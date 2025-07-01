import {
  type Agreement,
  Allocation,
  DraftOfferProposalPool,
  GolemNetwork,
  ProviderInfo,
  ResourceRental,
  ResourceRentalPool,
} from "@golem-sdk/golem-js";
import { AppContext } from "./../app_context";
import { GenerationParams } from "./../scheduler";
import {
  BaseRentalConfig,
  CPURentalConfig,
  GPURentalConfig,
  ProcessingUnitType,
} from "./config";
import { Estimator } from "../estimator";
import { computePrefixDifficulty } from "../difficulty";
import { displayDifficulty, displayTime } from "../utils/format";
import { withTimeout } from "../utils/timeout";
import {
  defaultResultsServiceOptions,
  GenerationEntryResult,
  ResultsService,
} from "../results";
import { isNativeError } from "util/types";

/**
 * Parameters for the GolemSessionManager constructor
 */
export interface SessionManagerParams {
  /** Number of workers to allocate */
  numberOfWorkers: number;

  /** Rental duration in seconds */
  rentalDurationSeconds: number;

  /** Budget in GLM tokens */
  budgetGlm: number;

  /** Type of processing unit to use (CPU or GPU) */
  processingUnitType: ProcessingUnitType;
}

// Callbacks for `runSingleIteration` method
export type OnResultHandler = (payload: {
  results: GenerationEntryResult[];
  provider: ProviderInfo;
}) => Promise<boolean>;
export type OnErrorHandler = (payload: {
  error: Error;
  provider: ProviderInfo;
}) => Promise<boolean>;

/**
 * The purpose of the GolemSessionManager is to abstract the complexity of managing
 * the entire lifecycle of executing tasks on Golem Network.
 * It handles connecting to the network, allocating resources, looking for offers,
 * running commands and collecting results.
 */
export class GolemSessionManager {
  private numberOfWorkers: number;
  private rentalDurationSeconds: number;
  private budgetGlm: number;
  private processingUnitType: ProcessingUnitType;
  private golemNetwork?: GolemNetwork;
  private allocation?: Allocation;
  private rentalPool?: ResourceRentalPool;
  private generationResults: ResultsService;
  private stopWorkAC: AbortController = new AbortController();
  private agreementToEstimator: Record<Agreement["id"], Estimator> = {};

  constructor(params: SessionManagerParams) {
    this.numberOfWorkers = params.numberOfWorkers;
    this.rentalDurationSeconds = params.rentalDurationSeconds;
    this.budgetGlm = params.budgetGlm;
    this.processingUnitType = params.processingUnitType;
    this.generationResults = new ResultsService(defaultResultsServiceOptions());
  }

  public addGenerationResult(result: GenerationEntryResult): void {
    this.generationResults.addResult(result);
  }

  public get noResults(): number {
    return this.generationResults.numberOfResults;
  }

  public async results(): Promise<GenerationEntryResult[]> {
    return await this.generationResults.results();
  }

  public async connectToGolemNetwork(ctx: AppContext): Promise<void> {
    this.golemNetwork = new GolemNetwork({
      logger: ctx.L(),
    });
    try {
      await this.golemNetwork.connect();
      ctx.L().info("Connected to Golem Network successfully");
    } catch (error) {
      ctx.L().error("Failed to connect to Golem Network:", error);
      throw new Error("Connection to Golem Network failed");
    }
    this.golemNetwork.market.events.on("agreementApproved", ({ agreement }) => {
      console.log(`📃 Signed an agreement with ${agreement.provider.name}`);
    });
    this.golemNetwork.market.events.on(
      "agreementTerminated",
      ({ agreement }) => {
        console.log(`🗑️ Terminated agreement with ${agreement.provider.name}`);
      },
    );
  }

  public getAllocationId(): string {
    if (!this.allocation) {
      throw new Error("Allocation is not initialized");
    }
    return this.allocation.id;
  }

  public getGolemNetwork(): GolemNetwork {
    if (!this.golemNetwork) {
      throw new Error("Golem Network is not initialized");
    }
    return this.golemNetwork;
  }

  public stopWork(message?: string): void {
    this.stopWorkAC.abort(message || "Work stopped by user");
  }

  public isWorkStopped(): boolean {
    return this.stopWorkAC.signal.aborted;
  }

