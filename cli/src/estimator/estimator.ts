import { displayDifficulty, displayTime } from "../utils/format";

export interface EstimatorInfo {
  workDone: number;
  totalSuccesses: number;
  luckFactor: number;
  probabilityFactor: number;
  remainingTimeSec: number | null;
  estimatedSpeed5m: SpeedEstimation;
  estimatedSpeed10m: SpeedEstimation;
  estimatedSpeed20m: SpeedEstimation;
  estimatedSpeed1h: SpeedEstimation;
  estimatedSpeed1y: SpeedEstimation;
  providerName: string;
  providerId: string;
  cost: number;
  lastUpdated: Date;
  totalEfficiency: number | null;
  stopping?: boolean;
}

export function formatEstimatorInfo(info: EstimatorInfo): string {
  const workDoneStr = displayDifficulty(info.workDone);
  const probFactorStr = (info.probabilityFactor * 100).toFixed(1) + "%";
  const remainingTime =
    info.remainingTimeSec !== null
      ? displayTime("", info.remainingTimeSec)
      : "N/A";
  const estimatedSpeed =
    info.estimatedSpeed1h !== null
      ? displayDifficulty(info.estimatedSpeed1h.speed) + "/s"
      : "N/A";

  return `Work Done: ${workDoneStr} | Prob ${probFactorStr} | Rem. Time: ${remainingTime} | Speed: ${estimatedSpeed}`;
}

interface EstimatorHistoryEntry {
  timePoint: Date;
  totalWorkDone: number;
  successes: number;
  cost: number;
}

export class SpeedEstimation {
  currentTimePoint: Date;
  startTimePoint: Date;
  currentWork: number;
  startWork: number;
  currentCost: number;
  startCost: number;
  efficiency: number | null;
  speed: number; // H/s
  costPerHour: number;

  constructor(
    currentTimePoint: Date,
    startTimePoint: Date,
    currentWork: number,
    startWork: number,
    currentCost: number = 0,
    startCost: number = 0,
    efficiency: number | null = null,
  ) {
    this.currentTimePoint = currentTimePoint;
    this.startTimePoint = startTimePoint;
    this.currentWork = currentWork;
    this.startWork = startWork;
    this.currentCost = currentCost;
    this.startCost = startCost;
    this.efficiency = efficiency;
    this.speed = this._speed();
    this.costPerHour = this._costPerHour();
  }

  /* Calculates speed in hashes per second (H/s) */
  _speed(): number {
    const timeDiffMs =
      this.currentTimePoint.getTime() - this.startTimePoint.getTime();
    if (timeDiffMs <= 0) {
      return 0;
    }
    const workDiff = this.currentWork - this.startWork;
    return workDiff / (timeDiffMs / 1000);
  }

  _costPerHour(): number {
    const timeDiffMs =
      this.currentTimePoint.getTime() - this.startTimePoint.getTime();
    if (timeDiffMs <= 0) {
      return 0;
    }
    const costDiff = this.currentCost - this.startCost;
    return costDiff / (timeDiffMs / 3600000);
  }
}

const MAX_HISTORY_SIZE = 1000;
const HISTORY_TRUNCATE_AT_ONCE = 100;

export class Estimator {
  uploadUid: string | null = null; // Optional upload UID for tracking
  targetDifficulty: number;
  workDoneSinceLastSuccess: number = 0;
  totalWorkDone: number = 0;
  totalSuccesses: number = 0;
  providerName: string;
  providerId: string;
  currentCost: number = 0;
  stopping: boolean = false;
  private _entries: EstimatorHistoryEntry[] = [];

  constructor(targetDifficulty: number, provName: string, providerId: string) {
    this.targetDifficulty = targetDifficulty;
    this.providerName = provName;
    this.providerId = providerId;
    this.addProvedWork(0);
  }

  private _appendEntry(entry: EstimatorHistoryEntry) {
    this._entries.push(entry);
    if (this._entries.length > MAX_HISTORY_SIZE) {
      this._entries.splice(1, HISTORY_TRUNCATE_AT_ONCE); // Keep the history size manageable, but keep the oldest entry
    }
  }

  private _getOldestRecentEntry(maxAgeSec: number): EstimatorHistoryEntry {
    if (this._entries.length === 0) {
      return { timePoint: new Date(), totalWorkDone: 0, successes: 0, cost: 0 };
    }
    const newestTime =
      this._entries[this._entries.length - 1].timePoint.getTime();
    const cutoff = newestTime - maxAgeSec * 1000;

    // Find the first entry that is more recent than the cutoff time
    const foundEntry = this._entries.find(
      (entry) => entry.timePoint.getTime() >= cutoff,
    );
    return foundEntry || this._entries[this._entries.length - 1];
  }

  private _findNewestUsableEntry(): EstimatorHistoryEntry {
    return this._entries[this._entries.length - 1];
  }

  private _lastUpdated(): Date {
    if (this._entries.length === 0) {
      return new Date(0);
    }
    return this._findNewestUsableEntry().timePoint;
  }

  public setCurrentCost(cost: number) {
    this.currentCost = cost;
  }

