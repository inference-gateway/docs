export default function Home() {
  return (
    <main>
      <h1>Inference Gateway Documentation</h1>
      <p>
        Inference Gateway is a proxy server designed to facilitate access to various 
        language model APIs. It allows users to interact with different language models 
        through a unified interface, simplifying the configuration and the process of 
        sending requests and receiving responses from multiple LLMs, enabling an easy use 
        of Mixture of Experts.
      </p>
      
      <h2>Key Features</h2>
      <ul>
        <li>📜 <strong>Open Source</strong>: Available under the MIT License.</li>
        <li>🚀 <strong>Unified API Access</strong>: Proxy requests to multiple language model APIs.</li>
        <li>⚙️ <strong>Environment Configuration</strong>: Easily configure API keys and URLs.</li>
        <li>🐳 <strong>Docker Support</strong>: Use Docker and Docker Compose for easy setup.</li>
        <li>☸️ <strong>Kubernetes Support</strong>: Ready for deployment in Kubernetes environments.</li>
        <li>📊 <strong>OpenTelemetry Tracing</strong>: Monitor and analyze performance.</li>
        <li>🛡️ <strong>Production Ready</strong>: Built with configurable timeouts and TLS support.</li>
        <li>🌿 <strong>Lightweight</strong>: Smaller size binary of ~10.8MB.</li>
      </ul>

      <h2>Getting Started</h2>
      <p>
        Ready to try Inference Gateway? Follow our <a href="/getting-started">Getting Started guide</a> to install
        and set up your own instance in minutes.
      </p>

      <h2>How It Works</h2>
      <p>
        Inference Gateway acts as an intermediary between your applications and various LLM providers.
        By standardizing the API interactions, it allows you to:
      </p>
      <ul>
        <li>Access multiple LLM providers through a single integration</li>
        <li>Switch between providers without changing application code</li>
        <li>Implement sophisticated routing and fallback mechanisms</li>
        <li>Centralize API key management and security policies</li>
      </ul>

      <h2>Community</h2>
      <p>
        Inference Gateway is an open-source project maintained by a growing community.
        Contributions are welcome on <a href="https://github.com/inference-gateway/inference-gateway">GitHub</a>.
      </p>
    </main>
  )
}
