<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

type Node = {
  icon?: string;
  title: string;
  sub?: string;
  wire?: string;
  link?: string;
  dashed?: boolean;
  aside?: boolean;
  step?: number;
};

type Band = {
  frame?: string;
  chain?: boolean;
  rail?: string;
  nodes: Node[];
};

const flows: Record<string, Band[]> = {
  request: [
    {
      frame: 'Clients',
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
          sub: 'Delegated by the CLI, and they call the gateway themselves',
          wire: 'A2A_SubmitTask -> calendar-agent',
          link: '/a2a/',
          dashed: true,
          step: 0,
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
      frame: 'Clients',
      rail: 'HTTPS',
      nodes: [
        {
          icon: '💻',
          title: 'External clients',
          sub: 'Reach the cluster through the data plane',
          step: 0,
        },
        {
          icon: '💻',
          title: 'In-cluster clients',
          sub: 'Reach the Service directly, skipping the data plane',
          dashed: true,
          step: 0,
        },
      ],
    },
    {
      frame: '☸️ Cluster edge',
      chain: true,
      rail: 'load balanced',
      nodes: [
        { title: 'Gateway API', sub: 'Envoy Gateway data plane', link: '/operator/', step: 1 },
        { title: 'Gateway Service', sub: 'ClusterIP fronting every pod', step: 2 },
      ],
    },
    {
      frame: '🛡️ Gateway pods',
      rail: 'provider API',
      nodes: [
        { title: 'Gateway Pod', sub: 'stateless, HPA-scaled', step: 3 },
        { title: 'Gateway Pod', sub: 'stateless, HPA-scaled', step: 3 },
        { title: 'Gateway Pod', sub: 'stateless, HPA-scaled', step: 3 },
        {
          icon: '📊',
          title: 'Monitoring stack',
          sub: 'ServiceMonitor + Prometheus + Grafana scrape each pod',
          wire: 'scrape :9464 /metrics',
          link: '/observability/',
          dashed: true,
          aside: true,
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
          step: 4,
        },
      ],
    },
  ],
};

const props = defineProps<{ flow: keyof typeof flows }>();

const bands = computed(() => flows[props.flow]);
const steps = computed(
  () => Math.max(...bands.value.flatMap((b) => b.nodes.map((n) => n.step ?? 0))) + 1
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
    <template v-for="(band, bi) in bands" :key="bi">
      <div class="flow-band" :class="{ 'is-framed': band.frame }">
        <span v-if="band.frame" class="flow-band-label">{{ band.frame }}</span>

        <div v-if="band.chain" class="flow-chain">
          <component
            :is="node.link ? 'a' : 'div'"
            v-for="(node, ni) in band.nodes"
            :key="node.title + ni"
            class="flow-stage"
            :class="{ 'is-dashed': node.dashed, 'is-active': node.step === active }"
            :href="node.link"
          >
            <span class="flow-stage-num">{{ ni + 1 }}</span>
            <strong>{{ node.title }}</strong>
            <span v-if="node.sub" class="flow-sub">{{ node.sub }}</span>
          </component>
        </div>

        <div v-else class="flow-grid">
          <component
            :is="node.link ? 'a' : 'div'"
            v-for="(node, ni) in band.nodes"
            :key="node.title + ni"
            class="flow-node"
            :class="{
              'is-dashed': node.dashed,
              'is-aside': node.aside,
              'is-active': node.step === active,
            }"
            :href="node.link"
          >
            <span v-if="node.icon" class="flow-icon">{{ node.icon }}</span>
            <strong>{{ node.title }}</strong>
            <span v-if="node.sub" class="flow-sub">{{ node.sub }}</span>
            <code v-if="node.wire" class="flow-wire">{{ node.wire }}</code>
          </component>
        </div>
      </div>

      <div v-if="band.rail" class="flow-rail">
        <span class="flow-rail-label">{{ band.rail }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.flow {
  display: flex;
  flex-direction: column;
  margin: 1.75rem 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
}

.flow-band.is-framed {
  padding: 12px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 14px;
}

.flow-band-label {
  display: block;
  margin-bottom: 10px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-align: center;
  color: var(--vp-c-text-3);
}

/* Nodes share the full width of the band, so they never get squeezed into a column. */
.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.flow-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-align: center;
  text-decoration: none;
  transition:
    border-color 0.3s,
    box-shadow 0.3s,
    transform 0.3s;
}

.flow-node.is-aside {
  grid-column: 1 / -1;
}

.flow-chain {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition:
    border-color 0.3s,
    box-shadow 0.3s,
    transform 0.3s;
}

.flow-stage .flow-sub {
  margin-left: auto;
  text-align: right;
}

.flow-stage-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  align-self: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
}

.flow-node.is-dashed,
.flow-stage.is-dashed {
  border-style: dashed;
}

.flow-node.is-active,
.flow-stage.is-active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.flow-node strong,
.flow-stage strong {
  font-size: 14px;
  font-weight: 600;
}

.flow-icon {
  font-size: 22px;
  line-height: 1.2;
}

.flow-sub {
  font-size: 12.5px;
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

/* The rail is always vertical: the label sits beside the line, never on top of a node. */
.flow-rail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 0;
}

.flow-rail::before {
  content: '';
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

.flow-rail-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-2);
}

@keyframes flow-y {
  to {
    background-position: 0 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-rail::before {
    animation: none;
  }

  .flow-node,
  .flow-stage {
    transition: none;
  }
}
</style>
