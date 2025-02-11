import {
  type LanguageModelV1,
  type LanguageModelV1CallWarning,
  type LanguageModelV1FinishReason,
  type LanguageModelV1StreamPart,
  UnsupportedFunctionalityError,
} from "@ai-sdk/provider";
import type {
  ParseResult,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import { convertToWorkersAIChatMessages } from "./convert-to-workersai-chat-messages";
import { mapWorkersAIFinishReason } from "./map-workersai-finish-reason";
import type { WorkersAIChatSettings } from "./workersai-chat-settings";
import { workersAIFailedResponseHandler } from "./workersai-error";

import { events } from "fetch-event-stream";

type WorkersAIChatConfig = {
  provider: string;
  binding: Ai;
};

export class WorkersAIChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly defaultObjectGenerationMode = "json";

  readonly modelId: BaseAiTextGenerationModels;
  readonly settings: WorkersAIChatSettings;

  private readonly config: WorkersAIChatConfig;

  constructor(
    modelId: BaseAiTextGenerationModels,
    settings: WorkersAIChatSettings,
    config: WorkersAIChatConfig
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  private getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    seed,
  }: Parameters<LanguageModelV1["doGenerate"]>[0]) {
    const type = mode.type;

    const warnings: LanguageModelV1CallWarning[] = [];

    if (frequencyPenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "frequencyPenalty",
      });
    }

    if (presencePenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "presencePenalty",
      });
    }

    const baseArgs = {
      // model id:
      model: this.modelId,

      // model specific settings:
      safe_prompt: this.settings.safePrompt,

      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      random_seed: seed,

      // messages:
      messages: convertToWorkersAIChatMessages(prompt),
    };

    switch (type) {
      case "regular": {
        return {
          args: { ...baseArgs, ...prepareToolsAndToolChoice(mode) },
          warnings,
        };
      }

      case "object-json": {
        return {
          args: {
            ...baseArgs,
            response_format: { type: "json_object" },
          },
          warnings,
        };
      }

      case "object-tool": {
        return {
          args: {
            ...baseArgs,
            tool_choice: "any",
            tools: [{ type: "function", function: mode.tool }],
          },
          warnings,
        };
      }

      // @ts-expect-error - this is unreachable code
      // TODO: fixme
      case "object-grammar": {
        throw new UnsupportedFunctionalityError({
          functionality: "object-grammar mode",
        });
      }

      default: {
        const exhaustiveCheck = type satisfies never;
        throw new Error(`Unsupported type: ${exhaustiveCheck}`);
      }
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const { args, warnings } = this.getArgs(options);

    const response = await this.config.binding.run(args.model, {
      messages: args.messages,
    }, 
    {
      gateway: this.settings.gateway
    });

    if (response instanceof ReadableStream) {
      throw new Error("This shouldn't happen");
    }

    return {
      text: response.response,
      // TODO: tool calls
      // toolCalls: response.tool_calls?.map((toolCall) => ({
      //   toolCallType: "function",
      //   toolCallId: toolCall.name, // TODO: what can the id be?
      //   toolName: toolCall.name,
      //   args: JSON.stringify(toolCall.arguments || {}),
      // })),
      finishReason: "stop", // TODO: mapWorkersAIFinishReason(response.finish_reason),
      rawCall: { rawPrompt: args.messages, rawSettings: args },
      usage: {
        // TODO: create mapWorkersAIUsage(response.usage) and do mapping there instead,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
      warnings,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const { args, warnings } = this.getArgs(options);

    const decoder = new TextDecoder();

    const response = await this.config.binding.run(args.model, {
      messages: args.messages,
      stream: true,
    });

    if (!(response instanceof ReadableStream)) {
      throw new Error("This shouldn't happen");
    }

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof workersAIChatChunkSchema>>,
          LanguageModelV1StreamPart
        >({
          async transform(chunk, controller) {
            const chunkToText = decoder.decode(chunk as unknown as Uint8Array);
            const chunks = events(new Response(chunkToText));
            const promptTokens = 0;
            const completionTokens = 0;            
            for await (const singleChunk of chunks) {
              if (!singleChunk.data) {
                continue;
              }
              if (singleChunk.data === "[DONE]") {
                controller.enqueue({
                  type: "finish",
                  finishReason: "stop",
                  usage: {
                    promptTokens: promptTokens,
                    completionTokens: completionTokens,
                  },
                });
                return;
              }
              const data = JSON.parse(singleChunk.data);

              // Usage stats are reported in a final data message (with data.response set to ""), before "[DONE]".
              if(data.usage) {
                promptTokens = data.usage.prompt_tokens;
                completionTokens = data.usage.completion_tokens;
              }
              
              controller.enqueue({
                type: "text-delta",
                textDelta: data.response ?? "DATALOSS",
              });
            }
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: {
                promptTokens: 0,
                completionTokens: 0,
              },
            });
          },
        })
      ),
      rawCall: { rawPrompt: args.messages, rawSettings: args },
      warnings,
    };
  }
}
// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const workersAIChatResponseSchema = z.object({
  response: z.string(),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const workersAIChatChunkSchema = z.instanceof(Uint8Array);

function prepareToolsAndToolChoice(
  mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
    type: "regular";
  }
) {
  // when the tools array is empty, change it to undefined to prevent errors:
  const tools = mode.tools?.length ? mode.tools : undefined;

  if (tools == null) {
    return { tools: undefined, tool_choice: undefined };
  }

  const mappedTools = tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      // @ts-expect-error - description is not a property of tool
      description: tool.description,
      // @ts-expect-error - parameters is not a property of tool
      parameters: tool.parameters,
    },
  }));

  const toolChoice = mode.toolChoice;

  if (toolChoice == null) {
    return { tools: mappedTools, tool_choice: undefined };
  }

  const type = toolChoice.type;

  switch (type) {
    case "auto":
      return { tools: mappedTools, tool_choice: type };
    case "none":
      return { tools: mappedTools, tool_choice: type };
    case "required":
      return { tools: mappedTools, tool_choice: "any" };

    // workersAI does not support tool mode directly,
    // so we filter the tools and force the tool choice through 'any'
    case "tool":
      return {
        tools: mappedTools.filter(
          (tool) => tool.function.name === toolChoice.toolName
        ),
        tool_choice: "any",
      };
    default: {
      const exhaustiveCheck = type satisfies never;
      throw new Error(`Unsupported tool choice type: ${exhaustiveCheck}`);
    }
  }
}
