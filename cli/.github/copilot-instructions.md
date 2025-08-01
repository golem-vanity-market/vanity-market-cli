# GitHub Copilot Instructions for Golem Vanity Address Generator CLI

## Project Classification

**Architecture**: Enterprise-grade distributed vanity cryptocurrency address generation platform  
**Language**: TypeScript (strict mode, ES2020 target)  
**Runtime**: Node.js 20+ with Commander.js CLI framework  
**Complexity**: 25+ TypeScript modules across 8 directories, distributed computing orchestration  
**Security Model**: Public key cryptography with elliptic curve point addition, private keys never leave local machine

## Technology Stack

- **Languages**: TypeScript (strict mode, ES2020 target)
- **Runtime**: Node.js 20+ with Commander.js CLI framework
- **Distributed Computing**: Golem Network SDK (@golem-sdk/golem-js ^3.5.1)
- **Database**: SQLite with Drizzle ORM (type-safe operations)
- **Cryptography**: Elliptic.js (secp256k1), Ethers.js (Ethereum address generation)
- **Observability**: Full OpenTelemetry stack with enterprise monitoring
- **Testing**: Jest with TypeScript support
- **Reactive Programming**: RxJS for event streams and async coordination
- **CLI Framework**: Commander.js with graceful shutdown handling
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier 3.5.3
- **Build**: TypeScript compiler with auto-versioning

## Development Philosophy

- **Enterprise Architecture**: Focus on distributed computing, cryptographic validation, and enterprise observability patterns
- **Immutable Context Pattern**: All operations use AppContext builder pattern for dependency injection
- **Type Safety**: Strict TypeScript mode with comprehensive interface definitions
- **Security First**: Multi-layer validation, proper cryptographic operations, private key never stored
- **Observability**: Full OpenTelemetry integration with structured logging and distributed tracing
- **Graceful Degradation**: Comprehensive error handling with automatic recovery patterns
- **Professional Standards**: Follow enterprise-grade code quality, documentation, and maintainability

## Critical File Locations and Patterns

### Core Entry Points

- **CLI Entry**: `/src/index.ts` - Main Commander.js application with graceful shutdown handling
- **OpenTelemetry**: `/src/instrumentation.ts` - MUST be imported first, enterprise observability setup
- **Main Orchestrator**: `/src/scheduler.ts` - Central business logic coordinator
- **Network Manager**: `/src/node_manager/golem_session.ts` - Golem Network abstraction layer

### Data Layer

- **Database Schema**: `/src/lib/db/schema.ts` - Drizzle ORM SQLite schema (jobs, provider_jobs, proofs tables)
- **DB Config**: `/drizzle.config.ts` - Migration configuration
- **Models**: `/src/params.ts` - Core interfaces (GenerationParams, GenerationPrefix, ProcessingUnitType)

### Key Algorithms

- **Validation**: `/src/validator.ts` - Elliptic curve cryptographic validation (secp256k1)
- **Estimation**: `/src/estimator/estimator.ts` - Monte Carlo statistical estimation
- **Difficulty**: `/src/difficulty.ts` - Pattern complexity calculation (16^length)
- **Selection**: `/src/node_manager/selector.ts` - Cost-based provider selection

## Code Style and Conventions

### General Guidelines

- Use clear, descriptive variable and function names
- Prefer explicit code over clever shortcuts
- Include comprehensive error handling and validation
- Add meaningful comments for complex algorithms
- Follow consistent indentation (2 spaces for JavaScript/TypeScript, 4 for Python)

### Function Naming

- Use camelCase for JavaScript/TypeScript functions
- Use snake_case for Python functions
- Prefix boolean functions with `is`, `has`, `can`, or `should`
- Use verb-noun patterns for action functions (e.g., `generateAddress`, `validatePattern`)

### Variable Naming

- Use descriptive names: `targetPattern` instead of `pattern`
- Avoid abbreviations unless they're widely understood
- Use constants for magic numbers and strings

## Architecture Patterns

### Dependency Injection

**Pattern**: Immutable context with builder pattern  
**Location**: `/src/app_context.ts` (lines 15-50)  
**Usage**: `new AppContext(ROOT_CONTEXT).WithLogger(logger).WithTracer(tracer).WithDatabase(db)`  
**Key Methods**: `getDB()`, `L()`, `tracer()`, `collector()`

### Database Operations

**ORM**: Drizzle with type-safe operations  
**Tables**: jobs (1:many) → provider_jobs (1:many) → proofs  
**Pattern**: Repository pattern with recorder interfaces  
**Implementations**: `GollemSessionRecorderImpl`, `SchedulerRecorderImpl`

### Reactive Architecture

