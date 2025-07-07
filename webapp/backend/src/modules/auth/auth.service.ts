import { db } from "../../lib/db/index.ts";
import { usersTable } from "../../lib/db/schema.ts";

export async function signInWithEthereum(
  address: string,
  _signature: string
): Promise<{ accessToken: string; refreshToken: string }> {
  //   TODO: SIWE

  // upsert user if we don't have them yet
  await db
    .insert(usersTable)
    .values({
      address,
    })
    .onConflictDoNothing();
  return {
    accessToken: "123",
    refreshToken: "456",
  };
}
