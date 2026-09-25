---
title: Troubleshooting
description: Resolve common Inference Gateway issues - 401 auth errors, MCP disconnects, vision rejections, provider 4xx errors, and environment variable propagation pitfalls.
---

# Troubleshooting

This page collects the most frequent operational issues hit when running Inference Gateway in production, along with the fastest path to diagnosing and fixing them. Each entry lists the symptom, the most likely root cause, and a remediation that you can verify against the gateway's logs and metrics.

If you do not find your issue here, check:

- [Observability](/observability/) for log/metric correlation.
- [Configuration](/configuration/) for the complete environment-variable reference.
- The [issue tracker](https://github.com/inference-gateway/inference-gateway/issues) on GitHub.

## Authentication

### Auth is enabled but every request returns 401

**Symptom.** With `AUTH_ENABLED=true`, every request - including ones carrying what looks like a valid bearer token - fails with `401 Unauthorized`.

**Likely cause.** The OIDC issuer URL does not match the identity provider that minted the token, or the token's `aud` claim is not one of the accepted audiences. The gateway validates JWTs against the configured `AUTH_OIDC_ISSUER`'s JWKS endpoint; any mismatch (trailing slash, wrong realm, http vs https, internal vs external hostname) makes signature verification fail. The gateway only verifies tokens and never requests one, so it has no client secret setting.

**Fix.**

1. Verify the OIDC variables are set and point at the same realm the client uses:

   ```bash
   AUTH_ENABLED=true
   AUTH_OIDC_ISSUER=https://keycloak.example.com/realms/inference-gateway-realm
   AUTH_OIDC_CLIENT_ID=inference-gateway-client
   AUTH_OIDC_AUDIENCE=                # optional; empty means AUTH_OIDC_CLIENT_ID
   ```

2. Confirm the JWT's `iss` claim matches `AUTH_OIDC_ISSUER` byte-for-byte, and that its `aud` claim is one of the accepted audiences. Decode the token:

   ```bash
   echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .
   ```

   An `aud` mismatch is the most common 401 after the issuer is correct: with `AUTH_OIDC_AUDIENCE` empty the gateway expects `aud` to equal `AUTH_OIDC_CLIENT_ID`. If your identity provider mints tokens for an API identifier instead, list it in `AUTH_OIDC_AUDIENCE` (comma-separated when more than one value is accepted).

3. Confirm the gateway can reach the issuer's discovery document from inside its pod/container:

   ```bash
   curl -sS "$AUTH_OIDC_ISSUER/.well-known/openid-configuration" | jq .jwks_uri
   ```

4. Run the gateway with `ENVIRONMENT=development` and re-issue a request. Auth failures log the underlying reason (expired token, signature mismatch, unknown issuer).

See [Authentication](/authentication/) for the full Keycloak integration walkthrough.

## Model Context Protocol (MCP)

### MCP server keeps disconnecting

**Symptom.** Tool calls intermittently fail, gateway logs show `mcp client reconnecting` or `mcp polling failed`, and the MCP server drops out of the available tool list.

**Likely cause.** Timeouts are too tight for the upstream MCP server, or reconnect / polling settings are misaligned with how the server behaves.

**Fix.** Tune the following variables (defaults shown):

```bash
MCP_ENABLED=true
MCP_SERVERS=filesystem=http://mcp-tools:8081/mcp,search=http://mcp-search:8082/mcp

# Connection timeouts
MCP_CLIENT_TIMEOUT=10s          # default 5s   - bump if servers are slow
MCP_DIAL_TIMEOUT=5s              # default 3s
MCP_REQUEST_TIMEOUT=15s          # default 5s   - applies to initialize + tool calls
MCP_RESPONSE_HEADER_TIMEOUT=5s   # default 3s

# Reconnection
MCP_ENABLE_RECONNECT=true        # default true
MCP_MAX_RETRIES=5                # default 3
MCP_RETRY_INTERVAL=10s           # default 5s
MCP_RECONNECT_INTERVAL=30s       # default 30s
MCP_INITIAL_BACKOFF=2s           # default 1s

# Health-check polling
MCP_POLLING_ENABLED=true         # default true
MCP_POLLING_INTERVAL=30s         # default 30s
MCP_POLLING_TIMEOUT=10s          # default 5s
MCP_DISABLE_HEALTHCHECK_LOGS=true
```

If servers stay unreachable, set `MCP_DISABLE_HEALTHCHECK_LOGS=false` temporarily to surface the underlying TCP / TLS / HTTP error in the gateway logs.

For full MCP setup details see [MCP Integration](/mcp/).

## Vision / Multimodal

### The model answers as if it never saw the image

**Symptom.** A chat completion carrying an `image_url` or base64 image content succeeds, but the reply only reflects the text - the image appears to have been ignored.

**Likely cause.** With `VISION_ENABLED=true`, the gateway strips image parts only from requests to models known to accept non-image input only and forwards the text only; unknown models are passed through untouched. With `VISION_ENABLED=false` (the default) the gateway forwards image content untouched, so an ignored image means the upstream provider or model dropped it. The gateway does not reject a request for containing an image in either mode.

**Fix.** Verify the model itself supports vision (e.g. `gpt-5`, `claude-opus-4-8`, `gemini-3-flash`) - see [Providers with Vision Support](/supported-providers/#providers-with-vision-support). If it does and images are still ignored, check the flag:

```bash
VISION_ENABLED=true
```

Restart the gateway after changing it, then retry the request.

## Provider Errors

### Provider X returns 4xx and the gateway's error is opaque

**Symptom.** The gateway returns a 4xx (often `400`, `404`, or `422`) but the message is generic - you cannot tell whether the payload, the model name, or the upstream provider's auth is at fault.

**Fix.**

1. Run the gateway in development mode to get verbose request/response logs:

   ```bash
   ENVIRONMENT=development
   ```

   Logs will then include the outbound provider request body (with content truncated per `DEBUG_CONTENT_TRUNCATE_WORDS` and `DEBUG_MAX_MESSAGES`) and the raw upstream response.

2. Bypass the gateway's normalization layer and hit the provider directly using the proxy endpoint. This skips the MCP and telemetry middlewares - which only run on chat completions - and forwards the request unchanged. Authentication and the guardrails `pre_call` check still apply, so send the same bearer token you would send to `/v1/...`:

   ```bash
   curl -sS -X POST \
     -H "Content-Type: application/json" \
     -d '{ "model": "gpt-5-mini", "messages": [{"role":"user","content":"hello"}] }' \
     http://inference-gateway:8080/proxy/openai/v1/chat/completions
   ```

   If the request succeeds against `/proxy/...` but fails against `/v1/...`, the issue is in the gateway's request transformation; if it fails on both, the issue is upstream (bad model id, missing API key, quota).

3. Inspect the metrics:

   ```promql
   sum by (error_type) (rate(gen_ai_server_request_duration_seconds_count{gen_ai_provider_name="<provider>"}[5m]))
   ```

   to see which errors the provider is returning and at what rate. Drop the `error_type` grouping for total request rate; an empty `error_type` label marks successful requests.

4. Double-check provider credentials. Each provider reads its API key from a dedicated env var (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, etc.) - see [Configuration](/configuration/) for the full list.

### Bypass MCP middleware for a single request

**Symptom.** You want a request to skip MCP tool-call processing without disabling MCP for the whole gateway - for instance, when testing a raw chat completion or debugging an upstream provider issue.

**Fix.** Set the `X-MCP-Bypass: true` header on the request:

```bash
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -H "X-MCP-Bypass: true" \
  -d '{ "model": "deepseek/deepseek-v4-flash", "messages": [{"role":"user","content":"hi"}] }' \
  http://inference-gateway:8080/v1/chat/completions
```

The MCP middleware will inspect the header and short-circuit; auth and telemetry still run. This is a client-side escape hatch only - the gateway never sets the header itself. Its own follow-up calls after a tool result are in-process provider calls that do not re-enter the middleware chain.

To also skip the MCP and telemetry middlewares, use the proxy endpoint instead:

```text
ANY /proxy/{provider}/{path}
```

`/proxy/...` forwards the request unchanged, but it is not an unauthenticated back door: the OIDC middleware skips only `/health` and the RFC 9728 protected-resource metadata path, and the guardrails `pre_call` check runs on every path. Only the MCP and telemetry middlewares are limited to chat completions. Use it for debugging only.

## Configuration

### Environment variables look correct but the gateway behaves as if defaults were used

**Symptom.** You set `AUTH_ENABLED=true` (or `MCP_ENABLED=true`, `VISION_ENABLED=true`, ...) but the gateway logs `auth disabled` / `mcp disabled` / keeps behaving as if vision handling were off.

**Likely cause.** Variables are not reaching the gateway process. In Docker Compose this usually means the variable is set in the shell but not declared under `environment:` in `docker-compose.yml`; in Kubernetes, the ConfigMap is mounted into a different container or the pod was not restarted.

**Fix.**

1. Confirm the variable is visible to the gateway process:

   ```bash
   # Docker
   docker exec inference-gateway env | grep -E 'AUTH_|MCP_|VISION_ENABLED|TELEMETRY_'

   # Kubernetes
   kubectl exec deploy/inference-gateway -- env | grep -E 'AUTH_|MCP_|VISION_ENABLED|TELEMETRY_'
   ```

2. Booleans are parsed with Go's `strconv.ParseBool`, so `true`, `True`, `TRUE`, `1`, `t` (and their false counterparts) all work, while a value such as `yes` is rejected. Prefer `"true"` / `"false"`, and quote them in YAML so the value reaches the gateway as a string.

3. After updating a ConfigMap, restart the deployment so the new values are picked up:

   ```bash
   kubectl rollout restart deploy/inference-gateway
   ```

See [Configuration](/configuration/) for the canonical list of variables and their defaults.
