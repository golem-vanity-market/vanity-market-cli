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
import { anonymousSessionIdSchema } from "../../../shared/contracts/auth.contract.ts";

export type Identity =
  | {
      type: "user";
      walletAddress: `0x${string}`;
    }
  | {
      type: "anonymous";
      sessionId: string;
    };

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
  interface FastifyRequest {
    userIdentity?: Identity;
  }

  interface FastifyInstance {
    // Strict authenticator for signed-in users ONLY
    requireUser: (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => Promise<void>;
    // Requires some form of identity (signed-in or anonymous)
    requireAnyIdentity: (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => Promise<void>;
  }
}
/**
 * Attempts to determine the identity of a request.
 * - If an Authorization header is present, it MUST be a valid JWT.
 * - If no Authorization header is present, it checks for an anonymous session ID.
 * - Returns null otherwise
 */
async function getIdentity(request: FastifyRequest): Promise<Identity | null> {
  if (request.headers.authorization) {
    await request.jwtVerify();
    return {
      type: "user",
      walletAddress: request.user.walletAddress,
    };
  }

  const sessionId = request.headers[config.ANONYMOUS_SESSION_ID_HEADER_NAME];
  const parseResults = anonymousSessionIdSchema.safeParse(sessionId);
  if (parseResults.success) {
    return {
      type: "anonymous",
      sessionId: parseResults.data,
    };
  }

  return null;
}

/**
 * Hook to require any form of identity (user or anonymous session)
 */
async function requireAnyIdentity(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const identity = await getIdentity(request);
    if (!identity) {
      throw new Error("Unauthorized");
    }
    request.userIdentity = identity;
  } catch (err) {
    reply.status(401).send({ message: "Unauthorized" });
  }
}

/**
 * Hook to require a signed-in user.
 */
async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const identity = await getIdentity(request);
    if (!identity || identity.type !== "user") {
      throw new Error("Unauthorized");
    }
    request.userIdentity = identity;
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
      try {
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
      } catch (e) {
        return false;
      }
    },
  });

  fastify.decorate("requireUser", requireUser);
  fastify.decorate("requireAnyIdentity", requireAnyIdentity);
});
