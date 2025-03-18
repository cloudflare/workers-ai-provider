import { WorkersAIChatLanguageModel } from "./workersai-chat-language-model";
import type { WorkersAIChatSettings } from "./workersai-chat-settings";
import type { TextGenerationModels } from "./workersai-models";
import { createRun } from "./utils";

export type WorkersAISettings =
  ({
  /**
   * Provide a Cloudflare AI binding.
   */
  binding: Ai;

  /**
   * Credentials must be absent when a binding is given.
   */
  accountId?: never;
  apiKey?: never;
}
  | {
  /**
   * Provide Cloudflare API credentials directly. Must be used if a binding is not specified.
   */
  accountId: string;
  apiKey: string;
  /**
   * Both binding must be absent if credentials are used directly.
   */
  binding?: never;
}) & {
  /**
   * Optionally specify a gateway.
   */
  gateway?: GatewayOptions;
};

export interface WorkersAI {
  (
    modelId: TextGenerationModels,
    settings?: WorkersAIChatSettings
  ): WorkersAIChatLanguageModel;

  /**
   * Creates a model for text generation.
   **/
  chat(
    modelId: TextGenerationModels,
    settings?: WorkersAIChatSettings
  ): WorkersAIChatLanguageModel;
}

/**
 * Create a Workers AI provider instance.
 */
export function createWorkersAI(options: WorkersAISettings): WorkersAI {
  // Use a binding if one is directly provided. Otherwise use credentials to create
  // a `run` method that calls the Cloudflare REST API.
  let binding: Ai | undefined;

  if (options.binding) {
    binding = options.binding;
  } else {
    const { accountId, apiKey } = options;
    binding = {
      run: createRun(accountId, apiKey),
    } as Ai;
  }

  if (!binding) {
    throw new Error(
      "Either a binding or credentials must be provided."
    );
  }

  /**
   * Helper function to create a chat model instance.
   */
  const createChatModel = (
    modelId: TextGenerationModels,
    settings: WorkersAIChatSettings = {}
  ) =>
    new WorkersAIChatLanguageModel(modelId, settings, {
      provider: "workersai.chat",
      binding,
      gateway: options.gateway
    });

  const provider = function (
    modelId: TextGenerationModels,
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

