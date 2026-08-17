import { Estimator } from "./estimator/estimator";
import { AppContext } from "./app_context";
import { ProofEntryResult } from "./estimator/proof";
import { ResultsService } from "./results_service";
import { EstimatorInfo } from "./estimator/estimator";
import { Problem } from "./lib/db/schema";
import { Reputation } from "./reputation/reputation";
import { NO_BAN_PAY_ALL } from "./temporary_mode";

export interface EstimatorServiceOptions {
  disableMessageLoop?: boolean;
  messageLoopSecs?: number;
  processLoopSecs: number;
  problems: Problem[];
  resultService: ResultsService;
  // When set, per-provider enforcement targets from the ban server take
  // precedence over the local dynamic params (which stay the fallback
  // whenever the ban server has no answer).
  reputation?: Reputation;
}

export interface ReportCostResponse {
  accepted: boolean;
  reason: string;
}

export interface ProviderCurrentEstimate extends EstimatorInfo {
  jobId: string;
  unfortunateIteration: number;
  costPerHour?: number;
}

export interface EstimatorDynamicParams {
  minimumAcceptedSpeed: number;
  minimumAcceptedEfficiency: number;
}

export interface EstimatorSimpleInfo {
  jobId: string;
  currentInfo: EstimatorInfo;
  currentCost: number;
  rental: {
    provider: string;
    agreementId: string;
    status: string;
  } | null;
}

export class EstimatorService {
  private proofQueue: Map<string, ProofEntryResult[]> = new Map();

  private estimators: Map<string, Estimator> = new Map();
  private costs: Map<string, number> = new Map();
  // Per-agreement count of consecutive below-target checks (see the
  // persistence gate in checkIfTerminate).
  private consecutiveFails: Map<string, number> = new Map();
  private totalEstimator: Estimator | null = null;
  private options;
  private ctx;

  private dynamicParams: EstimatorDynamicParams = {
    minimumAcceptedSpeed: parseFloat(process.env.SPEED_LOWER_THRESHOLD || "1"),
    minimumAcceptedEfficiency: parseFloat(
      process.env.EFFICIENCY_LOWER_THRESHOLD || "0.1",
    ),
  };

  constructor(ctx: AppContext, opt: EstimatorServiceOptions) {
    this.ctx = ctx;
    this.options = opt;
  }

  public getDynamicParams(): EstimatorDynamicParams {
    return structuredClone(this.dynamicParams);
  }

  public setDynamicParams(params: EstimatorDynamicParams): void {
    this.dynamicParams = structuredClone(params);
  }

  public allEstimatorsInfo() {
    const estimatorArray: EstimatorSimpleInfo[] = [];
    for (const [jobId, estimator] of this.estimators.entries()) {
      estimatorArray.push({
        jobId: jobId,
        currentInfo: estimator.currentInfo(),
        currentCost: estimator.currentCost,
        rental: null,
      });
    }
    return {
      estimators: estimatorArray,
      totalEstimator: this.totalEstimator
        ? this.totalEstimator.currentInfo()
        : null,
    };
  }

  public totalOnly(): object {
    return {
      totalEstimator: this.totalEstimator
        ? this.totalEstimator.currentInfo()
        : null,
    };
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
    providerId: string,
    providerWalletAddress: string,
    targetDifficulty: number,
  ) {
    if (!this.totalEstimator) {
      this.totalEstimator = new Estimator(
        targetDifficulty,
        "total",
        "provider-total",
      );
    }
    if (!this.estimators.has(jobId)) {
      const est = new Estimator(targetDifficulty, providerName, providerId);
      this.estimators.set(jobId, est);

      const queue: ProofEntryResult[] = [];
      this.proofQueue.set(jobId, queue);
    }
  }

  // public async forceProcess() {
  //   await this.process();
  // }

  public async getCurrentEstimate(
    agreementId: string,
  ): Promise<ProviderCurrentEstimate> {
    await this.process(agreementId); // Ensure processing is done before getting the estimator
    const est = this.estimators.get(agreementId);
    if (!est) {
      throw new Error(`Estimator for job ${agreementId} not found.`);
    }
    const info = est.currentInfo();
    const unfortunateIteration = Math.floor(
      info.attempts / est.estimateAttemptsGivenProbability(0.5),
    );
    return {
      jobId: agreementId,
      ...info,
      costPerHour: info.estimatedSpeed?.costPerHour || 0,
      unfortunateIteration,
    };
  }

