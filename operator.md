---
title: Kubernetes Operator
description: Declarative Kubernetes management of Inference Gateway via Custom Resources - Gateway, Agent, MCP, and Orchestrator CRDs under core.inference-gateway.com/v1alpha1.
---

# Kubernetes Operator

The Inference Gateway Operator is a Kubernetes controller that manages Inference Gateway and related resources declaratively through Custom Resources (CRs). Pick the operator over the [Helm chart](/deployment/) when you want to manage gateways, A2A agents, MCP servers, and chat-channel orchestrators as first-class CRs in the same cluster API your other workloads use.

The operator publishes four CRDs under `core.inference-gateway.com/v1alpha1`:

- `Gateway` - the gateway proxy itself, with providers, auth, MCP, ingress, and HPA.
- `Agent` - an A2A worker that an `Orchestrator` (or any A2A client) can dispatch tasks to.
- `MCP` - a Model Context Protocol server.
- `Orchestrator` - runs a chat bot backed by the gateway. It listens on a messaging channel (Telegram today; more channels planned), drives the conversation with an LLM, and can delegate work to `Agent`s and MCP tools.

The API is `v1alpha1` and breaking changes can land between releases.

## Installation

The operator is distributed as pre-rendered manifests on each GitHub release. The `install.yaml` artifact bundles the namespace, CRDs, RBAC, and controller deployment.

```bash
kubectl apply -f https://github.com/inference-gateway/operator/releases/latest/download/install.yaml
```

For production, pin to a release rather than `latest`:

```bash
kubectl apply -f https://github.com/inference-gateway/operator/releases/download/v<VERSION>/install.yaml
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
| `ingress.{enabled,host,className,hosts[],tls}`                   | Ingress with optional cert-manager integration via `tls.issuer`.                                                                                                                           |
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

| Field                                                                          | Description                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `image`                                                                        | Required CLI image, e.g. `ghcr.io/inference-gateway/cli:latest`.                           |
| `channels.maxWorkers` / `channels.imageRetention` / `channels.requireApproval` | Top-level channel runtime.                                                                 |
| `channels.telegram.enabled`                                                    | Toggle the Telegram channel.                                                               |
| `channels.telegram.tokenSecretRef`                                             | `SecretKeySelector` for the bot token (required).                                          |
| `channels.telegram.allowedUsersSecretRef`                                      | `SecretKeySelector` for a comma-separated allow-list.                                      |
| `channels.telegram.pollTimeout`                                                | `metav1.Duration` for `getUpdates` long-polling.                                           |
| `gateway.url`                                                                  | Required URL of the gateway this orchestrator talks to.                                    |
| `gateway.apiKeySecretRef`                                                      | Optional API key for the gateway.                                                          |
| `agent.model`                                                                  | Required `provider/model` for the orchestrating LLM.                                       |
| `agent.systemPrompt`                                                           | Optional system prompt.                                                                    |
| `tools.enabled` / `tools.schedule`                                             | Built-in CLI tools (incl. scheduling).                                                     |
| `a2a.enabled`                                                                  | Toggle A2A fan-out. **A2A lives on `Orchestrator`, not on `Gateway`.**                     |
| `a2a.agents[]`                                                                 | Static agent URLs.                                                                         |
| `a2a.serviceDiscovery.{enabled,namespace,selector}`                            | Discover `Agent` CRs by label selector. The pod is rolled when the discovered set changes. |
| `resources` / `env[]`                                                          | Standard pod knobs.                                                                        |

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

## Status and Monitoring

```bash
kubectl get gateway -A
kubectl describe gateway my-gateway -n inference-gateway
```

The `Gateway` status surfaces:

- `phase` - `Pending`, `Running`, `Failed`, or `Unknown`.
- `readyReplicas` / `availableReplicas`.
- `url` - the resolved access URL (ingress host when ingress is enabled, otherwise the cluster service URL).
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

- [`gateway-minimal`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-minimal) - single provider, no ingress.
- [`gateway-complete`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-complete) - HPA, multiple providers, ingress with cert-manager.
- [`gateway-with-ingress-simple`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-with-ingress-simple) and [`gateway-with-ingress-advanced`](https://github.com/inference-gateway/operator/tree/main/examples/gateway-with-ingress-advanced) - ingress patterns.
- [`agent-server`](https://github.com/inference-gateway/operator/tree/main/examples/agent-server) - minimal A2A agent.
- [`mcp-server`](https://github.com/inference-gateway/operator/tree/main/examples/mcp-server) - MCP server.
- [`orchestrator`](https://github.com/inference-gateway/operator/tree/main/examples/orchestrator) - gateway + two agents + orchestrator with service discovery.
