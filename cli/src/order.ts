import { Allocation, MarketOrderSpec } from "@golem-sdk/golem-js";
import { WorkerType } from "./node_manager/types";

export function getOrderSpec({
  engine,
  allocation,
  cruncherVersion = "prod-12.4.1",
  rentalDurationSeconds,
}: {
  cruncherVersion?: string;
  engine: WorkerType;
  allocation: Allocation;
  rentalDurationSeconds: number;
}): MarketOrderSpec {
  const rentalDurationHours = Math.ceil(rentalDurationSeconds / 3600);

  if (engine === WorkerType.CPU) {
    return {
      demand: {
        workload: {
          imageTag: `nvidia/cuda-x-crunch:${cruncherVersion}`,
          capabilities: [],
          engine: "vm",
        },
      },
      market: {
        rentHours: rentalDurationHours,
        pricing: {
          model: "linear",
          maxStartPrice: 1.0,
          maxCpuPerHourPrice: 2.0,
          maxEnvPerHourPrice: 2.0,
        },
      },
      payment: {
        allocation,
      },
    };
  }
  if (engine === WorkerType.GPU) {
    return {
      demand: {
        workload: {
          imageTag: `nvidia/cuda-x-crunch:${cruncherVersion}`,
          capabilities: [],
          engine: "vm",
        },
      },
      market: {
        rentHours: rentalDurationHours,
        pricing: {
          model: "linear",
          maxStartPrice: 1.0,
          maxCpuPerHourPrice: 2.0,
          maxEnvPerHourPrice: 2.0,
        },
      },
      payment: {
        allocation,
      },
    };
  }
  throw new Error(`Unsupported engine type: ${engine}`);
}
