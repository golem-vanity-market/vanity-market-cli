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
npx @unoperate/golem-vaddr-cli@0.1.5 --help

export YAGNA_APPKEY=your-generated-app-key

# optional
export OTEL_CONFIG_FILE=

# Generate vanity address
npx @unoperate/golem-vaddr-cli@0.1.5 generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x6666 \
  --budget-limit 6 \
  --processing-unit cpu \
  --results-file results.json \
  --num-workers 2
```

### Alternative: One-time authentication

You can also authenticate for a single command:

```bash
# Set token and run in one command
NPM_TOKEN=YOUR_GITHUB_TOKEN npx @unoperate/golem-vaddr-cli@0.1.5 generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix 0xvanity \
  --budget-limit 1000 \
  --processing-unit cpu \
  --results-file results.json
```

## Installation

```bash
npm install
npm run build

# Initialize the database (first time setup)
npm run db:setup
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
npm run dev -- generate --public-key <path-to-key-file> --vanity-address-prefix <prefix> --budget-limit <amount> --processing-unit <cpu|gpu> --results-file <output-file>
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
  --budget-limit 1000 \
  --processing-unit cpu \
  --results-file results.json
```

#### Using the built version

```bash
# Build first
npm run build

# Then run directly
node dist/index.js generate \
  --public-key my-public-key.txt \
  --vanity-address-prefix 0xvanity \
  --budget-limit 1000 \
  --processing-unit cpu \
  --results-file results.json
```

## Arguments

| Argument                  | Type      | Description                                                        | Example          |
| ------------------------- | --------- | ------------------------------------------------------------------ | ---------------- |
| `--public-key`            | file path | Path to file containing the public key (Ethereum format: 0x...)    | `my-key.txt`     |
| `--vanity-address-prefix` | string    | Desired vanity prefix for the generated address (1-10 chars)       | `0x1337`         |
| `--budget-limit`          | number    | Budget in GLM tokens for the generation process (required)         | `10`             |
| `--processing-unit`       | string    | Processing unit type: 'cpu' or 'gpu' (default: gpu)                | `cpu`            |
| `--results-file`          | file path | Path to save the generation results (optional)                     | `results.json`   |
| `--num-workers`           | number    | Number of parallel workers to use (default: 1)                     | `2`              |
| `--db`                    | file path | Database file path for storing session data (default: ./db.sqlite) | `./my-db.sqlite` |

## Environment variables

Internal functionality of the CLI can be configured using environment variables:

| Variable                           | Description                                                                    | Default Value                 |
| ---------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| `YAGNA_APPKEY`                     | Yagna application key for authentication                                       | (required)                    |
| `OTEL_CONFIG_FILE`                 | Path to OpenTelemetry configuration file for observability support             | `monitoring/otel-config.yaml` |
| `MAX_CPU_ENV_PER_HOUR`             | Maximum price per hour for CPU environment (in GLM tokens)                     | `0.1`                         |
| `MAX_CPU_CPU_PER_HOUR`             | Maximum price per hour for CPU compute (in GLM tokens)                         | `0.1`                         |
| `MAX_GPU_ENV_PER_HOUR`             | Maximum price per hour for GPU environment (in GLM tokens)                     | `2.0`                         |
| `RESULT_CSV_FILE`                  | Path to save results in CSV format                                             | `results-{current-date}.csv`  |
| `MESSAGE_LOOP_SEC_INTERVAL`        | Interval in seconds for printing status to the console                         | `30`                          |
| `PROCESS_LOOP_SEC_INTERVAL`        | Interval in seconds for processing results                                     | `1`                           |
| `COMMAND_EXECUTION_TIMEOUT_BUFFER` | Extra time (ms) added to `singlePassSec` before aborting unresponsive commands | `30000` (30s)                 |
| `RENTAL_RELEASE_TIMEOUT`           | Timeout (ms) for releasing a rental                                            | `30000` (30s)                 |
| `RENTAL_DESTROY_TIMEOUT`           | Timeout (ms) for destroying a rental                                           | `30000` (30s)                 |

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

# Initialize database (first time setup)
npm run db:setup

# Reset database (drops and recreates tables)
npm run db:clear

# Run tests
npm test

# Watch mode for testing
npm run test:watch

# Code quality
npm run lint
npm run format:fix

# Golem network exploration
npm run list-cpu-offers
npm run list-gpu-offers
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
  --budget-limit 6 \
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

A complete monitoring stack is available in the `monitoring/` directory. The CLI provides comprehensive OpenTelemetry observability support.

### Database Management

The CLI uses a local SQLite database to track provider performance and job history:

```bash
# Initialize the database (run before first use)
npm run db:setup

# Reset the database (drops and recreates tables)
npm run db:clear
```

The default database file is `./db.sqlite`, but you can specify a custom path using the `--db <path>` option.

### Golem Network Exploration

Explore available providers on the Golem Network:

```bash
# List available CPU providers
npm run list-cpu-offers

# List available GPU providers
npm run list-gpu-offers
```

## Sample commands

Windows

```
bun src/index.ts generate --public-key sample-key.pub --vanity-address-prefix 0x33333333 --budget-limit 1 --results-file results.json --processing-unit cpu --min-offers-timeout-sec 1 --num-workers 3
```

Linux/WSL

```bash
# Basic development usage
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x333333 \
  --budget-limit 1 \
  --results-file results.json \
  --processing-unit cpu

# GPU workers (higher performance)
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x12345678 \
  --budget-limit 10 \
  --processing-unit gpu \
  --results-file results.json \
  --num-workers 1

# With custom worker settings
npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x123456 \
  --budget-limit 15 \
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
  --budget-limit 6 \
  --processing-unit cpu \
  --results-file tmp_result.json \
  --num-workers 2

# Linux/macOS
OTEL_CONFIG_FILE=monitoring/otel-config.yaml npm run dev -- generate \
  --public-key sample-key.pub \
  --vanity-address-prefix 0x666666 \
  --budget-limit 6 \
  --processing-unit cpu \
  --results-file tmp_result.json \
  --num-workers 2
```