  public addProvedWork(difficultySum: number, isSuccess: boolean = false) {
    if (isSuccess) {
      this.workDoneSinceLastSuccess = 0; // Reset work for the next target
      this.totalSuccesses += 1;
    } else {
      this.workDoneSinceLastSuccess += difficultySum;
    }

    this.totalWorkDone += difficultySum;

    this._appendEntry({
      timePoint: new Date(),
      totalWorkDone: this.totalWorkDone,
      successes: this.totalSuccesses,
      cost: this.currentCost,
    });
  }

  /**
   * Calculates the hashrate over a given recent time frame, assuming a given cost at the end.
   */
  public estimatedSpeedGivenCost(
    timeFrameSecs: number,
    givenCost: number,
  ): SpeedEstimation {
    const entryOld = this._getOldestRecentEntry(timeFrameSecs);
    const entryNew = this._findNewestUsableEntry();

    let efficiency = null;
    if (givenCost > entryOld.cost) {
      const workDiff = entryNew.totalWorkDone - entryOld.totalWorkDone;
      const costDiff = givenCost - entryOld.cost;
      efficiency = workDiff / costDiff / 1e12; // Efficiency in TH/GLM
    }

    return new SpeedEstimation(
      new Date(entryNew.timePoint),
      new Date(entryOld.timePoint),
      entryNew.totalWorkDone,
      entryOld.totalWorkDone,
      givenCost,
      entryOld.cost,
      efficiency,
    );
  }

  /**
   * Calculates the hashrate over a given recent time frame.
   */
  public estimatedSpeed(timeFrameSecs: number): SpeedEstimation {
    const entryOld = this._getOldestRecentEntry(timeFrameSecs);
    const entryNew = this._findNewestUsableEntry();

    let efficiency = null;
    if (entryNew.cost > entryOld.cost) {
      const workDiff = entryNew.totalWorkDone - entryOld.totalWorkDone;
      const costDiff = entryNew.cost - entryOld.cost;
      efficiency = workDiff / costDiff / 1e12; // Efficiency in TH/GLM
    }

    return new SpeedEstimation(
      new Date(entryNew.timePoint),
      new Date(entryOld.timePoint),
      entryNew.totalWorkDone,
      entryOld.totalWorkDone,
      entryNew.cost,
      entryOld.cost,
      efficiency,
    );
  }

  /**
   * Estimates the probability of finding a solution given a certain amount of work.
   * Uses the formula P = 1 - e^(-W/D) for accuracy.
   */
  public estimateProbability(workDone: number): number {
    if (workDone <= 0 || this.targetDifficulty <= 0) {
      return 0;
    }
    return 1 - Math.exp(-workDone / this.targetDifficulty);
  }

  /**
   * Estimates the remaining time to find a solution based on recent hashrate.
   * @returns Remaining time in seconds, or null if speed is zero.
   */
  public estimateTime(): number | null {
    const speedEstimation = this.estimatedSpeed(600);
    if (speedEstimation === null || speedEstimation.speed <= 0) {
      return null;
    }
    const remainingWork = this.targetDifficulty - this.workDoneSinceLastSuccess;
    if (remainingWork <= 0) {
      return 0;
    }
    return remainingWork / speedEstimation.speed;
  }

  /**
   * Calculates how "lucky" the current run is.
   * Values < 100% mean lucky, > 100% mean unlucky.
   */
  public luckFactor(workDone: number): number {
    if (workDone <= 0) {
      return 0; // Not started yet
    }
    const probability = this.estimateProbability(workDone);
    if (probability === 1) return Number.POSITIVE_INFINITY;
    // Expected work for this probability: -D * ln(1 - P)
    const expectedWork = -this.targetDifficulty * Math.log(1 - probability);
    return workDone / expectedWork;
  }

  public workFor50PercentChance(): number {
    return this.targetDifficulty * Math.LN2;
  }

  public currentInfo(): EstimatorInfo {
    const probabilityFactor = this.estimateProbability(
      this.workDoneSinceLastSuccess,
    );
    const luckFactor = this.luckFactor(this.workDoneSinceLastSuccess);
    const remainingTimeSec = this.estimateTime();
    const estimatedSpeed1y = this.estimatedSpeed(365 * 24 * 60 * 60);
    const estimatedSpeed1h = this.estimatedSpeed(3600);
    const estimatedSpeed10m = this.estimatedSpeed(10 * 60);
    const estimatedSpeed20m = this.estimatedSpeed(20 * 60);
    const estimatedSpeed5m = this.estimatedSpeed(5 * 60);

    const totalEfficiency =
      this.currentCost > 0
        ? this.totalWorkDone / this.currentCost / 1e12
        : null;

    return {
      workDone: this.totalWorkDone,
      totalSuccesses: this.totalSuccesses,
      luckFactor: luckFactor,
      probabilityFactor: probabilityFactor,
      remainingTimeSec: remainingTimeSec,
      estimatedSpeed5m: estimatedSpeed5m,
      estimatedSpeed10m: estimatedSpeed10m,
      estimatedSpeed20m: estimatedSpeed20m,
      estimatedSpeed1h: estimatedSpeed1h,
      estimatedSpeed1y: estimatedSpeed1y,
      providerName: this.providerName,
      providerId: this.providerId,
      cost: this.currentCost,
      lastUpdated: this._lastUpdated(),
      totalEfficiency,
      stopping: this.stopping,
    };
  }
}
