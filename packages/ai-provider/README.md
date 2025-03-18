# ⛅️ ✨ workers-ai-provider ✨ ⛅️

A custom provider that enables [Workers AI](https://ai.cloudflare.com/)'s models for the [Vercel AI SDK](https://sdk.vercel.ai/).

## Install

```bash
npm install workers-ai-provider
```

## Usage

First, setup an AI binding in `wrangler.toml` in your Workers project:

```toml
# ...
[ai]
binding = "AI"
# ...
```

Then in your Worker, import the factory function and create a new AI provider:

```ts
// index.ts
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

type Env = {
  AI: Ai;
};

export default {
  async fetch(req: Request, env: Env) {
    const workersai = createWorkersAI({ binding: env.AI });
    // Use the AI provider to interact with the Vercel AI SDK
    // Here, we generate a chat stream based on a prompt
    const text = await streamText({
      model: workersai("@cf/meta/llama-2-7b-chat-int8"),
      messages: [
        {
          role: "user",
          content: "Write an essay about hello world",
        },
      ],
    });

    return text.toTextStreamResponse({
      headers: {
        // add these headers to ensure that the
        // response is chunked and streamed
        "Content-Type": "text/x-unknown",
        "content-encoding": "identity",
        "transfer-encoding": "chunked",
      },
    });
  },
};
```

You can also use your Cloudflare credentials to create the provider, for example if you want to use Cloudflare AI outside of the Worker environment. For example, here is how you can use Cloudflare AI in a Node script:

```js
const workersai = createWorkersAI({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiKey: process.env.CLOUDFLARE_API_KEY
});

const text = await streamText({
  model: workersai("@cf/meta/llama-2-7b-chat-int8"),
  messages: [
    {
      role: "user",
      content: "Write an essay about hello world",
    },
  ],
});
```

For more info, refer to the documentation of the [Vercel AI SDK](https://sdk.vercel.ai/).

### Credits

Based on work by [Dhravya Shah](https://twitter.com/DhravyaShah) and the Workers AI team at Cloudflare.
