// Don't import anything before it!
import { shutdownOpenTelemetry } from "./instrumentation";
import { trace, metrics } from "@opentelemetry/api";
import { MetricsCollector } from "./metrics_collector";
import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ethers, hexlify } from "ethers";
import { Scheduler } from "./scheduler";
import { GenerationParams } from "./params";
import { GenerationPrefix } from "./params";
import {
  GolemSessionManager,
  SessionManagerParams,
} from "./node_manager/golem_session";
import { AppContext } from "./app_context";
import process from "process";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import { computePrefixDifficulty } from "./difficulty";
import { displayDifficulty, displayTime } from "./utils/format";
import { sleep } from "@golem-sdk/golem-js";
import { pinoLogger } from "@golem-sdk/pino-logger";
import { ProcessingUnitType } from "./node_manager/config";
import "dotenv/config";
import { EstimatorService } from "./estimator_service";
import { ResultsService } from "./results_service";
import { APP_NAME, APP_VERSION } from "./version";

/**
 * Custom error class for address generation validation errors
 */
class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message + ": " + field);
    this.name = "ValidationError";
  }
}

/**
 * Interface for generate command options
 */
export interface GenerateCmdOptions {
  publicKey?: string; // The actual public key content
  publicKeyPath?: string; // Path to the public key file
  vanityAddressPrefix?: string;
  budgetGlm?: number;
  prefix?: string;
  resultsFile?: string; // Path to save results
  processingUnit?: string; // Processing unit type ('cpu' or 'gpu')
  singlePassSec?: string; // Duration of a single pass in seconds
  numResults: bigint;
  numWorkers: number;
  nonInteractive: boolean; // Run in non-interactive mode
  minOffers: number; // Minimum offers to wait for
  minOffersTimeoutSec: number; // Timeout for waiting for enough offers (`minOffers`)
}

/**
 * Interface for validated options
 */
interface GenerateOptionsValidated {
  publicKey: PublicKey; // The actual public key content
  budgetGlm?: number;
  vanityAddressPrefix: GenerationPrefix;
  processingUnitType: ProcessingUnitType;
}

/**
 * Maximum allowed vanity prefix length for security and performance
 */
const MAX_VANITY_PREFIX_LENGTH = 16;

/**
 * Maximum budget to prevent excessive resource usage
 */
const MAX_BUDGET_GLM = 1000;

/**
 * Reads and validates a public key from a file path
 * @param publicKeyPath - Path to the file containing the public key
 * @returns The public key content as a string
 * @throws {ValidationError} When file cannot be read or contains invalid format
 */
function readPublicKeyFromFile(publicKeyPath: string): string {
  try {
    // Resolve the path to handle relative paths
    const resolvedPath = resolve(publicKeyPath);

    // Check if file exists
    if (!existsSync(resolvedPath)) {
      throw new ValidationError(
        `Public key file not found: ${resolvedPath}`,
        publicKeyPath,
      );
    }

    // Read file content
    const fileContent = readFileSync(resolvedPath, "utf8").trim();

    if (!fileContent) {
      throw new ValidationError("Public key file is empty", publicKeyPath);
    }

    return fileContent;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      `Failed to read public key file: ${error}`,
      "publicKeyPath",
    );
  }
}

export class PublicKey {
  bytes: Uint8Array;

  constructor(publicKey: string) {
    if (!publicKey.startsWith("0x")) {
      publicKey = "0x" + publicKey; // Ensure public key starts with '0x'
    }
    let byteArray: Uint8Array<ArrayBufferLike>;
    try {
      byteArray = ethers.getBytes(publicKey);
    } catch (error) {
      throw new ValidationError(
        `Invalid public key format. ${error}`,
        publicKey,
      );
    }

    if (byteArray.length != 65) {
      throw new ValidationError("Public key must be 65 bytes long", publicKey);
    }
    if (byteArray[0] !== 4) {
      throw new ValidationError(
        "Public key must start with byte 0x04",
        publicKey,
      );
    }

    this.bytes = byteArray;
  }

  toHex(): string {
    return hexlify(this.bytes);
  }

  toTruncatedHex(): string {
    return this.toHex().replace("0x04", "");
  }
}

/**
 * Validates the processing unit type
 * @param processingUnitType - Processing unit type string ('cpu' or 'gpu')
 * @returns ProcessingUnitType enum value
 * @throws {ValidationError} When processing unit type is invalid
 */
