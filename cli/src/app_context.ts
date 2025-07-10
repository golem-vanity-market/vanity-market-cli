import * as otl from "@opentelemetry/api";
import { Logger } from "@golem-sdk/golem-js";
import { MetricsCollector } from "./metrics_collector";

export class AppContext {
  private _activeContext: otl.Context;
  private logger?: Logger;
  private tracer?: otl.Tracer;
  private collector?: MetricsCollector;

  constructor(ctx: otl.Context) {
    this._activeContext = ctx;
  }

  public WithLogger(logger: Logger): AppContext {
    const newCtx = new AppContext(this._activeContext);
    newCtx.logger = logger;
    newCtx.tracer = this.tracer;
    newCtx.collector = this.collector;
    return newCtx;
  }

  public WithTracer(tracer: otl.Tracer): AppContext {
    const newCtx = new AppContext(this._activeContext);
    newCtx.tracer = tracer;
    newCtx.logger = this.logger;
    newCtx.collector = this.collector;
    return newCtx;
  }

  public WithCollector(collector: MetricsCollector): AppContext {
    const newCtx = new AppContext(this._activeContext);
    newCtx.collector = collector;
    newCtx.logger = this.logger;
    newCtx.tracer = this.tracer;
    return newCtx;
  }

  public L(): Logger {
    if (!this.logger) {
      throw new Error("Logger is not set in the AppContext");
    }
    return this.logger;
  }

  public withValue<T>(key: string, value: T): AppContext {
    const otl_key = otl.createContextKey(key);
    const newOtlCtx = this._activeContext.setValue(otl_key, value);

    const newCtx = new AppContext(newOtlCtx);
    newCtx.logger = this.logger; // Preserve the logger
    return newCtx;
  }

  public getValue<T>(key: string): T | undefined {
    const otl_key = otl.createContextKey(key);
    return this._activeContext.getValue(otl_key) as T | undefined;
  }

  public consoleInfo(message?: unknown, ...optionalParams: unknown[]): void {
    console.log(message, ...optionalParams);
  }

  public consoleError(message?: unknown, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }
}
