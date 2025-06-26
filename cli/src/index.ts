// Don't import anything before it!
import { shutdownOpenTelemetry } from "./instrumentation";
import { Command } from "commander";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, resolve } from "path";
//import { Scheduler } from "./scheduler";
import { ethers, hexlify } from "ethers";
import { GenerationParams } from "./scheduler";
import { GenerationPrefix } from "./prefix";
import { WorkerPoolParams, WorkerType } from "./node_manager/types";
import { WorkerPool } from "./node_manager/workerpool";
import { AppContext } from "./app_context";
import process from "process";
import { ROOT_CONTEXT } from "@opentelemetry/api";
import { computePrefixDifficulty } from "./difficulty";
import { displayDifficulty, displayTime } from "./utils/format";
import { sleep } from "@golem-sdk/golem-js";
import { pinoLogger } from "@golem-sdk/pino-logger";

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
  workerType?: string; // Worker type: 'cpu' or 'gpu'
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
  workerType: WorkerType;
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
 * Retrieves package version from package.json with proper error handling
 * @returns The semantic version string from package.json or fallback version
 */
function getPackageVersion(): string {
  try {
    const packageJsonPath = join(__dirname, "../package.json");
    const packageJsonContent = readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version;
  } catch (error) {
    console.error("Failed to read package version:", error);
    return "1.0.0"; // Fallback version
  }
}

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

