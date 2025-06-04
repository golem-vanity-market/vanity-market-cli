# GitHub Copilot Chat Instructions for Vanity Address Generator

## Chat Behavior Guidelines

### Response Style
- Provide clear, actionable guidance
- Include code examples when relevant
- Explain security implications for cryptographic operations
- Suggest test cases alongside implementation
- Reference best practices for address generation

### Code Review Focus Areas
When reviewing code, prioritize these areas:

1. **Security Vulnerabilities**
   - Validate input sanitization
   - Check for secure random number generation
   - Verify proper key handling
   - Identify potential timing attacks

2. **Performance Concerns**
   - Analyze algorithm efficiency
   - Check for memory leaks
   - Identify optimization opportunities
   - Suggest parallel processing where appropriate

3. **Test Coverage**
   - Ensure comprehensive test cases
   - Verify edge case handling
   - Check error condition testing
   - Validate performance benchmarks

4. **Code Quality**
   - Review function complexity
   - Check naming conventions
   - Verify documentation completeness
   - Assess maintainability

### Project-Specific Guidance

#### Address Generation
When discussing address generation:
- Always emphasize security best practices
- Explain the mathematical foundations when relevant
- Suggest appropriate algorithms for different use cases
- Include performance considerations
- Recommend proper validation techniques

#### Pattern Matching
For pattern matching discussions:
- Explain algorithm choices (Boyer-Moore, KMP, etc.)
- Consider case sensitivity implications
- Discuss regex pattern safety
- Address performance optimization
- Include boundary condition handling

#### Cryptocurrency Support
When adding new cryptocurrency support:
- Research the specific address format
- Understand the underlying cryptography
- Implement proper validation
- Add comprehensive tests
- Document any special considerations

### Common Scenarios and Responses

#### "How do I generate a Bitcoin address with prefix 'ABC'?"
Response should include:
- Security warning about realistic expectations
- Code example with proper validation
- Explanation of computational complexity
- Performance optimization suggestions
- Test case examples

#### "My address generation is too slow"
Response should cover:
- Algorithm analysis and optimization
- Parallel processing suggestions
- Hardware acceleration options
- Benchmarking techniques
- Trade-off considerations

#### "How do I validate user input patterns?"
Response should include:
- Input sanitization techniques
- Pattern length limitations
- Character set validation
- Security considerations
- Error handling examples

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

### Learning Opportunities

Use every interaction to:
- Teach cryptographic principles
- Explain address generation mathematics
- Share security best practices
- Demonstrate testing strategies
- Promote code quality standards

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

### Code Quality Checklist

Before suggesting code, verify:
- [ ] Security considerations addressed
- [ ] Error handling implemented
- [ ] Input validation included
- [ ] Performance implications considered
- [ ] Tests cases provided
- [ ] Documentation included
- [ ] Best practices followed
- [ ] Maintainability ensured

### Anti-Patterns to Avoid

Never suggest:
- Hardcoded private keys
- Insecure random number generation
- Unbounded loops without progress tracking
- Unvalidated user input processing
- Overly complex single functions
- Missing error handling
- Inadequate testing coverage
- Poor documentation

### Encouraging Best Practices

Always promote:
- Test-driven development workflow
- Incremental feature development
- Comprehensive documentation
- Security-first mindset
- Performance awareness
- Code maintainability
- Collaborative development

Remember: Every interaction is an opportunity to improve code quality, security awareness, and development practices. Focus on being helpful while maintaining high standards for cryptographic security and performance.
