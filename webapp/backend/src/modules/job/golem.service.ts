import { type Logger } from "@golem-sdk/golem-js";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import {
  AppContext,
  EstimatorService,
  GenerationPrefix,
  GolemSessionManager,
  PublicKey,
  ResultsService,
  Scheduler,
  type GenerationParams,
  type SessionManagerParams,
  validateProcessingUnit,
  type GolemSessionRecorder,
  type SchedulerRecorder,
  type Reputation,
} from "@unoperate/golem-vaddr-cli/lib";
import type { JobInput } from "../../../../shared/contracts/job.contract.ts";
import type { GolemService, Callbacks } from "./types.ts";
import { isNativeError } from "node:util/types";
import { randomUUID } from "node:crypto";

interface ActiveJobContext {
  golemSessionManager: GolemSessionManager;
  scheduler: Scheduler;
}

const activeJobs: Record<string, ActiveJobContext> = {};

class GolemServiceImpl implements GolemService {
  private readonly rootLogger: Logger;

  constructor(rootLogger: Logger) {
    this.rootLogger = rootLogger;
  }

  public startJob(jobId: string, input: JobInput, callbacks: Callbacks): void {
    // Run the process in the background. Do not await it.
    this.runJobProcess(jobId, input, callbacks).catch((error) => {
      this.rootLogger.error(
        `Unhandled exception in Golem process for job ${jobId}:`,
        error
      );
      callbacks.onFailed(
        jobId,
        isNativeError(error) ? error : new Error(String(error))
      );
    });
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const jobContext = activeJobs[jobId];
    if (!jobContext) {
      this.rootLogger.warn(
        `Attempted to cancel job ${jobId}, but it was not found in active jobs.`
      );
      return false;
    }

    this.rootLogger.info(`Initiating cancellation for job ${jobId}`);
    jobContext.golemSessionManager.stopWork("User initiated cancellation");
    // The `finally` block in `_runJobProcess` will handle the actual cleanup.
    return true;
  }

  public validateAndTransformInputs(input: JobInput) {
    if (!input.publicKey) throw new Error("Public key is required");
    if (!input.vanityAddressPrefix)
      throw new Error("Vanity address prefix is required");
    if (!input.budgetGlm || input.budgetGlm <= 0)
      throw new Error("Budget must be a positive number");

    const publicKey = new PublicKey(input.publicKey);
    const vanityAddressPrefix = new GenerationPrefix(input.vanityAddressPrefix);
    const processingUnitType = validateProcessingUnit(input.processingUnit);

    return { publicKey, vanityAddressPrefix, processingUnitType };
  }

  private async runJobProcess(
    jobId: string,
    input: JobInput,
    callbacks: Callbacks
  ) {
    let golemSessionManager: GolemSessionManager | null = null;
    let appContext: AppContext | null = null;

    const seenResults = new Set<string>();
    let resultsCollector: NodeJS.Timeout | null = null;

    try {
      const validated = this.validateAndTransformInputs(input);

      await callbacks.onProcessing(jobId);

      // Set up Golem context and managers
      const logger = this.rootLogger.child(`job-${jobId}`);
      appContext = new AppContext(ROOT_CONTEXT).WithLogger(logger);

      const resultService = new ResultsService(appContext, {
        vanityPrefix: validated.vanityAddressPrefix,
        csvOutput: null,
      });
      const estimatorService = new EstimatorService(appContext, {
        vanityPrefix: validated.vanityAddressPrefix,
        disableMessageLoop: true,
        processLoopSecs: parseFloat(
          process.env.PROCESS_LOOP_SEC_INTERVAL || "1.0"
        ),
        resultService,
      }, null);

      const banSet = new Set();
      const reputation: Reputation = {
        ban: (_, providerId) => {
          banSet.add(providerId);
          return true;
        },
        isProviderBanned: (providerId) => banSet.has(providerId),
      };

      const sessionParams: SessionManagerParams = {
        rentalDurationSeconds: 15 / 60,
        budgetInitial: 1,
        processingUnitType: validated.processingUnitType,
        estimatorService,
        resultService,
        reputation,
      };

      // TODO:
      const NOOP = async () => {};
      const dbRecorder: GolemSessionRecorder = {
        addHashRate: NOOP,
        agreementCreate: NOOP,
        providerJobCompleted: NOOP,
        providerJobFailed: NOOP,
        providerJobCreate: async () => randomUUID(),
        providerJobStarted: NOOP,
        providerJobStopped: NOOP,
        getProviderJob: async () => [],
        resultFailedParsing: NOOP,
        resultInvalidVanityKey: NOOP,
        proofsStore: NOOP,
      };
      const schedulerRecorder: SchedulerRecorder = {
        startGenerationJob: NOOP,
      };

      golemSessionManager = new GolemSessionManager(sessionParams, dbRecorder);

      const scheduler = new Scheduler(
        golemSessionManager,
        estimatorService,
        schedulerRecorder
      );
      activeJobs[jobId] = { golemSessionManager, scheduler };

      // Setup results collector to periodically check for and report new results
      const collectResults = async () => {
        const results = await resultService.results();
        if (!results || results.length === 0) return;

        const newResults = results.filter((r) => !seenResults.has(r.addr));
        newResults.forEach((r) => seenResults.add(r.addr));

        if (newResults.length > 0) {
          await callbacks.onResults(jobId, newResults);
          appContext
            ?.L()
            .info(`Sent ${newResults.length} new results for job ${jobId}`);
        }
      };
      resultsCollector = setInterval(collectResults, 5000);

      await golemSessionManager.connectToGolemNetwork(appContext);
      await golemSessionManager.initializeRentalPool(appContext);
      await golemSessionManager.waitForEnoughOffers(appContext, 5, 30);

      const generationParams: GenerationParams = {
        publicKey: validated.publicKey.toTruncatedHex(),
        vanityAddressPrefix: validated.vanityAddressPrefix,
        budgetInitial: 0.5,
        budgetLimit: input.budgetGlm,
        budgetTopUp: 0.5,
        numberOfWorkers: input.numWorkers,
        singlePassSeconds: 20,
        numResults: BigInt(input.numResults),
        problems: [
          {
            type: "user-prefix",
            specifier: validated.vanityAddressPrefix.fullPrefix(),
          },
          { type: "leading-any" },
          { type: "trailing-any" },
          { type: "letters-heavy" },
          { type: "numbers-heavy" },
          { type: "snake-score-no-case" },
        ],
      };

      await scheduler.runGenerationProcess(appContext, generationParams);

      await collectResults(); // Final collection

      await callbacks.onCompleted(jobId);
    } catch (error) {
      appContext?.L().error(`Error processing job ${jobId}:`, error);
      await callbacks.onFailed(jobId, error as Error);
    } finally {
      if (resultsCollector) clearInterval(resultsCollector);
      this.rootLogger.info(`Stopped results collector for job ${jobId}`);

      if (golemSessionManager && appContext) {
        this.rootLogger.info(`Cleaning up Golem resources for job ${jobId}`);
        await golemSessionManager.drainPool(appContext);
        await golemSessionManager.disconnectFromGolemNetwork(appContext);
        this.rootLogger.info(`Resources cleaned up for job ${jobId}`);
      }
      delete activeJobs[jobId];
    }
  }
}

export function newGolemService(l: Logger): GolemService {
  return new GolemServiceImpl(l);
}
