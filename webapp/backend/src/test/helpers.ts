import * as schema from "../lib/db/schema.ts";
import { createRequire } from "node:module";
import { db } from "../lib/db/index.ts";
import { initClient } from "@ts-rest/core";
import { contract } from "../../../shared/contracts/index.ts";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { polygon } from "viem/chains";

// Workaround for dynamic require error in drizzle: https://github.com/drizzle-team/drizzle-orm/issues/2853#issuecomment-2668459509
const require = createRequire(import.meta.url);
const { pushSQLiteSchema } =
  require("drizzle-kit/api") as typeof import("drizzle-kit/api");

export async function applySchemaToTestDb() {
  const { apply } = await pushSQLiteSchema(schema, db);
  await apply();
}

export type TestApiClient = ReturnType<
  typeof initClient<
    typeof contract,
    {
      baseUrl: string;
      baseHeaders: Record<string, string>;
    }
  >
>;

export function getTestApiClient(
  serverUrl: string,
  extraHeaders?: Record<string, string>
) {
  return initClient(contract, {
    baseUrl: serverUrl,
    baseHeaders: extraHeaders,
  });
}

export function getRandomPublicKey() {
  const account = privateKeyToAccount(generatePrivateKey());
  const publicKey = account.publicKey;
  return publicKey;
}

export async function getAuthenticatedClient(
  serverUrl: string,
  anonymousClient: TestApiClient,
  extraHeaders?: Record<string, string>
) {
  const account = privateKeyToAccount(generatePrivateKey());
  const nonceResponse = await anonymousClient.auth.getNonce({ body: {} });
  if (nonceResponse.status !== 200) {
    throw new Error("Failed to fetch nonce");
  }
  const nonce = nonceResponse.body.nonce;
  const message = createSiweMessage({
    domain: "localhost",
    address: account.address,
    statement: "Sign in to Golem Vanity Market",
    uri: serverUrl,
    version: "1",
    chainId: polygon.id,
    nonce,
  });
  const signature = await account.signMessage({ message });
  const signInResponse = await anonymousClient.auth.signIn({
    body: {
      message,
      signature: signature as `0x${string}`,
    },
  });
  if (signInResponse.status !== 200) {
    throw new Error("Failed to sign in");
  }
  return getTestApiClient(serverUrl, {
    ...extraHeaders,
    authorization: `Bearer ${signInResponse.body.accessToken}`,
  });
}
