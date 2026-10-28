import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // La UI y el arranque los cubren los tests E2E en navegador real (ver CONSTRAINTS.md).
      exclude: ['src/ui/**', 'src/main.ts', 'src/**/*-worklet.ts'],
      reporter: ['text-summary', 'lcov'],
      thresholds: { lines: 80, branches: 80 },
    },
  },
});
