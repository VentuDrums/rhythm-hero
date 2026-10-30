import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';

const PROGRESS = 'rhythm-hero.progress';

test('al principio solo el nivel 1 está abierto; los demás se ven bloqueados', async ({ page }) => {
  await page.goto('/#/niveles');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Niveles');
  const cards = page.locator('.level-card');
  await expect(cards).toHaveCount(12);
  await expect(page.getByRole('link', { name: /Nivel \d+:/ })).toHaveCount(1);
  await expect(cards.nth(1)).toContainText('Bloqueado');
  await expectNoSeriousA11yViolations(page);

  // Un nivel bloqueado tampoco se abre escribiendo su dirección.
  await page.goto('/#/leer/2');
  await expect(page.getByText('Este nivel aún está bloqueado.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Empezar' })).toHaveCount(0);
  await page.goto('/#/leer/99');
  await expect(page.getByText('Ese nivel no existe.')).toBeVisible();
});

test('el progreso guardado desbloquea el siguiente nivel y se conserva al volver a abrir', async ({ page }) => {
  await page.goto('/#/niveles');
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ 1: { best: 92, stars: 2, passed: true } })), PROGRESS);
  await page.reload();
  const first = page.getByRole('link', { name: /Nivel 1:/ });
  await expect(first).toContainText('Récord: 92 %');
  await expect(first.getByRole('img', { name: '2 de 3 estrellas' })).toBeVisible();

  await page.getByRole('link', { name: /Nivel 2:/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leer y tocar');
  await expect(page.getByText('Blancas y negras', { exact: true })).toBeVisible();
  await expect(page.locator('#track svg')).toBeVisible();
});

test('si el progreso guardado está estropeado, el juego arranca igual', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, '{roto'), PROGRESS);
  await page.goto('/#/niveles');
  await expect(page.getByRole('link', { name: /Nivel 1:/ })).toBeVisible();
});

test('todos los niveles se dibujan sin errores', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  // Todo desbloqueado para recorrerlos.
  await page.evaluate((key) => {
    const all = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, { best: 100, stars: 3, passed: true }]));
    localStorage.setItem(key, JSON.stringify(all));
  }, PROGRESS);
  for (let id = 1; id <= 12; id++) {
    await page.goto(`/#/leer/${id}`);
    await expect(page.locator('#track svg .vf-stavenote').first()).toBeAttached();
  }
  expect(errors).toEqual([]);
});
