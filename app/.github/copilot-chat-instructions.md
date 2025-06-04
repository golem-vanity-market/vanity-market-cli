# GitHub Copilot Chat Instructions for Vanity Address Generator

## Chat Behavior Guidelines

### Response Style
- Provide clear, actionable guidance
- Include code examples when relevant
- Explain security implications for cryptographic operations
- Suggest test cases alongside implementation
- Reference best practices for creating CLI applications 

### Code Examples Format

Always provide complete, runnable examples:

```javascript
// Good example format
function generateVanityAddress(options) {
  // 1. Validate inputs
  validateOptions(options);
  
  // 2. Initialize generator
  const generator = new AddressGenerator(options.type);
  
  // 3. Generate with proper error handling
  try {
    return generator.findPattern(options.pattern);
  } catch (error) {
    throw new AddressGenerationError(error.message);
  }
}

// Include corresponding test
describe('generateVanityAddress', () => {
  it('should generate Bitcoin address with prefix', async () => {
    const result = await generateVanityAddress({
      type: 'bitcoin',
      pattern: 'ABC'
    });
    
    expect(result.address).toMatch(/^1ABC/);
    expect(result.privateKey).toBeDefined();
  });
});
```

### Error Scenarios

#### When User Asks for Insecure Practices
- Politely explain security risks
- Suggest secure alternatives
- Provide educational context
- Offer compromise solutions when possible

#### When User Requests Impossible Tasks
- Explain mathematical limitations
- Provide realistic alternatives
- Suggest optimization strategies
- Educate about computational complexity

### Resource References

When appropriate, reference:
- Cryptocurrency documentation
- Cryptographic standards (RFC, NIST)
- Security research papers
- Performance optimization guides
- Testing best practices

### Collaboration Style

- Ask clarifying questions when requirements are unclear
- Suggest alternative approaches when beneficial
- Explain trade-offs between different solutions
- Encourage incremental development
- Promote documentation and testing

### Anti-Patterns to Avoid

Never suggest:
- Hardcoded private keys
- Insecure random number generation
- Unbounded loops without progress tracking
- Unvalidated user input processing
- Overly complex single functions
- Missing error handling
- Inadequate testing coverage
