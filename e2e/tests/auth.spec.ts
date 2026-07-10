import { test, expect } from '@playwright/test';
import { register, login, logout, TEST_USER } from './helpers';

test.describe('Authentication', () => {
  test('register a new account', async ({ page }) => {
    await register(page);
    await expect(page).toHaveURL(/\/channels/);
  });

  test('log out after registration', async ({ page }) => {
    await register(page);
    await logout(page);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('log in with registered credentials', async ({ page }) => {
    await register(page);
    await logout(page);
    await login(page);
    await expect(page).toHaveURL(/\/channels/);
  });

  test('rejects wrong password', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder(/username/i).fill(TEST_USER.username);
    await page.getByPlaceholder(/password/i).fill('WrongPassword99!');
    await page.getByRole('button', { name: /log.?in|sign.?in/i }).click();
    // should stay on login and show an error
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByText(/invalid|incorrect|wrong|unauthorized/i)).toBeVisible({ timeout: 5_000 });
  });
});
