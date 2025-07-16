import { type Logger } from "@golem-sdk/golem-js";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import {
  AppContext,
  EstimatorService,
  GenerationPrefix,
  GolemSessionManager,
  PublicKey,
  ResultsService,
  Scheduler,
  type GenerationParams,
  type SessionManagerParams,
  validateProcessingUnit,
} from "@unoperate/golem-vaddr-cli/lib";
import { jobResultsTable, jobsTable } from "../../lib/db/schema.ts";
import { and, desc, eq } from "drizzle-orm";
import {
  JobSchema,
  JobResultSchema,
  type JobInput,
  type JobDetails,
  type JobResult,
} from "../../../../shared/contracts/job.contract.ts";
import { fastifyLogger } from "../../lib/logger.ts";
import { db } from "../../lib/db/index.ts";
import type { Identity } from "../../plugins/authenticate.ts";

// context of an active job stored in memory
interface ActiveJobContext {
  golemSessionManager: GolemSessionManager;
  scheduler: Scheduler;
}

const activeJobs: Record<string, ActiveJobContext> = {};

/**
 * Validates and transforms API input into the format required by the Golem logic.
 * This reuses the validation logic from your CLI.
 */
function validateAndTransformInputs(input: JobInput) {
  if (!input.publicKey) throw new Error("Public key is required");
  if (!input.vanityAddressPrefix)
    throw new Error("Vanity address prefix is required");
  if (!input.budgetGlm || input.budgetGlm <= 0)
    throw new Error("Budget must be a positive number");

  const publicKey = new PublicKey(input.publicKey);
  const vanityAddressPrefix = new GenerationPrefix(input.vanityAddressPrefix);
  const processingUnitType = validateProcessingUnit(input.processingUnit);

  return {
    publicKey,
    vanityAddressPrefix,
    processingUnitType,
  };
}

/**
 * The main background task that runs the entire Golem generation process for a single job.
 * @param jobId The ID of the job from the database.
 * @param input The user-provided parameters for the job.
 */
