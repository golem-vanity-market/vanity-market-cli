import { type Logger } from "@golem-sdk/golem-js";
import { pinoLogger } from "@golem-sdk/pino-logger";
import { type LibSQLDatabase } from "drizzle-orm/libsql";

export class AppContext {
  private logger?: Logger;
  private db?: LibSQLDatabase;
  private showTags = false;
  private jobId?: string;
  private providerJobId?: string;
  private workerNo?: number;
  private iterationNo?: number;

  constructor() {}

  public getDB(): LibSQLDatabase {
    if (!this.db) {
      throw new Error("DB is not set in the AppContext");
    }
    return this.db;
  }

  private duplicate(): AppContext {
    const newCtx = new AppContext();
    newCtx.showTags = this.showTags;
    newCtx.logger = this.logger;
    newCtx.db = this.db;
    newCtx.jobId = this.jobId;
    newCtx.providerJobId = this.providerJobId;
    newCtx.workerNo = this.workerNo;
    newCtx.iterationNo = this.iterationNo;
    return newCtx;
  }

  public withLogger(logger: Logger): AppContext {
    const newCtx = this.duplicate();
    newCtx.logger = logger;
    return newCtx;
  }

  public withDatabase(db: LibSQLDatabase): AppContext {
    const newCtx = this.duplicate();
    newCtx.db = db;
    return newCtx;
  }

  public L(): Logger {
    if (!this.logger) {
      throw new Error("Logger is not set in the AppContext");
    }
    return this.logger;
  }
  public getJobId(): string | undefined {
    return this.jobId;
  }
  public getProviderJobId(): string | undefined {
    return this.providerJobId;
  }
  public getWorkerNo(): number | undefined {
    return this.workerNo;
  }
  public getIterationNo(): number | undefined {
    return this.iterationNo;
  }
  public withJobId(jobId: string): AppContext {
    const newCtx = this.duplicate();
    newCtx.jobId = jobId;
    return newCtx;
  }

  public withShowTags(show: boolean): AppContext {
    const newCtx = this.duplicate();
    newCtx.showTags = show;
    return newCtx;
  }
  public withProviderJobId(providerJobId: string): AppContext {
    const newCtx = this.duplicate();
    newCtx.providerJobId = providerJobId;
    return newCtx;
  }
  public withWorkerNo(workerNo: number): AppContext {
    const newCtx = this.duplicate();
    newCtx.workerNo = workerNo;
    return newCtx;
  }

  public withIterationNo(iterationNo: number): AppContext {
    const newCtx = this.duplicate();
    newCtx.iterationNo = iterationNo;
    return newCtx;
  }

  public debug(message: string): void {
    if (!this.logger) {
      throw new Error("Logger is not set in the AppContext");
    }
    const m = this.withPrefix(message);
    if (this.showTags) {
      this.logger.debug(m, this.getTags());
    } else {
      this.logger.debug(m);
    }
  }

  public info(message: string): void {
    if (!this.logger) {
      throw new Error("Logger is not set in the AppContext");
    }
    const m = this.withPrefix(message);
    if (this.showTags) {
      this.logger.info(m, this.getTags());
    } else {
      this.logger.info(m);
    }
  }

  public warn(message: string): void {
    if (!this.logger) {
      throw new Error("Logger is not set in the AppContext");
    }
    const m = this.withPrefix(message);
    if (this.showTags) {
      this.logger.warn(m, this.getTags());
    } else {
      this.logger.warn(m);
    }
  }

  public error(message: string): void {
    if (!this.logger) {
      throw new Error("Logger is not set in the AppContext");
    }
    const m = this.withPrefix(message);
    if (this.showTags) {
      this.logger.error(m, this.getTags());
    } else {
      this.logger.error(m);
    }
  }

  public consoleInfo(message?: unknown, ...optionalParams: unknown[]): void {
    console.log(message, ...optionalParams);
  }

  public consoleError(message?: unknown, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }

  private withPrefix(m: string): string {
    const workerNo = this.getWorkerNo();
    const iterationNo = this.getIterationNo();
    let prefix = "";
    if (workerNo !== undefined) prefix = `Worker: ${workerNo}`;

    if (iterationNo !== undefined) {
      prefix = prefix + ` Iteration: ${iterationNo}`;
    }
    return prefix + " " + m;
  }

  public getTags(): Record<string, string> {
    const tags: Record<string, string> = {};
    const jobId = this.getJobId();
    if (jobId) {
      tags.jobId = jobId;
    }
    const workerNo = this.getWorkerNo();
    if (workerNo !== undefined) {
      tags.workerNo = workerNo.toString();
    }
    const iterationNo = this.getIterationNo();
    if (iterationNo !== undefined) {
      tags.iterationNo = iterationNo.toString();
    }
    return tags;
  }
}

/**
 * Creates a Pino logger
 *
 * Overwrite the default console log level (through pino-pretty) with GOLEM_PINO_LOG_LEVEL.
 *
 * @param appName - The application name to use for the logger
 * @returns Configured Pino logger
 */
export function getPinoLogger(appName: string): Logger {
  return pinoLogger({
    name: appName,
    transport: {
      targets: [
        { target: "pino-pretty", options: { colorize: true }, level: "info" },
      ],
    },
  });
}
