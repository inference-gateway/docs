---
title: Observability
description: Prometheus metrics (OpenTelemetry GenAI semantic conventions), OTLP metrics push endpoint, OpenTelemetry traces, structured JSON logs, Grafana dashboards, and reference Kubernetes monitoring stacks for production Inference Gateway deployments.
---

# Observability

Inference Gateway ships first-class observability for production deployments: a Prometheus-compatible metrics endpoint following the [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/), an opt-in OTLP/HTTP metrics push endpoint for subscription clients, OpenTelemetry-based instrumentation, structured JSON logs, and reference Grafana / Loki / Jaeger stacks you can copy directly into your cluster.

This page covers:

- Exported Prometheus metrics (names, labels, units)
- Enabling telemetry and scraping with Prometheus / kube-prometheus-stack
- Pushing metrics via the OTLP endpoint
- A reference Grafana dashboard
- Distributed tracing with OpenTelemetry Collector and Jaeger
- Log aggregation with Loki + Promtail
- The official Kubernetes monitoring stack examples

## Enabling Telemetry

Telemetry is opt-in. Set the following variables to expose metrics on a dedicated port:

```bash
TELEMETRY_ENABLE=true
TELEMETRY_METRICS_PORT=9464   # default
```

When enabled, the gateway exposes a Prometheus exposition endpoint at `http://<gateway>:9464/metrics`. Metrics are exported by the OpenTelemetry SDK via the Prometheus exporter, with service attributes (`service.name`, `service.version`, `deployment.environment`) attached from the gateway's runtime.

The metrics port is separate from the main API port. Do not expose `9464` to the public internet; scope it to your cluster network or behind your monitoring ingress.

## Exported Metrics

The following metrics are exported when `TELEMETRY_ENABLE=true`. Metrics follow the [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/).

Every series carries a `source` label: `gateway` for gateway-observed traffic, or a client-supplied value for pushed metrics.

### Metric set

| Metric                                                | Type      | Description                                                             |
| ----------------------------------------------------- | --------- | ----------------------------------------------------------------------- |
| `gen_ai_client_token_usage`                           | Histogram | Token usage; `gen_ai_token_type` is `input` or `output`                 |
| `gen_ai_server_request_duration_seconds`              | Histogram | End-to-end request duration in seconds; `error_type` set only on errors |
| `gen_ai_execute_tool_duration_seconds`                | Histogram | Tool execution duration in seconds (fed via the push endpoint)          |
| `gen_ai_client_operation_duration_seconds`            | Histogram | Client-side operation duration (push-only)                              |
| `gen_ai_client_operation_time_to_first_chunk_seconds` | Histogram | Time to first chunk (push-only)                                         |
| `gen_ai_server_time_to_first_token_seconds`           | Histogram | Time to first token (push-only)                                         |
| `inference_gateway_tool_calls_total`                  | Counter   | Total function/tool calls                                               |

### Labels

| Label                   | Applies to                           | Description                                                |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `gen_ai_provider_name`  | All metrics                          | LLM provider (openai, anthropic, etc.)                     |
| `gen_ai_request_model`  | All metrics                          | Model name (gpt-4o, claude-sonnet-4, etc.)                 |
| `gen_ai_operation_name` | All metrics                          | Operation (e.g. `chat`)                                    |
| `gen_ai_token_type`     | `gen_ai_client_token_usage`          | `input` or `output`                                        |
| `gen_ai_tool_type`      | `inference_gateway_tool_calls_total` | Tool type (`mcp`, `a2a`, `function`)                       |
| `gen_ai_tool_name`      | `inference_gateway_tool_calls_total` | Fully qualified tool identifier                            |
| `error_type`            | Duration histograms                  | HTTP status string, present only on errors                 |
| `source`                | All metrics                          | `gateway` for gateway-observed, client-supplied for pushed |

### Histogram bucket boundaries

Duration histograms use these bucket boundaries (seconds): `0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56, 5.12, 10.24, 20.48, 40.96, 81.92`.

