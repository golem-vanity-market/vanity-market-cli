import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

// Sign in with Ethereum
export const SignInSchema = z.object({
  address: z.string(),
  signature: z.string(),
});

export const UserSchema = z.object({
  id: z.number().int(),
  address: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const authContract = c.router({
  signIn: {
    method: "POST",
    path: "/auth/signin",
    body: SignInSchema,
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
