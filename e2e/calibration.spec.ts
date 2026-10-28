import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';
import { CLAPS_WAV, FAKE_MEDIA_ARGS } from './paths';

// Micrófono falso con palmas a 120 BPM: no siguen el pulso de la calibración (80 BPM),
// así que el resultado debe rechazarse y pedir repetir. El cálculo correcto se prueba en tests/unit/calibration.test.ts.
test.use({ launchOptions: { args: [...FAKE_MEDIA_ARGS, `--use-file-for-fake-audio-capture=${CLAPS_WAV}`] } });

test('pide repetir si las palmas no siguen el pulso, y no guarda nada', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  await page.getByRole('link', { name: 'Calibrar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calibración');
  await expect(page.getByText('Este dispositivo aún no está calibrado.')).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  await page.getByRole('button', { name: 'Empezar calibración' }).click();
  await expect(page.getByText('Escucha las claves…')).toBeVisible();
  await expect(page.getByText('Da 8 palmas siguiendo la luz.')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole('alert')).toContainText(/Repite|repite/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Empezar calibración' })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('rhythm-hero.latency'))).toBeNull();
  await expectNoSeriousA11yViolations(page);
});

test('muestra el retraso guardado y Leer y tocar deja de pedir calibrar', async ({ page }) => {
  await page.goto('/#/leer');
  await expect(page.getByText('Este dispositivo aún no está calibrado.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Calibrar ahora' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calibración');

  await page.evaluate(() => localStorage.setItem('rhythm-hero.latency', '0.085'));
  await page.reload();
  await expect(page.getByText('Retraso guardado en este dispositivo: 85 ms.')).toBeVisible();
  await page.getByRole('link', { name: 'Ir a Leer y tocar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leer y tocar');
  await expect(page.getByText('Calibrarlo hace que la puntuación sea más justa.', { exact: false })).toBeHidden();
});
