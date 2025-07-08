import { noncesTable } from "./../../lib/db/schema.ts";
import { db } from "../../lib/db/index.ts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { usersTable } from "../../lib/db/schema.ts";
import { eq, and, gte } from "drizzle-orm";
import { verifyMessage } from "viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";

export async function generateNonce() {
  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
  await db.insert(noncesTable).values({
    nonce,
    expiresAt,
  });
  return { nonce, expiresAt };
}

export async function verifySignatureAndLogin(
  fastify: FastifyInstance,
  message: string,
  signature: `0x${string}`
) {
  try {
    const fields = parseSiweMessage(message);
    if (!fields.nonce || !fields.address) {
      throw new Error("Invalid message format");
    }
    const nonce = await db
      .select()
      .from(noncesTable)
      .where(
        and(
          eq(noncesTable.nonce, fields.nonce),
          gte(noncesTable.expiresAt, new Date())
        )
      )
      .limit(1)
      .then((rows) => rows[0]);
    if (!nonce) {
      throw new Error("Invalid or expired nonce");
    }
    const address = fields.address.toLowerCase() as `0x${string}`;
    const isValidSignature = verifyMessage({ address, message, signature });
    if (!isValidSignature) {
      throw new Error("Invalid signature");
    }
    // invalidate the nonce
    await db.delete(noncesTable).where(eq(noncesTable.nonce, fields.nonce));
    // find or create user
    let user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.address, address))
      .limit(1)
      .then((rows) => rows[0]);
    if (!user) {
      user = await db
        .insert(usersTable)
        .values({
          address,
        })
        .returning()
        .then((rows) => rows[0]);
    }
    const token = fastify.jwt.sign({
      walletAddress: address,
    });
    return { token };
  } catch (error) {
    fastify.log.error(error);
    throw new Error("Authentication failed");
  }
}

export async function getCurrentUser(request: FastifyRequest) {
  const { walletAddress } = request.user;
  if (!walletAddress) {
    throw new Error("User not authenticated");
  }
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.address, walletAddress.toLowerCase()))
    .limit(1)
    .then((rows) => rows[0]);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}
