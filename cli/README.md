# Golem Address Generator CLI

A TypeScript CLI application for generating vanity cryptocurrency addresses with OpenTelemetry observability support.

## Running CLI with NPX (Private Repository)

You can run the CLI directly from the private GitHub npm package repository.

### Prerequisites

1. **GitHub Personal Access Token**: You need a GitHub token with `read:packages` ([GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)) permission to access the private npm package.

2. **Configure npm authentication**: Set up your npm configuration to authenticate with GitHub Packages:

```bash
echo "@unoperate:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

3. You need to run a local yagna instance, grab a YAGNA_APP_KEY:

```bash
yagna app-key create golem-vaddr

yagna app-key list
```

### Running with NPX

Once authentication is configured, you can run the CLI directly:

```bash
# Display help
npx @unoperate/golem-vaddr-cli@1.0.1 --help

export YAGNA_APP_KEY=

# optional
export OTEL_CONFIG_FILE=

# Generate vanity address
npx @unoperate/golem-vaddr-cli@1.0.1 generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x6666 \
  --budget-glm 6 \
  --processing-unit cpu \
  --results-file results.json \
  --num-workers 2
```

### Alternative: One-time authentication

You can also authenticate for a single command:

```bash
# Set token and run in one command
NPM_TOKEN=YOUR_GITHUB_TOKEN npx @unoperate/golem-vaddr-cli@1.0.1 generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix 0xvanity \
  --budget-glm 1000 \
  --processing-unit cpu \
  --results-file results.json
```

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
npm run dev -- generate --public-key <path-to-key-file> --vanity-address-prefix <prefix> --budget-glm <amount> --processing-unit <cpu|gpu> --results-file <output-file>
```

#### Example Usage

1. **Create a public key file:**

```bash
echo "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28" > my-public-key.txt
```

2. **Run the generate command:**

```bash
npm run dev -- generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix 0xvanity \
  --budget-glm 1000 \
  --processing-unit cpu \
  --results-file results.json
```

#### Using the built version:

```bash
# Build first
npm run build

# Then run directly
node dist/index.js generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix 0xvanity \
  --budget-glm 1000 \
  --processing-unit cpu \
  --results-file results.json
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
0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28
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
   Public Key: 0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28
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

## OpenTelemetry Monitoring

The CLI includes OpenTelemetry observability support for tracing, metrics, and logging.

### Running with OpenTelemetry Configuration

To enable comprehensive monitoring with file-based telemetry export:

```bash
# Set the OpenTelemetry config file
export OTEL_CONFIG_FILE=monitoring/otel-config.yaml

# Run the CLI
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x6666 \
  --budget-glm 6 \
  --processing-unit cpu \
  --results-file results.json \
  --num-workers 2
```

### Monitoring Output

When OpenTelemetry is enabled, telemetry data is exported to:

- `./logs/traces.jsonl` - Distributed tracing data
- `./logs/metrics.jsonl` - Performance metrics
- `./logs/logs.jsonl` - Application logs

### Monitoring Stack

A complete monitoring stack is available in the `monitoring/` directory. See `monitoring/README.md` for setup instructions.

## Sample commands

```bash
# Basic development usage
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x333333 \
  --budget-glm 1 \
  --results-file results.json \
  --processing-unit cpu

# GPU workers (higher performance)
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x12345678 \
  --budget-glm 10 \
  --processing-unit gpu \
  --results-file results.json \
  --num-workers 1

# With custom worker settings
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x123456 \
  --budget-glm 15 \
  --processing-unit cpu \
  --num-workers 4 \
  --min-offers 3 \
  --min-offers-timeout-sec 60

# With OpenTelemetry monitoring
# Windows
set OTEL_CONFIG_FILE=monitoring/otel-config.yaml
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x666666 \
  --budget-glm 6 \
  --processing-unit cpu \
  --results-file tmp_result.json \
  --num-workers 2

# Linux/macOS
OTEL_CONFIG_FILE=monitoring/otel-config.yaml npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x666666 \
  --budget-glm 6 \
  --processing-unit cpu \
  --results-file tmp_result.json \
  --num-workers 2
```
