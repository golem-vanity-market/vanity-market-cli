import {
  describe,
  before,
  after,
  beforeEach,
  mock,
  type Mock,
  it,
} from "node:test";
import assert from "node:assert";
import type { FastifyInstance } from "fastify";
import { JobService } from "./job.service.ts";
import { db } from "../../lib/db/index.ts";
import { jobsTable, jobResultsTable } from "../../lib/db/schema.ts";
import { type JobInput } from "../../../../shared/contracts/job.contract.ts";
import { eq } from "drizzle-orm";
import { buildApp } from "../../app.ts";
import config from "../../config.ts";
import { randomUUID } from "node:crypto";
import {
  applySchemaToTestDb,
  getAuthenticatedClient,
  getRandomPublicKey,
  getTestApiClient,
  type TestApiClient,
} from "../../test/helpers.ts";

type MockJobControls = {
  resolve: (results: (typeof jobResultsTable.$inferInsert)[]) => void;
  reject: (error: Error) => void;
  jobInput: JobInput;
};
const mockJobs = new Map<string, MockJobControls>();

mock.method(
  JobService,
  "runJobInBackground",
  async (jobId: string, input: JobInput) => {
    await db
      .update(jobsTable)
      .set({ status: "processing" })
      .where(eq(jobsTable.id, jobId));

    return new Promise<void>((resolve, reject) => {
      mockJobs.set(jobId, {
        resolve: (results) => {
          db.update(jobsTable)
            .set({ status: "completed" })
            .where(eq(jobsTable.id, jobId))
            .then(() => {
              if (results && results.length > 0) {
                db.insert(jobResultsTable)
                  .values(results)
                  .then(() => resolve());
              } else {
                resolve();
              }
            });
        },
        reject: (error) => {
          db.update(jobsTable)
            .set({ status: "failed" })
            .where(eq(jobsTable.id, jobId))
            .then(() => reject(error));
        },
        jobInput: input,
      });
    });
  }
);

