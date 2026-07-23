---
title: Model Routing
description: Route a stable logical model alias to a pool of upstream provider deployments with gateway-native round-robin selection, and swap the upstreams behind an alias without changing client code.
---

# Model Routing

Model routing lets a single logical model name (an **alias**, e.g. `fast-chat`) stand in
for a pool of upstream provider/model deployments. Clients keep requesting the alias; the
gateway picks one deployment per request, round-robin, and forwards there. Operators can
change what an alias points at without touching a single client.

Routing is **opt-in**. With it disabled (the default), the gateway behaves exactly as
before: you address models directly with a `provider/model` prefix or a `?provider=` query
parameter. See [Supported Providers](/supported-providers/) for direct routing.

::: info Phase 1
This is Phase 1 of gateway-native routing: a single `round_robin` strategy, selected
per replica. Weighted selection, retries, fallbacks, circuit breaking, and per-route
metrics are [deferred to later phases](#not-in-phase-1).
:::

## Enabling routing

Set two environment variables (see the [Configuration reference](/configuration/#routing)):

```bash
ROUTING_ENABLED=true
ROUTING_CONFIG_PATH=/etc/inference-gateway/routing.yaml
```

`ROUTING_CONFIG_PATH` is required when `ROUTING_ENABLED=true` and points at the routing
config file described below.

On Kubernetes, the [operator](/operator/#model-routing) sets both variables for you from
the Gateway CRD's `spec.routing` block - supply the routing config inline (`config`) or
reference an existing ConfigMap (`configMapRef`), and the operator mounts it at
`ROUTING_CONFIG_PATH`.

## Routing config file

The routing file maps each logical alias to a pool of deployments:

```yaml
# routing.yaml
models:
  fast-chat:
    strategy: round_robin # only strategy in Phase 1; omit to default to round_robin
    deployments:
      - provider: groq
        model: llama-3.3-70b-versatile
      - provider: openai
        model: gpt-4o-mini
  cheap-chat:
    deployments:
      - provider: openai
        model: gpt-4o-mini
      - provider: groq
        model: llama-3.1-8b-instant
```

| Field                    | Description                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `models.<alias>`         | The logical name clients send as the `model` field (e.g. `{"model": "fast-chat"}`).            |
| `strategy`               | Selection strategy. Optional; defaults to `round_robin`, the only strategy in Phase 1.         |
| `deployments[].provider` | An already-configured provider. Its API key/URL are set the usual way (e.g. `OPENAI_API_KEY`). |
| `deployments[].model`    | The upstream model name to send to that provider.                                              |

A working example lives at
[`examples/routing.yaml`](https://github.com/inference-gateway/inference-gateway/blob/main/examples/routing.yaml)
in the gateway repo.

::: tip
Give each pool at least two deployments - round-robin has nothing to rotate over
otherwise. Every `provider` you reference must already be configured (its API key set);
routing selects among your configured providers, it does not configure them.
:::

## How selection works

- **Per request, pre-dispatch.** The gateway resolves the alias to a concrete
  provider/model _before_ it opens the upstream connection. The upstream is fixed before
  the first streamed byte, so **streaming and non-streaming both work** and a single
  response never splits across deployments.
- **Round-robin per replica.** Each gateway replica keeps its own rotation counter.
  Selection is best-effort per replica, **not** globally coordinated - with multiple
  replicas behind a load balancer the aggregate distribution is approximate, not a strict
  global round-robin.

### Which deployment was chosen

Every routed response carries two headers naming the resolved upstream (no secrets):

```http
X-Selected-Provider: groq
X-Selected-Model: llama-3.3-70b-versatile
```

Use them to confirm routing behavior, debug, or log which upstream served a request.

## Direct routing still bypasses everything

An explicit `?provider=` query parameter or a `provider/model` prefix in the `model`
field **always bypasses routing** and goes straight to that upstream, whether or not
routing is enabled. Aliases and direct addressing coexist: `fast-chat` routes through the
pool, `openai/gpt-4o-mini` goes directly to OpenAI.

## Migration: change upstreams without changing clients

The point of an alias is a stable client contract. Suppose clients call `fast-chat`,
today backed by Groq:

```yaml
models:
  fast-chat:
    deployments:
      - provider: groq
        model: llama-3.3-70b-versatile
```

To spread load onto OpenAI, or migrate off Groq entirely, edit only `routing.yaml` and
reload the gateway - **no client change**:

```yaml
models:
  fast-chat:
    deployments:
      - provider: groq
        model: llama-3.3-70b-versatile
      - provider: openai
        model: gpt-4o-mini # add capacity...
  # ...later, drop the groq entry to complete the migration.
```

Clients keep sending `{"model": "fast-chat"}` throughout. Check `X-Selected-Provider` on
responses to watch traffic shift between upstreams as you edit the pool.

## `ALLOWED_MODELS` / `DISALLOWED_MODELS`

Model allow/deny lists are matched against the **requested logical alias**, not the
resolved upstream model. To permit `fast-chat`, list `fast-chat` - not the underlying
`llama-3.3-70b-versatile` or `gpt-4o-mini`:

```bash
ALLOWED_MODELS=fast-chat,cheap-chat
```

See [General Settings](/configuration/#general-settings) for `ALLOWED_MODELS` /
`DISALLOWED_MODELS`.

## What model routing is not

Gateway-native routing selects an **upstream** for a request. It does **not** replace two
separate concerns that remain the platform's and operator's responsibility:

- **Gateway-replica load balancing** - spreading requests across gateway pods is a
  Kubernetes `Service` + HPA concern, not this feature.
- **North-south ingress routing** - exposing the gateway to external traffic is handled by
  the operator's [`spec.gatewayAPI`](/operator/#routing-gateway-api) (Kubernetes Gateway
  API), a distinct layer from model-alias routing.

## Not in Phase 1

Deferred to later phases:

- Weighted / non-round-robin selection strategies
- Retries and fallbacks across deployments
- Circuit breaking / health-aware selection
- Per-route routing metrics

## Next steps

- [Configuration reference](/configuration/#routing) - `ROUTING_ENABLED` and `ROUTING_CONFIG_PATH`
- [Supported Providers](/supported-providers/) - configure the providers your pools reference
- [Kubernetes Operator](/operator/#routing-gateway-api) - north-south Gateway API routing
