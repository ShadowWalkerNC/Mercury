import { type Page, expect } from '@playwright/test';

export const TEST_USER = {
  username: `e2e_${Date.now()}`,
  password: 'E2eTestPass1!',
};

export async function register(page: Page, username = TEST_USER.username, password = TEST_USER.password) {
  await page.goto('/auth/register');
  await page.getByPlaceholder(/username/i).fill(username);
  await page.getByPlaceholder(/password/i).first().fill(password);
  // some forms have confirm-password field
  const confirm = page.getByPlaceholder(/confirm/i);
  if (await confirm.isVisible()) await confirm.fill(password);
  await page.getByRole('button', { name: /register|sign up|create/i }).click();
  await expect(page).toHaveURL(/\/channels/, { timeout: 10_000 });
}

export async function login(page: Page, username = TEST_USER.username, password = TEST_USER.password) {
  await page.goto('/auth/login');
  await page.getByPlaceholder(/username/i).fill(username);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /log.?in|sign.?in/i }).click();
  await expect(page).toHaveURL(/\/channels/, { timeout: 10_000 });
}

export async function logout(page: Page) {
  // click user avatar / settings button in bottom bar
  await page.getByTitle(/settings|profile/i).click();
  const logoutBtn = page.getByRole('button', { name: /log.?out|sign.?out/i });
  if (await logoutBtn.isVisible()) await logoutBtn.click();
  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8_000 });
}