Token usage histograms use these bucket boundaries: `1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864`.

### Migration from old `llm_*` metrics

> **Breaking change (pre-1.0):** All `llm_*` Prometheus series have been renamed. Existing dashboards and alerts must be updated. Duration histograms are now in **seconds** (previously milliseconds) — drop any `/1000` conversions in your queries.

| Old metric                          | New query                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `llm_usage_prompt_tokens_total`     | `gen_ai_client_token_usage_sum{gen_ai_token_type="input"}`                  |
| `llm_usage_completion_tokens_total` | `gen_ai_client_token_usage_sum{gen_ai_token_type="output"}`                 |
| `llm_usage_total_tokens_total`      | sum of `gen_ai_client_token_usage_sum` over both token types                |
| `llm_responses_total`               | `gen_ai_server_request_duration_seconds_count` (errors: `{error_type!=""}`) |
| `llm_request_duration_*` (ms)       | `gen_ai_server_request_duration_seconds_*` (seconds)                        |
| `llm_tool_calls_total`              | `inference_gateway_tool_calls_total`                                        |
| `llm_tool_calls_success_total`      | `gen_ai_execute_tool_duration_seconds_count{error_type=""}`                 |
| `llm_tool_calls_failure_total`      | `gen_ai_execute_tool_duration_seconds_count{error_type!=""}`                |
| `llm_tool_call_duration_*` (ms)     | `gen_ai_execute_tool_duration_seconds_*` (seconds)                          |

Label renames: `provider` → `gen_ai_provider_name`, `model` → `gen_ai_request_model`, `tool_name` → `gen_ai_tool_name`, `tool_type` → `gen_ai_tool_type`.

### Example queries (PromQL)

```promql
# Input tokens per second by provider
sum by (gen_ai_provider_name) (rate(gen_ai_client_token_usage_sum{gen_ai_token_type="input"}[5m]))

# p95 end-to-end request latency (seconds)
histogram_quantile(0.95, sum by (le, gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_bucket[5m])))

# Error rate per provider
sum by (gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_count{error_type!=""}[5m]))
/ sum by (gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_count[5m]))

# Tool-call failure ratio per tool
sum by (gen_ai_tool_name) (rate(gen_ai_execute_tool_duration_seconds_count{error_type!=""}[10m]))
/ sum by (gen_ai_tool_name) (rate(gen_ai_execute_tool_duration_seconds_count[10m]))

# Tokens per minute by model and source
sum by (gen_ai_request_model, source) (rate(gen_ai_client_token_usage_sum[1m])) * 60
```

## Prometheus Scrape Configuration

### Plain Prometheus

```yaml
scrape_configs:
  - job_name: inference-gateway
    metrics_path: /metrics
    static_configs:
      - targets: ['inference-gateway:9464']
        labels:
          service: inference-gateway
```

### Kubernetes (kube-prometheus-stack)

Expose the metrics port on the gateway Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: inference-gateway
  namespace: inference-gateway
  labels:
    app: inference-gateway
spec:
  selector:
    app: inference-gateway
  ports:
    - name: http
      port: 8080
      targetPort: 8080
    - name: metrics
      port: 9464
      targetPort: 9464
```

Then have the Prometheus Operator pick it up via a `ServiceMonitor`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: inference-gateway
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: inference-gateway
  namespaceSelector:
    matchNames:
      - inference-gateway
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
      scrapeTimeout: 10s
```

Make sure the `release:` label matches your kube-prometheus-stack release name so the Prometheus Operator selects the `ServiceMonitor`.

## Pushing Metrics (OTLP)

Subscription clients that bypass the gateway's inference path can push their own usage metrics to the gateway via the OTLP/HTTP metrics push endpoint.

### Enabling the push endpoint

The push endpoint is opt-in and requires both `TELEMETRY_ENABLE=true` and `TELEMETRY_METRICS_PUSH_ENABLE=true`:

