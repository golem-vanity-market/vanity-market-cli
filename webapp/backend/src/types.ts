import type { JobInput, JobDetails, JobResult } from "../../shared/contracts/job.contract";
import type { Identity } from "./plugins/authenticate";

export interface JobService {
  createJob(input: JobInput, jobOwner: Identity): Promise<JobDetails>;
  cancelJob(jobId: string, jobOwner: Identity): Promise<JobDetails | null>;
  findJobById(jobId: string, jobOwner: Identity): Promise<JobDetails | null>;
  findJobsByOwner(jobOwner: Identity): Promise<JobDetails[]>;
  getJobResult(jobId: string, jobOwner: Identity): Promise<JobResult>;
}