**Framework**: RxJS for event streams and async coordination  
**Pattern**: Observer pattern for budget monitoring with callbacks  
**Location**: `/src/budget.ts` - BudgetMonitor with success/error/exhausted handlers

### Error Handling

- Use immutable context pattern for all error propagation
- Implement graceful degradation for Golem network issues
- Follow OpenTelemetry structured logging for error tracking
- Validate all cryptographic operations with multi-layer verification
- Provider reputation system for handling unreliable workers

## Testing Strategy

### Test Structure

- Create comprehensive unit tests for cryptographic validation functions
- Use integration tests for Golem network interactions and end-to-end workflows
- Implement performance tests for distributed generation algorithms
- Include edge cases for elliptic curve operations and provider failures
- Follow AppContext pattern for test setup with proper OpenTelemetry context

### Test Naming

- Use descriptive test names: `should_validate_secp256k1_public_key_with_proper_format`
- Group related tests in describe blocks by module (validator, estimator, scheduler)
- Use beforeEach/afterEach for database state management and context cleanup

### Test Coverage

- Test both success and failure paths for cryptographic operations
- Include boundary condition tests for budget limits and provider timeouts
- Test with various input combinations for vanity prefix patterns
- Validate proper OpenTelemetry trace propagation in test environments

### Critical Test Data

**Cryptographic Test Vectors**: Known-good address/salt/pubkey combinations for validation testing  
**Invalid Cases**: Comprehensive negative testing for all validation functions

## Security Guidelines

### Input Validation

- Sanitize all user inputs with strict format validation
- Validate vanity address patterns (1-16 chars, hex format validation)
- Implement budget limits and provider rental duration caps
- Check for malicious patterns and injection attacks

### Key Management

- Never store private keys in plaintext or transmit them over network
- Use secure random number generation for salt creation
- Implement proper elliptic curve operations with secp256k1
- Follow cryptographic best practices for public key validation (65 bytes, 0x04 prefix)

### Data Protection

- Minimize data retention (only necessary proof storage)
- Use secure Golem Network communication protocols
- Implement proper access controls for database operations
- Regular security audits of cryptographic implementations

### Cryptographic Operations

- **Private Key Security**: Never stored, never transmitted, only public keys used
- **Validation**: Multi-layer verification with elliptic curve point addition
- **Salt Generation**: Cryptographically secure random number generation
- **Address Derivation**: Standard Ethereum address generation from public key

## Documentation Standards

### README Requirements

- Clear installation and setup instructions with Golem Network prerequisites
- Usage examples with expected outputs and CLI parameter explanations
- API documentation for public interfaces and AppContext patterns
- Contributing guidelines emphasizing type safety and OpenTelemetry requirements

### Code Documentation

- Document all cryptographic operations with mathematical references
- Include examples of proper AppContext usage in complex operations
- Explain distributed computing patterns and provider interaction workflows
- Document OpenTelemetry tracing patterns for debugging distributed operations

## Specific Implementation Guidance

### Address Generation Functions

```typescript
// Preferred pattern for address generation with AppContext
async function generateVanityAddress(
  ctx: AppContext,
  options: GenerationParams,
): Promise<GenerationResult> {
  const tracer = ctx.tracer();
  const span = tracer.startSpan("generateVanityAddress");

  try {
    // Validate inputs using cryptographic validation
    await validateGenerationOptions(ctx, options);

    // Use Golem Network distributed processing
    const scheduler = new Scheduler(ctx);
    const result = await scheduler.executeGeneration(options);

    // Validate results using elliptic curve verification
    await validateGenerationResult(ctx, result);

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw new AddressGenerationError(error.message, ctx);
  } finally {
    span.end();
  }
}
```

### AppContext Usage Pattern

```typescript
// Standard context creation and usage
function createOperationContext(
  parentCtx: AppContext,
  operationName: string,
): AppContext {
  const logger = parentCtx.L().child({ operation: operationName });
  return parentCtx.WithLogger(logger);
}

// Database operations with context
async function recordProviderJob(
  ctx: AppContext,
  jobData: ProviderJobData,
): Promise<void> {
  const db = ctx.getDB();
  await db.insert(providerJobs).values(jobData);
  ctx.L().info("Provider job recorded", { jobId: jobData.id });
}
```

### Cryptographic Validation Pattern

