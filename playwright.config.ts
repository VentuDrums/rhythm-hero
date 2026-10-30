import { defineConfig, devices } from '@playwright/test';
import { FAKE_MEDIA_ARGS } from './e2e/paths';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    permissions: ['microphone'],
    launchOptions: {
      // Micrófono simulado: Chromium no pide permiso y usa un dispositivo falso.
      // Los tests que necesiten palmas concretas añaden --use-file-for-fake-audio-capture.
      args: FAKE_MEDIA_ARGS,
    },
  },
  projects: [
    // Navegador en español: el juego elige idioma según el navegador la primera vez.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], locale: 'es-ES' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], locale: 'es-ES' } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
  },
});
