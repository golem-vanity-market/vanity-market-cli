import Fastify from "fastify";
import { initServer } from "@ts-rest/fastify";
import { authRouter } from "./modules/auth/auth.router.ts";
import { jobRouter } from "./modules/job/job.router.ts";
import authenticatePlugin from "./plugins/authenticate.ts";
import { contract } from "../../shared/contracts/index.ts";
import jwtPlugin from "@fastify/jwt";
import corsPlugin from "@fastify/cors";

export async function buildApp() {
  const app = Fastify({
    logger: true, // TODO: use golem-compatible logger
  });

  app.register(corsPlugin, {
    origin: "*", // TODO: restrict to specific origins in production
  });
  app.register(jwtPlugin, {
    secret: process.env.JWT_SECRET || "default_secret_key",
    sign: {
      expiresIn: "1d",
    },
  });
  app.register(authenticatePlugin);

  const s = initServer();

  // Combine all your modular routers into one
  const router = s.router(contract, {
    auth: authRouter,
    jobs: jobRouter,
  });

  app.register(s.plugin(router));

  return app;
}