```bash
TELEMETRY_ENABLE=true
TELEMETRY_METRICS_PUSH_ENABLE=true
```

When disabled, the endpoint returns `403 Forbidden`. When enabled, it sits behind the same OIDC authentication middleware as the rest of the API.

### Endpoint

```
POST /v1/metrics
```

Accepts an OTLP `ExportMetricsServiceRequest` encoded as:

- `application/x-protobuf` — binary protobuf encoding
- `application/json` — JSON encoding via protojson

Gzip compression is supported via the `Content-Encoding: gzip` header. The maximum decoded payload size is 4 MiB.

### Response

Returns `200 OK` with an OTLP `ExportMetricsServiceResponse`. If any data points were rejected (e.g. unsupported metric names, wrong temporality), the response includes `partial_success` details with the count of rejected data points and an error message.

| Status | Description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| `200`  | Success, possibly with partial success details                                    |
| `400`  | Malformed payload or invalid gzip data                                            |
| `401`  | Missing or invalid authentication                                                 |
| `403`  | Metrics push is not enabled                                                       |
| `413`  | Payload exceeds 4 MiB limit                                                       |
| `415`  | Unsupported content type (must be `application/x-protobuf` or `application/json`) |

### Ingestion rules

- Only allowlisted `gen_ai.*` metric names are accepted (see the [metric set](#metric-set) above). Unknown metrics are rejected with `partial_success`.
- Only **delta** aggregation temporality is accepted. Cumulative or unspecified temporality data points are rejected.
- Data-point attributes are filtered to an allowlist to bound cardinality. Arbitrary custom attributes are dropped.
- Histograms are replayed via bucket midpoints (first bucket at its upper bound, overflow bucket at its lower bound). This preserves `_count` exactly and `_sum` approximately; percentile distortion is a documented v1 limitation. Replay is capped at 10,000 observations per data point.
- The `source` label is derived from the pushed payload: an explicit `source` attribute wins (unless it impersonates `gateway`), then the resource's `service.name`, then `"unknown"`.

### Example

```bash
curl -X POST http://localhost:8080/v1/metrics \
  -H 'Content-Type: application/json' \
  -d '{
    "resourceMetrics": [{
      "resource": {
        "attributes": [{ "key": "service.name", "value": { "stringValue": "infer-cli" } }]
      },
      "scopeMetrics": [{
        "metrics": [{
          "name": "gen_ai.client.token.usage",
          "sum": {
            "aggregationTemporality": 1,
            "dataPoints": [{
              "asInt": "1234",
              "attributes": [
                { "key": "gen_ai.provider.name", "value": { "stringValue": "anthropic" } },
                { "key": "gen_ai.token.type", "value": { "stringValue": "input" } },
                { "key": "source", "value": { "stringValue": "infer-cli" } }
              ]
            }]
          }
        }]
      }]
    }]
  }'
```

Pushed series carry the client-supplied `source` label, so they can be distinguished from gateway-observed traffic (`source="gateway"`) in dashboards and alerts.

### Recommended alerting rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: inference-gateway
  namespace: monitoring
spec:
  groups:
    - name: inference-gateway
      rules:
        - alert: InferenceGatewayHighErrorRate
          expr: |
            sum by (gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_count{error_type!=""}[5m]))
              / sum by (gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_count[5m])) > 0.05
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: 'Inference Gateway error rate above 5% for {{ $labels.gen_ai_provider_name }}'
        - alert: InferenceGatewayP95LatencyHigh
          expr: |
            histogram_quantile(0.95,
              sum by (le, gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_bucket[5m]))
            ) > 5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: 'p95 request duration > 5s for {{ $labels.gen_ai_provider_name }}'
        - alert: InferenceGatewayToolCallFailures
          expr: |
            sum by (gen_ai_tool_name) (rate(gen_ai_execute_tool_duration_seconds_count{error_type!=""}[10m]))
              / sum by (gen_ai_tool_name) (rate(gen_ai_execute_tool_duration_seconds_count[10m])) > 0.1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: 'Tool {{ $labels.gen_ai_tool_name }} failing > 10% of calls'
