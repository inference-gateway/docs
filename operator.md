---
title: Kubernetes Operator
description: Declarative Kubernetes management of Inference Gateway via Custom Resources - Gateway, Agent, MCP, and Orchestrator CRDs under core.inference-gateway.com/v1alpha1.
---

# Kubernetes Operator

The Inference Gateway Operator is a Kubernetes controller that manages Inference Gateway and related resources declaratively through Custom Resources (CRs). It is the recommended way to run Inference Gateway on Kubernetes - manage gateways, A2A agents, MCP servers, and chat-channel orchestrators as first-class CRs in the same cluster API your other workloads use.

The operator publishes four CRDs under `core.inference-gateway.com/v1alpha1`:

- `Gateway` - the gateway proxy itself, with providers, auth, MCP, routing (Gateway API), and HPA.
- `Agent` - an A2A worker that an `Orchestrator` (or any A2A client) can dispatch tasks to.
- `MCP` - a Model Context Protocol server.
- `Orchestrator` - runs a chat bot backed by the gateway. It listens on a messaging channel (Telegram today; more channels planned), drives the conversation with an LLM, and can delegate work to `Agent`s and MCP tools.

The API is `v1alpha1` and breaking changes can land between releases.

## Installation

The operator is distributed as pre-rendered manifests on each GitHub release. The `install.yaml` artifact bundles the namespace, CRDs, RBAC, and controller deployment.

```bash
kubectl apply -f https://github.com/inference-gateway/operator/releases/latest/download/install.yaml
```

For production, pin to a release rather than `latest` (the current release is `v0.16.3`):

```bash
kubectl apply -f https://github.com/inference-gateway/operator/releases/download/v0.16.3/install.yaml
```

For GitOps (ArgoCD, Flux), point your source at the operator repository's `manifests/` directory at a tagged ref - it contains the same `install.yaml` and a CRD-only `crds.yaml` for split installs.

## Verification

```bash
kubectl get pods -n inference-gateway-system
kubectl get crd | grep inference-gateway.com
```

You should see four CRDs: `gateways`, `agents`, `mcps`, and `orchestrators`.

## Custom Resources

### Gateway

