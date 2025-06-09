# Golem Address Generator CLI

A TypeScript CLI application for generating vanity cryptocurrency addresses with OpenTelemetry observability support.

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Commands

```bash
# Display help
npm run dev -- --help

# Display version
npm run dev -- --version

# Hello world command
npm run dev hello
```

### Generate Command

The `generate` command requires three arguments:

```bash
npm run dev -- generate --public-key <path-to-key-file> --vanity-address-prefix <prefix> --budget-glm <amount>
```

#### Example Usage

1. **Create a public key file:**

```bash
echo "0x1234567890abcdef1234567890abcdef12345678" > my-public-key.txt
```

2. **Run the generate command:**

```bash
npm run dev -- generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix vanity \
  --budget-glm 1000
```

#### Using the built version:

```bash
# Build first
npm run build

# Then run directly
node dist/index.js generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix vanity \
  --budget-glm 1000
```

## Arguments

| Argument                  | Type      | Description                                                     | Example      |
| ------------------------- | --------- | --------------------------------------------------------------- | ------------ |
| `--public-key`            | file path | Path to file containing the public key (Ethereum format: 0x...) | `my-key.txt` |
| `--vanity-address-prefix` | string    | Desired vanity prefix for the generated address (max 20 chars)  | `vanity`     |
| `--budget-glm`            | number    | Budget in GLM tokens for the generation process (1-1,000,000)   | `1000`       |

## Public Key File Format

The public key file should contain a single line with an Ethereum address in hex format:

```
0x1234567890abcdef1234567890abcdef12345678
```

## Validation Rules

- **Public Key**: Must be a valid Ethereum address (0x followed by 40 hex characters)
- **Vanity Prefix**: 1-20 characters, cannot be empty
- **Budget**: Positive number between 1 and 1,000,000 GLM

## Development

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
npm test:watch
```

## Example Output

```
🚀 Starting vanity address generation with the following parameters:
   Public Key File: my-public-key.txt
   Public Key: 0x1234567890abcdef1234567890abcdef12345678
   Vanity Address Prefix: vanity
   Budget (GLM): 1000

✓ All parameters validated successfully
✓ OpenTelemetry tracing enabled for generation process

⚠️  Address generation not yet implemented - placeholder for Step 3
```

## Error Handling

The CLI provides helpful error messages for common issues:

- **File not found**: `Public key file not found: /path/to/file.txt`
- **Invalid format**: `Invalid public key format. Must be a valid Ethereum address`
- **Empty file**: `Public key file is empty`
- **Invalid budget**: `Budget must be a positive number`
- **Prefix too long**: `Vanity address prefix too long. Maximum length is 20 characters`
