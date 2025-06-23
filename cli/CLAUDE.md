# Claude Code Configuration

This is a TypeScript CLI application for generating vanity cryptocurrency addresses with OpenTelemetry observability support.

## Project Structure

- `src/index.ts` - Main CLI entry point with Commander.js and OpenTelemetry integration
- `src/__tests__/` - Jest test files
- `dist/` - Built JavaScript output
- `package.json` - NPM dependencies and scripts

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Watch mode for testing
npm run test:watch
```

## Key Features

- **CLI Framework**: Commander.js for argument parsing
- **Observability**: OpenTelemetry for tracing and telemetry
- **Testing**: Jest with TypeScript support
- **Build**: TypeScript compilation to `dist/`

## Main Command

```bash
# Generate vanity address
npm run dev -- generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix vanity \
  --budget-glm 1000
```

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
- Use established crypto libraries (crypto-js, elliptic, noble-secp256k1)
- Implement proper input validation and sanitization
- Follow cryptographic best practices
- Avoid hardcoded secrets

### Performance Optimization

- Efficient pattern matching algorithms
- Memory efficiency considerations
- CPU utilization optimization
- Monitor generation time and success rates

## Current Status

- ✅ Basic CLI structure with Commander.js
- ✅ OpenTelemetry integration
- ✅ Generate command with validation

## Supported Features (Planned)

- **Cryptocurrencies**: Ethereum and CREATE1 addresses
- **Pattern Types**: Prefix, suffix, regex
- **Validation**: 1-10 character patterns, alphanumeric, case-insensitive
