import "dotenv/config";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { Scheduler, GenerationParams, JobUpdate } from "./scheduler";

/**
 * Custom error class for address generation validation errors
 */
class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Interface for generate command options
 */
interface GenerateOptions {
  publicKey?: string; // The actual public key content
  publicKeyPath?: string; // Path to the public key file
  vanityAddressPrefix?: string;
  budgetGlm?: number;
}

/**
 * Maximum allowed vanity prefix length for security and performance
 */
const MAX_VANITY_PREFIX_LENGTH = 8;

/**
 * Maximum budget to prevent excessive resource usage
 */
const MAX_BUDGET_GLM = 1000;

/**
 * Regular expression for validating Ethereum public key format
 */
const PUBLIC_KEY_REGEX = /^0x[0-9a-fA-F]{40}$/;

/**
 * Initialize OpenTelemetry SDK for comprehensive observability
 * Sets up automatic instrumentation for the CLI application
 * Following best practices for telemetry initialization
 */
function initializeOpenTelemetry(): void {
  const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    sdk.start();
    console.log("OpenTelemetry initialized successfully");
  } catch (error) {
    console.error("OpenTelemetry initialization failed:", error);
    // Continue execution - telemetry failure should not break CLI functionality
  }
}

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
        "publicKeyPath",
      );
    }

    // Read file content
    const fileContent = readFileSync(resolvedPath, "utf8").trim();

    if (!fileContent) {
      throw new ValidationError("Public key file is empty", "publicKeyPath");
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

/**
 * Validates generate command options with comprehensive error checking
 * @param options - The options object containing publicKey, vanityAddressPrefix, and budgetGlm
 * @throws {ValidationError} When validation fails
 */
function validateGenerateOptions(options: GenerateOptions): void {
  // Validate public key presence and format
  if (!options.publicKey) {
    throw new ValidationError("Public key is required", "publicKey");
  }

  if (!PUBLIC_KEY_REGEX.test(options.publicKey)) {
    throw new ValidationError(
      "Invalid public key format. Must be a valid Ethereum address (0x followed by 40 hex characters)",
      "publicKey",
    );
  }

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

  if (options.vanityAddressPrefix.length > MAX_VANITY_PREFIX_LENGTH) {
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
}

/**
 * Handles the generate command execution with proper validation and error handling
 * @param options - Command options from commander.js
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleGenerateCommand(options: any): void {
  try {
    // Read public key from file first
    const publicKey = readPublicKeyFromFile(options.publicKey);

    // Extract and validate options
    const generateOptions: GenerateOptions = {
      publicKey: publicKey,
      publicKeyPath: options.publicKey,
      vanityAddressPrefix: options.vanityAddressPrefix,
      budgetGlm: parseInt(options.budgetGlm, 10),
    };

    // Validate all options
    validateGenerateOptions(generateOptions);

    // Display generation parameters
    console.log(
      "🚀 Starting vanity address generation with the following parameters:",
    );
    console.log(`   Public Key File: ${generateOptions.publicKeyPath}`);
    console.log(`   Public Key: ${generateOptions.publicKey}`);
    console.log(
      `   Vanity Address Prefix: ${generateOptions.vanityAddressPrefix}`,
    );
    console.log(`   Budget (GLM): ${generateOptions.budgetGlm}`);
    console.log("");
    console.log("✓ All parameters validated successfully");
    console.log("✓ OpenTelemetry tracing enabled for generation process");
    console.log("");

    // Initialize TaskManager and start generation
    const taskManager = new Scheduler();

    // Set up event listeners for real-time updates
    taskManager.on("update", (update: JobUpdate) => {
      console.log(`[${update.status.toUpperCase()}] ${update.message}`);
      if (update.activeWorkers !== undefined) {
        console.log(`   Active workers: ${update.activeWorkers}`);
      }
      if (update.numOfGeneratedAddresses) {
        console.log(
          `   Generated addresses: ${update.numOfGeneratedAddresses}`,
        );
      }
      if (update.foundPrivateKey) {
        console.log(`   🎉 Found private key: ${update.foundPrivateKey}`);
      }
      if (update.error) {
        console.error(`   ❌ Error: ${update.error}`);
      }
    });

    // Start the generation process
    const generationParams: GenerationParams = {
      publicKey: generateOptions.publicKey!,
      vanityAddressPrefix: generateOptions.vanityAddressPrefix!,
      budgetGlm: generateOptions.budgetGlm!,
      numberOfWorkers: 4, // Default number of workers
    };

    taskManager.startGenerating(generationParams);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`❌ Validation Error: ${error.message}`);
      process.exit(1);
    } else {
      console.error(`❌ Unexpected Error: ${error}`);
      process.exit(1);
    }
  }
}

/**
 * Main CLI application entry point
 * Implements generate command with comprehensive validation
 * Following TDD principles and professional development standards
 */
function main(): void {
  // Initialize observability first for comprehensive monitoring
  initializeOpenTelemetry();

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
      "Path to file containing the public key (Ethereum format: 0x...)",
    )
    .requiredOption(
      "--vanity-address-prefix <prefix>",
      "Desired vanity prefix for the generated address",
    )
    .requiredOption(
      "--budget-glm <amount>",
      "Budget in GLM tokens for the generation process",
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
  initializeOpenTelemetry,
  getPackageVersion,
  validateGenerateOptions,
  readPublicKeyFromFile,
};
