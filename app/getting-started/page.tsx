export default function GettingStarted() {
  return (
    <div>
      <h1>Getting Started</h1>
      <p>Learn how to install and set up Inference Gateway.</p>

      <h2>Installation</h2>
      <h3>Using Docker</h3>
      <pre>
        <code>
          docker pull ghcr.io/inference-gateway/inference-gateway:latest
        </code>
      </pre>

      <h3>Using Docker Compose</h3>
      <p>
        Check out the{" "}
        <a href="https://github.com/inference-gateway/inference-gateway/tree/main/examples/docker-compose">
          Docker Compose examples
        </a>
        .
      </p>

      <h3>Using Kubernetes</h3>
      <p>
        Check out the{" "}
        <a href="https://github.com/inference-gateway/inference-gateway/tree/main/examples/kubernetes">
          Kubernetes examples
        </a>
        .
      </p>

      <h2>Basic Usage</h2>
      <p>Send a request to the Inference Gateway:</p>
      <pre>
        <code>{`curl -X POST http://localhost:8080/llms/openai/generate \\
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Hello, world!"
      }
    ]
  }'`}</code>
      </pre>
    </div>
  );
}
