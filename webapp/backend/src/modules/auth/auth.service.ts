import {
  jobsTable,
  noncesTable,
  refreshTokensTable,
  usersTable,
} from "./../../lib/db/schema.ts";
import { db } from "../../lib/db/index.ts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq, and, gte } from "drizzle-orm";
import { verifyMessage } from "viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
import { randomUUID } from "node:crypto";

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
  signature: `0x${string}`,
  reply: FastifyReply,
  anonymousSessionId?: string
) {
  return db.transaction(async (tx) => {
    try {
      const fields = parseSiweMessage(message);
      if (!fields.nonce || !fields.address) {
        throw new Error("Invalid message format");
      }
      const nonce = await tx
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
      await tx.delete(noncesTable).where(eq(noncesTable.nonce, fields.nonce));
      // find or create user
      let user = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.address, address))
        .limit(1)
        .then((rows) => rows[0]);
      if (!user) {
        user = await tx
          .insert(usersTable)
          .values({
            address,
          })
          .returning()
          .then((rows) => rows[0]);
        if (!user) {
          throw new Error("Failed to create user");
        }
      }
      // merge jobs created by the anonymous session id that the user provided
      if (anonymousSessionId) {
        await tx
          .update(jobsTable)
          .set({
            userAddress: user.address,
            anonymousSessionId: null,
          })
          .where(eq(jobsTable.anonymousSessionId, anonymousSessionId));
      }
      // create refresh token
      const token = randomUUID();
      const refreshToken = await reply.jwtSign(
        { walletAddress: address, token },
        {
          expiresIn: "30d",
        }
      );
      await tx.insert(refreshTokensTable).values({
        token,
        userAddress: address,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiration
      });

      const accessToken = await reply.jwtSign(
        { walletAddress: address, token },
        {
          expiresIn: "15m",
        }
      );
      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      fastify.log.error(error);
      tx.rollback();
      throw new Error("Authentication failed");
    }
  });
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

export async function refreshAccessToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { token, walletAddress } = await request.jwtVerify<{
    token: string;
    walletAddress: `0x${string}`;
  }>({ onlyCookie: true });
  if (!token || !walletAddress) {
    throw new Error("Refresh token is required");
  }
  await db
    .delete(refreshTokensTable)
    .where(eq(refreshTokensTable.token, token));

  const newToken = randomUUID();
  const newRefreshToken = await reply.jwtSign(
    { walletAddress, token: newToken },
    {
      expiresIn: "30d",
    }
  );
  await db.insert(refreshTokensTable).values({
    token: newToken,
    userAddress: walletAddress.toLowerCase(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiration
  });
  const newAccessToken = await reply.jwtSign(
    { token: newToken, walletAddress },
    {
      expiresIn: "15m",
    }
  );
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(request: FastifyRequest) {
  const { token } = await request.jwtVerify<{ token: string }>({
    onlyCookie: true,
  });
  if (!token) {
    throw new Error("Refresh token is required");
  }
  await db
    .delete(refreshTokensTable)
    .where(eq(refreshTokensTable.token, token));
}
