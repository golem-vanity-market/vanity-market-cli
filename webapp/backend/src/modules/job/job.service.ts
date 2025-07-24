import { db } from "../../lib/db/index.ts";
import { jobResultsTable, jobsTable } from "../../lib/db/schema.ts";
import { and, desc, eq } from "drizzle-orm";
import {
  JobSchema,
  JobResultSchema,
  type JobInput,
  type JobDetails,
  type JobResult,
} from "../../../../shared/contracts/job.contract.ts";
import {
  type Callbacks as GolemCallbacks,
  type GolemService,
} from "./types.ts";
import type { Identity } from "../../plugins/authenticate.ts";
import { ValidationError } from "../../errors/index.ts";
import { isNativeError } from "node:util/types";
import type { JobService } from "../../types.ts";
import { randomUUID } from "node:crypto";

function getOwnerWhereClause(jobOwner: Identity) {
  switch (jobOwner.type) {
    case "user":
      return eq(jobsTable.userAddress, jobOwner.walletAddress);
    case "anonymous":
      return eq(jobsTable.anonymousSessionId, jobOwner.sessionId);
    default:
      throw new Error("Invalid job owner type");
  }
}

function jobToJobDetails(job: typeof jobsTable.$inferSelect): JobDetails {
  return JobSchema.parse({
    id: job.id,
    status: job.status,
    publicKey: job.publicKey,
    vanityAddressPrefix: job.vanityAddressPrefix,
    numWorkers: job.numWorkers,
    budgetGlm: job.budgetGlm,
    processingUnit: job.processingUnit,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
}

class JobServiceImpl implements JobService {
  private golemService: GolemService;

  constructor(golemService: GolemService) {
    this.golemService = golemService;
  }

  private getGolemCallbacks(): GolemCallbacks {
    return {
      onProcessing: async (jobId) => {
        await db
          .update(jobsTable)
          .set({ status: "processing" })
          .where(eq(jobsTable.id, jobId));
      },
      onResults: async (jobId, results) => {
        await db.insert(jobResultsTable).values(
          results.map((r) => ({
            jobId,
            addr: r.addr,
            salt: r.salt,
            pubKey: r.pubKey,
            providerId: r.provider.id,
            providerName: r.provider.name,
            providerWalletAddress: r.provider.walletAddress,
          }))
        );
      },
      onCompleted: async (jobId) => {
        await db
          .update(jobsTable)
          .set({ status: "completed" })
          .where(eq(jobsTable.id, jobId));
      },
      onFailed: async (jobId) => {
        await db
          .update(jobsTable)
          .set({ status: "failed" })
          .where(eq(jobsTable.id, jobId));
      },
    };
  }

  public async createJob(
    input: JobInput,
    jobOwner: Identity
  ): Promise<JobDetails> {
    try {
      if (!input.publicKey) throw new Error("Public key is required");
      if (!input.vanityAddressPrefix)
        throw new Error("Vanity address prefix is required");
      if (!input.budgetGlm || input.budgetGlm <= 0)
        throw new Error("Budget must be a positive number");
      this.golemService.validateAndTransformInputs(input); // will throw if validation fails
    } catch (error) {
      throw new ValidationError(
        isNativeError(error) ? error.message : "Invalid input"
      );
    }

    const jobId = randomUUID();
    const [job] = await db
      .insert(jobsTable)
      .values({
        id: jobId,
        userAddress: jobOwner.type === "user" ? jobOwner.walletAddress : null,
        anonymousSessionId:
          jobOwner.type === "anonymous" ? jobOwner.sessionId : null,
        status: "pending",
        ...input,
      })
      .returning();
    if (!job) throw new Error("Failed to create job in database");

    this.golemService.startJob(jobId, input, this.getGolemCallbacks());
    return jobToJobDetails(job);
  }

  public async cancelJob(
    jobId: string,
    jobOwner: Identity
  ): Promise<JobDetails | null> {
    const ownerWhereClause = getOwnerWhereClause(jobOwner);
    const dbJob = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.id, jobId), ownerWhereClause))
      .limit(1)
      .then((r) => r[0]);
    if (!dbJob) return null;

    if (dbJob.status !== "processing" && dbJob.status !== "pending") {
      return jobToJobDetails(dbJob);
    }

    const cancellationInitiated = await this.golemService.cancelJob(jobId);
    if (!cancellationInitiated) {
      // Job may have finished between our DB check and the cancel call. Re-fetch final state.
      return await this.findJobById(jobId, jobOwner);
    }

    const [updatedJob] = await db
      .update(jobsTable)
      .set({ status: "cancelled" })
      .where(eq(jobsTable.id, jobId))
      .returning();
    return updatedJob ? jobToJobDetails(updatedJob) : null;
  }

  public async findJobById(
    jobId: string,
    jobOwner: Identity
  ): Promise<JobDetails | null> {
    const ownerWhereClause = getOwnerWhereClause(jobOwner);
    const job = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.id, jobId), ownerWhereClause))
      .limit(1)
      .then((r) => r[0]);
    return job ? jobToJobDetails(job) : null;
  }

  public async findJobsByOwner(jobOwner: Identity): Promise<JobDetails[]> {
    const ownerWhereClause = getOwnerWhereClause(jobOwner);
    const jobs = await db
      .select()
      .from(jobsTable)
      .where(ownerWhereClause)
      .orderBy(desc(jobsTable.createdAt))
      .limit(100);
    return jobs.map(jobToJobDetails);
  }

  public async getJobResult(
    jobId: string,
    jobOwner: Identity
  ): Promise<JobResult> {
    const job = await this.findJobById(jobId, jobOwner);
    if (!job) {
      throw new Error(
        `Job with ID ${jobId} not found or you do not have permission to access it.`
      );
    }

    const results = await db
      .select()
      .from(jobResultsTable)
      .where(eq(jobResultsTable.jobId, jobId))
      .orderBy(desc(jobResultsTable.createdAt));
    return JobResultSchema.parse(
      results.map((result) => ({
        addr: result.addr,
        salt: result.salt,
        pubKey: result.pubKey,
        provider: {
          id: result.providerId,
          name: result.providerName,
          walletAddress: result.providerWalletAddress,
        },
      }))
    );
  }
}

export function newJobService(gs: GolemService): JobServiceImpl {
  return new JobServiceImpl(gs);
}
