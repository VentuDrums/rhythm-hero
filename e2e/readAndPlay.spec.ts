import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';
import { CLAPS_WAV, FAKE_MEDIA_ARGS } from './paths';

// Micrófono falso con palmas a 120 BPM: no coinciden con el nivel (80 BPM), así que el resultado varía,
// pero sirve para comprobar que la partida llega al final y puntúa golpes reales.
test.use({ launchOptions: { args: [...FAKE_MEDIA_ARGS, `--use-file-for-fake-audio-capture=${CLAPS_WAV}`] } });

// Guarda los micrófonos abiertos para comprobar después que se cierran.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    (window as unknown as { openStreams: MediaStream[] }).openStreams = streams;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      streams.push(stream);
      return stream;
    };
  });
});

const liveTracks = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as unknown as { openStreams: MediaStream[] }).openStreams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length,
  );

test('se juega un nivel de principio a fin y sale el resumen', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('link', { name: 'Leer y tocar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leer y tocar');
  await expect(page.locator('#track svg')).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByText('Escucha las claves…')).toBeVisible();
  await expect(page.getByText('¡Tu turno! Toca cuando cada figura llegue a la línea.')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeHidden();

  // La partitura avanza: su posición cambia con el tiempo.
  const before = await page.locator('#track').evaluate((el) => el.style.transform);
  await page.waitForTimeout(500);
  expect(await page.locator('#track').evaluate((el) => el.style.transform)).not.toBe(before);
  // Hay feedback en directo sobre las figuras.
  await expect(page.locator('#track .vf-stavenote.perfect, #track .vf-stavenote.early, #track .vf-stavenote.late, #track .vf-stavenote.miss').first()).toBeAttached({ timeout: 5_000 });

  const summary = page.getByRole('heading', { name: 'Resultado' });
  await expect(summary).toBeVisible({ timeout: 20_000 });
  await expect(summary).toBeFocused();
  await expect(page.getByText(/^Precisión: \d+ %$/)).toBeVisible();
  await expect(page.getByText(/^Perfectos: \d+$/)).toBeVisible();
  await expect(page.getByText(/^Fallos: \d+$/)).toBeVisible();
  await expect(page.getByRole('img', { name: /de 3 estrellas/ })).toBeVisible();
  await expect(page.getByText(/Nivel superado|Necesitas un 70 %/)).toBeVisible();
  // Las 16 negras salen coloreadas en el resumen.
  await expect(page.locator('#sum-score .vf-stavenote:is(.perfect, .early, .late, .miss)')).toHaveCount(16);
  await expectNoSeriousA11yViolations(page);

  await page.getByRole('link', { name: 'Volver al menú' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rhythm Hero');
  expect(await liveTracks(page)).toBe(0);
});

test('se puede parar a mitad y salir sin que quede el micrófono abierto', async ({ page }) => {
  await page.goto('/#/leer');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByText('Escucha las claves…')).toBeVisible();
  expect(await liveTracks(page)).toBe(1);

  await page.getByRole('button', { name: 'Parar' }).click();
  await expect(page.getByText('Partida detenida.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeEnabled();

  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByText('Escucha las claves…')).toBeVisible();
  await page.getByRole('link', { name: 'Volver' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rhythm Hero');
  expect(await liveTracks(page)).toBe(0);
});

test('el modo también está en inglés', async ({ page }) => {
  await page.goto('/#/leer');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Read and play');
  await expect(page.getByText('Level 1: quarter notes · 4/4 · 80 BPM')).toBeVisible();
});
