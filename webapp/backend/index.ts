import "dotenv/config";
import Fastify from "fastify";
import {
  AppContext,
  GenerationPrefix,
  GolemSessionManager,
  ProcessingUnitType,
  PublicKey,
  Scheduler,
  type GenerationParams,
  type SessionManagerParams,
} from "@unoperate/golem-vaddr-cli/lib";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import { pinoPrettyLogger } from "@golem-sdk/pino-logger";
const fastify = Fastify({
  logger: true,
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  return { hello: "world" };
});

fastify.post("/generate", async function handler(request, reply) {
  const generationParams: GenerationParams = {
    publicKey: new PublicKey(
      "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28"
    ).toTruncatedHex(),
    vanityAddressPrefix: new GenerationPrefix("0x1234321"),
    budgetGlm: 1,
    numberOfWorkers: 1,
    singlePassSeconds: 20,
    numResults: 3n,
  };

  const estimatedRentalDurationSeconds = 15 * 60;

  const workerPoolParams: SessionManagerParams = {
    numberOfWorkers: generationParams.numberOfWorkers,
    rentalDurationSeconds: estimatedRentalDurationSeconds,
    budgetGlm: generationParams.budgetGlm,
    processingUnitType: ProcessingUnitType.GPU,
  };

  const logger = pinoPrettyLogger({
    level: "info",
    name: "golem-vanity-market-backend",
  });

  const appContext = new AppContext(ROOT_CONTEXT).WithLogger(logger);
  const golemSessionManager = new GolemSessionManager(workerPoolParams);

  await golemSessionManager.connectToGolemNetwork(appContext);
  console.log("✅ Connected to Golem network successfully");

  await golemSessionManager.initializeRentalPool(appContext);
  console.log(
    `✅ Initialized pool of ${generationParams.numberOfWorkers} rentals`
  );

  console.log(
    `🔍 Looking for the best offer (waiting for at least ${5} proposals with a ${30} second timeout)`
  );
  await golemSessionManager.waitForEnoughOffers(appContext, 5, 30);

  const scheduler = new Scheduler(golemSessionManager);
  await scheduler.runGenerationProcess(appContext, generationParams);

  const results = await golemSessionManager.results();
  await golemSessionManager.drainPool(appContext);
  await golemSessionManager.disconnectFromGolemNetwork(appContext);
  await golemSessionManager.stopServices(appContext);
  return {
    message: "Generation completed",
    results,
  };
});

// Run the server!
try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
