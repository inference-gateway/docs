<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const targets = [
  {
    icon: '🧠',
    title: 'LLM providers',
    details: 'OpenAI, Anthropic, Groq, Google, Ollama, DeepSeek, Mistral, llama.cpp',
    call: 'POST /v1/chat/completions',
    link: '/supported-providers/',
  },
  {
    icon: '🔌',
    title: 'MCP servers',
    details: 'Tools discovered and executed server-side, in selector or direct mode',
    call: 'tools/call filesystem.read',
    link: '/mcp/',
  },
];

const active = ref(0);
let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  timer = setInterval(() => (active.value = (active.value + 1) % targets.length), 2600);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="arch">
    <div class="arch-flow">
      <div class="arch-source">
        <a class="arch-node arch-node-branch" href="/a2a/">
          <span class="arch-icon">🤖</span>
          <strong>A2A agents</strong>
          <span class="arch-sub">Optional - delegated by the CLI, not proxied by the gateway</span>
          <code class="arch-wire arch-wire-static">A2A_SubmitTask -&gt; calendar-agent</code>
        </a>

        <div class="arch-rail arch-rail-branch" aria-hidden="true"></div>

        <div class="arch-node arch-node-app">
          <span class="arch-icon">💻</span>
          <strong>Your app</strong>
          <span class="arch-sub">OpenAI SDK, curl, or the infer CLI</span>
        </div>
      </div>

      <div class="arch-rail" aria-hidden="true"></div>

      <div class="arch-node arch-node-gateway">
        <span class="arch-icon">🛡️</span>
        <strong>Inference Gateway</strong>
        <span class="arch-sub">Routing, auth, streaming, observability</span>
        <code class="arch-wire">{{ targets[active].call }}</code>
      </div>

      <div class="arch-rail arch-rail-fan" aria-hidden="true"></div>

      <div class="arch-targets">
        <a
          v-for="(target, index) in targets"
          :key="target.title"
          class="arch-node arch-node-target"
          :class="{ 'is-active': index === active }"
          :href="target.link"
        >
          <span class="arch-icon">{{ target.icon }}</span>
          <strong>{{ target.title }}</strong>
          <span class="arch-sub">{{ target.details }}</span>
        </a>
      </div>
    </div>
    <p class="arch-caption">
      One stable, OpenAI-compatible surface in front of every provider and MCP tool, with A2A
      delegation handled by the CLI.
      <a href="/architecture-overview/">Read the architecture overview</a>.
    </p>
  </div>
</template>

<style scoped>
.arch {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 40px;
}

@media (min-width: 640px) {
  .arch {
    padding: 0 48px 40px;
  }
}

@media (min-width: 960px) {
  .arch {
    padding: 0 64px 48px;
  }
}

.arch-flow {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.arch-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-align: center;
  transition:
    border-color 0.3s,
    box-shadow 0.3s,
    transform 0.3s;
}

.arch-node strong {
  font-size: 15px;
  font-weight: 600;
}

.arch-icon {
  font-size: 22px;
  line-height: 1.2;
}

.arch-sub {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.arch-node-gateway {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-soft);
  animation: arch-breathe 3s ease-in-out infinite;
}

.arch-wire {
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  align-self: center;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
  animation: arch-fade 2.6s ease-in-out infinite;
}

.arch-node-target.is-active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.arch-targets {
  display: grid;
  gap: 12px;
}

.arch-source {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.arch-node-branch {
  border-style: dashed;
}

.arch-wire-static {
  animation: none;
}

.arch-rail {
  height: 28px;
  align-self: center;
  width: 2px;
  background-image: repeating-linear-gradient(
    180deg,
    var(--vp-c-brand-1) 0 6px,
    transparent 6px 18px
  );
  background-size: 100% 18px;
  animation: arch-flow-y 0.9s linear infinite;
}

.arch-caption {
  margin: 20px 0 0;
  font-size: 14px;
  text-align: center;
  color: var(--vp-c-text-2);
}

.arch-caption a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (min-width: 860px) {
  .arch-flow {
    flex-direction: row;
    align-items: center;
    gap: 0;
  }

  .arch-source,
  .arch-node-gateway {
    flex: 0 1 240px;
  }

  .arch-targets {
    flex: 1 1 340px;
  }

  .arch-rail {
    flex: 0 1 64px;
    width: auto;
    height: 2px;
    background-image: repeating-linear-gradient(
      90deg,
      var(--vp-c-brand-1) 0 6px,
      transparent 6px 18px
    );
    background-size: 18px 100%;
    animation: arch-flow-x 0.9s linear infinite;
  }

  .arch-rail-branch {
    flex: none;
    width: 2px;
    height: 28px;
    background-image: repeating-linear-gradient(
      180deg,
      var(--vp-c-brand-1) 0 6px,
      transparent 6px 18px
    );
    background-size: 100% 18px;
    animation: arch-flow-y 0.9s linear infinite;
  }
}

@keyframes arch-flow-x {
  to {
    background-position: 18px 0;
  }
}

@keyframes arch-flow-y {
  to {
    background-position: 0 18px;
  }
}

@keyframes arch-breathe {
  50% {
    box-shadow: 0 0 0 4px var(--vp-c-brand-soft);
  }
}

@keyframes arch-fade {
  0%,
  15% {
    opacity: 0.35;
  }
  35%,
  100% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .arch-rail,
  .arch-node-gateway,
  .arch-wire {
    animation: none;
  }

  .arch-node {
    transition: none;
  }
}
</style>
