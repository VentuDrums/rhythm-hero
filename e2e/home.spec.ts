import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';

test('la portada se muestra en español y cambia a inglés sin recargar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rhythm Hero');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByText('Aprende ritmo tocando con palmas')).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Learn rhythm by clapping')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Español' })).toBeVisible();
});

test('la portada no tiene fallos graves de accesibilidad en ningún idioma', async ({ page }) => {
  await page.goto('/');
  await expectNoSeriousA11yViolations(page);
  await page.getByRole('button', { name: 'English' }).click();
  await expectNoSeriousA11yViolations(page);
});
