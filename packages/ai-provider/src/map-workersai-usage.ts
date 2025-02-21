export function mapWorkersAIUsage(output:  AiTextGenerationOutput | AiTextToImageOutput) {
	const usage = (output as { usage: { prompt_tokens: number, completion_tokens: number} }).usage ?? {
		prompt_tokens: 0,
		completion_tokens: 0,
	};

	return {
		promptTokens: usage.prompt_tokens,
		completionTokens: usage.completion_tokens
	}
}
