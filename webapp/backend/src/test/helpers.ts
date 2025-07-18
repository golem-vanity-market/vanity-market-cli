import * as schema from "../lib/db/schema.ts";
// Workaround for dynamic require error in drizzle: https://github.com/drizzle-team/drizzle-orm/issues/2853#issuecomment-2668459509
import { createRequire } from "node:module";
import { db } from "../lib/db/index.ts";
import { initClient } from "@ts-rest/core";
import { contract } from "../../../shared/contracts/index.ts";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
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