function validateProcessingUnit(
  processingUnitType?: string,
): ProcessingUnitType {
  if (!processingUnitType) {
    return ProcessingUnitType.GPU; // Default to GPU for backward compatibility
  }

  const normalizedType = processingUnitType.toLowerCase();
  if (normalizedType === "cpu") {
    return ProcessingUnitType.CPU;
  } else if (normalizedType === "gpu") {
    return ProcessingUnitType.GPU;
  } else {
    throw new ValidationError(
      `Invalid processing unit '${processingUnitType}'. Must be 'cpu' or 'gpu'`,
      "processingUnit",
    );
  }
}

/**
 * Validates generate command options with comprehensive error checking
 * @param options - The options object containing publicKey, vanityAddressPrefix, budgetGlm, and processingUnitType
 * @throws {ValidationError} When validation fails
 */
function validateGenerateOptions(
  options: GenerateCmdOptions,
): GenerateOptionsValidated {
  // Validate public key presence and format
  if (!options.publicKey) {
    throw new ValidationError("Public key is required", "publicKey");
  }

  const publicKey = new PublicKey(options.publicKey);

  // Validate vanity address prefix presence and constraints
  if (
    options.vanityAddressPrefix === undefined ||
    options.vanityAddressPrefix === null
  ) {
    throw new ValidationError(
      "Vanity address prefix is required",
      "vanityAddressPrefix",
    );
  }

  if (options.vanityAddressPrefix.length === 0) {
    throw new ValidationError(
      "Vanity address prefix cannot be empty",
      "vanityAddressPrefix",
    );
  }

  if (
    options.vanityAddressPrefix.replace("0x", "").length >
    MAX_VANITY_PREFIX_LENGTH
  ) {
    throw new ValidationError(
      `Vanity address prefix too long. Maximum length is ${MAX_VANITY_PREFIX_LENGTH} characters`,
      "vanityAddressPrefix",
    );
  }

  // Validate budget constraints
  if (options.budgetGlm === undefined || options.budgetGlm === null) {
    throw new ValidationError("Budget is required", "budgetGlm");
  }

  if (options.budgetGlm <= 0) {
    throw new ValidationError("Budget must be a positive number", "budgetGlm");
  }

  if (options.budgetGlm > MAX_BUDGET_GLM) {
    throw new ValidationError(
      `Budget exceeds maximum allowed. Maximum is ${MAX_BUDGET_GLM} GLM`,
      "budgetGlm",
    );
  }

  if (options.minOffers < 0 || isNaN(options.minOffers)) {
    throw new ValidationError(
      "Minimum offers must be a non-negative number",
      "minOffers",
    );
  }

  if (isNaN(options.minOffersTimeoutSec) || options.minOffersTimeoutSec < 0) {
    throw new ValidationError(
      "Minimum offers timeout must be a non-negative number",
      "minOffersTimeoutSec",
    );
  }

  // Validate worker type
  const processingUnitType = validateProcessingUnit(options.processingUnit);

  return {
    publicKey: publicKey,
    vanityAddressPrefix: new GenerationPrefix(options.vanityAddressPrefix),
    budgetGlm: options.budgetGlm,
    processingUnitType: processingUnitType,
  };
}

