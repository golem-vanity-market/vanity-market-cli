import {
  Activity,
  Agreement,
  Allocation,
  GolemNetwork,
  OfferProposal,
} from "@golem-sdk/golem-js";
import { AppContext } from "./app_context";
import { filter, map, switchMap, take } from "rxjs";
import { GenerationResults, GenerationParams } from "./scheduler";
import { WorkerPoolParams, WorkerType, BaseWorker } from "./node_manager/types";
import { createWorker } from "./node_manager/worker";

export interface Worker {
  id: string;
  name: string;
  workerImpl: BaseWorker;
  golem: {
    activity: Activity;
    aggreement: Agreement;

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
    this.golemNetwork = new GolemNetwork();
    try {
      await this.golemNetwork.connect();
      ctx.L().info("Connected to Golem Network successfully");
    } catch (error) {
      ctx.L().error("Failed to connect to Golem Network:", error);
      throw new Error("Connection to Golem Network failed");
    }
  }

  public async getWorkers(ctx: AppContext): Promise<Worker[]> {
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
    const workers: Worker[] = [];
    const numberOfWorkers = this.numberOfWorkers;

    try {
      this.allocation = await glm.payment.createAllocation({
        budget: this.budgetGlm,
        expirationSec: Math.round(rentalDurationWithPaymentsSeconds),
        paymentPlatform: "erc20-polygon-glm",
      });

      const allocation = this.allocation;

      const order = this.workerImpl.getOrder(
        this.rentalDurationSeconds,
        this.allocation,
      );

      // Convert the human-readable order to a protocol-level format that we will publish on the network
      const demandSpecification = await glm.market.buildDemandDetails(
        order.demand,
        order.market,
        this.allocation,
      );

      // Publish the order on the market
      const demand$ = glm.market.publishAndRefreshDemand(demandSpecification);

      // Now, for each created demand, let's listen to proposals from providers
      const offerProposal$ = demand$.pipe(
        switchMap((demand) => glm.market.collectMarketProposalEvents(demand)),
        filter((event) => event.type === "ProposalReceived"),
        map((event) => {
          console.log(
            "Received proposal from provider",
            event.proposal.provider.name,
          );
          return event.proposal;
        }),
      );

      const draftProposals: OfferProposal[] = [];
      const offerProposalsSubscription = offerProposal$.subscribe(
        (offerProposal) => {
          if (offerProposal.isInitial()) {
            glm.market
              .negotiateProposal(offerProposal, demandSpecification)
              .catch(console.error);
          } else if (offerProposal.isDraft()) {
            draftProposals.push(offerProposal);
          }
        },
      );

      // Wait for the required number of proposals
      while (draftProposals.length < numberOfWorkers) {
        console.log(
          `Waiting for proposals... (${draftProposals.length}/${numberOfWorkers})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      offerProposalsSubscription.unsubscribe();

      // Create workers from the collected proposals
      for (let i = 0; i < numberOfWorkers; i++) {
        const draftProposal = draftProposals[i];
        const agreement = await glm.market.proposeAgreement(draftProposal);
        console.log(
          `Agreement ${i + 1} signed with provider`,
          agreement.provider.name,
        );

        const activity = await glm.activity.createActivity(agreement);

        // Setup payment subscriptions for this worker
        const invoiceSubscription = glm.payment
          .observeInvoices()
          .pipe(
            filter((invoice) => invoice.agreementId === agreement.id),
            take(1),
          )
          .subscribe((invoice) => {
            console.log(
              "Received invoice for ",
              invoice.getPreciseAmount().toFixed(4),
              "GLM",
            );
            glm.payment
              .acceptInvoice(invoice, allocation, invoice.amount)
              .catch(console.error);
          });

        const debitNoteSubscription = glm.payment
          .observeDebitNotes()
          .pipe(filter((debitNote) => debitNote.agreementId === agreement.id))
          .subscribe((debitNote) => {
            console.log(
              "Received debit note for ",
              debitNote.getPreciseAmount().toFixed(4),
              "GLM",
            );
            glm.payment
              .acceptDebitNote(debitNote, allocation, debitNote.totalAmountDue)
              .catch(console.error);
          });

        workers.push({
          id: agreement.id,
          name: `worker ${i}: ${agreement.provider.name}`,
          workerImpl: createWorker(this.workerType),
          golem: {
            activity,
            aggreement: agreement,
            paymentsSubscriptions: {
              invoiceSubscription,
              debitNoteSubscription,
            },
          },
        });
      }

      return workers;
    } catch (error) {
      ctx.L().error("Failed to allocate workers:" + error);
      throw new Error("Worker allocation failed");
    }
  }

  public async runCommand(
    ctx: AppContext,
    worker: Worker,
    generationParams: GenerationParams,
  ): Promise<GenerationResults> {
    if (!this.golemNetwork) {
      ctx.L().error("Golem Network is not initialized.");
      throw new Error("Golem Network is not initialized");
    }

    const generationResults: GenerationResults = {
      entries: [],
    };

    try {
      // Create ExeUnit from the worker's activity
      const exe = await this.golemNetwork.activity.createExeUnit(
        worker.golem.activity,
      );

      // Set up profanity_cuda executable permissions
      await exe.run("chmod +x /usr/local/bin/profanity_cuda").then((res) => {
        ctx.L().info("Set profanity_cuda permissions:", res);
      });

      // Validate worker capabilities (CPU or GPU specific)
      const capabilityInfo = await worker.workerImpl.validateCapabilities(exe);
      ctx.L().info(`Worker capabilities validated: ${capabilityInfo}`);

      ctx
        .L()
        .info("Prefix value:", generationParams.vanityAddressPrefix.toArg());

      // Run profanity_cuda for the specified number of passes
      for (let passNo = 0; passNo < generationParams.numberOfPasses; passNo++) {
        if (generationResults.entries.length > 0) {
          ctx
            .L()
            .info("Found addresses in previous pass, stopping further passes");
          break;
        }

        ctx
          .L()
          .info(
            `Running pass ${passNo + 1}/${generationParams.numberOfPasses}`,
          );

        const command = worker.workerImpl.generateCommand(generationParams);
        ctx.L().info(`Executing command: ${command}`);

        await exe.run(command).then(async (res) => {
          let biggestCompute = 0;
          // @ts-expect-error descr
          for (const line of res.stderr.split("\n")) {
            ctx.L().info(line);
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
            ctx
              .L()
              .info(
                `Pass ${passNo + 1} compute performance: ${(biggestCompute / 1e9).toFixed(2)} GH/s`,
              );
          }

          const stdout = res.stdout ? String(res.stdout) : "";
          ctx.L().info("Received stdout bytes:", stdout.length);

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
                  generationResults.entries.push({
                    addr,
                    salt,
                    pubKey,
                  });
                  ctx
                    .L()
                    .info(
                      "Found address:",
                      addr,
                      "with salt:",
                      salt,
                      "public address:",
                      pubKey,
                      "prefix:",
                      generationParams.vanityAddressPrefix.toHex(),
                    );
                }
              }
            } catch (e) {
              ctx.L().error("Error parsing result line:", e);
            }
          }
        });
      }

      return generationResults;
    } catch (error) {
      ctx.L().error("Error during profanity_cuda execution:", error);
      throw new Error("Profanity execution failed");
    }
  }

  public async runCommandConcurrent(
    ctx: AppContext,
    workers: Worker[],
    generationParams: GenerationParams,
  ): Promise<GenerationResults> {
    ctx.L().info(`Starting concurrent execution on ${workers.length} workers`);

    const aggregatedResults: GenerationResults = {
      entries: [],
    };

    try {
      // Execute runCommand concurrently on all workers
      const promises = workers.map(async (worker, index) => {
        ctx.L().info(`Starting worker ${index + 1}/${workers.length}`);
        try {
          const result = await this.runCommand(ctx, worker, generationParams);
          ctx
            .L()
            .info(
              `Worker ${index + 1} completed with ${result.entries.length} results`,
            );
          return result;
        } catch (error) {
          ctx.L().error(`Worker ${index + 1} failed:`, error);
          return { entries: [] } as GenerationResults;
        }
      });

      // Wait for all workers to complete
      const results = await Promise.all(promises);

      // Aggregate results from all workers
      for (const result of results) {
        aggregatedResults.entries.push(...result.entries);
      }

      ctx
        .L()
        .info(
          `Concurrent execution completed. Total results: ${aggregatedResults.entries.length}`,
        );
      return aggregatedResults;
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
      console.log("Released allocation");
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

  public async closeWorkers(ctx: AppContext, workers: Worker[]): Promise<void> {
    if (!this.golemNetwork) {
      ctx.L().error("Golem Network is not initialized.");
      throw new Error("Golem Network is not initialized");
    }

    if (workers.length === 0) {
      ctx.L().info("No workers to close");
      return;
    }

    ctx.L().info(`Starting cleanup of ${workers.length} workers`);
    const errors: Error[] = [];

    try {
      // Phase 1: Destroy all activities
      ctx.L().info("Phase 1: Destroying activities");
      const activityResults = await Promise.allSettled(
        workers.map(async (worker, index) => {
          try {
            await this.golemNetwork!.activity.destroyActivity(
              worker.golem.activity,
            );
            ctx
              .L()
              .info(`Activity destroyed for worker ${index} ${worker.name}`);
          } catch (error) {
            ctx
              .L()
              .error(
                `Failed to destroy activity for worker ${index} ${worker.name}:`,
                error,
              );
            throw error;
          }
        }),
      );

      // Collect phase 1 errors
      activityResults.forEach((result, index) => {
        if (result.status === "rejected") {
          errors.push(
            new Error(
              `Worker ${index} (${workers[index].name}) activity cleanup failed: ${result.reason}`,
            ),
          );
        }
      });

      // Phase 2: Terminate all agreements
      ctx.L().info("Phase 2: Terminating agreements");
      const agreementResults = await Promise.allSettled(
        workers.map(async (worker, index) => {
          try {
            await this.golemNetwork!.market.terminateAgreement(
              worker.golem.aggreement,
            );
            ctx
              .L()
              .info(
                `Agreement terminated for worker ${index} - ${worker.name}`,
              );
          } catch (error) {
            ctx
              .L()
              .error(
                `Failed to terminate agreement for worker ${index} - ${worker.name}:`,
                error,
              );
            throw error;
          }
        }),
      );

      // Collect phase 2 errors
      agreementResults.forEach((result, index) => {
        if (result.status === "rejected") {
          errors.push(
            new Error(
              `Worker ${index} (${workers[index].name}) agreement cleanup failed: ${result.reason}`,
            ),
          );
        }
      });

      // Wait for final invoice and debit note processing
      ctx.L().info("Waiting for payment processing...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Phase 3: Unsubscribe from payment subscriptions
      ctx.L().info("Phase 3: Unsubscribing payment subscriptions");
      const subscriptionResults = await Promise.allSettled(
        workers.map(async (worker, index) => {
          try {
            worker.golem.paymentsSubscriptions.invoiceSubscription.unsubscribe();
            worker.golem.paymentsSubscriptions.debitNoteSubscription.unsubscribe();
            ctx
              .L()
              .info(
                `Payment subscriptions unsubscribed for worker ${index} ${worker.name}`,
              );
          } catch (error) {
            ctx
              .L()
              .error(
                `Failed to unsubscribe payments for worker ${index} ${worker.name}:`,
                error,
              );
            throw error;
          }
        }),
      );

      // Collect phase 3 errors
      subscriptionResults.forEach((result, index) => {
        if (result.status === "rejected") {
          errors.push(
            new Error(
              `Worker ${index} (${workers[index].name}) subscription cleanup failed: ${result.reason}`,
            ),
          );
        }
      });

      // Report results
      const successfulCleanups = workers.length * 4 - errors.length;
      const totalOperations = workers.length * 4;
      ctx
        .L()
        .info(
          `Cleanup completed: ${successfulCleanups}/${totalOperations} operations successful`,
        );

      if (errors.length > 0) {
        ctx.L().error(`${errors.length} cleanup operations failed`);
        errors.forEach((error, index) => {
          ctx.L().error(`Error ${index + 1}: ${error.message}`);
        });
        throw new Error(
          `Worker cleanup partially failed: ${errors.length}/${totalOperations} operations failed`,
        );
      }
    } catch (error) {
      ctx.L().error("Critical error during workers cleanup:", error);
      throw new Error("Workers cleanup failed");
    }
  }

  public async closeWorker(ctx: AppContext, worker: Worker): Promise<void> {
    if (!this.golemNetwork) {
      ctx.L().error("Golem Network is not initialized.");
      throw new Error("Golem Network is not initialized");
    }

    try {
      // Destroy the activity first
      await this.golemNetwork.activity.destroyActivity(worker.golem.activity);
      ctx.L().info("Activity destroyed for worker");

      // Terminate the agreement
      await this.golemNetwork.market.terminateAgreement(
        worker.golem.aggreement,
      );
      ctx.L().info("Agreement terminated for worker");

      // Wait a bit for final invoice and debit note processing
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Unsubscribe from payment subscriptions
      worker.golem.paymentsSubscriptions.invoiceSubscription.unsubscribe();
      worker.golem.paymentsSubscriptions.debitNoteSubscription.unsubscribe();
      ctx.L().info("Payment subscriptions unsubscribed for worker");

      ctx.L().info("Allocation released for worker");
    } catch (error) {
      ctx.L().error("Error during worker cleanup:", error);
      // Still try to release allocation even if other cleanup failed
      throw new Error("Worker cleanup failed");
    }
  }
}