  public getConfigBasedOnProcessingUnitType(
    cruncherVersion?: string,
  ): BaseRentalConfig {
    switch (this.processingUnitType) {
      case ProcessingUnitType.CPU:
        return new CPURentalConfig(cruncherVersion);
      case ProcessingUnitType.GPU:
        return new GPURentalConfig(cruncherVersion);
      default:
        throw new Error(
          `Unsupported processing unit type: ${this.processingUnitType}`,
        );
    }
  }

  public async initializeRentalPool(ctx: AppContext): Promise<void> {
    if (!this.golemNetwork) {
      ctx
        .L()
        .error(
          "Golem Network is not initialized. Call connectToGolemNetwork first.",
        );
      throw new Error("Golem Network is not initialized");
    }

    const glm = this.golemNetwork;
    const rentalDurationWithPaymentsSeconds = this.rentalDurationSeconds + 360;
    const numberOfWorkers = this.numberOfWorkers;

    try {
      this.allocation = await glm.payment.createAllocation({
        budget: this.budgetGlm,
        expirationSec: Math.round(rentalDurationWithPaymentsSeconds),
        paymentPlatform: "erc20-polygon-glm",
      });

      this.rentalPool = await glm.manyOf({
        poolSize: numberOfWorkers,
        order: this.getConfigBasedOnProcessingUnitType().getOrder(
          this.rentalDurationSeconds,
          this.allocation,
        ),
      });
    } catch (error) {
      ctx.L().error("Failed to initialize rental pool:", error);
      throw error;
    }
  }

