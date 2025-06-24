import * as otl from "@opentelemetry/api";
import pino from "pino";
import { GenerationEntryResult, GenerationResults } from "./scheduler";

export class AppContext {
  private _activeContext: otl.Context;
  private logger?: pino.Logger;
  private generationResults: GenerationResults;

  constructor(ctx: otl.Context) {
    this._activeContext = ctx;
    this.generationResults = new GenerationResults();
  }

  public addGenerationResult(result: GenerationEntryResult): void {
    this.generationResults.entries.push(result);
  }

  public get noResults(): number {
    return this.generationResults.entries.length;
  }

  // Use as readonly
  public get results(): GenerationResults {
    return this.generationResults;
  }

  public WithLogger(logger: pino.Logger): AppContext {
    const newCtx = new AppContext(this._activeContext);
    newCtx.logger = logger;
    return newCtx;
  }

  public L(): pino.Logger {
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
}
