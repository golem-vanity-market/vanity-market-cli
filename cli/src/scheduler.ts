import { GenerationPrefix } from "./prefix";
import { BudgetMonitor } from "./budget";
import {
  GolemSessionManager,
  OnErrorHandler,
  OnResultHandler,
} from "./node_manager/golem_session";
import { AppContext } from "./app_context";

/**
 * Interface for task generation parameters
 */
export interface GenerationParams {
  publicKey: string;
  vanityAddressPrefix: GenerationPrefix;
  budgetGlm: number;
  numberOfWorkers: number;
  singlePassSeconds: number;
  numResults: bigint;
}

/**
 * The purpose of the Scheduler is to continuously generate tasks until either enough addresses are found or the budget is exhausted.
 */
export class Scheduler {
  constructor(private readonly sessionManager: GolemSessionManager) {}

  public async runGenerationProcess(
    ctx: AppContext,
    params: GenerationParams,
  ): Promise<void> {
    const onResult: OnResultHandler = async ({ results, provider }) => {
      ctx
        .L()
        .info(
          `Provider ${provider.name} found ${results.length} results. Returning them to the pool for further processing.`,
        );
      // Determine if the results are satisfactory and update reputation here
      return true; // Keep the rental for further work
    };
    const onError: OnErrorHandler = async ({ error, provider }) => {
      ctx
        .L()
        .info(
          `Provider ${provider.name} encountered an error: ${error.message}. Removing them from the pool.`,
        );
      // Determine if the error is recoverable and update reputation here
      return false; // Destroy the rental
    };

    const budgetMonitor = new BudgetMonitor(this.sessionManager);

    if (!(await budgetMonitor.hasSufficientBudget())) {
      ctx.L().warn("Insufficient budget to start the work. Stopping.");
      console.warn("⚠️ Insufficient budget to start the work. Stopping.");
      return;
    }

    await budgetMonitor.displayBudgetInfo();
    console.log(
      `🔨 Starting work with ${params.numberOfWorkers} concurrent providers...`,
    );

    // Create and start multiple providers in parallel
    const workerPromises = Array.from({ length: params.numberOfWorkers }, () =>
      this.workInLoop(ctx, params, onResult, onError, budgetMonitor),
    );

    await Promise.allSettled(workerPromises);

    console.log(
      `✅ Generation process completed. Found ${this.sessionManager.noResults}/${params.numResults} addresses.`,
    );
  }

  /**
   * Runs work continuously until the main generation goals are met or work is stopped.
   * Note that `sessionManager.runSingleIteration` is _not_ guaranteed to run on the same
   * provider each time.
   */
  private async workInLoop(
    ctx: AppContext,
    params: GenerationParams,
    onResult: OnResultHandler,
    onError: OnErrorHandler,
    budgetMonitor: BudgetMonitor,
  ): Promise<void> {
    // This loop continues as long as the overall job is not done
    while (!this.sessionManager.isWorkStopped()) {
      // Check if the target number of results is reached
      if (this.sessionManager.noResults >= params.numResults) {
        ctx
          .L()
          .info(
            `Reached the target number of results: ${this.sessionManager.noResults}/${params.numResults}. Stopping work.`,
          );
        console.log(
          `🥳 Reached the target number of results: ${this.sessionManager.noResults}/${params.numResults}. Stopping work.`,
        );
        this.sessionManager.stopWork("Target number of results reached"); // Stop all other providers
        break; // Exit the loop if the target is reached
      }
      // Check budget before this worker starts a new task
      if (!(await budgetMonitor.hasSufficientBudget())) {
        ctx.L().warn("Insufficient budget to continue work. Stopping.");
        this.sessionManager.stopWork("Insufficient budget"); // Stop all other providers
        break; // Exit this worker's loop
      }

      try {
        // A single provider runs one iteration. When it's done, the loop
        // will check conditions again and start another if needed.
        await this.sessionManager.runSingleIteration(
          ctx,
          params,
          onResult,
          onError,
        );
      } catch (error) {
        if (this.sessionManager.isWorkStopped()) {
          // we can safely assume that the error is due to the work being stopped
          ctx.L().info("Work was stopped, exiting the provider loop.");
          break;
        }
        ctx.L().error("Unhandled error during a provider iteration:", error);
        console.error("Error in provider, continuing if possible:", error);
        // don't rethrow the error, just continue the loop, we'll get another provider
        // next time we call `runSingleIteration`
      }
    }
  }
}
