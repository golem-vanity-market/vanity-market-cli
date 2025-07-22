import fp from "fastify-plugin";
import type { ServiceContainer } from "../types.ts";

declare module "fastify" {
  interface FastifyRequest {
    jobService: ServiceContainer["jobService"];
    golemService: ServiceContainer["golemService"];
    authService: ServiceContainer["authService"];
  }
}

export default (serviceContainer: ServiceContainer) =>
  fp(async (fastify) => {
    fastify.decorateRequest("jobService", serviceContainer.jobService);
    fastify.decorateRequest("golemService", serviceContainer.golemService);
    fastify.decorateRequest("authService", serviceContainer.authService);
  });
