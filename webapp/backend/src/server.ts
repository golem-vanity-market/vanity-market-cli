import { buildApp } from "./app.ts";
import config from "./config.ts";
import { newJobService } from "./modules/job/job.service.ts";
import { newGolemService } from "./modules/job/golem.service.ts";
import { fastifyLogger } from "./lib/logger.ts";
import { newAuthService } from "./modules/auth/auth.service.ts";

const start = async () => {
  const golemService = newGolemService(fastifyLogger);
  const jobService = newJobService(golemService);
  const authService = newAuthService();

  const app = await buildApp({
    jobService,
    authService,
  });

  try {
    await app.listen({ port: config.BIND_PORT, host: config.BIND_ADDRESS });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
