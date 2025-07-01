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

    // loop until enough addresses are found or budget is exhausted
    while (this.sessionManager.noResults < params.numResults) {
      // first check if the budget is sufficient to continue
      const hasSufficientBudget = await budgetMonitor.hasSufficientBudget();
      if (!hasSufficientBudget) {
        ctx.L().warn("Insufficient budget to continue work. Stopping.");
        console.warn("⚠️ Insufficient budget to continue work. Stopping.");
        this.sessionManager.stopWork("Insufficient budget");
        break;
      }

      // display budget info at the start of each iteration
      await budgetMonitor.displayBudgetInfo();

      console.log(
        `🔨 Scheduling work to ${params.numberOfWorkers} providers. This should take around ${params.singlePassSeconds} seconds.`,
      );
      try {
        const currentWorkers: Promise<void>[] = [];
        for (let i = 0; i < params.numberOfWorkers; i++) {
          const worker = this.sessionManager.runSingleIteration(
            ctx,
            params,
            onResult,
            onError,
          );
          currentWorkers.push(worker);
        }
        const settledWork = await Promise.allSettled(currentWorkers);
        const successfulWork = settledWork.filter(
          (result) => result.status === "fulfilled",
        ).length;
        if (this.sessionManager.isWorkStopped()) {
          ctx.L().info("Work was stopped by user");
          break;
        }
        console.log(
          `Iteration completed. ${successfulWork}/${params.numberOfWorkers} providers successfully finished their work. Found ${this.sessionManager.noResults}/${params.numResults} results so far.`,
        );
      } catch (error) {
        ctx.L().error("Error during generation process:", error);
        console.error("Error during generation process:", error);
        continue;
      }
    }
    console.log(
      `✅ Generation process completed. Found ${this.sessionManager.noResults}/${params.numResults} addresses.`,
    );
  }
}
