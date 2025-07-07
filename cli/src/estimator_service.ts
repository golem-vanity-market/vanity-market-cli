import { sleep } from "@golem-sdk/golem-js";
import { Estimator } from "./estimator";
import { GenerationPrefix } from "./prefix";
import { ProcessingUnitType } from "./node_manager/config";
import { displayDifficulty } from "./utils/format";
import { computePrefixDifficulty } from "./difficulty";
import { AppContext } from "./app_context";
import { displaySummary, displayTotalSummary } from "./ui/displaySummary";
import { ProofEntryResult } from "./model/proof";
import { validateProof } from "./validator";
import { ResultsService } from "./results_service";

export interface EstimatorServiceOptions {
  disableMessageLoop?: boolean;
  messageLoopSecs?: number;
  processLoopSecs: number;
  vanityPrefix: GenerationPrefix; // Optional vanity prefix
  resultService: ResultsService;
}

export interface ReportCostResponse {
  accepted: boolean;
  reason: string;
}

export class EstimatorService {
  private proofQueue: ProofEntryResult[] = [];

  private savedProofs: Map<string, null> = new Map();
  private isStopping = false;
  private isFinished = false;

  private estimators: Map<string, Estimator> = new Map();
  private costs: Map<string, number> = new Map();
  private totalEstimator: Estimator | null = null;
  private options;
  private ctx;
  private messageLoop;
  private processLoop;

  constructor(ctx: AppContext, opt: EstimatorServiceOptions) {
    this.ctx = ctx;
    this.options = opt;
    this.processLoop = this.runProcessLoop();
    this.messageLoop = this.runMessageLoop();
  }

  public getEstimator(jobId: string): Estimator {
    const job = this.estimators.get(jobId);
    if (!job) {
      throw new Error(`Estimator for job ${jobId} not found.`);
    }
    return job;
  }

  public async initJobIfNotInitialized(
    jobId: string,
    providerName: string,
    diff: number,
  ) {
    if (!this.totalEstimator) {
      this.totalEstimator = new Estimator(diff, "total");
    }
    if (!this.estimators.has(jobId)) {
      const est = new Estimator(diff, providerName);
      this.estimators.set(jobId, est);
    }
  }

  public async forceProcess() {
    await this.process();
  }

  private async process(): Promise<void> {
    const proofQueue = this.proofQueue;
    this.proofQueue = []; // Clear the proof queue after processing
    for (const entry of proofQueue) {
      if (await validateProof(entry)) {
        let prover: string = "N/A";

        if (entry.cpu == ProcessingUnitType.GPU) {
          prover = this.options.vanityPrefix.toHex().slice(0, 10);
        } else if (entry.cpu == ProcessingUnitType.CPU) {
          prover = this.options.vanityPrefix.toHex().slice(0, 8);
        } else {
          this.ctx.L().error(`Unsupported worker type: ${entry.cpu}`);
        }

        const estimator = this.estimators.get(entry.jobId);
        if (!estimator) {
          this.ctx.L().error(`Estimator for job ${entry.jobId} not found.`);
          throw "Estimator not found for job: " + entry.jobId;
        }
        const proverDifficulty = computePrefixDifficulty(prover);

        await this.options.resultService.processValidatedEntry(
          entry,
          (jobId: string, address: string, addrDifficulty: number) => {
            this.ctx.consoleInfo(
              `Found address: ${entry.jobId}: ${entry.addr} diff: ${displayDifficulty(addrDifficulty)}`,
            );
          },
        );

        if (entry.addr.startsWith(this.options.vanityPrefix.fullPrefix())) {
          this.totalEstimator?.addProvedWork(proverDifficulty, true);
          estimator.addProvedWork(proverDifficulty, true);
        } else if (entry.addr.startsWith(prover)) {
          /*displayUserMessage(
            `Adding proof: ${entry.jobId}: ${entry.addr} diff: ${displayDifficulty(proverDifficulty)}`,
          );*/
          this.totalEstimator?.addProvedWork(proverDifficulty);
          estimator.addProvedWork(proverDifficulty);
        } else {
          // empty address
        }
        if (this.savedProofs.has(entry.addr.toLowerCase())) {
          this.ctx
            .L()
            .warn(
              `Duplicate proof entry found for address: ${entry.addr.toLowerCase()}`,
            );
          continue; // Skip duplicate entries
        }
        this.savedProofs.set(entry.addr.toLowerCase(), null);
      } else {
        console.warn("Invalid proof entry, skipping:", entry);
      }
    }
  }
  private async runProcessLoop(): Promise<void> {
    while (true) {
      // Process the inQueue entries before checking the stop condition
      await this.process();
      if (this.isStopping) {
        break;
      }
      await sleep(this.options.processLoopSecs);
    }
  }

  private get messageLoopSecs(): number {
    return this.options.messageLoopSecs || 30.0;
  }

  private async runMessageLoop(): Promise<void> {
    if (this.options.disableMessageLoop) {
      return;
    }
    while (true) {
      if (this.isStopping) {
        break;
      }
      if (this.totalEstimator) {
        displaySummary(this.estimators);
        this.ctx.consoleInfo("---------------------------");
        displayTotalSummary(this.totalEstimator);
      }
      await sleep(this.messageLoopSecs);
    }
  }

  public reportCosts(jobId: string, cost: number): ReportCostResponse {
    const job = this.estimators.get(jobId);
    if (!job) {
      return {
        accepted: false,
        reason: `Estimator for job ${jobId} not found.`,
      };
    }
    if (job.currentInfo().attempts == 0) {
      return {
        accepted: false,
        reason: `No work made for job ${jobId}.`,
      };
    }
    job.setCurrentCost(cost);

    let totalCost = 0;
    for (const estimator of this.estimators.values()) {
      totalCost += estimator.currentCost;
    }
    this.totalEstimator?.setCurrentCost(totalCost);
    return {
      accepted: true,
      reason: `Cost for job ${jobId} accepted: ${cost} GLM.`,
    };
  }

  public pushProofToQueue(result: ProofEntryResult): boolean {
    if (this.isStopping) {
      return false;
    }
    this.proofQueue.push(result);
    return true;
  }

  stop(): void {
    this.isStopping = true;
    this.ctx.L().debug("Requesting stop of result service");
  }

  async waitForFinish(): Promise<void> {
    await this.messageLoop;
    await this.processLoop;
    this.ctx.L().debug("Result service finished");
  }
}
