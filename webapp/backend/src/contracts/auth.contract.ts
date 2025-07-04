import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

// Sign in with Ethereum
export const AuthSchema = z.object({
  address: z.string().uuid(),
  signature: z.string(),
});

export const authContract = c.router({
  signIn: {
    method: "POST",
    path: "/auth/signin",
    body: AuthSchema,
    responses: {
      200: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
      }),
      401: z.object({
        message: z.string(),
      }),
    },
  },
});
