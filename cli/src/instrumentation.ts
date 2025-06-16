// Import this file only once. Do not import any nontrivial code before it.

// Be very cautionous about adding `import`s here.
import "dotenv/config"; // Needed to configure OTel SDK using environment variables.

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  PeriodicExportingMetricReader,
  InMemoryMetricExporter,
  AggregationTemporality,
} from "@opentelemetry/sdk-metrics";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-node";

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  // Note that if `traceExporter`, `metricReader`, or `logRecordProcessor` are not set here explicitly,
  // they can be configured with environment variables described here:
  // https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection
  // We configure trace and metrics exporter using in-memory exporters which aren't configurable with env vars.
  // We enable it so that it throws an error in case of an unexpected problem such as a version mismatch.
  metricReader: new PeriodicExportingMetricReader({
    exporter: new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE),
  }),
  // Must be set to enable the whole tracing part of the SDK. Otherwise spans seem not to be created.
  traceExporter: new InMemorySpanExporter(),
  // Configure whether to export logs with `OTEL_LOGS_EXPORTER` environment variable (probably using `.env`).
  // See https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection for possible values.
  // Note that even if it is disabled, our logger will log basic messages to its configured output.
});

try {
  sdk.start();
  console.log("OpenTelemetry initialized successfully");
} catch (error) {
  console.error("OpenTelemetry initialization failed:", error);
  // Continue execution - telemetry failure should not break CLI functionality
}

// It makes sure that the collected data is flushed.
export function shutdownOpenTelemetry(): Promise<void> {
  return sdk.shutdown();
}
