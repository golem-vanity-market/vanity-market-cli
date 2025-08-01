# Claude AI Development Guide - Golem Vanity Address Generator CLI

## Project Classification

**Architecture**: Enterprise-grade distributed vanity cryptocurrency address generation platform  
**Language**: TypeScript (strict mode, ES2020 target)  
**Runtime**: Node.js 20+ with Commander.js CLI framework  
**Complexity**: 25+ TypeScript modules across 8 directories, distributed computing orchestration  
**Security Model**: Public key cryptography with elliptic curve point addition, private keys never leave local machine

## Critical File Locations

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

## Development Commands (AI Usage)

### Build and Setup

```bash
npm install                    # Install dependencies
npm run db:setup              # Initialize SQLite database with migrations (REQUIRED first time)
npm run build                 # TypeScript compilation (updates version automatically)
npm run db:clear              # Reset database for testing
```

### Development Execution

```bash
npm run dev -- generate --public-key sample-key.pub --vanity-address-prefix 0xtest --budget-limit 10
npm run start -- generate     # Use compiled version
ts-node src/index.ts generate  # Direct execution
```

### Testing and Quality

```bash
npm test                      # Jest test suite
npm run test:watch           # Continuous testing
npm run lint                 # ESLint with TypeScript rules
npm run format:fix           # Prettier formatting
```

### Golem Network Operations

```bash
npm run list-cpu-offers      # Scan for CPU providers
npm run list-gpu-offers      # Scan for GPU providers (vm-nvidia engine)
```

## Critical Interfaces for AI Development

### GenerationParams Interface

**Location**: `/src/params.ts` (lines 6-14)

```typescript
interface GenerationParams {
  publicKey: string; // Hex-encoded secp256k1 public key
  vanityAddressPrefix: GenerationPrefix; // Processed prefix with validation
  budgetInitial: number; // Starting GLM allocation
  budgetTopUp: number; // Incremental funding amount
  budgetLimit: number; // Total spending cap
  numberOfWorkers: number; // Parallel provider count
  singlePassSeconds: number; // Individual execution duration
  numResults: bigint; // Target address count
}
```

### CLI Options Validation

**Location**: `/src/app/optionsValidator.ts`  
**Key Constraints**:

- Public key: 65 bytes, 0x04 prefix, hex format (lines 104-144)
- Vanity prefix: 1-16 chars, padded to 10 chars internally (lines 208-216)
- Budget: max 1000 GLM, positive numbers (lines 219-243)

### Database Schema

**Location**: `/src/lib/db/schema.ts`

```typescript
// Primary tables with foreign key relationships
jobs: { id, publicKey, vanityProblem: Problem, numWorkers, budgetGlm, processingUnit }
provider_jobs: { id, jobId→jobs.id, status, providerId, glmSpent, hashRate, startTime, endTime }
proofs: { id, providerJobId→provider_jobs.id, addr, salt, pubKey, vanityProblem }

// Enums for type safety
statusNames = ["pending", "started", "completed", "failed", "stopped"]
processingUnitNames = ["cpu", "gpu"]
offenceNames = ["ddos", "incorrect results", "repeat", "nonsense"]
```

## Key Business Logic Algorithms

### Validation Pipeline

**Location**: `/src/validator.ts` (lines 15-45)  
**Process**: Format validation → Elliptic curve point addition → Keccak256 hashing → Pattern matching  
**Critical**: Uses elliptic.js for secp256k1 operations with 32-byte salt verification

### Statistical Estimation

**Location**: `/src/estimator/estimator.ts` (lines 20-120)  
**Algorithm**: Rolling window performance tracking with multiple timeframes (5min, 10min, 20min, 1hr)  
**Key Methods**: `addProvedWork()`, `estimatedSpeed()`, `estimateTime()`, `currentInfo()`

### Provider Selection

**Location**: `/src/node_manager/selector.ts` (lines 10-25)  
**Algorithm**: Simple cost-minimization based on estimated rental hours  
**Formula**: `totalCost = offer.usageVector.hour * estimatedHours`

