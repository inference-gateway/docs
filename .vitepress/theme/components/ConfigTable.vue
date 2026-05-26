<script setup lang="ts">
interface ConfigRow {
  variable: string;
  description: string;
  defaultValue: string;
}

defineProps<{
  rows: ConfigRow[];
}>();
</script>

<template>
  <div class="config-table">
    <table>
      <thead>
        <tr>
          <th>Variable</th>
          <th>Description</th>
          <th>Default</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <td>
            <code>{{ row.variable }}</code>
          </td>
          <td>{{ row.description }}</td>
          <td>
            <code>{{ row.defaultValue }}</code>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.config-table {
  margin: 1.5rem 0;
  overflow-x: auto;
}

.config-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  display: table;
}

.config-table th,
.config-table td {
  border: 1px solid var(--vp-c-divider);
  padding: 0.6rem 0.8rem;
  text-align: left;
  vertical-align: top;
}

.config-table th {
  background-color: var(--vp-c-bg-soft);
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.config-table tbody tr:nth-child(even) {
  background-color: var(--vp-c-bg-soft);
}

.config-table td code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85em;
  background-color: transparent;
  padding: 0;
  color: var(--vp-c-brand-1);
}

.config-table td:nth-child(3) code {
  color: var(--vp-c-text-2);
}
</style>
