/**
 * Creates a run method that mimics the Cloudflare Workers AI binding,
 * but uses the Cloudflare REST API under the hood.
 *
 * @param accountId - Your Cloudflare account identifier.
 * @param apiKey - Your Cloudflare API token/key with appropriate permissions.
 * @returns An function matching `Ai['run']`.
 */
export function createRun(accountId: string, apiKey: string): AiRun {
  return async <Name extends keyof AiModels>(model: Name, inputs: AiModels[Name]["inputs"], options?: AiOptions | undefined) => {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const body = JSON.stringify(inputs);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    }) as Response;

    if (options?.returnRawResponse) {
      return response;
    }

    if ((inputs as AiTextGenerationInput).stream === true) {
      // If there's a stream, return the raw body so the caller can process it
      if (response.body) {
        return response.body;
      }
      throw new Error("No readable body available for streaming.");
    }

    // Otherwise, parse JSON and return the data.result
    const data = await response.json<{ result: AiModels[Name]["postProcessedOutputs"] }>();
    return data.result;
  };
}

interface AiRun {
  // (1) Return raw response if `options.returnRawResponse` is `true`.
  <Name extends keyof AiModels>(
    model: Name,
    inputs: AiModels[Name]["inputs"],
    options: AiOptions & { returnRawResponse: true }
  ): Promise<Response>;

  // (2) Return a stream if the input has `stream: true`.
  <Name extends keyof AiModels>(
    model: Name,
    inputs: AiModels[Name]["inputs"] & { stream: true },
    options?: AiOptions
  ): Promise<ReadableStream<Uint8Array>>;

  // (3) Return the post-processed outputs by default.
  <Name extends keyof AiModels>(
    model: Name,
    inputs: AiModels[Name]["inputs"],
    options?: AiOptions
  ): Promise<AiModels[Name]["postProcessedOutputs"]>;
}
