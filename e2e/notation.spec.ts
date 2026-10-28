import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';

test('la partitura de muestra se dibuja con la fuente musical y se adapta al ancho', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'Ver partitura de muestra' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Partitura de muestra');

  const scores = page.locator('.paper svg');
  await expect(scores).toHaveCount(6);
  await expect(page.getByText('Cargando partitura…')).toHaveCount(0);
  // La fuente musical ha cargado de verdad (si no, las figuras saldrían como cuadros vacíos).
  expect(await page.evaluate(() => document.fonts.check('30pt Gonville'))).toBe(true);
  // Cuatro negras coloreadas en la muestra de resultados.
  await expect(page.locator('.score .perfect')).toHaveCount(1);
  await expect(page.locator('.score .miss')).toHaveCount(1);

  // Ninguna partitura se sale de la pantalla (móvil incluido).
  const viewport = page.viewportSize()?.width ?? 0;
  for (const box of await scores.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right))) {
    expect(box).toBeLessThanOrEqual(viewport);
  }
  await expectNoSeriousA11yViolations(page);
  expect(errors).toEqual([]);
});