class PublicKey {
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
 * Validates worker type parameter
 * @param workerType - Worker type string ('cpu' or 'gpu')
 * @returns WorkerType enum value
 * @throws {ValidationError} When worker type is invalid
 */
function validateWorkerType(workerType?: string): WorkerType {
  if (!workerType) {
    return WorkerType.GPU; // Default to GPU for backward compatibility
  }

  const normalizedType = workerType.toLowerCase();
  if (normalizedType === "cpu") {
    return WorkerType.CPU;
  } else if (normalizedType === "gpu") {
    return WorkerType.GPU;
  } else {
    throw new ValidationError(
      `Invalid worker type '${workerType}'. Must be 'cpu' or 'gpu'`,
      "workerType",
    );
  }
}

/**
 * Validates generate command options with comprehensive error checking
 * @param options - The options object containing publicKey, vanityAddressPrefix, budgetGlm, and workerType
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
  const workerType = validateWorkerType(options.workerType);

  return {
    publicKey: publicKey,
    vanityAddressPrefix: new GenerationPrefix(options.vanityAddressPrefix),
    budgetGlm: options.budgetGlm,
    workerType: workerType,
  };
}

/**
 * Handles the generate command execution with proper validation and error handling
 * @param options - Command options from commander.js
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleGenerateCommand(options: any): Promise<void> {
  const publicKey = readPublicKeyFromFile(options.publicKey);

  // Extract and validate options
  const generateOptions: GenerateCmdOptions = {
    publicKey: publicKey,
    publicKeyPath: options.publicKey,
    vanityAddressPrefix: options.vanityAddressPrefix,
    budgetGlm: parseInt(options.budgetGlm),
    resultsFile: options.resultsFile,
    workerType: options.workerType,
    numResults: BigInt(options.numResults),
    numWorkers: parseInt(options.numWorkers), // Default to 1 worker
    nonInteractive: options.nonInteractive,
    minOffers: parseInt(options.minOffers),
    minOffersTimeoutSec: parseInt(options.minOffersTimeoutSec),
  };

  // Validate all options
  const validatedOptions = validateGenerateOptions(generateOptions);

  // Display generation parameters
  console.log(
    "🚀 Starting vanity address generation with the following parameters:",
  );
  console.log(`   Public Key File: ${generateOptions.publicKeyPath}`);
  console.log(`   Public Key: ${validatedOptions.publicKey.toHex()}`);
  console.log(
    `   Vanity Address Prefix: ${validatedOptions.vanityAddressPrefix}`,
  );
  console.log(`   Budget (GLM): ${validatedOptions.budgetGlm}`);
  console.log(`   Worker Type: ${validatedOptions.workerType}`);
  console.log("");
  console.log("✓ All parameters validated successfully");
  console.log("✓ OpenTelemetry tracing enabled for generation process");
  console.log("");

  const difficulty = computePrefixDifficulty(
    validatedOptions.vanityAddressPrefix.fullPrefix(),
  );

  console.log(
    `Difficulty of the prefix: ${displayDifficulty(difficulty)}, Estimation single Nvidia 3060 time: ${displayTime("GPU ", difficulty / 250000000)}`,
  );
  if (validatedOptions.workerType === WorkerType.CPU) {
    console.log(
      `Using CPU worker type. Estimated time: ${displayTime("CPU ", difficulty / 10000000)}`,
    );
  }
  if (!generateOptions.nonInteractive) {
    console.log("Continue in 10 seconds... Press Ctrl+C to cancel");
    await sleep(10);
  }

  const generationParams: GenerationParams = {
    publicKey: validatedOptions.publicKey.toTruncatedHex(),
    vanityAddressPrefix: validatedOptions.vanityAddressPrefix,
    budgetGlm: validatedOptions.budgetGlm!,
    numberOfWorkers: parseInt(options.numWorkers),
    singlePassSeconds: options.singlePassSec
      ? parseInt(options.singlePassSec, 10)
      : 20, // Default single pass duration
    numberOfPasses: options.numberOfPasses
      ? parseInt(options.numberOfPasses, 10)
      : 1, // Default number of passes
    numResults: options.numResults,
  };

  // Initialize Scheduler for task management and subproblem generation
  const workerPoolParams: WorkerPoolParams = {
    numberOfWorkers: generationParams.numberOfWorkers,
    rentalDurationSeconds:
      generationParams.singlePassSeconds * generationParams.numberOfPasses,
    budgetGlm: generationParams.budgetGlm,
    workerType: validatedOptions.workerType,
  };

  const logger = pinoLogger({
    level: "info",
    name: "golem-vaddr-cli",
  });

  const ctx: AppContext = new AppContext(ROOT_CONTEXT).WithLogger(logger);

  const workerPool = new WorkerPool(workerPoolParams);

  let processExitCode = 0;
  try {
    await workerPool.connectToGolemNetwork(ctx);
    console.log("✅ Connected to Golem network successfully");

    const rentalPool = await workerPool.initializeRentalPool(ctx);
    console.log(
      `✅ Initialized pool of ${generationParams.numberOfWorkers} rentals`,
    );

    console.log(
      `🔍 Looking for the best offer (waiting for at least ${generateOptions.minOffers} proposals with a ${generateOptions.minOffersTimeoutSec} second timeout)`,
    );
    await workerPool.waitForEnoughOffers(
      ctx,
      rentalPool,
      generateOptions.minOffers,
      generateOptions.minOffersTimeoutSec,
    );

    console.log(
      "🔨 Starting work on vanity address generation, this may take a while",
    );
    await workerPool.runCommandConcurrent(ctx, rentalPool, generationParams);
    if (generateOptions.resultsFile) {
      const results = await workerPool.results();
      writeFileSync(
        generateOptions.resultsFile,
        JSON.stringify(
          {
            entries: results,
          },
          null,
          2,
        ),
      );
      console.log(`✅ Results saved to ${generateOptions.resultsFile}`);
    } else {
      console.log("Results:", workerPool.results);
    }

    try {
      await workerPool.drainPool(ctx, rentalPool);
      console.log("✅ All rentals cleaned up successfully");
    } catch (error) {
      console.error("❌ Error during rental cleanup:", error);
    }
  } catch (error) {
    processExitCode = 1;
    console.error("❌ Failed during execution:", error);
  }
  // Always disconnect from Golem network, even if rental cleanup failed
  try {
    await workerPool.disconnectFromGolemNetwork(ctx);
    console.log("✅ Disconnected from Golem network");
  } catch (disconnectError) {
    processExitCode = 1;
    console.error(
      "❌ Error disconnecting from Golem network:",
      disconnectError,
    );
  }

  await workerPool.stopServices(ctx);
  console.log("✅ Stopped all services");
  process.exit(processExitCode);
}

function setUpSignalHandlers() {
  // We'd prefer to do it on 'exit', but the docs claim that async operations are forbidden in 'exit' listeners.
  // Note that this solution does not work on Windows.
  ["SIGTERM", "SIGINT"].forEach((event) =>
    process.on(event, () => {
      shutdownOpenTelemetry()
        .then(
          () => console.log("OpenTelemetry shut down successfully"),
          (err) => console.log("Error shutting down OpenTelemetry", err),
        )
        .finally(() => process.exit(0));
    }),
  );
}

/**
 * Main CLI application entry point
 * Implements generate command with comprehensive validation
 * Following TDD principles and professional development standards
 */
function main(): void {
  setUpSignalHandlers();

  // Create CLI program using commander.js with proper configuration
  const program = new Command();

  program
    .name("golem-addr")
    .description("Vanity address generator CLI with OpenTelemetry support")
    .version(getPackageVersion());

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
      "--number-of-passes <numberOfPasses>",
      "Number of passes to perform (default: 1)",
    )
    .option(
      "--results-file <file>",
      "Path to save the generation results (default: golem_results.json)",
    )
    .option(
      "--worker-type <type>",
      "Worker type to use: 'cpu' or 'gpu' (default: gpu)",
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
  getPackageVersion,
  validateGenerateOptions,
  validateWorkerType,
  readPublicKeyFromFile,
};
