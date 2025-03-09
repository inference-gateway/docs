export default function Configuration() {
  return (
    <main>
      <h1>Configuration</h1>
      <p>
        Inference Gateway provides flexible configuration options to adapt to your specific needs.
        This page covers the key configuration methods and options available.
      </p>

      <h2>Environment Variables</h2>
      <p>
        Inference Gateway can be configured using environment variables, which is the recommended
        approach for deployment in different environments.
      </p>
      
      <h3>General Settings</h3>
      <ul>
        <li><code>APPLICATION_NAME</code>: The name of the application (default: inference-gateway)</li>
        <li><code>ENVIRONMENT</code>: The environment (default: production)</li>
        <li><code>ENABLE_TELEMETRY</code>: Enable telemetry (default: false)</li>
        <li><code>ENABLE_AUTH</code>: Enable authentication (default: false)</li>
      </ul>

      <h3>OpenID Connect</h3>
      <p>
        Configure OpenID Connect for authentication:
      </p>
      <ul>
        <li><code>OIDC_ISSUER_URL</code>: OIDC issuer URL (default: http://keycloak:8080/realms/inference-gateway-realm)</li>
        <li><code>OIDC_CLIENT_ID</code>: OIDC client ID (default: inference-gateway-client)</li>
        <li><code>OIDC_CLIENT_SECRET</code>: OIDC client secret (default: "")</li>
      </ul>

      <h3>Server Settings</h3>
      <ul>
        <li><code>SERVER_HOST</code>: Server host (default: 0.0.0.0)</li>
        <li><code>SERVER_PORT</code>: Server port (default: 8080)</li>
        <li><code>SERVER_READ_TIMEOUT</code>: Read timeout (default: 30s)</li>
        <li><code>SERVER_WRITE_TIMEOUT</code>: Write timeout (default: 30s)</li>
        <li><code>SERVER_IDLE_TIMEOUT</code>: Idle timeout (default: 120s)</li>
        <li><code>SERVER_TLS_CERT_PATH</code>: TLS certificate path (default: "")</li>
        <li><code>SERVER_TLS_KEY_PATH</code>: TLS key path (default: "")</li>
      </ul>

      <h3>Client Settings</h3>
      <ul>
        <li><code>CLIENT_TIMEOUT</code>: Client timeout (default: 30s)</li>
        <li><code>CLIENT_MAX_IDLE_CONNS</code>: Maximum idle connections (default: 20)</li>
        <li><code>CLIENT_MAX_IDLE_CONNS_PER_HOST</code>: Maximum idle connections per host (default: 20)</li>
        <li><code>CLIENT_IDLE_CONN_TIMEOUT</code>: Idle connection timeout (default: 30s)</li>
        <li><code>CLIENT_TLS_MIN_VERSION</code>: Minimum TLS version (default: TLS12)</li>
      </ul>

      <h3>Provider Settings</h3>
      <p>
        Configure access to different LLM providers:
      </p>
      <ul>
        <li><code>ANTHROPIC_API_URL</code>: Anthropic API URL (default: https://api.anthropic.com)</li>
        <li><code>ANTHROPIC_API_KEY</code>: Anthropic API Key (default: "")</li>
        <li><code>CLOUDFLARE_API_URL</code>: Cloudflare API URL (default: https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID)</li>
        <li><code>CLOUDFLARE_API_KEY</code>: Cloudflare API Key (default: "")</li>
        <li><code>COHERE_API_URL</code>: Cohere API URL (default: https://api.cohere.com)</li>
        <li><code>COHERE_API_KEY</code>: Cohere API Key (default: "")</li>
        <li><code>GROQ_API_URL</code>: Groq API URL (default: https://api.groq.com)</li>
        <li><code>GROQ_API_KEY</code>: Groq API Key (default: "")</li>
        <li><code>OLLAMA_API_URL</code>: Ollama API URL (default: http://ollama:8080)</li>
        <li><code>OLLAMA_API_KEY</code>: Ollama API Key (default: "")</li>
        <li><code>OPENAI_API_URL</code>: OpenAI API URL (default: https://api.openai.com)</li>
        <li><code>OPENAI_API_KEY</code>: OpenAI API Key (default: "")</li>
      </ul>

      <h2>Kubernetes ConfigMaps and Secrets</h2>
      <p>
        When deploying in Kubernetes, use ConfigMaps for non-sensitive configuration 
        and Secrets for API keys and other sensitive information.
      </p>
      
      <h3>Example ConfigMap</h3>
      <pre><code>{`apiVersion: v1
kind: ConfigMap
metadata:
  name: inference-gateway-config
data:
  APPLICATION_NAME: "inference-gateway"
  ENVIRONMENT: "production"
  ENABLE_TELEMETRY: "false"
  SERVER_HOST: "0.0.0.0"
  SERVER_PORT: "8080"
  SERVER_READ_TIMEOUT: "30s"
  SERVER_WRITE_TIMEOUT: "30s"
  SERVER_IDLE_TIMEOUT: "120s"
`}</code></pre>

      <h3>Example Secret</h3>
      <pre><code>{`apiVersion: v1
kind: Secret
metadata:
  name: inference-gateway-secrets
type: Opaque
data:
  ANTHROPIC_API_KEY: "<base64-encoded-key>"
  COHERE_API_KEY: "<base64-encoded-key>"
  OPENAI_API_KEY: "<base64-encoded-key>"
  OIDC_CLIENT_SECRET: "<base64-encoded-key>"
`}</code></pre>
    </main>
  )
}