Deploys the gateway proxy. Source: [`api/v1alpha1/gateway_types.go`](https://github.com/inference-gateway/operator/blob/main/api/v1alpha1/gateway_types.go).

| Field                                                            | Description                                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `replicas`                                                       | Pod count (1-100, default `1`).                                                                                                                                                            |
| `image`                                                          | Container image, default `ghcr.io/inference-gateway/inference-gateway:latest`.                                                                                                             |
| `environment`                                                    | One of `development`, `staging`, `production` (default `production`).                                                                                                                      |
| `server.port` / `server.host` / `server.timeouts` / `server.tls` | HTTP server settings.                                                                                                                                                                      |
| `auth.enabled` / `auth.provider` / `auth.oidc`                   | Authentication. `provider` is `oidc`, `jwt`, or `basic`. See [Authentication (OIDC)](#authentication-oidc).                                                                                |
| `providers[]`                                                    | Each item: `name`, `enabled`, and an `env` list of `corev1.EnvVar`. Provider keys are passed through unchanged.                                                                            |
| `telemetry.enabled` / `telemetry.metrics.{enabled,port}`         | OpenTelemetry metrics. There is no `telemetry.tracing` block - tracing is configured through standard OTEL env vars on the gateway pod.                                                    |
| `mcp.enabled` / `mcp.servers[]` / `mcp.timeouts`                 | MCP client configuration with per-server health checks.                                                                                                                                    |
| `service.{type,port,annotations}`                                | Kubernetes Service for the gateway.                                                                                                                                                        |
| `routing.{enabled,gateway,httpRoute}`                            | North-south traffic via the Kubernetes Gateway API (`gateway.networking.k8s.io`). Successor to the removed `ingress` field. See [Routing (Gateway API)](#routing-gateway-api).             |
| `hpa.{enabled,config}`                                           | Wraps a `HorizontalPodAutoscalerSpec`. See the [Kubernetes HPA docs](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) for the `metrics[]` and `behavior` shape. |
| `serviceAccount.{create,name}`                                   | Pod service account.                                                                                                                                                                       |
| `resources.requests` / `resources.limits`                        | CPU and memory.                                                                                                                                                                            |

Provider env vars referenced via Secrets follow the standard `valueFrom.secretKeyRef` pattern - see [Configuration](/configuration/) for the full list of variables each provider accepts.

### Agent

Deploys an A2A worker. Agents are dispatched to by an `Orchestrator` (or any A2A client) - the gateway itself does not call agents; it only proxies inference. The agent typically calls back into the gateway for its own LLM completions via `agent.llm.baseURL`. Source: [`api/v1alpha1/agent_types.go`](https://github.com/inference-gateway/operator/blob/main/api/v1alpha1/agent_types.go). See [A2A Integration](/a2a/) for protocol background.

| Field                                                                                                    | Description                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `image`                                                                                                  | Required agent container image.                                                                                        |
| `port` / `host` / `readTimeout` / `writeTimeout` / `idleTimeout`                                         | HTTP server settings (defaults: `8080`, `0.0.0.0`, `30s`, `30s`, `60s`).                                               |
| `logging.{level,format}`                                                                                 | Defaults: `info`, `json`.                                                                                              |
| `tls.{enabled,secretRef}`                                                                                | TLS for the agent's HTTP server.                                                                                       |
| `agent.maxConversationHistory` / `agent.maxChatCompletionIterations` / `agent.maxRetries`                | LLM loop limits (defaults `10`, `5`, `3`).                                                                             |
| `agent.llm.baseURL`                                                                                      | LLM endpoint (typically the gateway URL).                                                                              |
| `agent.llm.model`                                                                                        | `provider/model` format. The prefix is split out as `A2A_AGENT_CLIENT_PROVIDER`, the rest as `A2A_AGENT_CLIENT_MODEL`. |
| `agent.llm.maxTokens` / `agent.llm.temperature` / `agent.llm.systemPrompt` / `agent.llm.customHeaders[]` | LLM tuning.                                                                                                            |
| `agent.llm.apiKeySecretRef`                                                                              | `corev1.SecretKeySelector` for the LLM API key.                                                                        |
| `queue.{enabled,maxSize,cleanupInterval}`                                                                | Optional task queue.                                                                                                   |
| `env[]`                                                                                                  | Additional pod env vars.                                                                                               |

The operator publishes the agent's discovered capabilities into `status.card`, which the orchestrator consumes through service discovery.

### MCP

Deploys a Model Context Protocol server. Source: [`api/v1alpha1/mcp_types.go`](https://github.com/inference-gateway/operator/blob/main/api/v1alpha1/mcp_types.go). See [MCP Integration](/mcp/) for protocol background.

| Field                             | Description                                                           |
| --------------------------------- | --------------------------------------------------------------------- |
| `replicas`                        | Pod count (default `1`).                                              |
| `image`                           | Container image, default `node:lts`.                                  |
| `server.port`                     | Listen port (default `8080`).                                         |
| `server.command` / `server.args`  | Override the container command.                                       |
| `server.timeout`                  | Request timeout (default `30s`).                                      |
| `server.tls.{enabled,secretName}` | TLS cert from a Secret. `secretName` is required when TLS is enabled. |
| `hpa.{enabled,config}`            | Same shape as `Gateway.hpa`.                                          |

### Orchestrator

Deploys the Inference Gateway CLI's `channels-manager` daemon - a chat bot that bridges a messaging channel and the gateway. It receives incoming messages, runs them through an LLM, optionally delegates work to `Agent`s and MCP tools, and posts the reply back to the channel. Source: [`api/v1alpha1/orchestrator_types.go`](https://github.com/inference-gateway/operator/blob/main/api/v1alpha1/orchestrator_types.go).

The Deployment is forced to a singleton (`replicas: 1`, `strategy: Recreate`) because Telegram allows only one active `getUpdates` consumer per bot token - running two replicas would 409. For HA today, run multiple `Orchestrator` resources with different tokens and disjoint allowed-user lists.

| Field                                                                          | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `image`                                                                        | Required CLI image, e.g. `ghcr.io/inference-gateway/cli:latest`.                                                                                                               |
| `channels.maxWorkers` / `channels.imageRetention` / `channels.requireApproval` | Top-level channel runtime.                                                                                                                                                     |
| `channels.telegram.enabled`                                                    | Toggle the Telegram channel.                                                                                                                                                   |
| `channels.telegram.tokenSecretRef`                                             | `SecretKeySelector` for the bot token (required).                                                                                                                              |
| `channels.telegram.allowedUsersSecretRef`                                      | `SecretKeySelector` for a comma-separated allow-list.                                                                                                                          |
| `channels.telegram.pollTimeout`                                                | `metav1.Duration` for `getUpdates` long-polling.                                                                                                                               |
| `gateway.url`                                                                  | Required URL of the gateway this orchestrator talks to.                                                                                                                        |
| `gateway.apiKeySecretRef`                                                      | Optional API key for the gateway.                                                                                                                                              |
| `agent.model`                                                                  | Required `provider/model` for the orchestrating LLM.                                                                                                                           |
| `agent.systemPrompt`                                                           | Optional system prompt.                                                                                                                                                        |
| `tools.enabled` / `tools.schedule`                                             | Built-in CLI tools (incl. scheduling).                                                                                                                                         |
| `a2a.enabled`                                                                  | Toggle A2A fan-out. **A2A lives on `Orchestrator`, not on `Gateway`.**                                                                                                         |
| `a2a.agents[]`                                                                 | Static agent URLs.                                                                                                                                                             |
| `a2a.serviceDiscovery.{enabled,namespace,selector}`                            | Discover `Agent` CRs by label selector. The pod is rolled when the discovered set changes.                                                                                     |
| `telemetry.enabled` / `telemetry.traces` / `telemetry.metrics`                 | OpenTelemetry telemetry. The `channels-manager` daemon consumes only a master switch and a single shared OTLP endpoint. See [Orchestrator Telemetry](#orchestrator-telemetry). |
| `resources` / `env[]`                                                          | Standard pod knobs.                                                                                                                                                            |

## Authentication (OIDC)

`spec.auth` secures the gateway proxy with OpenID Connect. When `enabled` is `true`, the Gateway controller translates the CRD fields into the gateway's `AUTH_*` environment variables, and the gateway validates every request's Bearer token against the issuer's JWKS. For the token flow, Keycloak setup, and how to obtain access tokens, see the [Authentication guide](/authentication/) - this section covers only how the same OIDC contract is expressed on the `Gateway` CR.

### `spec.auth`

| Field      | Description                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| `enabled`  | Toggle authentication (default `false`). Always emitted as `AUTH_ENABLE`.                                    |
| `provider` | Provider type: `oidc` (default), `jwt`, or `basic`. `oidc` is the path wired end to end and documented here. |
| `oidc`     | OIDC configuration (see below).                                                                              |

### `spec.auth.oidc`

| Field             | Emitted env var           | Description                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `issuerUrl`       | `AUTH_OIDC_ISSUER`        | OIDC issuer URL (default `http://keycloak:8080/realms/inference-gateway-realm`).                                                                                                                                                                                                                                            |
| `clientId`        | `AUTH_OIDC_CLIENT_ID`     | OAuth2 client id, used as the expected `aud` (default `inference-gateway-client`).                                                                                                                                                                                                                                          |
| `clientSecretRef` | `AUTH_OIDC_CLIENT_SECRET` | `SecretKeySelector` (`name` + `key`) for the client secret. The operator wires it through as a `valueFrom.secretKeyRef`, so the secret value never lands in the CR.                                                                                                                                                         |
| `caCertRef`       | `SSL_CERT_FILE`           | `ConfigMapKeySelector` (`name` + `key`) holding a PEM-encoded CA certificate. The operator mounts it into the gateway pod at `/usr/local/share/ca-certificates/oidc-ca.crt` and points `SSL_CERT_FILE` at it, so the Go runtime trusts a self-signed issuer (for example a Keycloak with its own CA) during OIDC discovery. |

The OIDC variables are emitted only when `enabled: true` and an `oidc` block is present. `AUTH_OIDC_CLIENT_SECRET` is added only when `clientSecretRef` is set, and `SSL_CERT_FILE` only when `caCertRef` is set. The variables themselves are documented on the gateway side in [Configuration](/configuration/#openid-connect).

### Example: Gateway with OIDC

This mirrors the [Kubernetes authentication example](/authentication/#keycloak-integration) expressed as a `Gateway` CR. Create a Secret holding the client secret and (for a self-signed issuer) a ConfigMap holding the issuer's CA certificate, then reference both from `spec.auth.oidc`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gateway-oidc
  namespace: inference-gateway
type: Opaque
stringData:
  client-secret: <your-client-secret>
---
# Only needed for a self-signed issuer (for example Keycloak with its own CA).
apiVersion: v1
kind: ConfigMap
metadata:
  name: keycloak-ca
  namespace: inference-gateway
data:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    ...your issuer's PEM CA...
    -----END CERTIFICATE-----
---
apiVersion: core.inference-gateway.com/v1alpha1
kind: Gateway
metadata:
  name: my-gateway
  namespace: inference-gateway
spec:
  replicas: 1
  auth:
    enabled: true
    provider: oidc
    oidc:
      issuerUrl: https://keycloak.example.com/realms/inference-gateway-realm
      clientId: inference-gateway-client
      clientSecretRef:
        name: gateway-oidc
        key: client-secret
      caCertRef:
        name: keycloak-ca
        key: ca.crt
  providers:
    - name: OpenAI
      enabled: true
      env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: OPENAI_API_KEY
```

Drop the `caCertRef` block and its ConfigMap when the issuer presents a publicly trusted certificate - it is only required to trust a self-signed or private-CA issuer.

## Quick Start: Minimal Gateway

Create a Secret with your provider API key, then a `Gateway`. The provider shape is `name` + `enabled` + `env[]` - env vars are passed through to the gateway pod.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openai-secret
  namespace: inference-gateway
type: Opaque
stringData:
  OPENAI_API_KEY: sk-...
---
apiVersion: core.inference-gateway.com/v1alpha1
kind: Gateway
metadata:
  name: my-gateway
  namespace: inference-gateway
spec:
  replicas: 1
  environment: development
  telemetry:
    enabled: true
    metrics:
      enabled: true
      port: 9464
  providers:
    - name: OpenAI
      enabled: true
      env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: OPENAI_API_KEY
```

Apply it and port-forward to test:

```bash
kubectl apply -f gateway.yaml
kubectl get gateway -n inference-gateway -w
kubectl port-forward -n inference-gateway svc/my-gateway 8080:8080
```

For a full end-to-end example with an `Orchestrator`, two `Agent`s, and Redis state, see [`examples/orchestrator/`](https://github.com/inference-gateway/operator/tree/main/examples/orchestrator) in the operator repository.

## Routing (Gateway API)

`spec.routing` exposes the gateway to north-south traffic through the [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/) (`gateway.networking.k8s.io`). It is the `v1alpha1` successor to the removed `ingress` field: instead of an `Ingress` fronted by ingress-nginx, the operator provisions a Gateway API `Gateway` and `HTTPRoute` for the gateway Service, served by [Envoy Gateway](https://gateway.envoyproxy.io/) (the `envoy` GatewayClass).

The `ingress:` field and the NGINX Ingress path are gone - Kubernetes deployments now front the gateway with the Gateway API. This mirrors the migration in the gateway's [`examples/kubernetes`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes) (tracking issue [inference-gateway/inference-gateway#370](https://github.com/inference-gateway/inference-gateway/issues/370), verification PR [inference-gateway/inference-gateway#367](https://github.com/inference-gateway/inference-gateway/pull/367)).

### Install the Gateway API and Envoy Gateway

Routing needs the Gateway API CRDs plus an implementation that registers the `envoy` GatewayClass. Install them once per cluster, before applying a `Gateway` with `routing.enabled: true`:

```bash
# 1. Gateway API standard CRDs (GatewayClass, Gateway, HTTPRoute).
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/standard-install.yaml

# 2. Envoy Gateway (the data plane).
helm upgrade --install envoy-gateway \
  oci://docker.io/envoyproxy/gateway-helm \
  --version v1.2.0 \
  --namespace envoy-gateway-system \
  --create-namespace \
  --skip-crds \
  --wait

# 3. Register the "envoy" GatewayClass.
kubectl apply -f - <<'EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
EOF
```

The gateway's [`examples/kubernetes`](https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes) wrap these steps as `task deploy-infrastructure` (cluster + Gateway API + Envoy Gateway + operator).

### `spec.routing`

| Field                                     | Description                                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                                 | Toggle Gateway API routing (default `false`). When `true`, the operator creates the Gateway API resources for the gateway Service.                    |
| `gateway.gatewayClassName`                | GatewayClass that implements the listener (default `envoy`). Ignored when `gateway.parentRefs` is set.                                                |
| `gateway.parentRefs[]`                    | Advanced mode: attach the `HTTPRoute` to an existing, platform-managed `Gateway` instead of creating one.                                             |
| `gateway.tls.{enabled,issuer,secretName}` | Terminate TLS at the Gateway listener. `issuer` names a cert-manager `ClusterIssuer`; `secretName` defaults to the gateway name suffixed with `-tls`. |
| `httpRoute.hostnames[]`                   | Hostnames the `HTTPRoute` matches. In default mode they also become the managed Gateway listener's hostnames.                                         |

In **default mode** the operator owns both the `Gateway` and the `HTTPRoute`. Setting `gateway.parentRefs` switches to **advanced mode**, where a platform team owns a shared `Gateway` and the operator only creates the `HTTPRoute` attached to it.

### Example: Gateway with routing

```yaml
apiVersion: core.inference-gateway.com/v1alpha1
kind: Gateway
metadata:
  name: my-gateway
  namespace: inference-gateway
spec:
  replicas: 1
  providers:
    - name: OpenAI
      enabled: true
      env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: OPENAI_API_KEY
  routing:
    enabled: true
    gateway:
      gatewayClassName: envoy
    httpRoute:
      hostnames:
        - api.inference-gateway.local
```

### Reach the gateway

Routing provisions a Gateway API `Gateway` and `HTTPRoute` in the gateway's namespace, while Envoy Gateway runs the data-plane Service in `envoy-gateway-system`. Confirm the resources are ready, then port-forward the Envoy Service and send the request with the routed hostname as a `Host` header (no `/etc/hosts` edit needed):

```bash
kubectl get gateway.gateway.networking.k8s.io -n inference-gateway
kubectl get httproute -n inference-gateway

ENVOY_SVC=$(kubectl get svc -n envoy-gateway-system \
  -l gateway.envoyproxy.io/owning-gateway-name=my-gateway \
  -o jsonpath='{.items[0].metadata.name}')
kubectl -n envoy-gateway-system port-forward "svc/${ENVOY_SVC}" 8080:80

curl -H 'Host: api.inference-gateway.local' http://localhost:8080/v1/models
```

For runnable manifests, see [`gateway-with-routing-simple`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-with-routing-simple) and [`gateway-with-routing-advanced`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-with-routing-advanced) in the operator repository.

## Orchestrator Telemetry

`spec.telemetry` on an `Orchestrator` configures OpenTelemetry traces and metrics. It reuses the shared `TelemetrySpec` that `Gateway` and `Agent` use, so the block accepts the same `enabled`, `traces`, `metrics`, and exporter fields. The orchestrator runs the CLI's `channels-manager` daemon, which consumes a narrower slice of that type: the controller maps the whole block onto just two environment variables on the orchestrator pod. When telemetry is enabled, the daemon pushes operational metrics (messages processed, message duration, active channels) over OTLP alongside traces and logs.

| Emitted env var                 | Sourced from                                                                                          | Description                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `INFER_TELEMETRY_ENABLED`       | `telemetry.enabled`                                                                                   | Master switch (default `false`). Always emitted - it is set to `false` when `spec.telemetry` is omitted or disabled.           |
| `INFER_TELEMETRY_OTLP_ENDPOINT` | `telemetry.traces.exporter.otlp.endpoint`, falling back to `telemetry.metrics.exporter.otlp.endpoint` | Single OTLP/HTTP collector endpoint shared by all signals. Emitted only when telemetry is enabled and an OTLP endpoint is set. |

### Single shared OTLP endpoint

Unlike `Gateway` and `Agent`, the `channels-manager` CLI exposes **one** OTLP endpoint for both traces and metrics - there is no per-signal OTLP field. When both `telemetry.traces.exporter.otlp.endpoint` and `telemetry.metrics.exporter.otlp.endpoint` are set, the **traces endpoint wins** and the metrics endpoint is ignored. Point both signals at one collector that ingests them together, or export metrics over Prometheus pull (which needs no OTLP endpoint) to sidestep the conflict.

The remaining `TelemetrySpec` fields - the `telemetry.metrics.*` Prometheus settings and the per-signal `protocol` - are accepted for schema parity with `Gateway`/`Agent` but are **inert for the orchestrator**: it is a forced singleton daemon with no scrape Service, so only the master switch and the shared OTLP endpoint reach the CLI. Configure Prometheus scraping and per-signal protocols on a `Gateway` or `Agent` instead. See [CLI Telemetry](/observability/#cli-telemetry) for how the daemon exports to the OTLP endpoint, and [Channels Manager (Daemon)](/observability/#channels-manager-daemon) for the daemon-specific metrics reference.

### Example: Orchestrator with OTLP traces and Prometheus metrics

```yaml
apiVersion: core.inference-gateway.com/v1alpha1
kind: Orchestrator
metadata:
  name: my-orchestrator
  namespace: inference-gateway
spec:
  image: ghcr.io/inference-gateway/cli:latest
  channels:
    telegram:
      enabled: true
      tokenSecretRef:
        name: telegram-bot
        key: token
  gateway:
    url: http://my-gateway:8080
  agent:
    model: openai/gpt-4o
  telemetry:
    enabled: true
    traces:
      exporter:
        otlp:
          endpoint: http://otel-collector:4318
    metrics:
      enabled: true
      exporter:
        prometheus:
          port: 9464
```

The orchestrator pod receives exactly two telemetry variables from this block:

```bash
INFER_TELEMETRY_ENABLED=true
INFER_TELEMETRY_OTLP_ENDPOINT=http://otel-collector:4318
```

Traces and daemon-specific operational metrics are pushed to the collector over OTLP/HTTP. The `metrics.exporter.prometheus` block is schema-valid but does not translate to any orchestrator env var today (no scrape endpoint is exposed); it is shown here to illustrate the full shared `TelemetrySpec` shape. Because Prometheus metrics do not claim an OTLP endpoint, pairing them with OTLP traces also keeps the single shared endpoint unambiguous.

The daemon emits the following metrics when telemetry is enabled:

| Metric                            | Type           | Description                     |
| --------------------------------- | -------------- | ------------------------------- |
| `infer.daemon.messages_processed` | Counter        | Inbound messages processed      |
| `infer.daemon.message.duration`   | Histogram      | Per-message processing duration |
| `infer.daemon.active_channels`    | UpDown Counter | Number of active channels       |

All daemon metrics carry the resource attribute `infer.execution.mode=daemon`. See [Channels Manager (Daemon)](/observability/#channels-manager-daemon) for example PromQL queries.

## Status and Monitoring

```bash
kubectl get gateway -A
kubectl describe gateway my-gateway -n inference-gateway
```

The `Gateway` status surfaces:

- `phase` - `Pending`, `Running`, `Failed`, or `Unknown`.
- `readyReplicas` / `availableReplicas`.
- `url` - the resolved access URL (the routing hostname when `routing` is enabled, otherwise the cluster service URL).
- `providerSummary` - comma-separated list of enabled providers.
- `conditions[]` - standard `Available` / `Progressing` / `ReplicaFailure` conditions.

`Agent`, `MCP`, and `Orchestrator` expose the standard `metav1.Condition` slice plus a boolean `ready`. `Orchestrator` additionally exposes `discoveredAgents[]` and `discoveredAgentCount` when service discovery is enabled. See [Observability](/observability/) for end-to-end metrics and tracing setup.

## Cleanup

Delete custom resources before uninstalling the operator so finalizers can run:

```bash
kubectl delete gateway,agent,mcp,orchestrator --all -A
kubectl delete -f https://github.com/inference-gateway/operator/releases/latest/download/install.yaml
```

## Examples

The operator repository ships runnable examples for each CRD:

- [`gateway-minimal`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-minimal) - single provider, no routing.
- [`gateway-complete`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-complete) - HPA, multiple providers, TLS via cert-manager.
- [`gateway-with-routing-simple`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-with-routing-simple) and [`gateway-with-routing-advanced`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-with-routing-advanced) - Gateway API routing patterns (operator-managed Gateway, or an `HTTPRoute` attached to a shared Gateway).
- [`agent-server`](https://github.com/inference-gateway/operator/tree/main/examples/agent-server) - minimal A2A agent.
- [`mcp-server`](https://github.com/inference-gateway/operator/tree/main/examples/mcp-server) - MCP server.
- [`orchestrator`](https://github.com/inference-gateway/operator/tree/main/examples/orchestrator) - gateway + two agents + orchestrator with service discovery.
