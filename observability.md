---
title: Observability
description: Prometheus metrics, OpenTelemetry traces, structured JSON logs, Grafana dashboards, and reference Kubernetes monitoring stacks for production Inference Gateway deployments.
---

# Observability

Inference Gateway ships first-class observability for production deployments: a Prometheus-compatible metrics endpoint with named gateway and tool-call metrics, OpenTelemetry-based instrumentation, structured JSON logs, and reference Grafana / Loki / Jaeger stacks you can copy directly into your cluster.

This page covers:

- Exported Prometheus metrics (names, labels, units)
- Enabling telemetry and scraping with Prometheus / kube-prometheus-stack
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

The following metrics are exported when `TELEMETRY_ENABLE=true`. All metric values are observed in milliseconds for histograms; counters are monotonic.

### Token usage

| Metric                        | Type    | Labels              | Description                                               |
| ----------------------------- | ------- | ------------------- | --------------------------------------------------------- |
| `llm_usage_prompt_tokens`     | Counter | `provider`, `model` | Number of prompt tokens consumed per provider/model.      |
| `llm_usage_completion_tokens` | Counter | `provider`, `model` | Number of completion tokens generated per provider/model. |
| `llm_usage_total_tokens`      | Counter | `provider`, `model` | Total tokens (`prompt + completion`) per provider/model.  |

### Requests and responses

| Metric                 | Type           | Labels                                                      | Description                                        |
| ---------------------- | -------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `llm_requests_total`   | Counter        | `provider`, `request_type`                                  | Total number of requests processed by the gateway. |
| `llm_responses_total`  | Counter        | `provider`, `request_method`, `request_path`, `status_code` | Total responses bucketed by HTTP status code.      |
| `llm_request_duration` | Histogram (ms) | `provider`, `request_method`, `request_path`                | End-to-end request duration in milliseconds.       |

Histogram bucket boundaries (ms): `1, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000`.

### Tool / function calls

| Metric                         | Type           | Labels                                                      | Description                                          |
| ------------------------------ | -------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `llm_tool_calls_total`         | Counter        | `provider`, `model`, `tool_type`, `tool_name`               | Total number of tool/function calls executed.        |
| `llm_tool_calls_success_total` | Counter        | `provider`, `model`, `tool_type`, `tool_name`               | Successful tool/function calls.                      |
| `llm_tool_calls_failure_total` | Counter        | `provider`, `model`, `tool_type`, `tool_name`, `error_type` | Failed tool/function calls bucketed by error reason. |
| `llm_tool_call_duration`       | Histogram (ms) | `provider`, `model`, `tool_type`, `tool_name`               | Per-call duration of tool/function invocation.       |

`tool_type` distinguishes MCP-backed tools from A2A tools and inline function calls (`mcp`, `a2a`, `function`). `tool_name` is the fully qualified tool identifier as registered with the gateway.

### Example queries (PromQL)

```promql
# Requests per second by provider
sum by (provider) (rate(llm_requests_total[5m]))

# p95 end-to-end request latency
histogram_quantile(0.95, sum by (le, provider) (rate(llm_request_duration_bucket[5m])))

# Error rate (5xx) per provider
sum by (provider) (rate(llm_responses_total{status_code=~"5.."}[5m]))
/ sum by (provider) (rate(llm_responses_total[5m]))

# Tool-call failure ratio per tool
sum by (tool_name) (rate(llm_tool_calls_failure_total[5m]))
/ sum by (tool_name) (rate(llm_tool_calls_total[5m]))

# Tokens per minute (prompt + completion) per model
sum by (model) (rate(llm_usage_total_tokens[1m])) * 60
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
            sum by (provider) (rate(llm_responses_total{status_code=~"5.."}[5m]))
              / sum by (provider) (rate(llm_responses_total[5m])) > 0.05
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: 'Inference Gateway 5xx rate above 5% for {{ $labels.provider }}'
        - alert: InferenceGatewayP95LatencyHigh
          expr: |
            histogram_quantile(0.95,
              sum by (le, provider) (rate(llm_request_duration_bucket[5m]))
            ) > 5000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: 'p95 request duration > 5s for {{ $labels.provider }}'
        - alert: InferenceGatewayToolCallFailures
          expr: |
            sum by (tool_name) (rate(llm_tool_calls_failure_total[10m]))
              / sum by (tool_name) (rate(llm_tool_calls_total[10m])) > 0.1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: 'Tool {{ $labels.tool_name }} failing > 10% of calls'
```

## Grafana Dashboard

A reference Grafana dashboard for these metrics is maintained in the main gateway repo:

- Docker Compose example: [`examples/docker-compose/monitoring/grafana/dashboards/inference-gateway.json`](https://github.com/inference-gateway/inference-gateway/blob/main/examples/docker-compose/monitoring/grafana/dashboards/inference-gateway.json)
- Kubernetes example with provisioned dashboards: [`examples/kubernetes/monitoring`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/monitoring)

Import it into Grafana via **Dashboards -> New -> Import**, paste the JSON, and bind it to your Prometheus data source.

A minimal hand-rolled panel set you can build in Grafana:

| Panel                    | Query                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Requests/sec by provider | `sum by (provider) (rate(llm_requests_total[1m]))`                                                                          |
| Error rate by provider   | `sum by (provider) (rate(llm_responses_total{status_code=~"5.."}[5m])) / sum by (provider) (rate(llm_responses_total[5m]))` |
| p50 / p95 / p99 latency  | `histogram_quantile(0.95, sum by (le, provider) (rate(llm_request_duration_bucket[5m])))`                                   |
| Tokens/min by model      | `sum by (model) (rate(llm_usage_total_tokens[1m])) * 60`                                                                    |
| Tool-call success rate   | `sum by (tool_name) (rate(llm_tool_calls_success_total[5m])) / sum by (tool_name) (rate(llm_tool_calls_total[5m]))`         |

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

## Reference Monitoring Stack

For a runnable end-to-end setup (Prometheus + Grafana + Loki + dashboards already wired), see the official examples:

- Docker Compose: [`examples/docker-compose/monitoring`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose/monitoring)
- Kubernetes (kube-prometheus-stack): [`examples/kubernetes/monitoring`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes/monitoring)

Both bring up the gateway with `TELEMETRY_ENABLE=true`, scrape `/metrics`, provision the reference Grafana dashboards, and (in the Kubernetes example) install a `ServiceMonitor` for kube-prometheus-stack.

## Troubleshooting Observability

- **No data in `/metrics`** - confirm `TELEMETRY_ENABLE=true` and that you are scraping the telemetry port (`TELEMETRY_METRICS_PORT`, default `9464`), not the main API port.
- **ServiceMonitor not picked up** - the `release:` label on the `ServiceMonitor` must match your kube-prometheus-stack Helm release name (often `kube-prometheus-stack`). Check the Prometheus Operator's `serviceMonitorSelector`.
- **Traces missing** - verify `OTEL_EXPORTER_OTLP_ENDPOINT` resolves from inside the gateway pod and that the collector is listening on the expected protocol (`grpc` on 4317 vs `http` on 4318).
- **Logs not appearing in Loki** - check that Promtail is running as a DaemonSet on the gateway's node and that its scrape config matches the gateway's namespace/labels.

For broader operational issues (auth, MCP, vision, provider 4xx debugging), see [Troubleshooting](/troubleshooting/).
