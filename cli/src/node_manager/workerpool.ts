import {
  Activity,
  Agreement,
  Allocation,
  GolemNetwork,
  ResourceRental,
  ResourceRentalPool,
} from "@golem-sdk/golem-js";
import { AppContext } from "./../app_context";
import { GenerationParams } from "./../scheduler";
import { WorkerPoolParams, WorkerType, BaseWorker } from "./types";
import { createWorker } from "./worker";
import { Estimator } from "../estimator";
import { computePrefixDifficulty } from "../difficulty";
import { displayDifficulty, displayTime } from "../utils/format";
import { withTimeout } from "../utils/timeout";

export interface Worker {
  id: string;
  name: string;
  workerImpl: BaseWorker;
  golem: {
    activity: Activity;
    agreement: Agreement;

    paymentsSubscriptions: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invoiceSubscription: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debitNoteSubscription: any;
    };
  };
}

export class WorkerPool {
  private numberOfWorkers: number;
  private rentalDurationSeconds: number;
  private budgetGlm: number;
  private workerType: WorkerType;
  private workerImpl: BaseWorker;
  private golemNetwork?: GolemNetwork;
  private allocation?: Allocation;

  constructor(params: WorkerPoolParams) {
    this.numberOfWorkers = params.numberOfWorkers;
    this.rentalDurationSeconds = params.rentalDurationSeconds;
    this.budgetGlm = params.budgetGlm;
    this.workerType = params.workerType;
    this.workerImpl = createWorker(params.workerType);
  }

  public getNumberOfWorkers(): number {
    return this.numberOfWorkers;
  }

