import { buildApp } from "./app.ts";
import config from "./config.ts";

const start = async () => {
  const app = await buildApp();
  try {
    await app.listen({ port: config.BIND_PORT, host: config.BIND_ADDRESS });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
