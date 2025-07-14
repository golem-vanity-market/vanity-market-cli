import { initContract } from "@ts-rest/core";
import * as z from "zod/v4";

const c = initContract();

const EthereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Not a valid Ethereum address");

// Sign in with Ethereum
export const SignInSchema = z.object({
  message: z.string(),
  signature: z.templateLiteral(["0x", z.string()]),
});

export const UserSchema = z.object({
  address: EthereumAddress,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const anonymousSessionIdSchema = z.uuidv4();

export const authContract = c.router({
  getNonce: {
    method: "POST",
    path: "/auth/nonce",
    body: z.object(),
    responses: {
      200: z.object({
        nonce: z.string(),
        expiresAt: z.string(),
      }),
    },
    summary: "Get the authentication nonce for signing in with Ethereum",
  },
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
    summary: "Verify the signature to obtain a JWT access token",
  },
  me: {
    method: "GET",
    path: "/auth/me",
    responses: {
      200: UserSchema,
      401: z.object({
        message: z.string(),
      }),
    },
    summary: "Get the current user's information",
  },
  refresh: {
    method: "POST",
    path: "/auth/refresh",
    body: z.object({}),
    responses: {
      200: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
      }),
      401: z.object({
        message: z.string(),
      }),
    },
    summary: "Refresh the access token using the refresh token",
  },
  logout: {
    method: "POST",
    path: "/auth/logout",
    body: z.object({}),
    responses: {
      200: z.object({
        message: z.string(),
      }),
      401: z.object({
        message: z.string(),
      }),
    },
    summary: "Log out the current user",
  },
});