async function runJobInBackground(
  jobId: string,
  input: JobInput,
  rootLogger: Logger
) {
  let golemSessionManager: GolemSessionManager | null = null;
  let appContext: AppContext | null = null;
  let resultService: ResultsService | null = null;

  const seenResults = new Set<string>();
  const collectResults = async () => {
    if (!resultService) return;
    const results = await resultService.results();
    if (!results) return;
    if (results.length > 0) {
      const newResults = results.filter((r) => !seenResults.has(r.addr));
      newResults.forEach((r) => seenResults.add(r.addr));
      if (newResults.length > 0) {
        await db.insert(jobResultsTable).values(
          newResults.map((r) => ({
            jobId,
            addr: r.addr,
            salt: r.salt,
            pubKey: r.pubKey,
            providerId: r.provider.id,
            providerName: r.provider.name,
            providerWalletAddress: r.provider.walletAddress,
          }))
        );
        appContext
          ?.L()
          .info(`Saved ${newResults.length} new results for job ${jobId}`);
      }
    }
  };
  const resultsCollector = setInterval(collectResults, 5000); // Collect results every 5 seconds

  try {
    const validated = validateAndTransformInputs(input);

    await db
      .update(jobsTable)
      .set({
        status: "processing",
        publicKey: validated.publicKey.toTruncatedHex(),
        vanityAddressPrefix: validated.vanityAddressPrefix.fullPrefix(),
        numWorkers: input.numWorkers,
      })
      .where(eq(jobsTable.id, jobId));

    // 2. Set up Golem context and managers
    const logger = rootLogger.child(`job-${jobId}`);
    appContext = new AppContext(ROOT_CONTEXT).WithLogger(logger);

    const rentalDurationSecs = 15 / 60;

    resultService = new ResultsService(appContext, {
      vanityPrefix: validated.vanityAddressPrefix,
      csvOutput: null,
    });
    const estimatorService = new EstimatorService(appContext, {
      vanityPrefix: validated.vanityAddressPrefix,
      disableMessageLoop: true,
      processLoopSecs: parseFloat(
        process.env.PROCESS_LOOP_SEC_INTERVAL || "1.0"
      ),
      resultService,
    });

    const sessionParams: SessionManagerParams = {
      rentalDurationSeconds: rentalDurationSecs,
      budgetInitial: 1,
      processingUnitType: validated.processingUnitType,
      estimatorService,
      resultService,
    };
    golemSessionManager = new GolemSessionManager(sessionParams);

    const scheduler = new Scheduler(golemSessionManager, estimatorService);

    // Store the session in our active jobs map for potential cancellation
    activeJobs[jobId] = { golemSessionManager, scheduler };

    // 3. Connect and initialize Golem resources
    await golemSessionManager.connectToGolemNetwork(appContext);
    await golemSessionManager.initializeRentalPool(appContext);
    await golemSessionManager.waitForEnoughOffers(appContext, 5, 30);

    // 4. Run the generation process
    const generationParams: GenerationParams = {
      publicKey: validated.publicKey.toTruncatedHex(),
      vanityAddressPrefix: validated.vanityAddressPrefix,
      budgetInitial: 1,
      budgetLimit: input.budgetGlm,
      budgetTopUp: 0.5,
      numberOfWorkers: input.numWorkers,
      singlePassSeconds: 20, // Default
      numResults: BigInt(input.numResults),
    };

    await scheduler.runGenerationProcess(appContext, generationParams);

    // collect the final set of results
    await collectResults();

    // 5. Mark job as completed
    await db
      .update(jobsTable)
      .set({ status: "completed" })
      .where(eq(jobsTable.id, jobId));
  } catch (error) {
    appContext?.L().error(`Error processing job ${jobId}:`, error);
    await db
      .update(jobsTable)
      .set({ status: "failed" })
      .where(eq(jobsTable.id, jobId))
      // if update fails, log the error but don't throw, so we can still clean up
      .catch((dbError) => {
        rootLogger.error(`Failed to update job status for ${jobId} ${dbError}`);
      });
  } finally {
    if (resultsCollector) {
      clearInterval(resultsCollector);
      rootLogger.info(`Stopped results collector for job ${jobId}`);
    }
    // 6. Cleanup: This block runs on success, failure, or cancellation.
    if (golemSessionManager && appContext) {
      rootLogger.info(`Cleaning up resources for job ${jobId}`);
      await golemSessionManager.drainPool(appContext);
      await golemSessionManager.disconnectFromGolemNetwork(appContext);
      rootLogger.info(`Resources cleaned up for job ${jobId}`);
    }
    // Remove from active jobs map to prevent memory leaks
    delete activeJobs[jobId];
  }
}

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

