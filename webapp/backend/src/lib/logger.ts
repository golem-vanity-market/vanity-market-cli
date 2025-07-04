import { pinoLogger } from "@golem-sdk/pino-logger";

export const fastifyLogger = pinoLogger({
  name: "golem-vanity-market",
});
