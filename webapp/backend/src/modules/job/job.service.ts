import { db } from "../../lib/db";
import { type Logger } from "@golem-sdk/golem-js";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import { validateProcessingUnit } from "@unoperate/golem-vaddr-cli";
import {
  AppContext,
  GenerationPrefix,
  GolemSessionManager,
  PublicKey,
  Scheduler,
  type GenerationParams,
  type SessionManagerParams,
} from "@unoperate/golem-vaddr-cli/lib";
import { jobResultsTable, jobsTable } from "../../lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import {
  JobSchema,
  JobResultSchema,
  JobInputSchema,
} from "../../contracts/job.contract";
import type z from "zod";
import { fastifyLogger } from "../../lib/logger";

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
function validateAndTransformInputs(input: z.infer<typeof JobInputSchema>) {
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
  input: z.infer<typeof JobInputSchema>,
  rootLogger: Logger
) {
  let golemSessionManager: GolemSessionManager | null = null;
  let appContext: AppContext | null = null;
  let resultsCollector: NodeJS.Timeout | null = null;

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

    const sessionParams: SessionManagerParams = {
      numberOfWorkers: input.numWorkers,
      rentalDurationSeconds: rentalDurationSecs,
      budgetGlm: input.budgetGlm,
      processingUnitType: validated.processingUnitType,
    };
    golemSessionManager = new GolemSessionManager(sessionParams);

    const scheduler = new Scheduler(golemSessionManager);

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
      budgetGlm: input.budgetGlm,
      numberOfWorkers: input.numWorkers,
      singlePassSeconds: 20, // Default
      numResults: BigInt(input.numResults),
    };

    resultsCollector = setInterval(async () => {
      const results = await golemSessionManager?.results();
      if (!results) return;
      if (results.length > 0) {
        const existingResults = await db
          .select()
          .from(jobResultsTable)
          .where(
            inArray(
              jobResultsTable.addr,
              results.map((r) => r.addr)
            )
          );
        const existingAddrs = new Set(existingResults.map((r) => r.addr));
        const newResults = results.filter((r) => !existingAddrs.has(r.addr));
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
    }, 5000); // Collect results every 5 seconds

    await scheduler.runGenerationProcess(appContext, generationParams);

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
      await golemSessionManager.stopServices(appContext);
      rootLogger.info(`Resources cleaned up for job ${jobId}`);
    }
    // Remove from active jobs map to prevent memory leaks
    delete activeJobs[jobId];
  }
}

export async function createJob(
  input: z.infer<typeof JobInputSchema>
): Promise<z.infer<typeof JobSchema>> {
  // Validate inputs before even creating the DB record
  validateAndTransformInputs(input);

  const jobId = crypto.randomUUID();
  const [job] = await db
    .insert(jobsTable)
    .values({
      id: jobId,
      userId: 1, // TODO: Replace with actual user ID from context
      status: "pending",
      publicKey: input.publicKey,
      vanityAddressPrefix: input.vanityAddressPrefix,
      numWorkers: input.numWorkers,
    })
    .returning();
  if (!job) {
    throw new Error("Failed to create job");
  }

  // Start the long-running task but DO NOT await it.
  // This makes the API request return immediately.
  runJobInBackground(jobId, input, fastifyLogger);
  return JobSchema.parse({
    id: jobId,
    userId: 1, // TODO: Replace with actual user ID from context
    status: "pending",
    publicKey: job.publicKey,
    vanityAddressPrefix: job.vanityAddressPrefix,
    numWorkers: job.numWorkers,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}

/**
 * Cancels a running job.
 */
export async function cancelJob(
  jobId: string
): Promise<z.infer<typeof JobSchema> | null> {
  const jobContext = activeJobs[jobId];
  const dbJob = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!dbJob || !jobContext) {
    // Job is not running or doesn't exist
    return null;
  }

  if (dbJob.status !== "processing" && dbJob.status !== "pending") {
    // Job is already finished or failed
    return JobSchema.parse({
      id: dbJob.id,
      userId: dbJob.userId,
      status: dbJob.status,
      publicKey: dbJob.publicKey,
      vanityAddressPrefix: dbJob.vanityAddressPrefix,
      numWorkers: dbJob.numWorkers,
    });
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
      return JobSchema.parse({
        id: updatedJob.id,
        userId: updatedJob.userId,
        status: updatedJob.status,
        publicKey: updatedJob.publicKey,
        vanityAddressPrefix: updatedJob.vanityAddressPrefix,
        numWorkers: updatedJob.numWorkers,
      });
    });
}

/**
 * Finds a job by its ID.
 */
export async function findJobById(
  jobId: string
): Promise<z.infer<typeof JobSchema> | null> {
  const job = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!job) {
    return null; // Job not found
  }

  return JobSchema.parse({
    id: job.id,
    userId: job.userId,
    status: job.status,
    publicKey: job.publicKey,
    vanityAddressPrefix: job.vanityAddressPrefix,
    numWorkers: job.numWorkers,
  });
}

/**
 * Finds all jobs for a specific user.
 */
export async function findJobsByUserId(
  userId: number
): Promise<z.infer<typeof JobSchema>[]> {
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.userId, userId))
    .orderBy(desc(jobsTable.createdAt))
    .then((rows) => rows);

  return jobs.map((job) =>
    JobSchema.parse({
      id: job.id,
      userId: job.userId,
      status: job.status,
      publicKey: job.publicKey,
      vanityAddressPrefix: job.vanityAddressPrefix,
      numWorkers: job.numWorkers,
    })
  );
}

/**
 * Fetches the results for a completed job.
 */
export async function getJobResults(
  jobId: string
): Promise<z.infer<typeof JobResultSchema>> {
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
