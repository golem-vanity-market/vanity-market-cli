import type {
  PublicKey,
  GenerationPrefix,
} from "@unoperate/golem-vaddr-cli/lib";
import type {
  JobDetails,
  JobInput,
  JobResult,
} from "../../../../shared/contracts/job.contract";
import type { Identity } from "../../plugins/authenticate";

export interface JobService {
  createJob(input: JobInput, jobOwner: Identity): Promise<JobDetails>;
  cancelJob(jobId: string, jobOwner: Identity): Promise<JobDetails | null>;
  findJobById(jobId: string, jobOwner: Identity): Promise<JobDetails | null>;
  findJobsByOwner(jobOwner: Identity): Promise<JobDetails[]>;
  getJobResult(jobId: string, jobOwner: Identity): Promise<JobResult>;
}

export interface GolemService {
  startJob(jobId: string, input: JobInput, callbacks: Callbacks): void;
  cancelJob(jobId: string): Promise<boolean>;
  validateAndTransformInputs(input: JobInput): {
    publicKey: PublicKey;
    vanityAddressPrefix: GenerationPrefix;
    processingUnitType: string;
  };
}

export interface Callbacks {
  onProcessing: (jobId: string) => Promise<void>;
  onResults: (jobId: string, results: Result[]) => Promise<void>;
  onCompleted: (jobId: string) => Promise<void>;
  onFailed: (jobId: string, error: Error) => Promise<void>;
}

export interface Result {
  addr: string;
  salt: string;
  pubKey: string;
  provider: {
    id: string;
    name: string;
    walletAddress: string;
  };
}