```

## Grafana Dashboard

A reference Grafana dashboard for these metrics is maintained in the main gateway repo:

- Docker Compose example: [`examples/docker-compose/monitoring/grafana/dashboards/inference-gateway.json`](https://github.com/inference-gateway/inference-gateway/blob/main/examples/docker-compose/monitoring/grafana/dashboards/inference-gateway.json)
- Kubernetes example with provisioned dashboards: [`examples/kubernetes/monitoring`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/monitoring)

Import it into Grafana via **Dashboards -> New -> Import**, paste the JSON, and bind it to your Prometheus data source.

A minimal hand-rolled panel set you can build in Grafana:

| Panel                    | Query                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requests/sec by provider | `sum by (gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_count[1m]))`                                                                                                          |
| Error rate by provider   | `sum by (gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_count{error_type!=""}[5m])) / sum by (gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_count[5m]))` |
| p50 / p95 / p99 latency  | `histogram_quantile(0.95, sum by (le, gen_ai_provider_name) (rate(gen_ai_server_request_duration_seconds_bucket[5m])))`                                                                           |
| Tokens/min by model      | `sum by (gen_ai_request_model, source) (rate(gen_ai_client_token_usage_sum[1m])) * 60`                                                                                                            |
| Tool-call success rate   | `sum by (gen_ai_tool_name) (rate(gen_ai_execute_tool_duration_seconds_count{error_type=""}[5m])) / sum by (gen_ai_tool_name) (rate(gen_ai_execute_tool_duration_seconds_count[5m]))`              |

## Distributed Tracing

The gateway initializes the global OpenTelemetry tracer provider when `TELEMETRY_ENABLE=true`. Spans are emitted for inbound requests and downstream provider calls, with `service.name`, `service.version`, and `deployment.environment` populated as resource attributes.

Use the standard OpenTelemetry environment variables to export to a collector via OTLP:

```bash
TELEMETRY_ENABLE=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_SERVICE_NAME=inference-gateway
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production
```

### OpenTelemetry Collector configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s
  memory_limiter:
    check_interval: 2s
    limit_mib: 512

exporters:
  otlp/jaeger:
    endpoint: jaeger-collector:4317
    tls:
      insecure: true
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/jaeger]
```

### Jaeger backend (Kubernetes)

Install Jaeger via Helm:

```bash
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm install jaeger jaegertracing/jaeger \
  --namespace observability --create-namespace \
  --set allInOne.enabled=true \
  --set provisionDataStore.cassandra=false \
  --set storage.type=memory
```

Then point the gateway's `OTEL_EXPORTER_OTLP_ENDPOINT` at the collector service exposed by your Jaeger or OTel Collector deployment (port `4317` for gRPC or `4318` for HTTP). Traces will be visible in the Jaeger UI under the `inference-gateway` service.

## Log Aggregation

The gateway emits structured JSON logs on stdout. Each entry includes a timestamp, level, message, and contextual fields such as `provider`, `model`, `request_id`, and `status_code`. Set log verbosity with:

```bash
ENVIRONMENT=production   # info-level logs
# or
ENVIRONMENT=development  # debug logs (verbose)
```

### Loki + Promtail (Kubernetes)

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace observability --create-namespace \
  --set grafana.enabled=false \
  --set promtail.enabled=true
```

Promtail will discover the gateway pods automatically. To filter to gateway logs in Grafana / LogQL:

```logql
{namespace="inference-gateway", app="inference-gateway"} | json
```

Useful queries:

```logql
# Error logs only
{app="inference-gateway"} | json | level="error"

# 5xx responses with their request_id
{app="inference-gateway"} | json | status_code >= 500

# All MCP-related logs
{app="inference-gateway"} | json | logger=~"mcp.*"