  public async process(agreementId: string): Promise<void> {
    const proofQueue = this.proofQueue.get(agreementId);
    this.proofQueue.set(agreementId, []); // Clear the proof queue after processing

    if (!proofQueue) {
      this.ctx.L().error(`No proof queue found for agreement ${agreementId}.`);
      throw new Error(`No proof queue found for agreement ${agreementId}.`);
    }

    const estimator = this.estimators.get(agreementId);
    if (!estimator) {
      this.ctx.L().error(`Estimator for job ${agreementId} not found.`);
      throw Error("Estimator not found for job: " + agreementId);
    }

    let totalWorkThisRun = 0;
    for (const entry of proofQueue) {
      this.totalEstimator?.addProvedWork(
        entry.workDone,
        !!entry.matchingUserProblem,
      );
      estimator.addProvedWork(entry.workDone, !!entry.matchingUserProblem);
      totalWorkThisRun += entry.workDone;
    }
    if (proofQueue.length > 0) {
      this.ctx.info(
        `Provider ${proofQueue[0].provider.name} found ${proofQueue.length} proofs and done: ${totalWorkThisRun} work`,
      );
    }
  }

  public checkIfProviderFailedToDoWork(
    ctx: AppContext,
    jobId: string,
    givenCost: number | null,
  ): boolean {
    return this.checkIfTerminate(ctx, jobId, givenCost) !== null;
  }

  /** Returns a human-readable termination reason (measured value vs target
   *  and the measurement window) when the provider is below its thresholds,
   *  or null when the rental should continue. The reason ends up in the ban
   *  server via Reputation.ban, so keep it self-explanatory. */
  public checkIfTerminate(
    ctx: AppContext,
    jobId: string,
    givenCost: number | null,
  ): string | null {
    if (NO_BAN_PAY_ALL) {
      // temporary_mode: never terminate for performance; this also makes
      // checkIfProviderFailedToDoWork false, so payments always go through
      return null;
    }
    const SPEED_ESTIMATION_TIMEFRAME = parseInt(
      process.env.SPEED_ESTIMATION_TIMEFRAME || "300",
    ); // 5 minutes in seconds
    const estimator = this.estimators.get(jobId);
    if (!estimator) return null;
    // Ban-server targets (per-provider override or fleet-wide global) win;
    // the local dynamic params remain the fail-safe.
    const targets = this.options.reputation?.targetsFor(estimator.providerId);
    const efficiencyLowerThreshold =
      targets?.efficiency ?? this.dynamicParams.minimumAcceptedEfficiency;
    const speedLowerThreshold =
      targets?.speed ?? this.dynamicParams.minimumAcceptedSpeed;

    const info = estimator.currentInfo();
    if (info.cost <= 0) return null;

    const speedEstimation =
      givenCost !== null
        ? estimator.estimatedSpeedGivenCost(
            SPEED_ESTIMATION_TIMEFRAME,
            givenCost,
          )
        : estimator.estimatedSpeed(SPEED_ESTIMATION_TIMEFRAME);

    // efficiency === null means no cost accrued inside the window yet — too
    // early to judge. Note: 0 (cost but zero work) is a valid, judgeable
    // value; the old truthiness check used to skip exactly those providers.
    if (speedEstimation.efficiency === null) return null;

    const problems: string[] = [];
    if (speedEstimation.efficiency < efficiencyLowerThreshold) {
      problems.push(
        `efficiency ${speedEstimation.efficiency.toFixed(4)} < target ${efficiencyLowerThreshold} TH/GLM`,
      );
    }
    if (speedEstimation.speed < speedLowerThreshold) {
      problems.push(
        `speed ${Math.round(speedEstimation.speed)} < target ${speedLowerThreshold} H/s`,
      );
    }
    if (problems.length === 0) {
      this.consecutiveFails.delete(jobId);
      return null;
    }

    const windowSecs = Math.round(
      (speedEstimation.currentTimePoint.getTime() -
        speedEstimation.startTimePoint.getTime()) /
        1000,
    );
    const targetSource = targets ? "ban-server target" : "local threshold";
    const reason = `${problems.join(" and ")} (${targetSource}, measured over ${windowSecs}s)`;

    // Persistence gate: short-window efficiency is noisy (proofs arrive in
    // bursts while debit-note cost arrives smoothly), so a single failing
    // check must not terminate a rental. Only ban when the provider stays
    // below target for several checks in a row; any passing check resets.
    const requiredFails = parseInt(
      process.env.TERMINATE_AFTER_CONSECUTIVE_FAILS || "3",
    );
    const fails = (this.consecutiveFails.get(jobId) ?? 0) + 1;
    this.consecutiveFails.set(jobId, fails);
    if (fails < requiredFails) {
      ctx.info(
        `Provider below target (check ${fails}/${requiredFails}, not terminating yet): ${reason}`,
      );
      return null;
    }
    return `${reason}; ${fails} consecutive failing checks`;
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
    job.addProvedWork(0);

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

  public reportEmpty(jobId: string) {
    const job = this.estimators.get(jobId);
    if (!job) {
      return;
    }
    job.addProvedWork(0);

    this.totalEstimator?.addProvedWork(0);
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
}
