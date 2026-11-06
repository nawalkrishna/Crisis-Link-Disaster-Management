// ESLint "flat config": one file lints the whole monorepo.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Backend + shared code runs in Node.
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', '*.js', '*.ts'],
    languageOptions: { globals: globals.node },
  },

  // Frontend runs in the browser and uses React.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // Must be last: turns off rules that would fight with Prettier's formatting.
  prettier,
);
