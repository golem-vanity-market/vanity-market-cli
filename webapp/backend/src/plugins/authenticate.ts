import type {
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
} from "fastify";
import fp from "fastify-plugin";
import jwtPlugin from "@fastify/jwt";
import config from "../config.ts";
import { db } from "../lib/db/index.ts";
import { refreshTokensTable } from "../lib/db/schema.ts";
import { and, eq, gte } from "drizzle-orm";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { walletAddress: `0x${string}`; token: string };
    user: {
      walletAddress: `0x${string}`;
      token: string;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => Promise<void>;
  }
}

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.headers.authorization) {
      throw new Error("Authorization header is missing");
    }
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ message: "Unauthorized" });
  }
}

export default fp(async (fastify) => {
  fastify.register(jwtPlugin, {
    secret: config.JWT_SECRET,
    cookie: {
      cookieName: config.COOKIE_NAME,
      signed: false, // We are not signing the cookie itself, but the JWT inside
    },
    // This function is called for every JWT verification
    // For refresh tokens, it checks if the token is valid and not expired
    trusted: async (request, decodedToken) => {
      const token = decodedToken.token;
      if (!token) return false;
      const tokenRecord = await db
        .select()
        .from(refreshTokensTable)
        .where(
          and(
            eq(refreshTokensTable.token, token),
            gte(refreshTokensTable.expiresAt, new Date())
          )
        );
      return tokenRecord.length > 0;
    },
  });
  fastify.decorate("authenticate", authenticate);
});
