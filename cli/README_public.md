# Golem Vanity Address Generator CLI

A high-performance CLI tool for generating vanity cryptocurrency addresses using the [Golem Network](https://www.golem.network/). This tool leverages distributed computing to efficiently find custom Ethereum addresses that match your desired prefix patterns. It does not operate on your private key, work only on public key. The CLI uses the additive key splitting for Secure Vanity Address Generation.

**Notice** we will also open source the code that runs on providers.

## Features

- **Distributed Computing**: Utilizes Golem Network's decentralized infrastructure for CPU and GPU-based address generation
- **Vanity Address Generation**: Create Ethereum addresses with custom prefixes (e.g., addresses starting with `0x1337...`)
- **Flexible Processing**: Support for both CPU and GPU workers depending on your performance needs
- **Budget Management**: Comprehensive GLM budget controls with automatic top-up and spending limits
- **Observability**: Built-in OpenTelemetry integration for monitoring and metrics
- **Results Export**: Save generated addresses to CSV files for analysis and record-keeping

## Prerequisites

Before using this tool, ensure you have the following installed and configured:

### 1. Node.js >= 22

Install Node.js version 22 or higher:

```bash
# Using Node Version Manager (recommended)
nvm install 22
nvm use 22

# Or download from https://nodejs.org/
```

### 2. YAGNA Requestor Setup

You need a running YAGNA instance with GLM tokens. Follow the official Golem documentation:

**📖 [YAGNA Installation for Requestors](https://docs.golem.network/docs/creators/tools/yagna/yagna-installation-for-requestors)**

#### Quick YAGNA Setup Summary:

1. **Install YAGNA**:

   ```bash
   curl -sSf https://join.golem.network/as-requestor | bash
   ```

2. **Start YAGNA daemon**:

   ```bash
   yagna service run
   ```

3. **Create and fund your account**:

   ```bash
   # Create account
   yagna payment init --sender

   # Get your wallet address
   yagna payment status
   ```

4. **Set up your app key**:
   ```bash
   yagna app-key create requestor-key
   export YAGNA_APPKEY=your-generated-app-key
   ```

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/golem-vanity-address-cli.git
cd golem-vanity-address-cli/cli

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
npm run dev -- generate --help
```

## Usage

### Generate your key

```bash
openssl ecparam -name secp256k1 -genkey -noout -out ec_private.pem

# input for the golem-addr CLI:
openssl ec -in ec_private.pem -pubout -outform DER | tail -c 65 | xxd -p -c 65 > my-key.public

openssl ec -in ec_private.pem -outform DER| tail -c +8| head -c 32| xxd -p -c 32 > my-key.private
```

### Basic Usage

Generate a vanity address with a specific prefix:

```bash
golem-addr generate \
  --public-key /path/to/my-key.public \
  --vanity-address-prefix "1337" \
  --budget-limit 10
```

### Public Key Format

Your public key file should contain a hex-encoded Ethereum public key:

```
0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28
```

See the how to generate your key section.

### Advanced Usage Examples

#### GPU-accelerated:

```bash
golem-addr generate \
  --public-key ./my-key.public \
  --vanity-address-prefix "beef" \
  --processing-unit gpu \
  --budget-limit 20 \
  --num-workers 3
```

#### Generate multiple addresses with results export:

```bash
golem-addr generate \
  --public-key ./my-key.public \
  --vanity-address-prefix "cafe" \
  --num-results 5 \
  --results-file vanity-addresses.json \
  --non-interactive
```

#### CPU-only generation with custom timing:

```bash
golem-addr generate \
  --public-key ./my-key.public \
  --vanity-address-prefix "dead" \
  --processing-unit cpu \
  --single-pass-sec 30 \
  --min-offers 10 \
  --min-offers-timeout-sec 60
```

## Command Reference

### generate

Generate vanity addresses with the specified parameters.

#### Required Options:

- `--public-key <path>` - Path to file containing your public key
- `--vanity-address-prefix <prefix>` - Desired vanity prefix (1-10 characters, alphanumeric)

#### Optional Options:

- `--processing-unit <type>` - Use 'cpu' or 'gpu' workers (default: gpu)
- `--num-results <count>` - Number of addresses to generate (default: 1)
- `--num-workers <count>` - Number of parallel workers (default: 1)
- `--single-pass-sec <seconds>` - Duration for each generation pass (default: 20)
- `--results-file <path>` - Save results to JSON file (default: golem_results.json)
- `--non-interactive` - Skip confirmation prompts
- `--min-offers <count>` - Minimum provider offers to wait for (default: 5)
- `--min-offers-timeout-sec <seconds>` - Timeout for waiting for offers (default: 30)

#### Budget Management:

- `--budget-limit <amount>` - Maximum total GLM budget (required)

## Cost Estimation

GLM costs depend on:

- Prefix difficulty (longer = more expensive)
- Processing unit type (GPU is faster but more expensive)
- Number of workers
- Current provider pricing

The tool provides real-time cost estimates and difficulty calculations before starting generation.

## Development

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code
npm run format:fix
```

### Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start built version
npm start
```

## Environment Variables

- `YAGNA_APPKEY` - Your YAGNA application key
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint
- `OTEL_LOG_LEVEL` - Logging level (debug, info, warn, error)
- `RESULT_CSV_FILE` - Custom CSV output file path
- `MESSAGE_LOOP_SEC_INTERVAL` - Status update interval (default: 30)
- `PROCESS_LOOP_SEC_INTERVAL` - Process loop interval (default: 1)

## Troubleshooting

### Common Issues

1. **"YAGNA daemon not running"**

   - Ensure YAGNA is installed and running: `yagna service run`
   - Check your YAGNA_APPKEY is set correctly

2. **"Insufficient GLM balance"**

   - Check your balance: `yagna payment status`

3. **"No providers available"**

   - Increase `--min-offers-timeout-sec` to wait longer for providers
   - Try different processing unit types (cpu vs gpu)

4. **Generation taking too long**
   - Reduce prefix length for faster results
   - Increase `--num-workers` for parallel processing
   - Switch to GPU processing for better performance

### Logs

Application logs are saved in the `logs/` directory:

- `logs.jsonl` - Application logs
- `metrics.jsonl` - Metrics data

### Support

For issues related to:

- **YAGNA/Golem Network**: [Golem Documentation](https://docs.golem.network/)
- **This CLI tool**: Create an issue in the project repository

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Acknowledgments

- Built by [Unoperate](https://github.com/Unoperate) on the [Golem Network](https://www.golem.network/)
- Uses OpenTelemetry for observability
- Ethereum address generation using ethers.js
