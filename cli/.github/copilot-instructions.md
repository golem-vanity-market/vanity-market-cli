# GitHub Copilot Instructions for Vanity Address Generator

## Project Overview

This is a vanity address generator CLI project that interacts with Golem network to generate cryptocurrency addresses with specific patterns.

## Technology Stack

- **Languages**: TypeScript
- **Frameworks**: Node.js, Golem
- **Testing**: Jest
- **Linting**: ESLint
- **Formatting**: Prettier
- **Dependency Management**: npm

## Development Philosophy

- **Test-Driven Development (TDD)**: Always write failing tests first, then implement functions to pass those tests
- **Incremental Development**: Make small, well-defined changes with clear justification
- **Professional Standards**: Follow best practices for code quality, documentation, and maintainability

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

### Error Handling

- Use custom error classes for different error types
- Implement graceful degradation for network issues
- Validate all inputs thoroughly
- Provide meaningful error messages to users

## Testing Strategy

### Test Structure

- Create comprehensive unit tests for all functions
- Use integration tests for end-to-end workflows
- Implement performance tests for generation algorithms
- Include edge cases and error conditions

### Test Naming

- Use descriptive test names: `should_generate_bitcoin_address_with_prefix`
- Group related tests in describe blocks
- Use beforeEach/afterEach for test setup and cleanup

### Test Coverage

- Test both success and failure paths
- Include boundary condition tests
- Test with various input combinations

## Security Guidelines

### Input Validation

- Sanitize all user inputs
- Validate address patterns and formats
- Implement rate limiting for generation requests
- Check for malicious patterns

### Key Management

- Never store private keys in plaintext
- Use secure random number generation
- Implement proper key derivation functions
- Follow cryptographic best practices

### Data Protection

- Minimize data retention
- Use secure communication protocols
- Implement proper access controls
- Regular security audits

## Documentation Standards

### README Requirements

- Clear installation and setup instructions
- Usage examples with expected outputs
- API documentation for public interfaces
- Contributing guidelines and code of conduct

## Specific Implementation Guidance

### Address Generation Functions

```javascript
// Preferred pattern for address generation
async function generateVanityAddress(options) {
  // Validate inputs first
  validateGenerationOptions(options);

  // Use appropriate algorithm based on cryptocurrency type
  const generator = getAddressGenerator(options.type);

  // Implement with proper error handling
  try {
    return await generator.generate(options.pattern);
  } catch (error) {
    throw new AddressGenerationError(error.message);
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

## Deployment and Operations

### Build Process

- Implement proper build scripts
- Use dependency management tools
- Include linting and formatting in CI/CD
- Generate optimized production builds

### Monitoring

- Implement tracing for all major operations
- Add performance metrics collection
- Monitor error rates and types
- Include health check endpoints

## Common Patterns to Suggest

### Error Handling Pattern

```javascript
class AddressGenerationError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "AddressGenerationError";
    this.code = code;
    this.details = details;
  }
}
```

### Validation Pattern

```javascript
function validateAddressPattern(pattern) {
  if (!pattern || typeof pattern !== "string") {
    throw new ValidationError("Pattern must be a non-empty string");
  }

  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new ValidationError("Pattern too long");
  }

  // Additional validation logic
}
```

### Configuration Pattern

```javascript
const config = {
  maxAttempts: process.env.MAX_ATTEMPTS || 1000000,
  workerThreads: process.env.WORKER_THREADS || 4,
  supportedTypes: ["bitcoin", "ethereum", "litecoin"],
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

- **Crypto**: Use well-established libraries (crypto-js, elliptic)
- **Testing**: Jest for JavaScript
- **Validation**: Joi or Yup for schema validation
- **Logging**: Winston for Node.js

### Dependency Management

- Pin dependency versions in package.json
- Regular security audits with npm audit/safety
- Use minimal dependencies to reduce attack surface
- Document all dependencies and their purposes

Remember: Always prioritize code simpolicity, security, performance, and maintainability.
When in doubt, choose the more explicit and well-documented approach over clever shortcuts.
