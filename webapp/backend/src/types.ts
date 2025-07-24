import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type {
  JobInput,
  JobDetails,
  JobResult,
} from "../../shared/contracts/job.contract";
import type { Identity } from "./plugins/authenticate";

export interface ServiceContainer {
  jobService: JobService;
  authService: AuthService;
}

export interface JobService {
  createJob(input: JobInput, jobOwner: Identity): Promise<JobDetails>;
  cancelJob(jobId: string, jobOwner: Identity): Promise<JobDetails | null>;
  findJobById(jobId: string, jobOwner: Identity): Promise<JobDetails | null>;
  findJobsByOwner(jobOwner: Identity): Promise<JobDetails[]>;
  getJobResult(jobId: string, jobOwner: Identity): Promise<JobResult>;
}

export interface AuthService {
  generateNonce(): Promise<{ nonce: string; expiresAt: Date }>;
  verifySignatureAndLogin(
    fastify: FastifyInstance,
    message: string,
    signature: `0x${string}`,
    reply: FastifyReply,
    anonymousSessionId?: string
  ): Promise<{ accessToken: string; refreshToken: string }>;
  getCurrentUser(request: FastifyRequest): Promise<{
    address: string;
    createdAt: string;
    updatedAt: string;
  }>;
  refreshAccessToken(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ accessToken: string; refreshToken: string }>;
  logout(request: FastifyRequest): Promise<void>;
}
