import { expect, test, type Page } from '@playwright/test';

// Pantallas que no necesitan micrófono para mostrarse.
const SCREENS = ['/', '/#/niveles', '/#/leer/1', '/#/micro', '/#/calibrar', '/#/partitura'];

// Textos que son iguales en los dos idiomas a propósito.
const SAME_IN_BOTH = /^(Rhythm Hero|[\d\s·/:%.★☆BPM-]*)$/;

/** Textos visibles de la pantalla, uno por elemento (sin hijos con texto). */
async function visibleTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.querySelector('main') as Node, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? '';
      const el = node.parentElement;
      if (text && el && el.closest('svg') === null && el.offsetParent !== null) out.push(text);
    }
    return out;
  });
}

test('ningún texto visible queda sin traducir al cambiar a inglés', async ({ page }) => {
  for (const screen of SCREENS) {
    await page.goto(screen);
    await page.waitForLoadState('networkidle');
    const spanish = await visibleTexts(page);
    await page.getByRole('button', { name: 'English' }).click();
    const english = await visibleTexts(page);
    const untranslated = english.filter((text) => spanish.includes(text) && !SAME_IN_BOTH.test(text));
    expect(untranslated, `pantalla ${screen}`).toEqual([]);
    await page.getByRole('button', { name: 'Español' }).click();
  }
});

test('el idioma elegido se recuerda al volver a abrir', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Read and play' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Español' })).toHaveAttribute('lang', 'es');
});

test.describe('con el navegador en inglés', () => {
  test.use({ locale: 'en-GB' });

  test('la primera vez se abre en inglés', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Read and play' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
