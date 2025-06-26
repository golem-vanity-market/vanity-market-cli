/**
 * Worker type system for CPU and GPU vanity address generation
 */

import { ExeUnit, Allocation, MarketOrderSpec } from "@golem-sdk/golem-js";
import { GenerationParams } from "../scheduler";
import { Estimator, EstimatorInfo } from "../estimator";

/**
 * Supported worker types
 */
export enum WorkerType {
  CPU = "cpu",
  GPU = "gpu",
}

/**
 * Configuration for a specific worker type
 */
export interface WorkerConfig {
  /** Type of worker (CPU or GPU) */
  type: WorkerType;

  /** Number of compute kernels to use */
  kernelCount: number;

  /** Number of work groups */
  groupCount: number;

  /** Number of rounds per execution */
  roundCount: number;

  /** Golem capabilities required for this worker type */
  capabilities: string[];

  /** Docker image tag to use */
  imageTag: string;

  /** Golem execution engine */
  engine: string;

  /** CPU count for parallel processing (CPU workers only) */
  cpuCount?: number;

  /** Maximum price per hour in GLM tokens */
  maxEnvPricePerHour: number;

  /** Maximum price per CPU thread (CPU workers only) - added to env price */
  maxCpuPerHourPrice?: number; // Maximum CPU price per hour in GLM tokens
}

/**
 * Extended WorkerPool parameters with worker type support
 */
export interface WorkerPoolParams {
  /** Number of workers to allocate */
  numberOfWorkers: number;

  /** Rental duration in seconds */
  rentalDurationSeconds: number;

  /** Budget in GLM tokens */
  budgetGlm: number;

  /** Type of workers to allocate */
  workerType: WorkerType;
}

/**
 * Abstract base class for worker implementations
 */
export abstract class BaseWorker {
  private _config: WorkerConfig;
  private _estimator: Estimator | null = null;

  constructor(cruncherVersion: string = "prod-12.4.1") {
    this._config = this.createConfig(cruncherVersion);
  }

  public initEstimator(estimator: Estimator): void {
    this._estimator = estimator;
  }

  public reportAttempts(attempts: number): void {
    if (!this._estimator) {
      throw "Estimator is not initialized";
    }
    this._estimator.reportAttempts(attempts);
  }

  public estimator(): Estimator {
    if (!this._estimator) {
      throw "Estimator is not initialized";
    }
    return this._estimator;
  }

  public estimatorInfo(): EstimatorInfo {
    if (!this._estimator) {
      throw "Estimator is not initialized";
    }
    return this._estimator.currentInfo();
  }

  /**
   * Get the configuration for this worker type
   */
  public get config(): WorkerConfig {
    return { ...this._config };
  }

  protected updateConfigCpuCount(count: number) {
    if (count < 1 || count > 255) {
      throw new Error("CPU count must be between 1 and 255");
    }
    this._config.cpuCount = count;
  }

  /**
   * Create worker-specific configuration
   */
  protected abstract createConfig(cruncherVersion: string): WorkerConfig;

  /**
   * Generate the command to execute profanity_cuda for this worker type
   */
  public abstract generateCommand(params: GenerationParams): string;

  /**
   * Validate worker capabilities and return relevant info
   * @returns CPU count for CPU workers, or 1 for GPU workers
   */
  public abstract checkAndSetCapabilities(exe: ExeUnit): Promise<void>;

  /**
   * Get the Golem order configuration for this worker type
   */
  public getOrder(
    rentalDurationSeconds: number,
    allocation: Allocation,
  ): MarketOrderSpec {
    const rentalDurationHours = Math.ceil(rentalDurationSeconds / 3600);

    return {
      demand: {
        workload: {
          imageTag: this._config.imageTag,
          capabilities: this._config.capabilities,
          engine: this._config.engine,
        },
      },
      market: {
        rentHours: rentalDurationHours,
        pricing: {
          model: "linear",
          maxStartPrice: 0.0,
          maxCpuPerHourPrice: this._config.maxCpuPerHourPrice ?? 0.0,
          maxEnvPerHourPrice: this._config.maxEnvPricePerHour,
        },
      },
      payment: {
        allocation,
      },
    };
  }

  /**
   * Get the worker type
   */
  public getType(): WorkerType {
    return this._config.type;
  }

  /**
   * Check if this is a CPU worker
   */
  public isCPU(): boolean {
    return this._config.type === WorkerType.CPU;
  }

  /**
   * Check if this is a GPU worker
   */
  public isGPU(): boolean {
    return this._config.type === WorkerType.GPU;
  }
}
