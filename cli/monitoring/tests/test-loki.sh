#!/bin/bash

# Test Loki integration by sending sample log data

echo "Testing Loki integration..."

# Test 1: Send log data directly to Loki via Alloy (OTLP HTTP)
echo "1. Testing OTLP log ingestion via Alloy..."
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [
      {
        "resource": {
          "attributes": [
            {
              "key": "service.name",
              "value": {
                "stringValue": "cli-test"
              }
            },
            {
              "key": "service.version",
              "value": {
                "stringValue": "1.0.0"
              }
            }
          ]
        },
        "scopeLogs": [
          {
            "scope": {
              "name": "test-logger"
            },
            "logRecords": [
              {
                "timeUnixNano": "'$(date +%s)'000000000",
                "severityText": "INFO",
                "body": {
                  "stringValue": "Test log message from CLI via Alloy to Loki"
                },
                "attributes": [
                  {
                    "key": "log.level",
                    "value": {
                      "stringValue": "info"
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }'

echo -e "\n"

# Test 2: Send log data directly to Loki API
echo "2. Testing direct Loki API..."
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [
      {
        "stream": {
          "job": "cli-direct-test",
          "level": "info"
        },
        "values": [
          ["'$(date +%s)'000000000", "Direct test log message to Loki API"]
        ]
      }
    ]
  }'

echo -e "\n"

# Test 3: Query logs from Loki
echo "3. Querying logs from Loki..."
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="cli-direct-test"}' \
  --data-urlencode "start=$(date -d '1 minute ago' +%s)000000000" \
  --data-urlencode "end=$(date +%s)000000000"

echo -e "\n\nTest completed! Check Grafana at http://localhost:3000 to view logs."
