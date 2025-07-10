import { Estimator } from "./estimator/estimator";
import { GenerationPrefix } from "./params";
import { ProcessingUnitType } from "./node_manager/config";
import { computePrefixDifficulty } from "./difficulty";
import { AppContext } from "./app_context";
import { ProofEntryResult } from "./estimator/proof";
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

export interface ProviderCurrentEstimate {
  jobId: string;
  name: string;
  estimatedSpeed: number;
  totalSuccesses: number;
  remainingTimeSec: number;
  unfortunateIteration: number; // Number of iterations that were not successful
}

export class EstimatorService {
  private proofQueue: Map<string, ProofEntryResult[]> = new Map();

  private savedProofs: Map<string, null> = new Map();
  private isStopping = false;
  private isFinished = false;

  private estimators: Map<string, Estimator> = new Map();
  private costs: Map<string, number> = new Map();
  private totalEstimator: Estimator | null = null;
  private options;
  private ctx;

  constructor(ctx: AppContext, opt: EstimatorServiceOptions) {
    this.ctx = ctx;
    this.options = opt;
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

      const queue: ProofEntryResult[] = [];
      this.proofQueue.set(jobId, queue);
    }
  }

  // public async forceProcess() {
  //   await this.process();
  // }

  public async getCurrentEstimate(
    jobId: string,
  ): Promise<ProviderCurrentEstimate> {
    await this.process(jobId); // Ensure processing is done before getting the estimator
    const est = this.estimators.get(jobId);
    if (!est) {
      throw new Error(`Estimator for job ${jobId} not found.`);
    }
    const info = est.currentInfo();
    const unfortunateIteration = Math.floor(
      info.attempts / est.estimateAttemptsGivenProbability(0.5),
    );
    return {
      jobId,
      name: info.provName || "Unknown",
      estimatedSpeed: info.estimatedSpeed?.speed || 0,
      totalSuccesses: info.totalSuccesses || 0,
      remainingTimeSec: info.remainingTimeSec || 0,
      unfortunateIteration,
    };
  }

  public async process(jobId: string): Promise<void> {
    const proofQueue = this.proofQueue.get(jobId);
    this.proofQueue.set(jobId, []); // Clear the proof queue after processing

    if (!proofQueue) {
      this.ctx.L().error(`No proof queue found for job ${jobId}.`);
      throw new Error(`No proof queue found for job ${jobId}.`);
    }

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

  private get messageLoopSecs(): number {
    return this.options.messageLoopSecs || 30.0;
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
    const jId = result.jobId;
    const queue = this.proofQueue.get(jId);
    if (!queue) {
      this.ctx.L().error(`No proof queue found for job ${jId}.`);
      throw new Error(`No proof queue found for job ${jId}.`);
    }
    queue.push(result);
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
