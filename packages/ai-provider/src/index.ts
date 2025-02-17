import { WorkersAIChatLanguageModel } from "./workersai-chat-language-model";
import type { WorkersAIChatSettings } from "./workersai-chat-settings";

export interface WorkersAI {
  (
    modelId: BaseAiTextGenerationModels,
    settings?: WorkersAIChatSettings
  ): WorkersAIChatLanguageModel;

  /**
   * Creates a model for text generation.
   **/
  chat(
    modelId: BaseAiTextGenerationModels,
    settings?: WorkersAIChatSettings
  ): WorkersAIChatLanguageModel;
}

export interface WorkersAISettings {
  /**
   * Provide an `env.AI` binding to use for the AI inference. 
   * You can set up an AI bindings in your Workers project 
   * by adding the following this to `wrangler.toml`: 
  
  ```toml
[ai]
binding = "AI"
  ``` 
   **/
  binding: Ai;
  /**
   * Optionally set Cloudflare AI Gateway options.
   */
  gateway?: GatewayOptions;
}

/**
 * Create a Workers AI provider instance.
 **/
export function createWorkersAI(options: WorkersAISettings): WorkersAI {
  const createChatModel = (
    modelId: BaseAiTextGenerationModels,
    settings: WorkersAIChatSettings = {}
  ) =>
    new WorkersAIChatLanguageModel(modelId, settings, {
      provider: "workersai.chat",
      binding: options.binding,
    });

  const provider = function (
    modelId: BaseAiTextGenerationModels,
    settings?: WorkersAIChatSettings
  ) {
    if (new.target) {
      throw new Error(
        "The WorkersAI model function cannot be called with the new keyword."
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.chat = createChatModel;

  return provider;
}
