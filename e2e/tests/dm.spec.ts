import { test, expect } from '@playwright/test';
import { register } from './helpers';

test.describe('Direct Messages', () => {
  test('DM list is reachable via ✉️ button', async ({ page }) => {
    await register(page);
    await page.getByTitle(/direct messages/i).click();
    await expect(page).toHaveURL(/\/channels\/@me/);
    await expect(page.getByText(/direct messages/i)).toBeVisible();
  });

  test('new DM search panel opens', async ({ page }) => {
    await register(page);
    await page.goto('/channels/@me');
    await page.getByTitle(/new dm/i).click();
    await expect(page.getByPlaceholder(/search users/i)).toBeVisible();
  });
});
