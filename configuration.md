---
title: Configuration
description: Complete configuration reference for Inference Gateway, covering environment variables for server, client, providers, MCP, telemetry, auth, and Kubernetes-friendly ConfigMap and Secret examples.
---

<script setup>
const generalSettings = [
  { variable: 'ENVIRONMENT', description: 'Deployment environment', defaultValue: 'production' },
  { variable: 'ALLOWED_MODELS', description: 'Comma-separated list of models to allow. If empty, all models will be available', defaultValue: '""' },
  { variable: 'DISALLOWED_MODELS', description: 'Comma-separated list of models to disallow. If empty, no models will be blocked. Takes lower precedence than ALLOWED_MODELS', defaultValue: '""' },
  { variable: 'ENABLE_VISION', description: 'Enable vision/multimodal support for all providers', defaultValue: 'false' },
  { variable: 'DEBUG_CONTENT_TRUNCATE_WORDS', description: 'Number of words to truncate per content section in debug logs (development mode only)', defaultValue: '10' },
  { variable: 'DEBUG_MAX_MESSAGES', description: 'Maximum number of messages to show in debug logs (development mode only)', defaultValue: '100' },
  { variable: 'AUTH_ENABLE', description: 'Enable OIDC authentication', defaultValue: 'false' },
];

const telemetrySettings = [
  { variable: 'TELEMETRY_ENABLE', description: 'Enable OpenTelemetry metrics and tracing', defaultValue: 'false' },
  { variable: 'TELEMETRY_METRICS_PUSH_ENABLE', description: 'Enable the OTLP metrics push endpoint (POST /v1/metrics)', defaultValue: 'false' },
  { variable: 'TELEMETRY_METRICS_PORT', description: 'Port for telemetry metrics server', defaultValue: '9464' },
];

const oidcSettings = [
  { variable: 'AUTH_OIDC_ISSUER', description: 'OIDC issuer URL', defaultValue: 'http://keycloak:8080/realms/inference-gateway-realm' },
  { variable: 'AUTH_OIDC_CLIENT_ID', description: 'OIDC client ID', defaultValue: 'inference-gateway-client' },
  { variable: 'AUTH_OIDC_CLIENT_SECRET', description: 'OIDC client secret', defaultValue: '""' },
];

const serverSettings = [
  { variable: 'SERVER_HOST', description: 'Server host', defaultValue: '0.0.0.0' },
  { variable: 'SERVER_PORT', description: 'Server port', defaultValue: '8080' },
  { variable: 'SERVER_READ_TIMEOUT', description: 'Read timeout', defaultValue: '30s' },
  { variable: 'SERVER_WRITE_TIMEOUT', description: 'Write timeout', defaultValue: '30s' },
  { variable: 'SERVER_IDLE_TIMEOUT', description: 'Idle timeout', defaultValue: '120s' },
  { variable: 'SERVER_TLS_CERT_PATH', description: 'TLS certificate path', defaultValue: '""' },
  { variable: 'SERVER_TLS_KEY_PATH', description: 'TLS key path', defaultValue: '""' },
];

const clientSettings = [
  { variable: 'CLIENT_TIMEOUT', description: 'Client timeout', defaultValue: '30s' },
  { variable: 'CLIENT_MAX_IDLE_CONNS', description: 'Maximum idle connections', defaultValue: '20' },
  { variable: 'CLIENT_MAX_IDLE_CONNS_PER_HOST', description: 'Maximum idle connections per host', defaultValue: '20' },
  { variable: 'CLIENT_IDLE_CONN_TIMEOUT', description: 'Idle connection timeout', defaultValue: '30s' },
  { variable: 'CLIENT_TLS_MIN_VERSION', description: 'Minimum TLS version', defaultValue: 'TLS12' },
  { variable: 'CLIENT_DISABLE_COMPRESSION', description: 'Disable compression for faster streaming', defaultValue: 'true' },
  { variable: 'CLIENT_RESPONSE_HEADER_TIMEOUT', description: 'Response header timeout', defaultValue: '10s' },
  { variable: 'CLIENT_EXPECT_CONTINUE_TIMEOUT', description: 'Expect continue timeout', defaultValue: '1s' },
];

