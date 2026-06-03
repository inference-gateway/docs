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

**Symptom.** With `AUTH_ENABLE=true`, every request - including ones carrying what looks like a valid bearer token - fails with `401 Unauthorized`.

**Likely cause.** The OIDC issuer URL, client ID, or client secret do not match the identity provider that minted the token. The gateway validates JWTs against the configured `AUTH_OIDC_ISSUER`'s JWKS endpoint; any mismatch (trailing slash, wrong realm, http vs https, internal vs external hostname) makes signature verification fail.

**Fix.**

1. Verify the three OIDC variables are set and point at the same realm the client uses:

   ```bash
   AUTH_ENABLE=true
   AUTH_OIDC_ISSUER=https://keycloak.example.com/realms/inference-gateway-realm
   AUTH_OIDC_CLIENT_ID=inference-gateway-client
   AUTH_OIDC_CLIENT_SECRET=<your-secret>
   ```

2. Confirm the JWT's `iss` claim matches `AUTH_OIDC_ISSUER` byte-for-byte. Decode the token:

   ```bash
   echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .
   ```

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
MCP_ENABLE=true
MCP_SERVERS=http://mcp-tools:8081/mcp,http://mcp-search:8082/mcp

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
MCP_POLLING_ENABLE=true          # default true
MCP_POLLING_INTERVAL=30s         # default 30s
MCP_POLLING_TIMEOUT=10s          # default 5s
MCP_DISABLE_HEALTHCHECK_LOGS=true
```

If servers stay unreachable, set `MCP_DISABLE_HEALTHCHECK_LOGS=false` temporarily to surface the underlying TCP / TLS / HTTP error in the gateway logs.

For full MCP setup details see [MCP Integration](/mcp/).

## Vision / Multimodal

### Image input is rejected

**Symptom.** Sending a chat completion with an `image_url` or base64 image content returns `400 Bad Request` with a message about images being disabled, even though the provider/model supports vision.

**Likely cause.** Vision support is opt-in. Without `ENABLE_VISION=true`, the gateway rejects any request that contains image content regardless of the underlying provider's capabilities.

**Fix.** Enable vision globally on the gateway:

```bash
ENABLE_VISION=true
```

After restarting the gateway, retry the request. If it still fails, verify the model itself supports vision (e.g. `gpt-5`, `claude-opus-4-8`, `gemini-3-flash`) - vision support is also gated on the upstream model.

## Provider Errors

### Provider X returns 4xx and the gateway's error is opaque

**Symptom.** The gateway returns a 4xx (often `400`, `404`, or `422`) but the message is generic - you cannot tell whether the payload, the model name, or the upstream provider's auth is at fault.

**Fix.**

1. Run the gateway in development mode to get verbose request/response logs:

   ```bash
   ENVIRONMENT=development
   ```

   Logs will then include the outbound provider request body (with content truncated per `DEBUG_CONTENT_TRUNCATE_WORDS` and `DEBUG_MAX_MESSAGES`) and the raw upstream response.

2. Bypass the gateway's normalization layer and hit the provider directly using the proxy endpoint. This skips all middleware (auth, MCP, telemetry) and forwards the request unchanged:

   ```bash
   curl -sS -X POST \
     -H "Content-Type: application/json" \
     -d '{ "model": "gpt-5-mini", "messages": [{"role":"user","content":"hello"}] }' \
     http://inference-gateway:8080/proxy/openai/v1/chat/completions
   ```

   If the request succeeds against `/proxy/...` but fails against `/v1/...`, the issue is in the gateway's request transformation; if it fails on both, the issue is upstream (bad model id, missing API key, quota).

3. Inspect the metrics:

   ```promql
   sum by (status_code, request_path) (rate(llm_responses_total{provider="<provider>"}[5m]))
   ```

   to see which endpoints are 4xx'ing and at what rate.

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

The MCP middleware will inspect the header and short-circuit; auth and telemetry still run. The gateway itself uses this header internally when it re-invokes the upstream provider with tool results, so toggling it client-side is a supported escape hatch.

To bypass **all** middleware (auth, telemetry, MCP), use the proxy endpoint instead:

```text
ANY /proxy/{provider}/{path}
```

`/proxy/...` skips the entire middleware chain and forwards the request unchanged. Use it for debugging only; treat it as an untrusted endpoint in production deployments.

## Configuration

### Environment variables look correct but the gateway behaves as if defaults were used

**Symptom.** You set `AUTH_ENABLE=true` (or `MCP_ENABLE=true`, `ENABLE_VISION=true`, ...) but the gateway logs `auth disabled` / `mcp disabled` / continues to reject images.

**Likely cause.** Variables are not reaching the gateway process. In Docker Compose this usually means the variable is set in the shell but not declared under `environment:` in `docker-compose.yml`; in Kubernetes, the ConfigMap is mounted into a different container or the pod was not restarted.

**Fix.**

1. Confirm the variable is visible to the gateway process:

   ```bash
   # Docker
   docker exec inference-gateway env | grep -E 'AUTH_|MCP_|ENABLE_VISION|TELEMETRY_'

   # Kubernetes
   kubectl exec deploy/inference-gateway -- env | grep -E 'AUTH_|MCP_|ENABLE_VISION|TELEMETRY_'
   ```

2. Boolean variables are case-sensitive strings: use `"true"` / `"false"` (not `True`, `yes`, `1`). Quoting matters in YAML where `true` can be parsed as a boolean and rejected by the env-var loader.

3. After updating a ConfigMap, restart the deployment so the new values are picked up:

   ```bash
   kubectl rollout restart deploy/inference-gateway
   ```

See [Configuration](/configuration/) for the canonical list of variables and their defaults.
