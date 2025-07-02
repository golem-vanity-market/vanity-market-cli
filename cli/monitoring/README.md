# Local Monitoring Stack

This directory contains a complete observability stack for monitoring the CLI application with metrics, traces, and logs.

## Stack Components

- **Init Container** - Sets proper permissions for Tempo data directory
- **Grafana Alloy** - OpenTelemetry Collector for telemetry ingestion and routing
- **Tempo** - Distributed tracing backend with metrics generation
- **Prometheus** - Metrics collection and storage with exemplar support
- **Loki** - Log aggregation and storage
- **Grafana** - Visualization and dashboards with pre-configured datasources

## Quick Start

1. **Start the monitoring stack:**

   ```bash
   cd monitoring/
   docker compose up -d
   ```

2. **Verify services are running:**

   ```bash
   docker compose ps
   ```

3. **Access the services:**
   - **Grafana**: http://localhost:3000 (admin/admin)
   - **Prometheus**: http://localhost:9090
   - **Alloy Web UI**: http://localhost:12345
   - **Tempo API**: http://localhost:3200

## Service Endpoints

| Service    | Port  | Protocol | Purpose                         |
| ---------- | ----- | -------- | ------------------------------- |
| Grafana    | 3000  | HTTP     | Dashboards and visualization    |
| Prometheus | 9090  | HTTP     | Metrics storage and queries     |
| Tempo      | 3200  | HTTP     | Trace queries and API           |
| Loki       | 3100  | HTTP     | Log queries and API             |
| Alloy      | 12345 | HTTP     | Alloy web UI and metrics        |
| Alloy      | 4317  | gRPC     | OTLP trace/metric/log ingestion |
| Alloy      | 4318  | HTTP     | OTLP trace/metric/log ingestion |

## CLI Integration

Configure your CLI application to export telemetry to the Alloy endpoints:

- **OTLP gRPC**: `http://localhost:4317`
- **OTLP HTTP**: `http://localhost:4318`

Example environment variables:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

## Data Flow

```
CLI App → Alloy (4317/4318) → Tempo (traces) + Prometheus (metrics) + Loki (logs)
                            ↓
                        Grafana (visualization)
```

## Architecture

The stack follows the official Grafana observability pattern:

1. **Alloy** receives OTLP telemetry (traces, metrics, logs) from applications
2. **Traces** are forwarded to Tempo for storage and query
3. **Metrics** are converted and sent to Prometheus via remote write
4. **Logs** are forwarded to Loki for aggregation and storage
5. **Tempo** generates service graphs and span metrics from traces
6. **Grafana** provides unified visualization with pre-configured datasources

## Configuration Files

- `docker-compose.yml` - Service definitions with proper dependencies and initialization
- `config.alloy` - Grafana Alloy configuration (River language) for OTLP ingestion
- `prometheus.yml` - Prometheus scraping configuration with exemplar support
- `tempo.yml` - Tempo configuration with metrics generation and native histograms
- `grafana/provisioning/datasources/datasources.yml` - Auto-configured datasources

## Features

✅ **Permissions handling** - Init container ensures proper Tempo data directory permissions  
✅ **Service graphs** - Automatic generation from trace data  
✅ **Span metrics** - RED metrics (Rate, Errors, Duration) from traces  
✅ **Exemplars** - Link from metrics to traces for faster debugging  
✅ **Native histograms** - Enhanced histogram support in Prometheus  
✅ **Log aggregation** - Centralized logging via Loki with OTLP support  
✅ **Auto-provisioning** - Grafana datasources configured automatically

## Stopping the Stack

```bash
docker compose down
```

To remove all data volumes:

```bash
docker compose down -v
```

**View volumes used by the stack:**

```bash
docker compose ps --volumes
```

## Troubleshooting

**Check service logs:**

```bash
docker compose logs <service-name>
```

**Check specific service logs:**

```bash
docker compose logs init     # Permission setup
docker compose logs tempo    # Tracing backend
docker compose logs alloy    # OTLP collector
```

**Restart a specific service:**

```bash
docker compose restart <service-name>
```

**View Alloy configuration status:**
Visit http://localhost:12345 to see the Alloy web UI with component status and data flow.

**Common issues:**

- **Permission denied errors**: Ensure the init container ran successfully
- **Alloy connection issues**: Check that Tempo, Prometheus, and Loki are running first
- **No traces appearing**: Verify OTLP endpoints are reachable and CLI is configured correctly
- **No logs in Loki**: Check that logs are being sent to OTLP endpoints and Alloy is forwarding to Loki

## Resources

### Official Documentation

- [Grafana Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/latest/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

### Reference Implementation

This configuration is based on the official Grafana Tempo example:

- **[Tempo + Alloy Docker Compose Example](https://github.com/grafana/tempo/tree/main/example/docker-compose/alloy)** - Official reference implementation from Grafana Labs

### Additional Examples

- [Tempo Examples Collection](https://github.com/grafana/tempo/tree/main/example/docker-compose) - Various Tempo deployment patterns
- [Alloy Configuration Examples](https://grafana.com/docs/alloy/latest/reference/components/) - Component reference and examples
