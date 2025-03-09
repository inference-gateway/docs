export default function Providers() {
  return (
    <main>
      <h1>Supported Providers</h1>
      <p>
        Inference Gateway provides a unified interface to interact with multiple LLM providers. 
        This page details each supported provider, their configuration, and usage examples.
      </p>

      <h2>Available Providers</h2>
      <p>
        The following LLM providers are currently supported:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="border p-4 rounded-md">
          <h3>OpenAI</h3>
          <p>Access GPT models including GPT-3.5, GPT-4, and more.</p>
          <p><strong>Authentication:</strong> Bearer Token</p>
          <p><strong>Default URL:</strong> https://api.openai.com</p>
        </div>
        
        <div className="border p-4 rounded-md">
          <h3>Anthropic</h3>
          <p>Connect to Claude models for high-quality conversational AI.</p>
          <p><strong>Authentication:</strong> X-Header</p>
          <p><strong>Default URL:</strong> https://api.anthropic.com</p>
        </div>
        
        <div className="border p-4 rounded-md">
          <h3>Cohere</h3>
          <p>Use Cohere's models for various natural language tasks.</p>
          <p><strong>Authentication:</strong> Bearer Token</p>
          <p><strong>Default URL:</strong> https://api.cohere.com</p>
        </div>
        
        <div className="border p-4 rounded-md">
          <h3>Groq</h3>
          <p>Access high-performance inference with Groq's LPU-accelerated models.</p>
          <p><strong>Authentication:</strong> Bearer Token</p>
          <p><strong>Default URL:</strong> https://api.groq.com</p>
        </div>
        
        <div className="border p-4 rounded-md">
          <h3>Cloudflare</h3>
          <p>Connect to Cloudflare Workers AI for inference on various models.</p>
          <p><strong>Authentication:</strong> Bearer Token</p>
          <p><strong>Default URL:</strong> https://api.cloudflare.com/client/v4/accounts/{'{ACCOUNT_ID}'}</p>
        </div>
        
        <div className="border p-4 rounded-md">
          <h3>Ollama</h3>
          <p>Run open-source models locally or on a self-hosted server.</p>
          <p><strong>Authentication:</strong> None (optional API key)</p>
          <p><strong>Default URL:</strong> http://ollama:8080</p>
        </div>
      </div>

      <h2>Using Providers</h2>
      
      <h3>Provider Configuration</h3>
      <p>
        Each provider requires specific configuration through environment variables:
      </p>
      <ul>
        <li><code>PROVIDER_API_URL</code>: The base URL for the provider's API</li>
        <li><code>PROVIDER_API_KEY</code>: The authentication key for the provider</li>
      </ul>
      <p>
        Replace "PROVIDER" with the provider name (uppercase): OPENAI, ANTHROPIC, COHERE, GROQ, CLOUDFLARE, OLLAMA.
      </p>

      <h3>API Endpoints</h3>
      <p>
        Inference Gateway offers two main approaches to interact with providers:
      </p>
      
      <h4>1. Unified Generate API</h4>
      <p>
        The unified API allows you to generate content with a consistent interface across all providers:
      </p>
      <pre><code>{`POST /llms/{provider}/generate
Content-Type: application/json

{
  "model": "MODEL_NAME",
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
}`}</code></pre>

      <h4>2. Provider Proxy</h4>
      <p>
        You can also proxy requests directly to the provider's native API:
      </p>
      <pre><code>{`POST /proxy/{provider}/{path}
Content-Type: application/json

// Provider-specific request body`}</code></pre>

      <h2>Provider-Specific Examples</h2>

      <h3>OpenAI</h3>
      <p>Generate content with OpenAI models:</p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/openai/generate \\
  -H "Content-Type: application/json" \\
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
  }'`}</code></pre>
      <p>List available models:</p>
      <pre><code>{`curl http://localhost:8080/llms/openai`}</code></pre>

      <h3>Anthropic</h3>
      <p>Generate content with Anthropic Claude models:</p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/anthropic/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-opus-20240229",
    "messages": [
      {
        "role": "user",
        "content": "Explain quantum computing in simple terms."
      }
    ]
  }'`}</code></pre>
      <p>List available models:</p>
      <pre><code>{`curl http://localhost:8080/llms/anthropic`}</code></pre>

      <h3>Cohere</h3>
      <p>Generate content with Cohere models:</p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/cohere/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "command",
    "messages": [
      {
        "role": "user",
        "content": "Write a short poem about AI."
      }
    ]
  }'`}</code></pre>

      <h3>Groq</h3>
      <p>Generate content with Groq's high-performance models:</p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/groq/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama2-70b-4096",
    "messages": [
      {
        "role": "user",
        "content": "What are the benefits of quantum computing?"
      }
    ]
  }'`}</code></pre>

      <h3>Cloudflare</h3>
      <p>Generate content with Cloudflare Workers AI:</p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/cloudflare/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "@cf/meta/llama-2-7b-chat-fp16",
    "messages": [
      {
        "role": "user",
        "content": "Explain how neural networks work."
      }
    ]
  }'`}</code></pre>

      <h3>Ollama</h3>
      <p>Generate content with locally-hosted Ollama models:</p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/ollama/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama2",
    "messages": [
      {
        "role": "user",
        "content": "Write a function to calculate Fibonacci numbers in Python."
      }
    ]
  }'`}</code></pre>

      <h2>Advanced Features</h2>
      
      <h3>Streaming Responses</h3>
      <p>
        You can stream responses from supported providers by adding the <code>stream</code> or <code>ssevents</code> parameter:
      </p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/openai/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Write a story about a space explorer."
      }
    ],
    "stream": true
  }'`}</code></pre>

      <h3>Function Calling / Tools</h3>
      <p>
        For providers that support function calling (like OpenAI and Anthropic), you can use the <code>tools</code> parameter:
      </p>
      <pre><code>{`curl -X POST http://localhost:8080/llms/openai/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in Paris?"
      }
    ],
    "tools": [
      {
        "type": "function",
        "name": "get_weather",
        "description": "Get the current weather in a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            }
          },
          "required": ["location"]
        }
      }
    ]
  }'`}</code></pre>

      <h3>Direct API Proxy</h3>
      <p>
        For more advanced use cases, you can proxy requests directly to the provider's API:
      </p>
      <pre><code>{`curl -X POST http://localhost:8080/proxy/openai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'`}</code></pre>
    </main>
  );
}