  public async findAndInitializeWorkers(): Promise<void> {}

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
  }

  public async initializeRentalPool(
    ctx: AppContext,
  ): Promise<ResourceRentalPool> {
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

      const pool = await glm.manyOf({
        poolSize: numberOfWorkers,
        order: this.workerImpl.getOrder(
          this.rentalDurationSeconds,
          this.allocation,
        ),
      });
      return pool;
    } catch (error) {
      ctx.L().error("Failed to allocate workers:" + error);
      throw error;
    }
  }

  private async runCommand(
    ctx: AppContext,
    rental: ResourceRental,
    generationParams: GenerationParams,
    worker: BaseWorker,
  ): Promise<void> {
    worker.initEstimator(
      new Estimator(
        computePrefixDifficulty(
          generationParams.vanityAddressPrefix.fullPrefix(),
        ),
      ),
    );

    try {
      // Create ExeUnit from the worker's activity
      const exe = await rental.getExeUnit();

      const provider = exe.provider;

      ctx
        .L()
        .info(
          `Running command on provider: ${provider.name}, type: ${worker.getType()}`,
        );

      // Validate worker capabilities (CPU or GPU specific)
      const _capabilityInfo = await worker.validateCapabilities(exe);
      //ctx.L().info(`Worker capabilities validated: ${capabilityInfo}`);

      let totalCompute = 0;
      // Run profanity_cuda for the specified number of passes
      for (let passNo = 0; passNo < generationParams.numberOfPasses; passNo++) {
        if (ctx.noResults >= generationParams.numResults) {
          ctx
            .L()
            .info(
              `Found ${ctx.noResults} results in previous pass, stopping further passes`,
            );
          break;
        }

        ctx
          .L()
          .info(
            `Running pass ${passNo + 1}/${generationParams.numberOfPasses}`,
          );

        const command = worker.generateCommand(generationParams);
        ctx.L().info(`Executing command: ${command}`);

        await exe.run(command).then(async (res) => {
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
            worker.reportAttempts(totalCompute);
          }

          const stdout = res.stdout ? String(res.stdout) : "";
          //ctx.L().info("Received stdout bytes:", stdout.length);

          let noAddressesFound = 0;
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
                    generationParams.vanityAddressPrefix
                      .fullPrefix()
                      .toLowerCase(),
                  )
                ) {
                  ctx.addGenerationResult({
                    addr,
                    salt,
                    pubKey,
                    provider,
                  });
                  noAddressesFound += 1;
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

          if (noAddressesFound == 0) {
            ctx
              .L()
              .info(
                `Pass ${passNo + 1} computed: ${displayDifficulty(biggestCompute)}`,
              );

            const commonInfo = worker.estimatorInfo();
            const unfortunateIteration = Math.floor(
              commonInfo.attempts /
                worker.estimator().estimateAttemptsGivenProbability(0.5),
            );
            const partial =
              commonInfo.attempts /
                worker.estimator().estimateAttemptsGivenProbability(0.5) -
              unfortunateIteration;
            const speed = commonInfo.estimatedSpeed;
            const eta = commonInfo.remainingTimeSec;
            const etaFormatted = eta !== null ? displayTime("", eta) : "N/A";
            const speedFormatted =
              speed !== null ? displayDifficulty(speed.speed) + "/s" : "N/A";
            const bar = "#".repeat(Math.round(partial * 50)).padEnd(50, " ");
            const attemptsCompleted = commonInfo.attempts;
            const attemptsCompletedFormatted =
              displayDifficulty(attemptsCompleted);

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
                `Pass ${passNo + 1} found ${noAddressesFound} addresses, total results: ${ctx.noResults}`,
              );
            //reset the worker's estimator after finding addresses
            totalCompute = 0;
            worker.initEstimator(
              new Estimator(
                computePrefixDifficulty(
                  generationParams.vanityAddressPrefix.fullPrefix(),
                ),
              ),
            );
          }
        });
      }
    } catch (error) {
      ctx.L().error(`Error during profanity_cuda execution: ${error}`);
      throw new Error("Profanity execution failed");
    }
  }

  public async runCommandConcurrent(
    ctx: AppContext,
    pool: ResourceRentalPool,
    generationParams: GenerationParams,
  ): Promise<void> {
    const numberOfWorkers = this.numberOfWorkers;
    ctx.L().info(`Starting concurrent execution on ${numberOfWorkers} workers`);

    try {
      const workingProviders = new Array(numberOfWorkers).fill(null).map(() =>
        pool.withRental(async (rental) => {
          const worker = createWorker(this.workerType);
          return await this.runCommand(ctx, rental, generationParams, worker);
        }),
      );
      const settledWork = await Promise.allSettled(workingProviders);
      const failedWork = settledWork.filter(
        (result) => result.status === "rejected",
      );
      const successfulWork = settledWork.filter(
        (result) => result.status === "fulfilled",
      );
      console.log(
        `✅ Completed ${successfulWork.length} passes successfully (${failedWork.length} failed)`,
      );
      console.log(`Found ${ctx.noResults} vanity addresses`);
    } catch (error) {
      ctx.L().error("Error during concurrent execution:", error);
      throw new Error("Concurrent execution failed");
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
      ctx.L().info("Disconnected from Golem Network successfully");
      this.golemNetwork = undefined;
    } catch (error) {
      ctx.L().error("Failed to disconnect from Golem Network:", error);
      throw new Error("Disconnection from Golem Network failed");
    }
  }

  public async drainPool(
    ctx: AppContext,
    pool: ResourceRentalPool,
    timeoutSeconds: number = 10,
  ): Promise<void> {
    if (!this.golemNetwork) {
      ctx.L().error("Golem Network is not initialized.");
      throw new Error("Golem Network is not initialized");
    }
    try {
      ctx.L().info("Draining and clearing all rentals from the pool...");
      await withTimeout(pool.drainAndClear(), timeoutSeconds * 1000);
      ctx.L().info("All rentals cleared from the pool");
    } catch (error) {
      ctx.L().error("Critical error during workers cleanup:", error);
      throw new Error("Workers cleanup failed");
    }
  }
}
