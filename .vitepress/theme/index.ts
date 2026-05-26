import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import ConfigTable from './components/ConfigTable.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ConfigTable', ConfigTable);
  },
} satisfies Theme;