describe("Jobs API", () => {
  let app: FastifyInstance;
  let client: TestApiClient;
  before(async () => {
    await applySchemaToTestDb();
    app = await buildApp();
    await app.ready();

    const serverUrl = await app.listen({ port: 0 });

    client = getTestApiClient(serverUrl, {
      [config.ANONYMOUS_SESSION_ID_HEADER_NAME]: randomUUID(),
    });
  });

  after(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(jobResultsTable);
    await db.delete(jobsTable);
    mockJobs.clear();
  });

  it("should create a job, process it, and allow fetching results", async () => {
    const jobInput: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "0xabc123",
      budgetGlm: 1,
      processingUnit: "cpu",
      numResults: 1,
      numWorkers: 2,
    };

    const { status, body: createdJob } = await client.jobs.createJob({
      body: jobInput,
    });

    // ASSERT 1: The initial API call returns 202 Accepted
    assert.strictEqual(
      status,
      202,
      `Status should be 202 Accepted, instead got an error: ${JSON.stringify(createdJob)}`
    );
    assert.strictEqual(
      createdJob.status,
      "pending",
      "Initial status should be pending"
    );
    assert.ok(createdJob.id, "Job should have an ID");

    const jobId = createdJob.id;

    // wait for the job to begin processing
    await new Promise((r) => setTimeout(r, 50));

    // ASSERT 2: Check that the job is 'processing'
    const dbJobProcessing = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, jobId));
    assert.strictEqual(dbJobProcessing[0]?.status, "processing");

    // ASSERT 3: Our mock background function was called
    const mockRunJob = JobService.runJobInBackground as Mock<
      typeof JobService.runJobInBackground
    >;
    assert.strictEqual(
      mockRunJob.mock.calls.length,
      1,
      "runJobInBackground should be called once"
    );
    assert.strictEqual(
      mockRunJob.mock.calls[0]?.arguments[0],
      jobId,
      "Mock was called with the correct jobId"
    );

    // manually "complete" the background job
    const jobControls = mockJobs.get(jobId);
    assert.ok(jobControls, "Mock controls for the job should exist");

    const mockResult = {
      jobId,
      addr: "0xabc123",
      salt: "salt123",
      pubKey: "pub123",
      providerId: "provider1",
      providerName: "p-name",
      providerWalletAddress: "0xprov",
    };
    jobControls.resolve([mockResult]);

    // Wait for the async DB updates in the mock to finish
    await new Promise((r) => setTimeout(r, 50));

    const res = await client.jobs.getJobDetails({
      params: { id: jobId },
    });

    // ASSERT 5: The job is now 'completed'
    assert.strictEqual(res.status, 200);
    const completedJob = res.body;
    assert.strictEqual(completedJob.status, "completed");

    const { status: resultStatus, body: jobResult } =
      await client.jobs.getJobResult({ params: { id: jobId } });

    // ASSERT 6: The results are correct
    assert.strictEqual(resultStatus, 200);
    assert.strictEqual(jobResult.length, 1, "There should be one result");
    assert.deepStrictEqual(jobResult[0]?.addr, mockResult.addr);
  });
  it("should validate inputs", async () => {
    const wrongPubKey: JobInput = {
      publicKey: "not-a-valid-public-key",
      vanityAddressPrefix: "0xabc123",
      budgetGlm: 1,
      processingUnit: "cpu",
      numResults: 1,
      numWorkers: 2,
    };
    const resPubKey = await client.jobs.createJob({
      body: wrongPubKey,
    });
    assert.strictEqual(
      resPubKey.status,
      400,
      "Invalid public key should result in a 400"
    );

    const wrongPrefix: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "not-a-valid-prefix",
      budgetGlm: 1,
      processingUnit: "cpu",
      numResults: 1,
      numWorkers: 2,
    };
    const resPrefix = await client.jobs.createJob({
      body: wrongPrefix,
    });
    assert.strictEqual(
      resPrefix.status,
      400,
      "Invalid vanity address prefix should result in a 400"
    );

    const wrongBudget: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "0xabc123",
      budgetGlm: -1,
      processingUnit: "cpu",
      numResults: 1,
      numWorkers: 2,
    };
    const resBudget = await client.jobs.createJob({
      body: wrongBudget,
    });
    assert.strictEqual(
      resBudget.status,
      400,
      "Invalid budget should result in a 400"
    );

    const wrongProcessingUnit: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "0xabc123",
      budgetGlm: 1,
      processingUnit: "not-a-valid-unit" as "cpu" | "gpu",
      numResults: 1,
      numWorkers: 2,
    };
    const resProcessingUnit = await client.jobs.createJob({
      body: wrongProcessingUnit,
    });
    assert.strictEqual(
      resProcessingUnit.status,
      400,
      "Invalid processing unit should result in a 400"
    );

    const wrongNumResults: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "0xabc123",
      budgetGlm: 1,
      processingUnit: "cpu",
      numResults: -1,
      numWorkers: 2,
    };
    const resNumResults = await client.jobs.createJob({
      body: wrongNumResults,
    });
    assert.strictEqual(
      resNumResults.status,
      400,
      "Invalid number of results should result in a 400"
    );

    const wrongNumWorkers: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "0xabc123",
      budgetGlm: 1,
      processingUnit: "cpu",
      numResults: 1,
      numWorkers: -1,
    };
    const resNumWorkers = await client.jobs.createJob({
      body: wrongNumWorkers,
    });
    assert.strictEqual(
      resNumWorkers.status,
      400,
      "Invalid number of workers should result in a 400"
    );
  });
  it("should not allow GPU work to anonymous users", async () => {
    const jobInput: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "0xabc123",
      budgetGlm: 1,
      processingUnit: "gpu",
      numResults: 1,
      numWorkers: 2,
    };

    const { status } = await client.jobs.createJob({
      body: jobInput,
    });
    assert.strictEqual(
      status,
      400,
      "Anonymous users should not be allowed GPU work"
    );
  });
  it("should allow GPU work to signed-in users", async () => {
    const jobInput: JobInput = {
      publicKey: getRandomPublicKey(),
      vanityAddressPrefix: "0xabc123",
      budgetGlm: 1,
      processingUnit: "gpu",
      numResults: 1,
      numWorkers: 2,
    };

    const authenticatedClient = await getAuthenticatedClient(
      app.listeningOrigin,
      client
    );

    const { status } = await authenticatedClient.jobs.createJob({
      body: jobInput,
    });
    assert.strictEqual(
      status,
      202,
      "Signed-in users should be allowed GPU work"
    );
  });
});