  public async waitForEnoughOffers(
    ctx: AppContext,
    numOffers: number,
    timeoutSec: number,
  ): Promise<void> {
    if (!this.rentalPool) {
      ctx
        .L()
        .error(
          "Rental pool is not initialized. Call initializeRentalPool first.",
        );
      throw new Error("Rental pool is not initialized");
    }
    const proposalPool: DraftOfferProposalPool =
      this.rentalPool["proposalPool"];
    const isEnough = () => proposalPool.availableCount() >= numOffers;

    if (isEnough()) {
      ctx
        .L()
        .info(
          `Found enough offers immediately: ${proposalPool.availableCount()} >= ${numOffers}`,
        );
      return;
    }

    return new Promise<void>((resolve) => {
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        proposalPool.events.off("added", onProposalAdded);
      };

      const onProposalAdded = () => {
        if (isEnough()) {
          ctx
            .L()
            .info(
              `Found enough offers: ${proposalPool.availableCount()} >= ${numOffers}`,
            );
          cleanup();
          resolve();
          return;
        }
        ctx
          .L()
          .info(
            `Current offers: ${proposalPool.availableCount()}, waiting for ${numOffers} offers...`,
          );
      };
      const timeoutId = setTimeout(() => {
        cleanup();
        ctx
          .L()
          .warn(
            `Timeout reached: ${timeoutSec} seconds, current offers: ${proposalPool.availableCount()}`,
          );
        resolve();
      }, timeoutSec * 1000);

      proposalPool.events.on("added", onProposalAdded);
    });
  }

  private async runCommand(
    ctx: AppContext,
    rental: ResourceRental,
    generationParams: GenerationParams,
  ): Promise<GenerationEntryResult[]> {
    const config = this.getConfigBasedOnProcessingUnitType();

    let estimator = this.agreementToEstimator[rental.agreement.id];
    if (!estimator) {
      estimator = new Estimator(
        computePrefixDifficulty(
          generationParams.vanityAddressPrefix.fullPrefix(),
        ),
      );
      this.agreementToEstimator[rental.agreement.id] = estimator;
    }

    try {
      // Get or create the exe unit
      const exe = await rental.getExeUnit();

      const provider = exe.provider;

      ctx
        .L()
        .info(
          `Running command on provider: ${provider.name}, type: ${this.processingUnitType}`,
        );

      // Validate capabilities (CPU or GPU specific)
      await config.checkAndSetCapabilities(exe);

      let totalCompute = 0;
      const addressesFound: GenerationEntryResult[] = [];
      const command = config.generateCommand(generationParams);
      ctx.L().info(`Executing command: ${command}`);

      const res = await exe.run(command, {
        signalOrTimeout: this.stopWorkAC.signal,
      });
      let biggestCompute = 0;
      const stderr = res.stderr ? String(res.stderr) : "";
      for (const line of stderr.split("\n")) {
        //ctx.L().info(line);
        if (line.includes("Total compute")) {
          try {
            const totalCompute = line
              .split("Total compute ")[1]
              .trim()
              .split(" GH")[0];
            const totalComputeFloatGh = parseFloat(totalCompute);
            biggestCompute = totalComputeFloatGh * 1e9;
          } catch (e) {
            ctx.L().error("Error parsing compute stats:", e);
          }
        }
      }

      if (biggestCompute > 0) {
        totalCompute += biggestCompute;
        estimator.reportAttempts(totalCompute);
      }

      const stdout = res.stdout ? String(res.stdout) : "";
      // Parse results from stdout
      for (let line of stdout.split("\n")) {
        try {
          line = line.trim();
          if (line.startsWith("0x")) {
            const salt = line.split(",")[0].trim();
            const addr = line.split(",")[1].trim();
            const pubKey = line.split(",")[2].trim();

            if (
              addr.startsWith(
                generationParams.vanityAddressPrefix.fullPrefix().toLowerCase(),
              )
            ) {
              const generationResult: GenerationEntryResult = {
                addr,
                salt,
                pubKey,
                provider,
              };
              addressesFound.push(generationResult);
              this.addGenerationResult(generationResult);
              console.log(`🤩 Provider ${provider.name} found address ${addr}`);
              ctx
                .L()
                .info(
                  `Found address: ${addr}, with salt: ${salt}, public key: ${pubKey}, prefix: ${generationParams.vanityAddressPrefix.toHex()}, provider: ${provider.name}`,
                );
            }
          }
        } catch (e) {
          ctx.L().error(`Error parsing result line: ${e}`);
        }
      }

      if (addressesFound.length === 0) {
        ctx
          .L()
          .info(
            `Couldn't find any address, difficulty: ${displayDifficulty(biggestCompute)}`,
          );

        const commonInfo = estimator.currentInfo();
        const unfortunateIteration = Math.floor(
          commonInfo.attempts / estimator.estimateAttemptsGivenProbability(0.5),
        );
        const partial =
          commonInfo.attempts /
            estimator.estimateAttemptsGivenProbability(0.5) -
          unfortunateIteration;
        const speed = commonInfo.estimatedSpeed;
        const eta = commonInfo.remainingTimeSec;
        const etaFormatted = eta !== null ? displayTime("", eta) : "N/A";
        const speedFormatted =
          speed !== null ? displayDifficulty(speed.speed) + "/s" : "N/A";
        const bar = "#".repeat(Math.round(partial * 50)).padEnd(50, " ");
        const attemptsCompleted = commonInfo.attempts;
        const attemptsCompletedFormatted = displayDifficulty(attemptsCompleted);

        const ecstaticFace = "😃";
        const smilingFace = "😊";
        const neutralFace = "😐";
        const sadFace = "😢";
        const catastrophicFace = "😱";
        const weepingFace = "😭";
        let face;
        if (commonInfo.luckFactor > 2) {
          face = ecstaticFace;
        } else if (unfortunateIteration == 0) {
          face = smilingFace;
        } else if (unfortunateIteration == 1) {
          face = neutralFace;
        } else if (unfortunateIteration == 2) {
          face = sadFace;
        } else if (unfortunateIteration == 3) {
          face = catastrophicFace;
        } else {
          face = weepingFace;
        }
        console.log(
          " --[" +
            bar +
            `]-- ${attemptsCompletedFormatted} ETA: ${etaFormatted} SPEED: ${speedFormatted} ITER: ${unfortunateIteration} LUCK: ${(commonInfo.luckFactor * 100).toFixed(1)}% ${face}`,
        );
      } else {
        ctx
          .L()
          .info(
            `Found ${addressesFound.length} addresses, total results: ${this.noResults}`,
          );
        //reset the worker's estimator after finding addresses
        totalCompute = 0;
        estimator = new Estimator(
          computePrefixDifficulty(
            generationParams.vanityAddressPrefix.fullPrefix(),
          ),
        );
        this.agreementToEstimator[rental.agreement.id] = estimator;
        ctx
          .L()
          .info(
            `Resetting estimator for agreement ${rental.agreement.id} with provider ${provider.name}`,
          );
      }
      return addressesFound;
    } catch (error) {
      if (this.stopWorkAC.signal.aborted) {
        ctx.L().info("Work was stopped by user");
        return [];
      }
      ctx.L().error(`Error during profanity_cuda execution: ${error}`);
      throw new Error("Profanity execution failed");
    }
  }

  /**
   * The `onResult` should resolve to `true` if the result is satisfactory and
   * the rental should be returned to the pool, or `false` if the rental should be
   * terminated and a new one should be acquired in it's place.
   * Similarly, the `onError` should resolve to `true` if the error is
   * recoverable and the rental should be returned to the pool, or `false` if
   * the rental should be terminated and a new one should be acquired in it's place.
   *
   * This method will throw if acquiring a rental fails, or if releasing or
   * destroying a rental fails.
   */
  public async runSingleIteration(
    ctx: AppContext,
    generationParams: GenerationParams,
    onResult: OnResultHandler,
    onError: OnErrorHandler,
  ): Promise<void> {
    if (this.stopWorkAC.signal.aborted) {
      ctx.L().info("Work was stopped by user");
      return;
    }
    if (!this.golemNetwork || !this.allocation || !this.rentalPool) {
      ctx
        .L()
        .error(
          "Cannot run command without initialized Golem Network, allocation and rental pool.",
        );
      throw new Error(
        "Golem Network, allocation or rental pool is not initialized",
      );
    }

    let wasSuccess = true;

    const rental = await this.rentalPool.acquire(5_000); // timeout if fail to acquire rental in 5 seconds
    let shouldKeepRental: boolean;
    try {
      const results = await this.runCommand(ctx, rental, generationParams);
      ctx.L().info("Command executed successfully, results:", results);
      shouldKeepRental = await onResult({
        results,
        provider: rental.agreement.provider,
      }).catch((error) => {
        ctx
          .L()
          .warn(
            "Error in onResult handler (defaulting to destroying rental):",
            error,
          );
        return false; // Default to destroying rental on error
      });
    } catch (error) {
      ctx.L().error("Error during command execution:", error);
      wasSuccess = false;
      shouldKeepRental = await onError({
        error: isNativeError(error) ? error : new Error(String(error)),
        provider: rental.agreement.provider,
      }).catch((error) => {
        ctx
          .L()
          .warn(
            "Error in onError handler (defaulting to destroying rental):",
            error,
          );
        return false; // Default to destroying rental on error
      });
    }
    try {
      if (shouldKeepRental) {
        ctx
          .L()
          .info(
            `Keeping rental with provider: ${rental.agreement.provider.name}`,
          );
        await this.rentalPool.release(rental);
      } else {
        ctx
          .L()
          .info(
            `Destroying rental with provider: ${rental.agreement.provider.name}`,
          );
        await this.rentalPool.destroy(rental);
      }
    } catch (error) {
      ctx.L().error("Error during rental release/destroy:", error);
      throw new Error("Rental release/destroy failed");
    }
    if (!wasSuccess) {
      throw new Error(
        "Rental did not complete successfully, check logs for details",
      );
    }
  }

  public async disconnectFromGolemNetwork(ctx: AppContext): Promise<void> {
    if (!this.golemNetwork) {
      ctx.L().warn("Golem Network is not initialized, nothing to disconnect");
      return;
    }

    if (this.allocation) {
      await this.golemNetwork.payment.releaseAllocation(this.allocation);
      ctx.L().info("Released allocation");
    }

    try {
      await this.golemNetwork.disconnect();
      this.golemNetwork.market.events.removeAllListeners();
      ctx.L().info("Disconnected from Golem Network successfully");
      this.golemNetwork = undefined;
    } catch (error) {
      ctx.L().error("Failed to disconnect from Golem Network:", error);
      throw new Error("Disconnection from Golem Network failed");
    }
  }

  public async drainPool(
    ctx: AppContext,
    timeoutSeconds: number = 10,
  ): Promise<void> {
    if (!this.rentalPool) {
      ctx.L().warn("Rental pool is not initialized, nothing to drain");
      return;
    }
    try {
      ctx.L().info("Draining and clearing all rentals from the pool...");
      await withTimeout(this.rentalPool.drainAndClear(), timeoutSeconds * 1000);
      ctx.L().info("All rentals cleared from the pool");
    } catch (error) {
      ctx.L().error("Critical error during pool cleanup:", error);
      throw new Error("Failed to drain rental pool");
    }
  }

  public async stopServices(ctx: AppContext): Promise<void> {
    ctx.L().debug("Stopping services...");
    this.generationResults.stop();
    await this.generationResults.waitForFinish();
    ctx.L().debug("All services stopped...");
  }
}
