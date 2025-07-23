import fp from "fastify-plugin";
import type { ServiceContainer } from "../types.ts";

declare module "fastify" {
  interface FastifyRequest {
    jobService: ServiceContainer["jobService"];
    authService: ServiceContainer["authService"];
  }
}

export default (serviceContainer: ServiceContainer) =>
  fp(async (fastify) => {
    fastify.decorateRequest("jobService", serviceContainer.jobService);
    fastify.decorateRequest("authService", serviceContainer.authService);
  });