// GENERATED:provider-settings START (do not edit - run: task generate)
const openAiSettings = [
  { variable: 'OPENAI_API_URL', description: 'OpenAI API URL', defaultValue: 'https://api.openai.com/v1' },
  { variable: 'OPENAI_API_KEY', description: 'OpenAI API Key', defaultValue: '""' },
];

const anthropicSettings = [
  { variable: 'ANTHROPIC_API_URL', description: 'Anthropic API URL', defaultValue: 'https://api.anthropic.com/v1' },
  { variable: 'ANTHROPIC_API_KEY', description: 'Anthropic API Key', defaultValue: '""' },
];

const cohereSettings = [
  { variable: 'COHERE_API_URL', description: 'Cohere API URL', defaultValue: 'https://api.cohere.ai' },
  { variable: 'COHERE_API_KEY', description: 'Cohere API Key', defaultValue: '""' },
];

const groqSettings = [
  { variable: 'GROQ_API_URL', description: 'Groq API URL', defaultValue: 'https://api.groq.com/openai/v1' },
  { variable: 'GROQ_API_KEY', description: 'Groq API Key', defaultValue: '""' },
];

const ollamaSettings = [
  { variable: 'OLLAMA_API_URL', description: 'Ollama API URL', defaultValue: 'http://ollama:8080/v1' },
  { variable: 'OLLAMA_API_KEY', description: 'Ollama API Key', defaultValue: '""' },
  { variable: 'OLLAMA_CLOUD_API_URL', description: 'Ollama Cloud API URL', defaultValue: 'https://ollama.com/v1' },
  { variable: 'OLLAMA_CLOUD_API_KEY', description: 'Ollama Cloud API Key', defaultValue: '""' },
];

const cloudflareSettings = [
  { variable: 'CLOUDFLARE_API_URL', description: 'Cloudflare API URL', defaultValue: 'https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai' },
  { variable: 'CLOUDFLARE_API_KEY', description: 'Cloudflare API Key', defaultValue: '""' },
];

const deepseekSettings = [
  { variable: 'DEEPSEEK_API_URL', description: 'DeepSeek API URL', defaultValue: 'https://api.deepseek.com' },
  { variable: 'DEEPSEEK_API_KEY', description: 'DeepSeek API Key', defaultValue: '""' },
];

