/**
 * Worker type system for CPU and GPU vanity address generation
 */

import { ExeUnit, Allocation } from "@golem-sdk/golem-js";
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
  protected config: WorkerConfig;
  private _estimator: Estimator | null = null;

  constructor(cruncherVersion: string = "prod-12.4.1") {
    this.config = this.createConfig(cruncherVersion);
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
  public getConfig(): WorkerConfig {
    return { ...this.config };
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
  public abstract validateCapabilities(exe: ExeUnit): Promise<number>;

  /**
   * Get the Golem order configuration for this worker type
   */
  public getOrder(
    rentalDurationSeconds: number,
    allocation: Allocation,
  ): any /* eslint-disable-line @typescript-eslint/no-explicit-any */ {
    const rentalDurationHours = Math.ceil(rentalDurationSeconds / 3600);

    return {
      demand: {
        workload: {
          imageTag: this.config.imageTag,
          capabilities: this.config.capabilities,
          engine: this.config.engine,
        },
      },
      market: {
        rentHours: rentalDurationHours,
        pricing: {
          model: "linear",
          maxStartPrice: 0.0,
          maxCpuPerHourPrice: 0.0,
          maxEnvPerHourPrice: 2.0,
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
    return this.config.type;
  }

  /**
   * Check if this is a CPU worker
   */
  public isCPU(): boolean {
    return this.config.type === WorkerType.CPU;
  }

  /**
   * Check if this is a GPU worker
   */
  public isGPU(): boolean {
    return this.config.type === WorkerType.GPU;
  }
}
