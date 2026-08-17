<script setup lang="ts">
import { ref } from 'vue';

const terminals = [
  {
    title: 'inference-gateway - bash',
    commands: [
      'docker run --rm -it -p 8080:8080 \\\n  -e OPENAI_API_KEY=your_key_here \\\n  ghcr.io/inference-gateway/inference-gateway:latest',
    ],
    comment: '# Gateway is live on http://localhost:8080/v1',
  },
  {
    title: 'infer - bash',
    commands: [
      'curl -fsSL https://raw.githubusercontent.com/inference-gateway/cli/main/install.sh | bash',
      'infer init',
      'infer chat',
    ],
    comment: '# Interactive chat, agents, and tools from your terminal',
  },
];

const copied = ref(-1);

async function copy(index: number) {
  try {
    await navigator.clipboard.writeText(terminals[index].commands.join('\n'));
    copied.value = index;
    setTimeout(() => (copied.value = -1), 2000);
  } catch {}
}
</script>

<template>
  <div class="quickstart">
    <div v-for="(terminal, index) in terminals" :key="terminal.title" class="quickstart-window">
      <div class="quickstart-titlebar">
        <span class="dot dot-red" />
        <span class="dot dot-yellow" />
        <span class="dot dot-green" />
        <span class="quickstart-title">{{ terminal.title }}</span>
        <button
          class="quickstart-copy"
          type="button"
          :title="copied === index ? 'Copied!' : 'Copy'"
          :aria-label="copied === index ? 'Command copied' : 'Copy command to clipboard'"
          @click="copy(index)"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path v-if="copied === index" d="M20 6 9 17l-5-5" />
            <template v-else>
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </template>
          </svg>
        </button>
      </div>
      <pre
        class="quickstart-body"
      ><template v-for="line in terminal.commands" :key="line"><span class="prompt">$ </span><code>{{ line }}</code>
</template><span class="comment">{{ terminal.comment }}</span></pre>
    </div>
    <p class="quickstart-link">
      Need Docker Compose, Kubernetes, or another provider?
      <a href="/getting-started/">Read the getting started guide</a>, or see the
      <a href="/cli/">CLI documentation</a>.
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

.quickstart-window + .quickstart-window {
  margin-top: 24px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
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

.quickstart-link {
  margin: 16px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.quickstart-link a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.2s;
}

.quickstart-link a:hover {
  color: var(--vp-c-brand-2);
}

.prompt {
  color: #28c840;
}

.comment {
  color: #9aa3b2;
}
</style>
