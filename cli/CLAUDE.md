# Claude Code Configuration

This is an enterprise-grade distributed vanity cryptocurrency address generation platform built in TypeScript. The system orchestrates parallel computation across the Golem Network using sophisticated provider selection, real-time budget management, and statistical estimation algorithms. The CLI operates exclusively on public keys with elliptic curve point addition for cryptographically secure vanity address generation, while your private key never leaves your local machine.

## Project Structure

```
cli/
├── src/
│   ├── index.ts                    # Main CLI entry point with Commander.js
│   ├── instrumentation.ts          # OpenTelemetry setup and configuration
│   ├── scheduler.ts               # Orchestrates distributed generation tasks
│   ├── app_context.ts             # Application context and logging
│   ├── metrics_collector.ts       # Performance metrics collection
│   ├── app/
│   │   └── optionsValidator.ts    # CLI parameter validation
│   ├── node_manager/
│   │   ├── golem_session.ts       # Golem network connection management
│   │   ├── selector.ts            # Provider selection logic
│   │   └── payment_module.ts      # GLM payment handling
│   ├── estimator/
│   │   ├── estimator.ts           # Generation time estimation
│   │   └── proof.ts               # Cryptographic proof validation
│   ├── ui/
│   │   └── displaySummary.ts      # Progress display and reporting
│   └── __tests__/                 # Jest test suite
├── monitoring/                    # Local observability stack
│   ├── docker-compose.yml         # Grafana, Prometheus, Tempo setup
│   └── grafana/                   # Dashboard configurations
├── results/                       # Generated vanity address outputs
├── dist/                          # Compiled JavaScript output
├── package.json                   # NPM dependencies and scripts
└── tools/                         # Development utilities
```

## Development Commands

```bash
# Install dependencies
npm install

# Build for production (updates version automatically)
npm run build

# Run the built CLI
npm start

# Development mode (runs generate command directly)
npm run dev -- --public-key sample-key.pub --vanity-address-prefix 0xtest

# Testing
npm test                    # Run full test suite
npm run test:watch          # Watch mode for testing

# Code quality
npm run lint               # Check code style and errors
npm run lint:fix           # Auto-fix linting issues
npm run format             # Check code formatting
npm run format:fix         # Auto-fix formatting

# Golem network exploration
npm run list-cpu-offers    # List available CPU providers
npm run list-gpu-offers    # List available GPU providers

# Monitoring stack (requires Docker)
cd monitoring && docker-compose up -d
```

## Architecture Overview

**⚠️ Complex Distributed System**: This is not a typical CLI tool. It's a sophisticated distributed platform with 20+ TypeScript modules across 7 directories, requiring Docker for the monitoring stack and advanced understanding of distributed computing concepts.

## Technology Stack

- **Core Framework**: TypeScript, Node.js, Commander.js for CLI interface
- **Distributed Computing**: Golem SDK for network orchestration
- **Reactive Programming**: RxJS for event streams and asynchronous data flow
- **Logging**: Pino for structured, high-performance logging with OpenTelemetry integration
- **Cryptography**: Elliptic for secp256k1 operations, Ethers.js for Ethereum functionality
- **Observability**: OpenTelemetry SDK with Grafana, Prometheus, Tempo, Loki, Alloy
- **Testing**: Jest with TypeScript support

## Key Features

- **Distributed Computing**: Multi-provider parallel execution with intelligent task scheduling
- **Advanced Budget Management**: Real-time GLM monitoring, automatic allocation amendments, exhaustion detection
- **Provider Intelligence**: Sophisticated selection algorithms with reputation tracking and offer evaluation
- **Statistical Analysis**: Monte Carlo estimation, difficulty calculation, and performance prediction algorithms
- **Enterprise Observability**: Production-grade OTLP stack (Grafana, Prometheus, Tempo, Loki, Alloy)
- **Cryptographic Validation**: Multi-layered verification with elliptic curve point addition
- **Reactive Architecture**: RxJS-based event streams for real-time progress tracking and error handling

## Main Command

```bash
# Generate vanity address
 npm run dev -- generate --public-key sample-key.pub \
  --vanity-address-prefix 0xcafe77 \
  --budget-limit 4 \
  --processing-unit gpu \
  --results-file results/result_cafe77_gpu.json \
  --num-workers 2
```

## Working with Git

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

## Pull Requests

- Create a detailed message of what changed. Focus on the high level description of the problem it tries to solve, and how it is solved. Don't go into the specifics of the code unless it adds clarity.

- NEVER ever mention a co-authored-by or similar aspects. In particular, never mention the tool used to create the commit message or PR.

## Development Guidelines

### Code Style (from .github/copilot-workspace-settings.yml)

- **TypeScript**: Single quotes, 2-space indentation, trailing commas, strict mode
- **Testing**: Jest framework, 90% coverage target
- **File naming**: kebab-case for files, camelCase for functions, PascalCase for classes
- **Security**: Input sanitization, pattern validation, secure crypto libraries

### Testing Strategy

- Test-driven development (TDD) approach
- Comprehensive unit tests for all functions
- Performance tests for generation algorithms
- Edge cases and error condition testing
- Test file pattern: `*.test.ts`

### Architecture Patterns

- Custom error classes for different error types
- Comprehensive input validation
- Graceful error handling and degradation
- Meaningful error messages for users
- Secure random number generation

### Security Guidelines

- Never store private keys in plaintext
- Implement proper input validation and sanitization
- Follow cryptographic best practices
- Avoid hardcoded secrets
- Regularly update dependencies to address security vulnerabilities

### Performance Optimization

- Efficient pattern matching algorithms
- Memory efficiency considerations
- CPU utilization optimization
- Monitor generation time and success rates

## Claude Code Hooks

The `.claude/scripts/` directory contains bash scripts that execute in response to Claude Code events.

## Current Status

- ✅ Basic CLI structure with Commander.js
- ✅ OpenTelemetry integration
- ✅ Generate command with validation

## Supported Features (Planned)

- **Cryptocurrencies**: Ethereum and CREATE1 addresses
- **Pattern Types**: Prefix, suffix, regex
- **Validation**: 1-10 character patterns, alphanumeric, case-insensitive

# important-instruction-reminders

## File Handling Guidelines

- **GEMINI Files**: Ignore all files starting with "GEMINI" (e.g., GEMINI_REVIEW.md, GEMINI_REVIEW_DETAILED.md) to avoid cross-contamination between AI tools when not explicitly needed for the task.
