import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Falla si la página tiene fallos de accesibilidad graves o críticos (WCAG 2.1 AA). */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(serious).toEqual([]);
}
