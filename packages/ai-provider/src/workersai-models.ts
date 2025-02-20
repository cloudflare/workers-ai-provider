export type TextGenerationModels = {
  // For each key K in AiModels, if the corresponding value is assignable to BaseAiTextGeneration,
  // then keep the key; otherwise, assign it to never.
  [K in keyof AiModels]: AiModels[K] extends BaseAiTextGeneration ? K : never;
}[keyof AiModels];
