# GitHub Copilot Chat Instructions for Golem Vanity Address Generator CLI

## Chat Behavior Guidelines

### Response Style

- Provide clear, actionable guidance with enterprise-grade patterns
- Include TypeScript code examples with proper AppContext usage
- Explain cryptographic security implications for secp256k1 operations
- Suggest comprehensive test cases with OpenTelemetry context
- Reference distributed computing best practices for Golem Network
- Emphasize immutable context patterns and type safety
- Focus on observability and graceful error handling

### Code Examples Format

Always provide complete, runnable TypeScript examples with proper AppContext usage:

```typescript
// Good example format with AppContext pattern
async function generateVanityAddress(
  ctx: AppContext,
  options: GenerationParams,
): Promise<GenerationResult> {
  const tracer = ctx.tracer();
  const span = tracer.startSpan("generateVanityAddress");

  try {
    // 1. Validate inputs using cryptographic validation
    await validateGenerationOptions(ctx, options);

    // 2. Initialize Golem scheduler with context
    const scheduler = new Scheduler(ctx);

    // 3. Execute distributed generation with proper error handling
    const result = await scheduler.executeGeneration(options);

    // 4. Validate results using elliptic curve verification
    await validateGenerationResult(ctx, result);

    ctx.L().info("Vanity address generation completed", {
      pattern: options.vanityAddressPrefix.pattern,
      providersUsed: result.providersUsed,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    ctx.L().error("Address generation failed", { error: error.message });
    throw new AddressGenerationError(error.message, ctx);
  } finally {
    span.end();
  }
}

// Include corresponding test with AppContext setup
describe("generateVanityAddress", () => {
  let ctx: AppContext;

  beforeEach(() => {
    ctx = getCtxForTests("generateVanityAddress");
  });

  it("should validate secp256k1 public key and generate Ethereum address with prefix", async () => {
    const options: GenerationParams = {
      publicKey: "0x04...", // 65-byte secp256k1 public key
      vanityAddressPrefix: { pattern: "cafe", difficulty: 16 ** 4 },
      budgetLimit: 10,
      numberOfWorkers: 2,
      singlePassSeconds: 60,
    };

    const result = await generateVanityAddress(ctx, options);

    expect(result.address).toMatch(/^0xcafe/i);
    expect(result.proofs).toBeDefined();
    expect(result.proofs[0].pubKey).toMatch(/^0x04/);

    // Verify cryptographic validation
    const isValid = await validateProof(ctx, result.proofs[0]);
    expect(isValid).toBe(true);
  });
});
```

### Error Scenarios

#### When User Asks for Insecure Practices

- Politely explain cryptographic security risks specific to secp256k1
- Suggest secure alternatives using elliptic curve best practices
- Provide educational context about private key security (never store/transmit)
- Offer compromise solutions using public key validation patterns
- Reference Ethereum address generation security standards

#### When User Requests Impossible Tasks

- Explain mathematical limitations of vanity address generation (16^length difficulty)
- Provide realistic alternatives with proper difficulty estimation
- Suggest optimization strategies using Golem Network distributed computing
- Educate about computational complexity and budget requirements
- Recommend appropriate pattern lengths (1-16 hex characters)

#### When User Asks About Provider Issues

- Explain Golem Network provider selection and reputation system
- Suggest debugging approaches using OpenTelemetry logs
- Provide guidance on budget management and rental optimization
- Reference provider failure handling and automatic recovery patterns

### Resource References

When appropriate, reference:

- Ethereum address generation standards and EIP specifications
- Cryptographic standards (secp256k1, elliptic curve point addition)
- Golem Network documentation and SDK best practices
- OpenTelemetry observability patterns and distributed tracing
- Drizzle ORM type-safe database operations
- RxJS reactive programming patterns for event coordination
- TypeScript strict mode and ES2020 enterprise patterns
- Commander.js CLI framework with graceful shutdown handling

### Collaboration Style

- Ask clarifying questions when requirements are unclear about distributed computing patterns
- Suggest alternative approaches for provider selection and budget optimization
- Explain trade-offs between CPU and GPU processing units
- Encourage incremental development with proper AppContext integration
- Promote comprehensive documentation with OpenTelemetry context
- Emphasize type safety and strict TypeScript compliance
- Guide toward immutable context patterns and dependency injection

### Anti-Patterns to Avoid

Never suggest:

- Hardcoded private keys or storing private keys anywhere
- Insecure random number generation (always use cryptographically secure)
- Unbounded loops without progress tracking and budget monitoring
- Unvalidated user input processing (especially public keys and patterns)
- Direct database operations without AppContext dependency injection
- Missing OpenTelemetry tracing and structured logging
- Bypassing elliptic curve validation for cryptographic operations
- Provider operations without proper reputation tracking
- Budget operations without proper monitoring and callbacks
- Ignoring graceful shutdown patterns for long-running processes
- Using plain JavaScript instead of strict TypeScript
- Missing error handling in distributed computing scenarios
