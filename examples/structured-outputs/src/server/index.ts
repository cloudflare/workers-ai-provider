import { generateObject, type Message } from "ai";
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

      // @ts-expect-error type instantiation too deep
      const { object } = await generateObject({
        model: workersai("@cf/meta/llama-3.1-8b-instruct"),
        // @ts-expect-error type instantiation too deep
        schema: z.object({
          recipe: z.object({
            name: z.string(),
            ingredients: z.array(
              z.object({ name: z.string(), amount: z.string() })
            ),
            steps: z.array(z.string()),
          }),
        }),
        messages,
      });

      return new Response(JSON.stringify(object));
    }

    return new Response("Not Found!!", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
