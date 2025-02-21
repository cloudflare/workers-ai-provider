import {
  createJsonErrorResponseHandler,
} from "@ai-sdk/provider-utils";
import { z } from "zod";

const workersAIErrorDataSchema = z.object({
  object: z.literal("error"),
  message: z.string(),
  type: z.string(),
  param: z.string().nullable(),
  code: z.string().nullable(),
});

export const workersAIFailedResponseHandler =
  createJsonErrorResponseHandler({
    errorSchema: workersAIErrorDataSchema,
    errorToMessage: (data) => data.message,
  });
