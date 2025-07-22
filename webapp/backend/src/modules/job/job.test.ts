import { describe, before, after, beforeEach, mock, it } from "node:test";
import assert from "node:assert";
import type { FastifyInstance } from "fastify";
import { newGolemService } from "./golem.service.ts";
import { type Callbacks as GolemCallbacks } from "./types.ts";
import { newJobService } from "./job.service.ts";
import { db } from "../../lib/db/index.ts";
import { jobsTable, jobResultsTable } from "../../lib/db/schema.ts";
import { type JobInput } from "../../../../shared/contracts/job.contract.ts";
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
import { fastifyLogger } from "../../lib/logger.ts";
import { newAuthService } from "../auth/auth.service.ts";

const golemService = newGolemService(fastifyLogger);
const startJobMock = mock.method(golemService, "startJob");
const cancelJobMock = mock.method(golemService, "cancelJob");

describe("Jobs API", () => {
  let app: FastifyInstance;
  let client: TestApiClient;
  // This will hold the callbacks passed to our mock GolemService
  let capturedCallbacks: GolemCallbacks | null = null;

  before(async () => {
    startJobMock.mock.mockImplementation(
      (_jobId, _input, callbacks: GolemCallbacks) => {
        capturedCallbacks = callbacks;
      }
    );
    cancelJobMock.mock.mockImplementation(async () => {
      return true;
    });

    await applySchemaToTestDb();

    const jobService = newJobService(golemService);
    const authService = newAuthService();

    app = await buildApp({
      jobService,
      golemService,
      authService,
    });
    await app.ready();

    const serverUrl = await app.listen({ port: 0 });

    client = getTestApiClient(serverUrl, {
      [config.ANONYMOUS_SESSION_ID_HEADER_NAME]: randomUUID(),
    });
  });

  after(async () => {
    await app.close();
    mock.reset();
  });

  beforeEach(async () => {
    await db.delete(jobResultsTable);
    await db.delete(jobsTable);
    // Reset mocks and captured state before each test
    startJobMock.mock.resetCalls();
    cancelJobMock.mock.resetCalls();
    capturedCallbacks = null;
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

    // ASSERT 1: The initial API call returns 202 Created and 'pending' status
    assert.strictEqual(status, 202, "API call should return 202 Created");
    assert.strictEqual(createdJob.status, "pending");
    assert.ok(createdJob.id, "Job should have an ID");
    const jobId = createdJob.id;

    // ASSERT 2: Our mock GolemService was called correctly
    assert.strictEqual(
      startJobMock.mock.calls.length,
      1,
      "GolemService.startJob should be called once"
    );
    assert.strictEqual(
      startJobMock.mock.calls[0]?.arguments[0],
      jobId,
      "startJob called with correct jobId"
    );
    assert.ok(capturedCallbacks, "Callbacks should have been captured");

    // --- 2. Simulate Golem process starting ---
    await capturedCallbacks.onProcessing(jobId);

    // ASSERT 3: Check that the job is 'processing'
    const { body: processingJob, status: processingStatus } =
      await client.jobs.getJobDetails({
        params: { id: jobId },
      });

    assert.strictEqual(processingStatus, 200);
    assert.strictEqual(processingJob.status, "processing");

    // --- 3. Simulate Golem finding results and completing ---
    const mockResult = {
      addr: "0xabc123...",
      salt: "salt123",
      pubKey: "pub123",
      provider: {
        id: "provider1",
        name: "p-name",
        walletAddress: "0xprov",
      },
    };
    await capturedCallbacks.onResults(jobId, [mockResult]);
    await capturedCallbacks.onCompleted(jobId);

    // ASSERT 4: The job is now 'completed'
    const { body: completedJob, status: completedStatus } =
      await client.jobs.getJobDetails({
        params: { id: jobId },
      });
    assert.strictEqual(completedStatus, 200);
    assert.strictEqual(completedJob.status, "completed");

    // ASSERT 5: The results are correct
    const { status: resultStatus, body: jobResult } =
      await client.jobs.getJobResult({ params: { id: jobId } });
    assert.strictEqual(resultStatus, 200);
    assert.strictEqual(jobResult.length, 1, "There should be one result");
    assert.strictEqual(jobResult[0]?.addr, mockResult.addr);
    assert.deepStrictEqual(jobResult[0]?.provider, mockResult.provider);
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
