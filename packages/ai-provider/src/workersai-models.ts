/**
 * The names of the BaseAiTextGeneration models.
 */
export type TextGenerationModels = {
  [K in keyof AiModels]: AiModels[K] extends BaseAiTextGeneration ? K : never;
}[keyof AiModels];