export async function createJob(
  input: JobInput,
  jobOwner: Identity
): Promise<JobDetails> {
  // Validate inputs before even creating the DB record
  validateAndTransformInputs(input);

  const jobId = crypto.randomUUID();
  const [job] = await db
    .insert(jobsTable)
    .values({
      id: jobId,
      userAddress: jobOwner.type === "user" ? jobOwner.walletAddress : null,
      anonymousSessionId:
        jobOwner.type === "anonymous" ? jobOwner.sessionId : null,
      status: "pending",
      publicKey: input.publicKey,
      vanityAddressPrefix: input.vanityAddressPrefix,
      numWorkers: input.numWorkers,
      budgetGlm: input.budgetGlm,
      processingUnit: input.processingUnit,
    })
    .returning();
  if (!job) {
    throw new Error("Failed to create job");
  }

  // Start the long-running task but DO NOT await it.
  // This makes the API request return immediately.
  runJobInBackground(jobId, input, fastifyLogger);
  const jobDetails: JobDetails = {
    id: job.id,
    status: job.status,
    publicKey: job.publicKey,
    vanityAddressPrefix: job.vanityAddressPrefix,
    numWorkers: job.numWorkers,
    budgetGlm: job.budgetGlm,
    processingUnit: job.processingUnit,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  return JobSchema.parse(jobDetails);
}

/**
 * Cancels a running job.
 */
export async function cancelJob(
  jobId: string,
  jobOwner: Identity
): Promise<JobDetails | null> {
  const jobContext = activeJobs[jobId];
  const ownerWhereClause = getOwnerWhereClause(jobOwner);
  const dbJob = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), ownerWhereClause))
    .limit(1)
    .then((rows) => rows[0]);

  if (!dbJob || !jobContext) {
    // Job is not running or doesn't exist
    return null;
  }

  if (dbJob.status !== "processing" && dbJob.status !== "pending") {
    // Job is already finished or failed
    const jobDetails: JobDetails = {
      id: dbJob.id,
      status: dbJob.status,
      publicKey: dbJob.publicKey,
      vanityAddressPrefix: dbJob.vanityAddressPrefix,
      numWorkers: dbJob.numWorkers,
      createdAt: dbJob.createdAt,
      updatedAt: dbJob.updatedAt,
      budgetGlm: dbJob.budgetGlm,
      processingUnit: dbJob.processingUnit,
    };
    return JobSchema.parse(jobDetails);
  }

  console.log(`User initiated cancellation for job ${jobId}`);
  jobContext.golemSessionManager.stopWork("User initiated cancellation");

  // The `finally` block in `runJobInBackground` will handle the cleanup.
  return await db
    .update(jobsTable)
    .set({ status: "cancelled" })
    .where(eq(jobsTable.id, jobId))
    .returning()
    .then((rows) => {
      const updatedJob = rows[0];
      if (!updatedJob) {
        return null; // Job not found or update failed
      }
      const jobDetails: JobDetails = {
        id: updatedJob.id,
        status: updatedJob.status,
        publicKey: updatedJob.publicKey,
        vanityAddressPrefix: updatedJob.vanityAddressPrefix,
        numWorkers: updatedJob.numWorkers,
        createdAt: updatedJob.createdAt,
        updatedAt: updatedJob.updatedAt,
        budgetGlm: updatedJob.budgetGlm,
        processingUnit: updatedJob.processingUnit,
      };
      return JobSchema.parse(jobDetails);
    });
}

/**
 * Finds a job by its ID.
 */
export async function findJobById(
  jobId: string,
  jobOwner: Identity
): Promise<JobDetails | null> {
  const ownerWhereClause = getOwnerWhereClause(jobOwner);
  const job = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), ownerWhereClause))
    .limit(1)
    .then((rows) => rows[0]);

  if (!job) {
    return null; // Job not found
  }

  const jobDetails: JobDetails = {
    id: job.id,
    status: job.status,
    publicKey: job.publicKey,
    vanityAddressPrefix: job.vanityAddressPrefix,
    numWorkers: job.numWorkers,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    budgetGlm: job.budgetGlm,
    processingUnit: job.processingUnit,
  };

  return JobSchema.parse(jobDetails);
}

/**
 * Finds all jobs for a specific user (or anonymous session id).
 */
export async function findJobsByOwner(
  jobOwner: Identity
): Promise<JobDetails[]> {
  const ownerWhereClause = getOwnerWhereClause(jobOwner);
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(ownerWhereClause)
    .orderBy(desc(jobsTable.createdAt))
    .limit(100) // Limit to 100 latest jobs
    .then((rows) => rows);

  return jobs.map((job) => {
    const jobDetails: JobDetails = {
      id: job.id,
      status: job.status,
      publicKey: job.publicKey,
      vanityAddressPrefix: job.vanityAddressPrefix,
      numWorkers: job.numWorkers,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      budgetGlm: job.budgetGlm,
      processingUnit: job.processingUnit,
    };
    return JobSchema.parse(jobDetails);
  });
}

/**
 * Fetches the results for a completed job.
 */
export async function getJobResult(
  jobId: string,
  jobOwner: Identity
): Promise<JobResult> {
  // First check if the job belongs to the owner
  const ownerWhereClause = getOwnerWhereClause(jobOwner);
  const job = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), ownerWhereClause))
    .limit(1)
    .then((rows) => rows[0]);

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
