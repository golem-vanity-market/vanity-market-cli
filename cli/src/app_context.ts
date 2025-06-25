import * as otl from "@opentelemetry/api";
import {
  defaultResultsServiceOptions,
  GenerationEntryResult,
  ResultsService,
} from "./results";
import { Logger } from "@golem-sdk/golem-js";

export class AppContext {
  private _activeContext: otl.Context;
  private logger?: Logger;
  private generationResults: ResultsService;

  constructor(ctx: otl.Context) {
    this._activeContext = ctx;
    this.generationResults = new ResultsService(defaultResultsServiceOptions());
  }

  public stopServices(): void {
    this.L().debug("Stopping result service...");
    this.generationResults.stop();
  }

  public async waitUntilFinished(): Promise<void> {
    this.L().debug("Waiting for result service stopped...");
    await this.generationResults.waitForFinish();
    this.L().debug("Results service stopped...");
  }

  public addGenerationResult(result: GenerationEntryResult): void {
    this.generationResults.addResult(result);
  }

  public get noResults(): number {
    return this.generationResults.numberOfResults;
  }

  // Use as readonly
  public async results(): Promise<GenerationEntryResult[]> {
    return await this.generationResults.results();
  }

  public WithLogger(logger: Logger): AppContext {
    const newCtx = new AppContext(this._activeContext);
    newCtx.logger = logger;
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
}
