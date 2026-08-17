<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

type Node = {
  icon?: string;
  title: string;
  sub?: string;
  wire?: string;
  link?: string;
  dashed?: boolean;
  step?: number;
};

type Column = {
  frame?: string;
  chain?: boolean;
  rail?: string;
  nodes: Node[];
};

const flows: Record<string, Column[]> = {
  request: [
    {
      rail: 'POST /v1/chat/completions',
      nodes: [
        {
          icon: '💻',
          title: 'Your app',
          sub: 'OpenAI SDK, curl, or the infer CLI',
          step: 0,
        },
        {
          icon: '🤖',
          title: 'A2A agents',
          sub: 'Delegated by the CLI, not proxied by the gateway',
          wire: 'A2A_SubmitTask -> calendar-agent',
          link: '/a2a/',
          dashed: true,
        },
      ],
    },
    {
      frame: '🛡️ Inference Gateway',
      chain: true,
      rail: 'provider request',
      nodes: [
        { title: 'OIDC auth', sub: 'optional', link: '/authentication/', dashed: true, step: 1 },
        { title: 'Guardrails', sub: 'optional', link: '/configuration/', dashed: true, step: 2 },
        {
          title: 'MCP tool loop',
          sub: 'tools/call, executed server-side',
          link: '/mcp/',
          step: 3,
        },
        {
          title: 'Model routing',
          sub: 'alias resolved to an upstream deployment',
          link: '/model-routing/',
          step: 4,
        },
        { title: 'Provider proxy', sub: 'dispatch and stream back', step: 5 },
      ],
    },
    {
      nodes: [
        {
          icon: '🧠',
          title: 'LLM providers',
          sub: 'OpenAI, Anthropic, Groq, Ollama, and more',
          link: '/supported-providers/',
          step: 6,
        },
        {
          icon: '🔌',
          title: 'MCP servers',
          sub: 'Called from the tool loop, not the proxy',
          wire: 'tools/call filesystem.read',
          link: '/mcp/',
          dashed: true,
          step: 3,
        },
      ],
    },
  ],
  kubernetes: [
    {
      rail: 'HTTPS',
      nodes: [
        { icon: '💻', title: 'External clients', sub: 'Reach the cluster through the data plane' },
        {
          icon: '💻',
          title: 'In-cluster clients',
          sub: 'Reach the Service directly, skipping the data plane',
          dashed: true,
        },
      ],
    },
    {
      frame: '☸️ Cluster edge',
      chain: true,
      rail: 'load balanced',
      nodes: [
        { title: 'Gateway API', sub: 'Envoy Gateway data plane', link: '/operator/', step: 0 },
        { title: 'Gateway Service', sub: 'ClusterIP fronting every pod', step: 1 },
      ],
    },
    {
      frame: '🛡️ Gateway pods',
      rail: 'provider API',
      nodes: [
        { title: 'Gateway Pod', sub: 'stateless, HPA-scaled', step: 2 },
        { title: 'Gateway Pod', sub: 'stateless, HPA-scaled', step: 2 },
        { title: 'Gateway Pod', sub: 'stateless, HPA-scaled', step: 2 },
        {
          icon: '📊',
          title: 'Monitoring stack',
          sub: 'ServiceMonitor + Prometheus + Grafana scrape each pod',
          wire: 'scrape :9464 /metrics',
          link: '/observability/',
          dashed: true,
        },
      ],
    },
    {
      nodes: [
        {
          icon: '🧠',
          title: 'External LLM providers',
          sub: 'Outside the cluster, reached over the network',
          link: '/supported-providers/',
          step: 3,
        },
      ],
    },
  ],
};

const props = defineProps<{ flow: keyof typeof flows }>();

const columns = computed(() => flows[props.flow]);
const steps = computed(
  () => Math.max(...columns.value.flatMap((c) => c.nodes.map((n) => n.step ?? 0))) + 1
);

