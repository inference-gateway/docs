import nextConfig from 'eslint-config-next';
import nextTypescriptConfig from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  ...nextConfig,
  ...nextTypescriptConfig,
  prettierConfig,
  {
    // Disable overly strict rule that flags common legitimate patterns
    // like setMounted(true) for hydration safety, setting state from DOM on mount,
    // and resetting state on route changes
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default eslintConfig;