### Difficulty Calculation

**Location**: `/src/difficulty.ts` (lines 5-15)  
**Formula**: `16^(prefixLength - 2)` for hex patterns  
**Usage**: Time estimation and statistical modeling

## Data Flow Architecture

### Primary Execution Flow

1. **CLI Entry** (`/src/index.ts`) → Parameter validation → Context setup → OpenTelemetry init
2. **Network Setup** → Golem connection → Payment allocation → Provider discovery
3. **Orchestration** (`/src/scheduler.ts`) → Budget monitoring → Worker pool creation → Continuous work loop
4. **Execution** → Provider rental → Command execution → Result collection → Validation
5. **Persistence** → Database recording → Result export → Progress display

### Error Handling Strategy

- **Graceful Shutdown**: SIGINT/SIGTERM handlers with resource cleanup sequence
- **Provider Failures**: Reputation tracking, automatic rental destruction, work continuation
- **Budget Exhaustion**: Automatic monitoring with configurable callbacks
- **Validation Failures**: Multi-layer verification with provider reputation impact

## Configuration Patterns

### Environment Variables (AI Development)

```bash
export YAGNA_APPKEY=your-key           # Golem Network authentication (REQUIRED)
export OTEL_CONFIG_FILE=monitoring/otel-config.yaml  # OpenTelemetry configuration
export OTEL_LOG_LEVEL=debug            # Logging verbosity
export NODE_ENV=development            # Environment detection
export RESULT_CSV_FILE=custom.csv      # Custom result export path
```

### Processing Unit Configurations

**Location**: `/src/node_manager/config.ts`

- **CPU**: Dynamic core detection, multi-prefix parallel processing
- **GPU**: CUDA optimization (kernelCount: 64, groupCount: 1000)
- **Pricing**: Environment-controlled max rates (MAX_CPU_ENV_PER_HOUR, MAX_GPU_ENV_PER_HOUR)

## Testing Architecture (AI Development)

### Test Structure

**Location**: `/src/__tests__/`

- **Unit Tests**: `validator.test.ts`, `estimator.test.ts`, `selector.test.ts`
- **Integration Tests**: `index.test.ts` with full CLI execution
- **Test Utils**: `utils.ts` with OpenTelemetry context helpers

### Testing Patterns

```typescript
// Standard test context creation
export function getCtxForTests(testName: string): AppContext {
  const logger = getPinoLoggerWithOtel(testName, "info");
  return new AppContext(ROOT_CONTEXT).WithLogger(logger);
}

// Integration test with build prerequisite
beforeAll(() => {
  execSync("npm run build", { stdio: "inherit" });
});
```

### Critical Test Data

**Cryptographic Test Vectors**: Known-good address/salt/pubkey combinations for validation testing  
**Invalid Cases**: Comprehensive negative testing for all validation functions

## OpenTelemetry Observability (AI Development)

### Metrics Collection

**Location**: `/src/metrics_collector.ts`

```typescript
observeCLI(status: string, durationSec: number)    // Command duration tracking
// Custom metrics for provider performance, budget utilization, success rates
```

### Structured Logging

**Format**: JSONL with OpenTelemetry trace correlation  
**Outputs**: `./logs/traces.jsonl`, `./logs/metrics.jsonl`, `./logs/logs.jsonl`  
**Context**: Full distributed tracing across provider network operations

### Production Stack

**Location**: `/monitoring/` directory with Docker Compose  
**Stack**: Grafana + Prometheus + Tempo + Loki + Alloy for enterprise monitoring

## Common AI Development Scenarios

### Adding New CLI Commands

1. Extend Commander.js structure in `/src/index.ts`
2. Add validation in `/src/app/optionsValidator.ts`
3. Implement handler following graceful shutdown pattern
4. Add database recording if needed

### Modifying Provider Selection

**File**: `/src/node_manager/selector.ts`  
**Pattern**: Implement new selection algorithm, maintain `selectBestProvider()` interface  
**Integration**: Update configurations in `/src/node_manager/config.ts`

