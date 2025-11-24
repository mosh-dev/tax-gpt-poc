import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules (without strict type checking)
  ...tseslint.configs.recommended,

  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', '.mastra/**', '*.js', '*.mjs', '*.cjs']
  },

  // Main configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // Allow 'any' type for flexibility
      '@typescript-eslint/no-explicit-any': 'off',

      // Disable unused variables rule
      '@typescript-eslint/no-unused-vars': 'warn',

      // Don't require explicit return types
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Enforce proper promise handling (critical for async code)
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Allow to require statements in ESM (for dynamic imports)
      '@typescript-eslint/no-require-imports': 'off',

      // Express route handlers often use unused 'next' parameter
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
);
