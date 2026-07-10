import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include:  ['src/**/*.ts', 'src/**/*.tsx'],
      exclude:  ['src/**/__tests__/**'],
    },
  },
});