### Adding New Validation

**File**: `/src/validator.ts`  
**Pattern**: Follow cryptographic validation pipeline  
**Requirements**: Elliptic curve operations, proper error handling, provider reputation impact

### Database Schema Changes

1. Modify `/src/lib/db/schema.ts`
2. Run `npm run db:setup` to generate migrations
3. Update recorder implementations in `/src/db/`

## Security Considerations (AI Development)

### Cryptographic Operations

- **Private Key Security**: Never stored, never transmitted, only public keys used
- **Validation**: Multi-layer verification with elliptic curve point addition
- **Salt Generation**: Cryptographically secure random number generation
- **Address Derivation**: Standard Ethereum address generation from public key

### Input Validation

- **Public Keys**: Strict format validation (65 bytes, 0x04 prefix)
- **Prefixes**: Length limits, character validation, injection prevention
- **Budget**: Numeric constraints, overflow protection

### Network Security

- **Provider Trust**: Reputation system, result validation, financial limits
- **Communication**: Golem Network encryption, secure payment channels

## Performance Optimization (AI Development)

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

## Dependencies and Integration Points

### Core Dependencies

- **@golem-sdk/golem-js**: ^3.5.1 - Distributed compute platform integration
- **commander**: ^11.0.0 - CLI framework with command structure
- **drizzle-orm**: ^0.44.2 - Type-safe database operations
- **elliptic**: ^6.6.1 - Secp256k1 cryptographic operations
- **ethers**: ^6.14.3 - Ethereum-specific functionality
- **@opentelemetry/\***: Enterprise observability stack
- **rxjs**: ^7.8.2 - Reactive programming patterns

### Development Dependencies

- **typescript**: ^5.8.3 - Strict mode compilation
- **jest**: ^29.5.0 - Testing framework with TypeScript support
- **eslint**: ^9.28.0 - Code quality with TypeScript rules
- **prettier**: 3.5.3 - Code formatting

## Troubleshooting for AI Development

### Common Issues

- **Database not initialized**: Run `npm run db:setup` first
- **Yagna connection failed**: Check `YAGNA_APPKEY` environment variable
- **Compilation errors**: Ensure TypeScript strict mode compliance
- **Test failures**: Verify build completed before integration tests

### Debug Workflows

- **OpenTelemetry logs**: Check `./logs/` directory for structured debugging
- **Provider issues**: Use `npm run list-cpu-offers` for network debugging
- **Database problems**: Use `npm run db:clear` to reset state
- **Performance analysis**: Monitor via Grafana stack in `/monitoring/`

## Version and Build Information

**Current Version**: 0.1.5 (auto-updated via `/tools/update-version.ts`)  
**Build Target**: ES2020 with CommonJS for Node.js compatibility  
**Distribution**: NPM package `@unoperate/golem-vaddr-cli` with binary `golem-addr`  
**License**: GPL-3.0 for open-source distribution

## Git and Github

### Working with Git

- Git branch name conventions:

- prefix: 'feature/' 'bugfix/' 'chore/', 'refactor/', 'experiment/', 'docs/'
- followed by descriptive name, words connected with dashes

- Git commit messages:
  - Use imperative mood (e.g., "Add feature" not "Added feature")
  - Keep subject line concise (50 chars or less)
  - Start with capital letter and don't end with period
  - Separate subject from body with a blank line for detailed explanations
  - For security updates, prefix with "Security:" or document vulnerability fixes
  - NEVER ever mention a co-authored-by or similar aspects. In particular, never mention the tool used to create the commit message or PR.

### Pull Requests

- Create a detailed message of what changed. Focus on the high level description of the problem it tries to solve, and how it is solved. Don't go into the specifics of the code unless it adds clarity.

- NEVER ever mention a co-authored-by or similar aspects. In particular, never mention the tool used to create the commit message or PR.

---

**AI Development Notes**: This codebase requires deep understanding of distributed computing, cryptographic validation, and enterprise observability patterns. Focus on type safety, proper error handling, and maintaining the immutable context pattern throughout modifications.
