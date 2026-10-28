import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';
import { CLAPS_WAV, FAKE_MEDIA_ARGS } from './paths';

// El micrófono falso de todo este archivo reproduce palmas grabadas a 120 BPM.
test.use({ launchOptions: { args: [...FAKE_MEDIA_ARGS, `--use-file-for-fake-audio-capture=${CLAPS_WAV}`] } });

test('se llega desde la portada', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Probar micrófono' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Probador de micrófono');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('detecta las palmas durante el turno del alumno y da un resumen', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/#/micro');
  await page.getByRole('button', { name: 'Activar micrófono' }).click();
  await expect(page.getByText('Listo. Da una palmada para probar.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activar micrófono' })).toBeHidden();
  await expectNoSeriousA11yViolations(page);

  await page.getByLabel(/Tempo/).fill('120');
  await expect(page.getByText('Tempo: 120 BPM')).toBeVisible();
  await page.getByRole('button', { name: 'Empezar' }).click();

  await expect(page.getByText('Escucha las claves…')).toBeVisible();
  await expect(page.getByText('¡Tu turno! Sigue el pulso.')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('Terminado.')).toBeVisible({ timeout: 15_000 });

  // 4 compases de 4/4 a 120 BPM = 8 s; el micro falso da una palmada cada 0,5 s.
  const detected = await page.getByText(/Golpes detectados: \d+/).textContent();
  expect(Number(detected?.match(/\d+/)?.[0])).toBeGreaterThanOrEqual(12);
  await expect(page.locator('.timeline .clap').first()).toBeVisible();
  await expect(page.getByText(/De media vas \d+ ms (adelantado|atrasado)\./)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeEnabled();
  await expectNoSeriousA11yViolations(page);
});

test('si se deniega el micrófono lo explica', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  await page.goto('/#/micro');
  await page.getByRole('button', { name: 'Activar micrófono' }).click();
  await expect(page.getByRole('alert')).toContainText('No hay permiso para usar el micrófono');
  await expectNoSeriousA11yViolations(page);
});

test('el probador también funciona en inglés', async ({ page }) => {
  await page.goto('/#/micro');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Microphone tester');
  await expect(page.getByRole('button', { name: 'Turn on microphone' })).toBeVisible();
});
