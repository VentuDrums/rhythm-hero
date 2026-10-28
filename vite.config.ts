import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // En GitHub Pages la web vive en /rhythm-hero/; el workflow de despliegue pasa BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  resolve: {
    alias: {
      // Fuente musical pequeña (22 kB) que VexFlow trae pero no exporta.
      'vexflow-gonville': fileURLToPath(new URL('./node_modules/vexflow/build/esm/src/fonts/gonville.js', import.meta.url)),
    },
  },
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
