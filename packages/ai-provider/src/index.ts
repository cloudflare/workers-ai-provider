import { WorkersAIChatLanguageModel } from "./workersai-chat-language-model";
import type { WorkersAIChatSettings } from "./workersai-chat-settings";
import type { TextGenerationModels } from "./workersai-models";

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
}

/**
 * Create a Workers AI provider instance.
 **/
export function createWorkersAI(options: WorkersAISettings): WorkersAI {
  const createChatModel = (
    modelId: TextGenerationModels,
    settings: WorkersAIChatSettings = {}
  ) =>
    new WorkersAIChatLanguageModel(modelId, settings, {
      provider: "workersai.chat",
      binding: options.binding,
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
