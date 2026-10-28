import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    permissions: ['microphone'],
    launchOptions: {
      // Micrófono simulado: Chromium no pide permiso y usa un dispositivo falso.
      // Los tests que necesiten palmas concretas añadirán --use-file-for-fake-audio-capture.
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
  },
});