# Trace a single request across providers
{app="inference-gateway"} | json | request_id="<uuid>"
```

If you also export traces to Jaeger, the `request_id` field doubles as a correlation key between logs and traces.

## CLI Telemetry

The [Inference Gateway CLI](/cli/) records OpenTelemetry signals (metrics, traces, and logs) for every session. Data is written to local files under `~/.infer/telemetry/` and can optionally be exported to an OTLP/HTTP collector.

### Local files

| Signal  | File pattern                                     | Description                                                                |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| Metrics | `~/.infer/telemetry/\<session-id\>.jsonl`        | Token usage, tool outcomes, session duration, and cost (delta temporality) |
| Traces  | `~/.infer/telemetry/\<session-id\>-traces.jsonl` | One root span per session, child spans for each LLM turn and tool call     |
| Logs    | `~/.infer/telemetry/\<session-id\>-logs.jsonl`   | Structured log entries emitted during the session                          |

Traces are recorded locally per session, so you can render a session's span tree offline - no collector required - with [`infer traces`](/cli/#viewing-traces):

```text
session (standard, success)                38.8s
|-- chat ollama_cloud/deepseek-v4-flash     3.4s
|-- execute_tool Read                      162us
`-- chat ollama_cloud/deepseek-v4-flash     8.1s
```

Pass `--list` to enumerate sessions that have trace files, or `--format json` for structured output.

### OTLP/HTTP export

All three signals can be exported to an OpenTelemetry Collector by setting the standard OTel environment variables:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
export OTEL_SERVICE_NAME=infer-cli
```

Per-signal endpoint overrides (`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`) take precedence over the base endpoint. Headers are configured via `OTEL_EXPORTER_OTLP_HEADERS`.

### Example collector setup

To receive all three signals from the CLI, configure an OpenTelemetry Collector with OTLP/HTTP receivers:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  debug:
    verbosity: detailed
  otlp/jaeger:
    endpoint: jaeger-collector:4317
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      exporters: [debug]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger, debug]
    logs:
      receivers: [otlp]
      exporters: [debug]

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s
```

See the [CLI Telemetry](/cli/#telemetry) section for the full documentation, including the span hierarchy, metric names, and local file inspection commands.

## Reference Monitoring Stack

For a runnable end-to-end setup (Prometheus + Grafana + Loki + dashboards already wired), see the official examples:

- Docker Compose: [`examples/docker-compose/monitoring`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/monitoring)
- Kubernetes (kube-prometheus-stack): [`examples/kubernetes/monitoring`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/monitoring)

Both bring up the gateway with `TELEMETRY_ENABLE=true`, scrape `/metrics`, provision the reference Grafana dashboards, and (in the Kubernetes example) install a `ServiceMonitor` for kube-prometheus-stack.

## Troubleshooting Observability

- **No data in `/metrics`** - confirm `TELEMETRY_ENABLE=true` and that you are scraping the telemetry port (`TELEMETRY_METRICS_PORT`, default `9464`), not the main API port.
- **Metrics push returns 403** - confirm both `TELEMETRY_ENABLE=true` and `TELEMETRY_METRICS_PUSH_ENABLE=true` are set.
- **Pushed metrics not appearing** - check that the OTLP payload uses delta temporality and allowlisted metric names. The response's `partial_success` field will list rejected data points and reasons.
- **ServiceMonitor not picked up** - the `release:` label on the `ServiceMonitor` must match your kube-prometheus-stack Helm release name (often `kube-prometheus-stack`). Check the Prometheus Operator's `serviceMonitorSelector`.
- **Traces missing** - verify `OTEL_EXPORTER_OTLP_ENDPOINT` resolves from inside the gateway pod and that the collector is listening on the expected protocol (`grpc` on 4317 vs `http` on 4318).
- **Logs not appearing in Loki** - check that Promtail is running as a DaemonSet on the gateway's node and that its scrape config matches the gateway's namespace/labels.

For broader operational issues (auth, MCP, vision, provider 4xx debugging), see [Troubleshooting](/troubleshooting/).
