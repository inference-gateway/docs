import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import type { Theme } from 'vitepress';
import ArchitectureDiagram from './components/ArchitectureDiagram.vue';
import ConfigTable from './components/ConfigTable.vue';
import QuickStartTerminal from './components/QuickStartTerminal.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-after': () => [h(ArchitectureDiagram), h(QuickStartTerminal)],
    }),
  enhanceApp({ app }) {
    app.component('ConfigTable', ConfigTable);
  },
} satisfies Theme;
