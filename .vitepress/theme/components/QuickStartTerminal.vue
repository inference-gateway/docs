<script setup lang="ts">
import { ref } from 'vue';

const command =
  'docker run --rm -it -p 8080:8080 \\\n  -e OPENAI_API_KEY=your_key_here \\\n  ghcr.io/inference-gateway/inference-gateway:latest';

const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(command);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {}
}
</script>

<template>
  <div class="quickstart">
    <div class="quickstart-window">
      <div class="quickstart-titlebar">
        <span class="dot dot-red" />
        <span class="dot dot-yellow" />
        <span class="dot dot-green" />
        <span class="quickstart-title">inference-gateway - bash</span>
        <button
          class="quickstart-copy"
          type="button"
          :aria-label="copied ? 'Command copied' : 'Copy command to clipboard'"
          @click="copy"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <pre class="quickstart-body"><span class="prompt">$ </span><code>{{ command }}</code>
<span class="comment"># Gateway is live on http://localhost:8080/v1</span></pre>
    </div>
    <p class="quickstart-link">
      Need Docker Compose, Kubernetes, or another provider?
      <a href="/getting-started/">Read the getting started guide</a>.
    </p>
  </div>
</template>

<style scoped>
.quickstart {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 48px;
}

@media (min-width: 640px) {
  .quickstart {
    padding: 0 48px 48px;
  }
}

@media (min-width: 960px) {
  .quickstart {
    padding: 0 64px 64px;
  }
}

.quickstart-window {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.16);
  background-color: #1c1c1e;
}

.quickstart-titlebar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #2c2c2e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-red {
  background-color: #ff5f57;
}

.dot-yellow {
  background-color: #febc2e;
}

.dot-green {
  background-color: #28c840;
}

.quickstart-title {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quickstart-copy {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  color: #e5e7eb;
  background-color: transparent;
  transition: background-color 0.2s;
}

.quickstart-copy:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.quickstart-body {
  margin: 0;
  padding: 16px 20px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13.6px;
  line-height: 1.7;
  color: #e5e7eb;
}

.prompt {
  color: #28c840;
}

.comment {
  color: #9aa3b2;
}
</style>