const active = ref(0);
let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  timer = setInterval(() => (active.value = (active.value + 1) % steps.value), 1400);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="flow">
    <div class="flow-cols">
      <template v-for="(column, ci) in columns" :key="ci">
        <div class="flow-col" :class="{ 'is-framed': column.frame }">
          <span v-if="column.frame" class="flow-frame">{{ column.frame }}</span>
          <template v-for="(node, ni) in column.nodes" :key="node.title + ni">
            <div
              v-if="column.chain && ni > 0"
              class="flow-rail flow-rail-step"
              aria-hidden="true"
            />
            <component
              :is="node.link ? 'a' : 'div'"
              class="flow-node"
              :class="{ 'is-dashed': node.dashed, 'is-active': node.step === active }"
              :href="node.link"
            >
              <span v-if="node.icon" class="flow-icon">{{ node.icon }}</span>
              <strong>{{ node.title }}</strong>
              <span v-if="node.sub" class="flow-sub">{{ node.sub }}</span>
              <code v-if="node.wire" class="flow-wire">{{ node.wire }}</code>
            </component>
          </template>
        </div>
        <div v-if="column.rail" class="flow-rail">
          <span class="flow-rail-label">{{ column.rail }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.flow {
  margin: 1.75rem 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
}

.flow-cols {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 0;
}

.flow-col.is-framed {
  padding: 12px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
}

.flow-frame {
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  color: var(--vp-c-text-2);
}

.flow-node {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-align: center;
  transition:
    border-color 0.3s,
    box-shadow 0.3s,
    transform 0.3s;
}

.flow-node.is-dashed {
  border-style: dashed;
}

.flow-node.is-active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.flow-node strong {
  font-size: 14px;
  font-weight: 600;
}

.flow-icon {
  font-size: 20px;
  line-height: 1.2;
}

.flow-sub {
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.flow-wire {
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  align-self: center;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
}

.flow-rail {
  position: relative;
  align-self: center;
  width: 2px;
  height: 34px;
  background-image: repeating-linear-gradient(
    180deg,
    var(--vp-c-brand-1) 0 6px,
    transparent 6px 18px
  );
  background-size: 100% 18px;
  animation: flow-y 0.9s linear infinite;
}

.flow-rail-step {
  height: 16px;
}

.flow-rail-label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-2);
}

@media (min-width: 960px) {
  .flow-cols {
    flex-direction: row;
    align-items: center;
    gap: 0;
  }

  .flow-col.is-framed {
    align-self: stretch;
    justify-content: center;
  }

  .flow-rail {
    flex: 0 1 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    min-width: 72px;
    padding: 0 12px 20px; /* bottom pad = label + gap, keeps the line on the node centerline */
    width: auto;
    height: auto;
    background: none;
    animation: none;
  }

  .flow-rail::after {
    content: '';
    height: 2px;
    background-image: repeating-linear-gradient(
      90deg,
      var(--vp-c-brand-1) 0 6px,
      transparent 6px 18px
    );
    background-size: 18px 100%;
    animation: flow-x 0.9s linear infinite;
  }

  .flow-rail-step::after {
    content: none;
  }

  .flow-rail-step {
    flex: none;
    min-width: 0;
    padding: 0;
    width: 2px;
    height: 16px;
    background-image: repeating-linear-gradient(
      180deg,
      var(--vp-c-brand-1) 0 6px,
      transparent 6px 18px
    );
    background-size: 100% 18px;
    animation: flow-y 0.9s linear infinite;
  }

  .flow-rail-label {
    position: static;
    transform: none;
    text-align: center;
  }
}

@keyframes flow-x {
  to {
    background-position: 18px 0;
  }
}

@keyframes flow-y {
  to {
    background-position: 0 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-rail,
  .flow-rail::after,
  .flow-rail-step {
    animation: none;
  }

  .flow-node {
    transition: none;
  }
}
</style>
