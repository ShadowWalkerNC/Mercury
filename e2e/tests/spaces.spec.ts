import { test, expect } from '@playwright/test';
import { register } from './helpers';

test.describe('Spaces', () => {
  test.beforeEach(async ({ page }) => { await register(page); });

  test('create a space and land on first channel', async ({ page }) => {
    // open create-space modal
    await page.getByTitle(/create space/i).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const spaceName = `Space-${Date.now()}`;
    await modal.getByPlaceholder(/name/i).fill(spaceName);
    await modal.getByRole('button', { name: /create/i }).click();

    // modal closes and sidebar shows new space
    await expect(modal).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByTitle(spaceName)).toBeVisible({ timeout: 8_000 });
  });

  test('create a text channel in a space', async ({ page }) => {
    // create space first
    await page.getByTitle(/create space/i).click();
    const modal = page.getByRole('dialog');
    const spaceName = `Space-${Date.now()}`;
    await modal.getByPlaceholder(/name/i).fill(spaceName);
    await modal.getByRole('button', { name: /create/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    // open create-channel modal
    await page.getByRole('button', { name: /\+ text channel/i }).click();
    const chanModal = page.getByRole('dialog');
    const chanName = `channel-${Date.now()}`;
    await chanModal.getByPlaceholder(/name/i).fill(chanName);
    await chanModal.getByRole('button', { name: /create/i }).click();
    await expect(chanModal).not.toBeVisible({ timeout: 8_000 });

    // channel appears in sidebar
    await expect(page.getByText(`# ${chanName}`)).toBeVisible({ timeout: 8_000 });
  });
});
