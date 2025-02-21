import { generateText, tool, type Message } from "ai";
import { createWorkersAI } from "workers-ai-provider/src";
import z from "zod";

export interface Env {
  AI: Ai;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST") {
      const { messages } = await request.json<{
        messages: Message[];
      }>();
      const workersai = createWorkersAI({ binding: env.AI });
      const model = workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast");

      const weather = tool({
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) =>
          location === "London" ? "Raining" : "Sunny",
      });

      const result = await generateText({
        model,
        messages,
        tools: {
          weather,
        },
        maxSteps: 5,
      });

      return new Response(result.text);
    }

    return new Response("Not Found!!", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
