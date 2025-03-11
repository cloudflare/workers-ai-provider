import {convertToCoreMessages, streamText, tool} from "ai";
import { createWorkersAI } from "workers-ai-provider/src";
import z from "zod";

export interface Env {
  AI: Ai;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      /^\/api\/chat\/[_\-A-Za-z]*/.exec(url.pathname)
    ) {
      const workersai = createWorkersAI({ binding: env.AI });
      const { messages } = await request.json<{
        messages: Parameters<typeof convertToCoreMessages>[0];
      }>();
      const weather = tool({
        description: "Get the weather in a location",
        parameters: z.object({
            location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) =>
          location === "London" ? "Raining" : "Sunny",
      });
      const result = streamText({
        model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
        messages: convertToCoreMessages(messages),
        tools: {
          weather
        },
        maxSteps: 5,
      });
      return result.toDataStreamResponse({
        headers: {
          // add these headers to ensure that the
          // response is chunked and streamed
          "Content-Type": "text/x-unknown",
          "content-encoding": "identity",
          "transfer-encoding": "chunked",
        },
      });
    }

    return new Response("Not Found!!", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