/**
 * Handles the generate command execution with proper validation and error handling
 * @param options - Command options from commander.js
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleGenerateCommand(options: any): Promise<void> {
  const logger = pinoLogger({
    name: APP_NAME,
    transport: {
      targets: [
        {
          target: "pino-opentelemetry-transport",
          level: process.env.OTEL_LOG_LEVEL || "info",
          options: {
            severityNumberMap: {
              trace: 1,
              debug: 5,
              info: 9,
              warn: 13,
              error: 17,
              fatal: 21,
            },
          },
        },
        // overwrite it with GOLEM_PINO_LOG_LEVEL
        { target: "pino-pretty", options: { colorize: true }, level: "info" },
      ],
    },
  });

  const tracer = trace.getTracer(APP_NAME, APP_VERSION);
  const meter = metrics.getMeter(APP_NAME, APP_VERSION);
  const mCollector = MetricsCollector.newCollector(meter);

  const appCtx = new AppContext(ROOT_CONTEXT)
    .WithLogger(logger)
    .WithTracer(tracer)
    .WithCollector(mCollector);

  let golemSessionManager: GolemSessionManager | null = null;
  let isShuttingDown = false;
  const gracefulShutdown = async (exitCode: number) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    console.log("\nGracefully shutting down...");

    if (golemSessionManager) {
      // first stop the generation process if it's still running
      try {
        golemSessionManager.stopWork("User initiated shutdown");
        appCtx.consoleInfo("✅ Generation process stopped successfully");
      } catch (error) {
        appCtx.L().error("❌ Error stopping generation process:", error);
      }

      if (options.resultsFile) {
        try {
          await golemSessionManager.resultService.saveResultsToFile(
            golemSessionManager.estimatorService,
            options.resultsFile,
          );
          appCtx.consoleInfo(
            `✅ Results saved to file: ${options.resultsFile}`,
          );
        } catch (error) {
          appCtx.L().error(`❌ Error saving results to file: ${error}`);
        }
      }

      // then clean up rentals (which gives us the chance to pay for the work done)
      try {
        await golemSessionManager.drainPool(appCtx);
        appCtx.consoleInfo("✅ All rentals cleaned up successfully");
      } catch (error) {
        appCtx.L().error("❌ Error during rental cleanup:", error);
      }

      // only then we can safely disconnect from the Golem network and release the allocation
      try {
        await golemSessionManager.disconnectFromGolemNetwork(appCtx);
        appCtx.consoleInfo("✅ Disconnected from Golem network");
      } catch (disconnectError) {
        appCtx
          .L()
          .error("❌ Error disconnecting from Golem network:", disconnectError);
      }
    }

    // and shut down OpenTelemetry
    try {
      await shutdownOpenTelemetry();
      appCtx.consoleInfo("✅ OpenTelemetry shut down successfully");
    } catch (err) {
      console.info("❌ Error shutting down OpenTelemetry", err);
    }

    process.exit(exitCode);
  };

  // Register signal handlers to initiate graceful shutdown
  process.on("SIGINT", () => gracefulShutdown(0));
  process.on("SIGTERM", () => gracefulShutdown(0));

  try {
    const publicKey = readPublicKeyFromFile(options.publicKey);

    const generateOptions: GenerateCmdOptions = {
      publicKey: publicKey,
      publicKeyPath: options.publicKey,
      vanityAddressPrefix: options.vanityAddressPrefix,
      budgetGlm: parseFloat(options.budgetGlm),
      resultsFile: options.resultsFile,
      processingUnit: options.processingUnit,
      numResults: BigInt(options.numResults),
      numWorkers: parseInt(options.numWorkers),
      nonInteractive: options.nonInteractive,
      minOffers: parseInt(options.minOffers),
      minOffersTimeoutSec: parseInt(options.minOffersTimeoutSec),
    };

    const validatedOptions = validateGenerateOptions(generateOptions);

    appCtx.consoleInfo(
      "🚀 Starting vanity address generation with the following parameters:\n" +
        `   Public Key File: ${generateOptions.publicKeyPath}\n` +
        `   Public Key: ${validatedOptions.publicKey.toHex()}\n` +
        `   Vanity Address Prefix: ${validatedOptions.vanityAddressPrefix.fullPrefix()}\n` +
        `   Budget (GLM): ${validatedOptions.budgetGlm}\n` +
        `   Worker Type: ${validatedOptions.processingUnitType}\n\n` +
        `✓ All parameters validated successfully\n` +
        `✓ OpenTelemetry tracing enabled for generation process\n`,
    );

    const difficulty = computePrefixDifficulty(
      validatedOptions.vanityAddressPrefix.fullPrefix(),
    );
    const estimatedSecondsToFindOneAddress =
      validatedOptions.processingUnitType === ProcessingUnitType.CPU
        ? difficulty / 10000000
        : difficulty / 250000000;

    appCtx.consoleInfo(
      `Difficulty of the prefix: ${displayDifficulty(difficulty)}`,
    );
    if (validatedOptions.processingUnitType === ProcessingUnitType.GPU) {
      appCtx.consoleInfo(
        `Using GPU worker type. Estimated time on a single Nvidia 3060: ${displayTime("GPU ", estimatedSecondsToFindOneAddress)}`,
      );
    } else {
      appCtx.consoleInfo(
        `Using CPU worker type. Estimated time: ${displayTime("CPU ", estimatedSecondsToFindOneAddress)}`,
      );
    }
    if (!generateOptions.nonInteractive) {
      appCtx.consoleInfo("Continue in 10 seconds... Press Ctrl+C to cancel");
      await sleep(10);
    }

    const generationParams: GenerationParams = {
      publicKey: validatedOptions.publicKey.toTruncatedHex(),
      vanityAddressPrefix: validatedOptions.vanityAddressPrefix,
      budgetGlm: validatedOptions.budgetGlm!,
      numberOfWorkers: parseInt(options.numWorkers),
      singlePassSeconds: options.singlePassSec
        ? parseInt(options.singlePassSec)
        : 20, // Default single pass duration
      numResults: options.numResults,
    };

    const estimatedRentalDurationSeconds = Math.max(
      15 * 60, // minimum rental duration on golem is 15 minutes, otherwise providers won't even consider the offer
      (Number(generationParams.numResults) * estimatedSecondsToFindOneAddress) /
        generationParams.numberOfWorkers,
    );

    const formatDateForFilename = (date = new Date()) => {
      return date
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")
        .replace("T", "_");
    };
    const resultService = new ResultsService(appCtx, {
      vanityPrefix: validatedOptions.vanityAddressPrefix,
      //location of the file that saves all results
      csvOutput:
        process.env.RESULT_CSV_FILE || `results-${formatDateForFilename()}.csv`,
    });
    const estimatorService = new EstimatorService(appCtx, {
      vanityPrefix: validatedOptions.vanityAddressPrefix,
      messageLoopSecs: parseFloat(
        process.env.MESSAGE_LOOP_SEC_INTERVAL || "30.0",
      ),
      processLoopSecs: parseFloat(
        process.env.PROCESS_LOOP_SEC_INTERVAL || "1.0",
      ),
      resultService,
    });
    const sessionManagerParams: SessionManagerParams = {
      numberOfWorkers: generationParams.numberOfWorkers,
      rentalDurationSeconds: estimatedRentalDurationSeconds,
      budgetGlm: generationParams.budgetGlm,
      processingUnitType: validatedOptions.processingUnitType,
      estimatorService,
      resultService,
    };

    golemSessionManager = new GolemSessionManager(sessionManagerParams);

    await golemSessionManager.connectToGolemNetwork(appCtx);
    appCtx.consoleInfo("✅ Connected to Golem network successfully");

    await golemSessionManager.initializeRentalPool(appCtx);
    appCtx.consoleInfo(
      `✅ Initialized pool of ${generationParams.numberOfWorkers} rentals`,
    );

    appCtx.consoleInfo(
      `🔍 Looking for the best offer (waiting for at least ${generateOptions.minOffers} proposals with a ${generateOptions.minOffersTimeoutSec} second timeout)`,
    );
    await golemSessionManager.waitForEnoughOffers(
      appCtx,
      generateOptions.minOffers,
      generateOptions.minOffersTimeoutSec,
    );

    const scheduler = new Scheduler(golemSessionManager, estimatorService);
    await scheduler.runGenerationProcess(appCtx, generationParams);

    // Normal completion, initiate shutdown.
    await gracefulShutdown(0);
  } catch (error) {
    // Avoid logging error if shutdown was user-initiated via Ctrl+C
    if (!isShuttingDown) {
      appCtx.consoleError("❌ Failed during execution:", error);
    }
    await gracefulShutdown(1);
  }
}

/**
 * Main CLI application entry point
 * Implements generate command with comprehensive validation
 * Following TDD principles and professional development standards
 */
