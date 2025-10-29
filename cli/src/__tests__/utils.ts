import { AppContext, getPinoLogger } from "../app_context";

export function getCtxForTests(testName: string): AppContext {
  const logger = getPinoLogger(testName);
  return new AppContext().withLogger(logger);
}