const googleSettings = [
  { variable: 'GOOGLE_API_URL', description: 'Google AI API URL', defaultValue: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { variable: 'GOOGLE_API_KEY', description: 'Google AI API Key', defaultValue: '""' },
];

const mistralSettings = [
  { variable: 'MISTRAL_API_URL', description: 'Mistral AI API URL', defaultValue: 'https://api.mistral.ai/v1' },
  { variable: 'MISTRAL_API_KEY', description: 'Mistral AI API Key', defaultValue: '""' },
];

const moonshotSettings = [
  { variable: 'MOONSHOT_API_URL', description: 'Moonshot AI API URL', defaultValue: 'https://api.moonshot.ai/v1' },
  { variable: 'MOONSHOT_API_KEY', description: 'Moonshot AI API Key', defaultValue: '""' },
];

const nvidiaSettings = [
  { variable: 'NVIDIA_API_URL', description: 'NVIDIA NIM API URL', defaultValue: 'https://integrate.api.nvidia.com/v1' },
  { variable: 'NVIDIA_API_KEY', description: 'NVIDIA API Key', defaultValue: '""' },
];

// GENERATED:provider-settings END (do not edit - run: task generate)

const mcpSettings = [
  { variable: 'MCP_ENABLE', description: 'Enable MCP middleware', defaultValue: 'false' },
  { variable: 'MCP_EXPOSE', description: 'Expose MCP endpoints for debugging', defaultValue: 'false' },
  { variable: 'MCP_SERVERS', description: 'Comma-separated list of MCP server URLs', defaultValue: '""' },
  { variable: 'MCP_INCLUDE_TOOLS', description: 'Comma-separated allowlist of MCP tool names to inject. If empty, all tools are injected. Takes precedence over MCP_EXCLUDE_TOOLS', defaultValue: '""' },
  { variable: 'MCP_EXCLUDE_TOOLS', description: 'Comma-separated denylist of MCP tool names to skip injecting. If empty, no tools are excluded. Takes lower precedence than MCP_INCLUDE_TOOLS', defaultValue: '""' },
  { variable: 'MCP_CLIENT_TIMEOUT', description: 'MCP client HTTP timeout', defaultValue: '5s' },
  { variable: 'MCP_DIAL_TIMEOUT', description: 'MCP client dial timeout', defaultValue: '3s' },
  { variable: 'MCP_TLS_HANDSHAKE_TIMEOUT', description: 'MCP client TLS handshake timeout', defaultValue: '3s' },
  { variable: 'MCP_RESPONSE_HEADER_TIMEOUT', description: 'MCP client response header timeout', defaultValue: '3s' },
  { variable: 'MCP_EXPECT_CONTINUE_TIMEOUT', description: 'MCP client expect continue timeout', defaultValue: '1s' },
  { variable: 'MCP_REQUEST_TIMEOUT', description: 'MCP client request timeout for initialize and tool calls', defaultValue: '5s' },
  { variable: 'MCP_MAX_RETRIES', description: 'Maximum number of connection retry attempts', defaultValue: '3' },
  { variable: 'MCP_RETRY_INTERVAL', description: 'Interval between connection retry attempts', defaultValue: '5s' },
  { variable: 'MCP_INITIAL_BACKOFF', description: 'Initial backoff duration for exponential backoff retry', defaultValue: '1s' },
  { variable: 'MCP_ENABLE_RECONNECT', description: 'Enable automatic reconnection for failed servers', defaultValue: 'true' },
  { variable: 'MCP_RECONNECT_INTERVAL', description: 'Interval between reconnection attempts', defaultValue: '30s' },
  { variable: 'MCP_POLLING_ENABLE', description: 'Enable health check polling', defaultValue: 'true' },
  { variable: 'MCP_POLLING_INTERVAL', description: 'Interval between health check polling requests', defaultValue: '30s' },
  { variable: 'MCP_POLLING_TIMEOUT', description: 'Timeout for individual health check requests', defaultValue: '5s' },
  { variable: 'MCP_DISABLE_HEALTHCHECK_LOGS', description: 'Disable health check log messages to reduce noise', defaultValue: 'true' },
];

const loggingSettings = [
  { variable: 'LOG_LEVEL', description: 'Set logging level (debug, info, warn, error)', defaultValue: 'info' },
];
</script>

# Configuration

Inference Gateway provides flexible configuration options to adapt to your specific needs. As a proxy server designed to facilitate access to various language model APIs, proper configuration is essential for optimal performance and security.

## Configuration Methods

Inference Gateway supports multiple configuration methods to suit different deployment scenarios:

1. **Environment Variables** - Recommended for most deployments
2. **Kubernetes ConfigMaps and Secrets** - For Kubernetes-based deployments
3. **Configuration Files** - For local development and testing

## Environment Variables

Environment variables are the primary method for configuring Inference Gateway. These variables control everything from basic server settings to provider-specific API configurations.

### General Settings

<ConfigTable :rows="generalSettings" />

When `ENABLE_VISION` is set to `true`, Inference Gateway enables vision/multimodal capabilities, allowing you to send images alongside text in chat completion requests. When disabled (default), requests with image content will be rejected even if the provider and model support vision. This is disabled by default for performance and security reasons.

### Telemetry

These settings control telemetry and metrics exposure:

<ConfigTable :rows="telemetrySettings" />

When `TELEMETRY_ENABLE` is set to `true`, Inference Gateway exposes a `/metrics` endpoint for Prometheus scraping and generates distributed traces that can be collected by OpenTelemetry collectors.

When `TELEMETRY_METRICS_PUSH_ENABLE` is also set to `true` (alongside `TELEMETRY_ENABLE=true`), the gateway exposes an OTLP/HTTP metrics push endpoint at `POST /v1/metrics`. This allows subscription clients that bypass the gateway's inference path (e.g. the infer CLI driving Claude Code directly) to push their usage metrics. See the [Observability](/observability/#pushing-metrics-otlp) page for details.

### OpenID Connect

If authentication is enabled (`AUTH_ENABLE=true`), configure the following OIDC settings:

<ConfigTable :rows="oidcSettings" />

When authentication is enabled, all API requests must include a valid JWT token in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Server Settings

These settings control the core HTTP server behavior:

<ConfigTable :rows="serverSettings" />

For production deployments, it's strongly recommended to configure TLS:

```bash
SERVER_TLS_CERT_PATH=/path/to/certificate.pem
SERVER_TLS_KEY_PATH=/path/to/private-key.pem
```

### Client Settings

These settings control how Inference Gateway connects to third-party APIs:

<ConfigTable :rows="clientSettings" />

For high-throughput deployments, consider increasing the connection pool settings:

```bash
CLIENT_MAX_IDLE_CONNS=100
CLIENT_MAX_IDLE_CONNS_PER_HOST=50
```

### Provider Settings

Configure access to various LLM providers. At minimum, you should configure the providers you plan to use.

<!-- GENERATED:provider-config-sections START (do not edit - run: task generate) -->

#### OpenAI

<ConfigTable :rows="openAiSettings" />

#### Anthropic

<ConfigTable :rows="anthropicSettings" />

#### Cohere

<ConfigTable :rows="cohereSettings" />

#### Groq

<ConfigTable :rows="groqSettings" />

#### Ollama

<ConfigTable :rows="ollamaSettings" />

#### Cloudflare

<ConfigTable :rows="cloudflareSettings" />

#### DeepSeek

<ConfigTable :rows="deepseekSettings" />

#### Google

<ConfigTable :rows="googleSettings" />

#### Mistral

<ConfigTable :rows="mistralSettings" />

#### Moonshot

<ConfigTable :rows="moonshotSettings" />

#### NVIDIA

<ConfigTable :rows="nvidiaSettings" />

<!-- GENERATED:provider-config-sections END (do not edit - run: task generate) -->

### Model Context Protocol (MCP) Settings

These settings control MCP integration for external tool access:

<ConfigTable :rows="mcpSettings" />

Use `MCP_INCLUDE_TOOLS` and `MCP_EXCLUDE_TOOLS` to control exactly which discovered tools are injected into LLM requests. Both accept a comma-separated list of tool names and default to empty:

- `MCP_INCLUDE_TOOLS` is an allowlist. When empty (the default), all discovered tools are injected. When set, only the listed tools are injected.
- `MCP_EXCLUDE_TOOLS` is a denylist. When empty (the default), no tools are excluded. When set, the listed tools are skipped.

`MCP_INCLUDE_TOOLS` takes precedence over `MCP_EXCLUDE_TOOLS`: when both are set, the allowlist is applied and the denylist is ignored.

### Logging and Debugging

These settings control logging and debugging behavior:

<ConfigTable :rows="loggingSettings" />

## Environment Variable File (.env)

For local development, you can use a `.env` file. Create a file named `.env` in your project root:

```bash
# .env file example
ENVIRONMENT=development
TELEMETRY_ENABLE=false
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Kubernetes ConfigMaps and Secrets

When deploying in Kubernetes, use ConfigMaps for non-sensitive configuration and Secrets for API keys and other sensitive information.

### Example ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inference-gateway-config
data:
  ENVIRONMENT: 'production'
  TELEMETRY_ENABLE: 'true'
  SERVER_HOST: '0.0.0.0'
  SERVER_PORT: '8080'
  SERVER_READ_TIMEOUT: '30s'
  SERVER_WRITE_TIMEOUT: '30s'
  SERVER_IDLE_TIMEOUT: '120s'
```

### Example Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: inference-gateway-secrets
type: Opaque
data:
  ANTHROPIC_API_KEY: '<base64-encoded-key>'
  COHERE_API_KEY: '<base64-encoded-key>'
  OPENAI_API_KEY: '<base64-encoded-key>'
  AUTH_OIDC_CLIENT_SECRET: '<base64-encoded-key>'
```

## Complete Configuration Example

Here's a comprehensive example for configuring Inference Gateway in a production environment:

```bash

# General settings
ENVIRONMENT=production
ALLOWED_MODELS=
ENABLE_VISION=false
DEBUG_CONTENT_TRUNCATE_WORDS=10
DEBUG_MAX_MESSAGES=100
# Telemetry
TELEMETRY_ENABLE=false
TELEMETRY_METRICS_PUSH_ENABLE=false
TELEMETRY_METRICS_PORT=9464
# Model Context Protocol (MCP)
MCP_ENABLE=false
MCP_EXPOSE=false
MCP_SERVERS=
MCP_INCLUDE_TOOLS=
MCP_EXCLUDE_TOOLS=
MCP_CLIENT_TIMEOUT=5s
MCP_DIAL_TIMEOUT=3s
MCP_TLS_HANDSHAKE_TIMEOUT=3s
MCP_RESPONSE_HEADER_TIMEOUT=3s
MCP_EXPECT_CONTINUE_TIMEOUT=1s
MCP_REQUEST_TIMEOUT=5s
MCP_MAX_RETRIES=3
MCP_RETRY_INTERVAL=5s
MCP_INITIAL_BACKOFF=1s
MCP_ENABLE_RECONNECT=true
MCP_RECONNECT_INTERVAL=30s
MCP_POLLING_ENABLE=true
MCP_POLLING_INTERVAL=30s
MCP_POLLING_TIMEOUT=5s
MCP_DISABLE_HEALTHCHECK_LOGS=true
# Authentication
AUTH_ENABLE=false
AUTH_OIDC_ISSUER=http://keycloak:8080/realms/inference-gateway-realm
AUTH_OIDC_CLIENT_ID=inference-gateway-client
AUTH_OIDC_CLIENT_SECRET=
# Server settings
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
SERVER_READ_TIMEOUT=30s
SERVER_WRITE_TIMEOUT=30s
SERVER_IDLE_TIMEOUT=120s
SERVER_TLS_CERT_PATH=
SERVER_TLS_KEY_PATH=
# Client settings
CLIENT_TIMEOUT=30s
CLIENT_MAX_IDLE_CONNS=20
CLIENT_MAX_IDLE_CONNS_PER_HOST=20
CLIENT_IDLE_CONN_TIMEOUT=30s
CLIENT_TLS_MIN_VERSION=TLS12
CLIENT_DISABLE_COMPRESSION=true
CLIENT_RESPONSE_HEADER_TIMEOUT=10s
CLIENT_EXPECT_CONTINUE_TIMEOUT=1s
# Providers
ANTHROPIC_API_URL=https://api.anthropic.com/v1
ANTHROPIC_API_KEY=
CLOUDFLARE_API_URL=https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai
CLOUDFLARE_API_KEY=
COHERE_API_URL=https://api.cohere.ai
COHERE_API_KEY=
GROQ_API_URL=https://api.groq.com/openai/v1
GROQ_API_KEY=
OLLAMA_API_URL=http://ollama:8080/v1
OLLAMA_API_KEY=
OLLAMA_CLOUD_API_URL=https://ollama.com/v1
OLLAMA_CLOUD_API_KEY=
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_API_KEY=
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
GOOGLE_API_URL=https://generativelanguage.googleapis.com/v1beta/openai
GOOGLE_API_KEY=
MISTRAL_API_URL=https://api.mistral.ai/v1
MISTRAL_API_KEY=
MOONSHOT_API_URL=https://api.moonshot.ai/v1
MOONSHOT_API_KEY=
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=
```

## Configuration Best Practices

1. **API Key Security**: Never commit API keys to version control. Use environment variables or secrets management.
2. **TLS in Production**: Always use TLS in production environments to secure data in transit.
3. **Authentication**: Enable authentication in production environments to control access.
4. **Timeouts**: Adjust timeouts based on your expected workloads and response times from LLM providers.
5. **Monitoring**: Enable telemetry in production for observability and performance tracking.

## Next Steps

Once you've configured Inference Gateway, you might want to:

- Check out the [API Reference](/api-reference/) for details on available endpoints
- Explore [SDK options](/sdks/) for integrating with your application
- Review [Observability](/observability/) options for monitoring and logging
