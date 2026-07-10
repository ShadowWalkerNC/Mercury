import { test, expect } from '@playwright/test';
import { register } from './helpers';

test.describe('User Settings modal', () => {
  test.beforeEach(async ({ page }) => { await register(page); });

  test('modal opens via settings button', async ({ page }) => {
    await page.getByTitle(/settings|profile/i).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/user settings/i)).toBeVisible();
  });

  test('display name can be updated', async ({ page }) => {
    await page.getByTitle(/settings|profile/i).click();
    const nameInput = page.getByPlaceholder(/display name|name/i).first();
    await nameInput.fill('Test Display Name');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/saved|✓/i)).toBeVisible({ timeout: 5_000 });
  });

  test('appearance toggle is visible', async ({ page }) => {
    await page.getByTitle(/settings|profile/i).click();
    await expect(page.getByText(/appearance/i)).toBeVisible();
  });

  test('2FA row is present', async ({ page }) => {
    await page.getByTitle(/settings|profile/i).click();
    await expect(page.getByText(/two.factor/i)).toBeVisible();
  });
});
