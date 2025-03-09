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
    </main>
  )
}