```typescript
// Elliptic curve validation with proper error handling
import { ec as EC } from "elliptic";

function validatePublicKey(ctx: AppContext, publicKeyHex: string): boolean {
  const tracer = ctx.tracer();
  const span = tracer.startSpan("validatePublicKey");

  try {
    // Validate format (65 bytes, 0x04 prefix)
    if (!publicKeyHex.startsWith("0x04") || publicKeyHex.length !== 130) {
      throw new ValidationError("Invalid public key format");
    }

    // Verify elliptic curve point
    const ec = new EC("secp256k1");
    const keyPair = ec.keyFromPublic(publicKeyHex.slice(2), "hex");
    const isValid = keyPair.validate().result;

    ctx.L().debug("Public key validation completed", {
      publicKey: publicKeyHex.slice(0, 10) + "...",
      isValid,
    });

    return isValid;
  } catch (error) {
    span.recordException(error);
    ctx.L().error("Public key validation failed", { error: error.message });
    return false;
  } finally {
    span.end();
  }
}
```

### Pattern Matching

- Use efficient algorithms (Boyer-Moore, KMP) for pattern searching
- Implement case-insensitive matching where appropriate
- Support regex patterns with proper validation
- Optimize for common use cases

### Configuration Management

- Use environment variables for configuration
- Implement configuration validation
- Support different environments (dev, test, prod)
- Document all configuration options

## Performance Optimization

### Parallel Processing

- **Worker Pool**: Configurable parallelism with optimal provider utilization
- **Async Operations**: Non-blocking I/O with proper resource management
- **Memory Efficiency**: Rolling history windows, bounded data structures

### Database Performance

- **SQLite**: Embedded database with WAL mode for concurrent access
- **Indexing**: Proper foreign key relationships, query optimization
- **Batch Operations**: Efficient bulk inserts for proof storage

### Network Optimization

- **Provider Selection**: Cost-based optimization with performance weighting
- **Rental Management**: Optimal duration balancing cost vs efficiency
- **Budget Management**: Predictive allocation with automatic top-ups

## Deployment and Operations

### Build Process

- Implement proper build scripts with auto-versioning via `/tools/update-version.ts`
- Use dependency management tools with pinned versions for security
- Include linting and formatting in CI/CD with ESLint TypeScript rules
- Generate optimized production builds targeting ES2020 with CommonJS

### Monitoring

- Implement OpenTelemetry tracing for all major operations with enterprise stack
- Add performance metrics collection via `/src/metrics_collector.ts`
- Monitor error rates, provider failures, and budget utilization
- Include health check endpoints and distributed tracing correlation

## Common Patterns to Suggest

### Error Handling Pattern

```typescript
class AddressGenerationError extends Error {
  constructor(
    message: string,
    public readonly context: AppContext,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AddressGenerationError";
    context.L().error("Address generation failed", { error: message, code });
  }
}
```

### Validation Pattern

```typescript
function validateAddressPattern(ctx: AppContext, pattern: string): void {
  if (!pattern || typeof pattern !== "string") {
    throw new ValidationError("Pattern must be a non-empty string", ctx);
  }

  if (pattern.length > 16 || pattern.length < 1) {
    throw new ValidationError("Pattern length must be 1-16 characters", ctx);
  }

  // Hex pattern validation for Ethereum addresses
  if (!/^[0-9a-fA-F]+$/.test(pattern)) {
    throw new ValidationError(
      "Pattern must contain only hexadecimal characters",
      ctx,
    );
  }
}
```

### Configuration Pattern

```typescript
const config = {
  maxBudgetGlm: parseInt(process.env.MAX_BUDGET_GLM) || 1000,
  maxWorkers: parseInt(process.env.MAX_WORKERS) || 10,
  supportedUnits: ["cpu", "gpu"] as ProcessingUnitType[],
  defaultSinglePassSeconds: 120,
  golemNetwork: {
    maxCpuPricePerHour: parseFloat(process.env.MAX_CPU_ENV_PER_HOUR) || 1.0,
    maxGpuPricePerHour: parseFloat(process.env.MAX_GPU_ENV_PER_HOUR) || 5.0,
  },
};
```

## File Organization

### Naming Conventions

- Use kebab-case for file names
- Group related functionality in directories
- Use index files for clean imports
- Separate concerns into focused modules

## Dependencies and Libraries

### Recommended Libraries

- **Crypto**: Use well-established libraries (elliptic for secp256k1, ethers for Ethereum)
- **Testing**: Jest with TypeScript support
- **Validation**: Drizzle ORM schemas with runtime validation
- **Logging**: Pino with OpenTelemetry integration
- **Distributed Computing**: Golem Network SDK (@golem-sdk/golem-js)
- **Reactive Programming**: RxJS for event streams

### Dependency Management

- Pin dependency versions in package.json for security
- Regular security audits with npm audit
- Use minimal dependencies to reduce attack surface
- Document all dependencies and their cryptographic purposes
- Maintain compatibility with Node.js 20+ and ES2020 target

Remember: Always prioritize code simplicity, security, performance, and maintainability.
When in doubt, choose the more explicit and well-documented approach over clever shortcuts.
