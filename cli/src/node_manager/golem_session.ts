import {
  Allocation,
  DraftOfferProposalPool,
  GolemNetwork,
  ProviderInfo,
  ResourceRental,
  ResourceRentalPool,
} from "@golem-sdk/golem-js";
import { AppContext } from "../app_context";
import { GenerationParams } from "../scheduler";
import {
  BaseRentalConfig,
  CPURentalConfig,
  GPURentalConfig,
  ProcessingUnitType,
} from "./config";
import { computePrefixDifficulty } from "../difficulty";
import { withTimeout } from "../utils/timeout";
import { isNativeError } from "util/types";
import { displayUserMessage } from "../cli";
import { EstimatorService } from "../estimator_service";
import { ResultsService } from "../results_service";
import { VanityPaymentModule } from "./payment_module";

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

  estimatorService: EstimatorService;

  resultService: ResultsService;
}

// Callbacks for `runSingleIteration` method
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
  private _estimatorService: EstimatorService;
  private _resultService: ResultsService;
  private stopWorkAC: AbortController = new AbortController();

  constructor(params: SessionManagerParams) {
    this.numberOfWorkers = params.numberOfWorkers;
    this.rentalDurationSeconds = params.rentalDurationSeconds;
    this.budgetGlm = params.budgetGlm;
    this.processingUnitType = params.processingUnitType;
    this._estimatorService = params.estimatorService;
    this._resultService = params.resultService;
  }

  public get estimatorService(): EstimatorService {
    return this._estimatorService;
  }
  public get resultService(): ResultsService {
    return this._resultService;
  }

  public get noResults(): number {
    return this.resultService.numberOfResults;
  }

  public async connectToGolemNetwork(ctx: AppContext): Promise<void> {
    VanityPaymentModule.estimatorService = this._estimatorService;
    VanityPaymentModule.ctx = ctx;
    this.golemNetwork = new GolemNetwork({
      logger: ctx.L(),
      override: {
        payment: VanityPaymentModule,
      },
    });
    try {
      await this.golemNetwork.connect();
      ctx.L().info("Connected to Golem Network successfully");
    } catch (error) {
      ctx.L().error("Failed to connect to Golem Network:", error);
      throw new Error("Connection to Golem Network failed");
    }
    this.golemNetwork.market.events.on("agreementApproved", ({ agreement }) => {
      displayUserMessage(
        `📃 Signed an agreement with ${agreement.provider.name}`,
      );
    });
    this.golemNetwork.market.events.on(
      "agreementTerminated",
      ({ agreement }) => {
        displayUserMessage(
          `🗑️ Terminated agreement with ${agreement.provider.name}`,
        );
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

    this.golemNetwork.payment.events.on(
      "allocationCreated",
      ({ allocation }) => {
        console.log(
          "Allocation created with budget:",
          Number(allocation.remainingAmount).toFixed(2),
        );
      },
    );

    const glm = this.golemNetwork;
    const rentalDurationWithPaymentsSeconds = this.rentalDurationSeconds + 360;

    try {
      this.allocation = await glm.payment.createAllocation({
        budget: this.budgetGlm,
        expirationSec: Math.round(rentalDurationWithPaymentsSeconds),
        paymentPlatform: "erc20-polygon-glm",
      });

      this.rentalPool = await glm.manyOf({
        poolSize: {
          min: 0,
          max: 100,
        }, //unused in our case, we are managing pool size manually
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
  ): Promise<void> {
    const config = this.getConfigBasedOnProcessingUnitType();

    const agreementId = rental.agreement.id;

    //displayUserMessage(`Started work on agreement ID: ${agreementId}`);
    await this.estimatorService.initJobIfNotInitialized(
      agreementId,
      rental.agreement.provider.name,
      computePrefixDifficulty(
        generationParams.vanityAddressPrefix.fullPrefix(),
      ),
    );

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

      /* Uncomment this to simulate random execution time
      const simulateRandomExecutionTime = true;

      if (simulateRandomExecutionTime) {
        generationParams.singlePassSeconds = Math.floor(
          20 + 100 * Math.random(),
        );
      }
      */
      const command = config.generateCommand(generationParams);
      ctx.L().info(`Executing command: ${command}`);

      const res = await exe.run(command, {
        signalOrTimeout: this.stopWorkAC.signal,
      });

      /* Uncomment this code to parse reported compute stats
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

       */
      const stdout = res.stdout ? String(res.stdout) : "";

      for (let line of stdout.split("\n")) {
        try {
          line = line.trim();
          if (line.startsWith("0x")) {
            const salt = line.split(",")[0].trim();
            const addr = line.split(",")[1].trim();
            const pubKey = line.split(",")[2].trim();

            ctx.L().debug("Found address:", addr);

            this.estimatorService.pushProofToQueue({
              addr,
              salt,
              pubKey,
              provider,
              jobId: agreementId,
              cpu: this.processingUnitType,
            });
          }
        } catch (e) {
          ctx.L().error(`Error parsing result line: ${e}`);
        }
      }
    } catch (error) {
      if (this.stopWorkAC.signal.aborted) {
        ctx.L().info("Work was stopped by user");
        return;
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
    const providerName = rental.agreement.provider.name;

    let shouldKeepRental: boolean;
    try {
      /*console.log(
        `🔨 Acquired provider ${providerName} from the pool, running the generation command on them ...`,
      );*/
      await this.runCommand(ctx, rental, generationParams);

      if (this.isWorkStopped()) {
        ctx.L().info("Work was stopped by user, not processing results");
        await this.rentalPool.release(rental);
        return;
      }

      ctx.L().info("Command finished successfully");
      shouldKeepRental = true;
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
        /*console.log(
          `💡 Provider ${providerName} ran the command successfully, returning them to the pool of available workers`,
        );*/
        await this.rentalPool.release(rental);
      } else {
        ctx
          .L()
          .info(
            `Destroying rental with provider: ${rental.agreement.provider.name}`,
          );
        console.log(
          `💔 Provider ${providerName} did not run the command successfully, destroying the rental`,
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
    this.estimatorService.stop();
    await this.estimatorService.waitForFinish();
    ctx.L().debug("All services stopped...");
  }
}
