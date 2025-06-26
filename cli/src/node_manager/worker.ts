/**
 * Worker implementation with CPU and GPU support
 */

import { ExeUnit } from "@golem-sdk/golem-js";
import { BaseWorker, WorkerType, WorkerConfig } from "./types";
import { GenerationParams } from "./../scheduler";

/**
 * CPU Worker implementation for parallel processing
 */
export class CPUWorker extends BaseWorker {
  protected createConfig(cruncherVersion: string): WorkerConfig {
    return {
      type: WorkerType.CPU,
      kernelCount: 1,
      groupCount: 1,
      roundCount: 20000,
      capabilities: [], // Standard VM capabilities
      imageTag: `nvidia/cuda-x-crunch:${cruncherVersion}`,
      engine: "vm",
      cpuCount: 1, // Will be updated after detection
      maxEnvPricePerHour: 0.1, // Default price per hour in GLM tokens
      maxCpuPerHourPrice: 0.025, // Default price per CPU thread in GLM tokens
    };
  }

  public async checkAndSetCapabilities(exe: ExeUnit): Promise<void> {
    try {
      const result = await exe.run("nproc");
      const cpuCount = parseInt(result.stdout?.toString().trim() ?? "1");

      if (cpuCount < 1) {
        throw new Error("CPU count cannot be smaller than 1");
      }
      if (cpuCount > 255) {
        throw new Error("CPU count cannot be greater than 255");
      }

      this.updateConfigCpuCount(cpuCount);
    } catch (error) {
      throw new Error(`Failed to detect CPU capabilities: ${error}`);
    }
  }

  public generateCommand(params: GenerationParams): string {
    const cpuCount = this.config.cpuCount || 1;
    const prefix = params.vanityAddressPrefix.toArg();

    // Create multiple prefix instances for parallel processing
    const prefixes = ` ${prefix}`.repeat(cpuCount);

    return `parallel profanity_cuda --cpu -k ${this.config.kernelCount} -g ${this.config.groupCount} -r ${this.config.roundCount} -b ${params.singlePassSeconds} -z ${params.publicKey} -p {} :::${prefixes}`;
  }
}

/**
 * GPU Worker implementation for CUDA processing
 */
export class GPUWorker extends BaseWorker {
  protected createConfig(cruncherVersion: string): WorkerConfig {
    return {
      type: WorkerType.GPU,
      kernelCount: 64,
      groupCount: 1000,
      roundCount: 1000,
      capabilities: ["!exp:gpu"],
      imageTag: `nvidia/cuda-x-crunch:${cruncherVersion}`,
      engine: "vm-nvidia",
      maxCpuPerHourPrice: 0.0,
      maxEnvPricePerHour: 0.2, // Default price per hour in GLM tokens
    };
  }

  public async checkAndSetCapabilities(exe: ExeUnit): Promise<void> {
    try {
      await exe.run("nvidia-smi");
    } catch (error) {
      throw new Error(`Failed to validate GPU capabilities: ${error}`);
    }
  }

  public generateCommand(params: GenerationParams): string {
    const prefix = params.vanityAddressPrefix.toArg();

    return `profanity_cuda -k ${this.config.kernelCount} -g ${this.config.groupCount} -r ${this.config.roundCount} -p ${prefix} -b ${params.singlePassSeconds} -z ${params.publicKey}`;
  }
}

/**
 * Factory function to create workers based on type
 */
export function createWorker(
  type: WorkerType,
  cruncherVersion?: string,
): BaseWorker {
  switch (type) {
    case WorkerType.CPU:
      return new CPUWorker(cruncherVersion);
    case WorkerType.GPU:
      return new GPUWorker(cruncherVersion);
    default:
      throw new Error(`Unsupported worker type: ${type}`);
  }
}
