import { buildApp } from "./app.ts";
import config from "./config.ts";
import { newJobService } from "./modules/job/job.service.ts";
import { newGolemService } from "./modules/job/golem.service.ts";
import { fastifyLogger } from "./lib/logger.ts";

const start = async () => {
  const jobSrv = newJobService(newGolemService(fastifyLogger));

  const app = await buildApp(jobSrv);
  try {
    await app.listen({ port: config.BIND_PORT, host: config.BIND_ADDRESS });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
