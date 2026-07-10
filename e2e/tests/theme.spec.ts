import { test, expect } from '@playwright/test';
import { register } from './helpers';

test.describe('Theme toggle', () => {
  test('defaults to dark theme', async ({ page }) => {
    await register(page);
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBeNull(); // dark = no attribute
  });

  test('toggles to light and persists on reload', async ({ page }) => {
    await register(page);
    // open user settings
    await page.getByTitle(/settings|profile/i).click();
    await page.getByRole('button', { name: /☀️|light/i }).click();
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).toBe('light');

    // reload and check persistence
    await page.reload();
    const persisted = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(persisted).toBe('light');
  });
});
