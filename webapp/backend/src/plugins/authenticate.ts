import type { FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { User } from "../contracts/auth.contract.ts";

declare module "fastify" {
  interface FastifyRequest {
    user: User;
  }
}

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // TODO: verify JWT auth here
    request.user = {
      id: 1,
      address: "0x1234567890abcdef1234567890abcdef12345678",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    reply.status(401).send({ message: "Unauthorized" });
  }
}

export default fp(async (fastify) => {
  // Decorate the request object so we can assign `request.user`
  fastify.decorate("user", null);
  // Register the main authentication function as a hook or decorator
  fastify.addHook("preHandler", authenticate);
});