function main(): void {
  // Create CLI program using commander.js with proper configuration
  const program = new Command();

  program
    .name(APP_NAME)
    .description("Vanity address generator CLI with OpenTelemetry support")
    .version(APP_VERSION);

  // Generate command - Step 2 implementation
  program
    .command("generate")
    .description("Generate vanity addresses with specified parameters")
    .requiredOption(
      "--public-key <path>",
      "Path to file containing the public key",
    )
    .requiredOption(
      "--vanity-address-prefix <prefix>",
      "Desired vanity prefix for the generated address",
    )
    .requiredOption(
      "--budget-glm <amount>",
      "Budget in GLM tokens for the generation process",
    )
    .option(
      "--single-pass-sec <singlePassSec>",
      "How long single pass should take in seconds (default: 20)",
    )
    .option(
      "--results-file <file>",
      "Path to save the generation results (default: golem_results.json)",
    )
    .option(
      "--processing-unit <type>",
      "Processing unit to use: 'cpu' or 'gpu' (default: gpu)",
    )
    .option(
      "--num-results <numResults>",
      "Number of vanity addresses to find (default: 1)",
      "1", // Default value
    )
    .option(
      "--num-workers <numWorkers>",
      "Number of workers to allocate (default: 1)",
      "1", // Default value
    )
    .option(
      "--non-interactive",
      "Run in non-interactive mode without prompts",
      false, // Default to false
    )
    .option(
      "--min-offers <minOffers>",
      "Minimum number of offers to wait for before starting (default: 5)",
      "5", // Default value
    )
    .option(
      "--min-offers-timeout-sec <minOffersTimeoutSec>",
      "Timeout in seconds for waiting for enough offers (default: 30)",
      "30", // Default value
    )
    .action(handleGenerateCommand);

  // Parse command line arguments and execute appropriate command
  program.parse();
}

// Execute main function only when file is run directly (not imported)
if (require.main === module) {
  main();
}

// Export functions for comprehensive testing coverage
export {
  main,
  validateGenerateOptions,
  validateProcessingUnit,
  readPublicKeyFromFile,
};
