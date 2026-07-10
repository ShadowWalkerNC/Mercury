import { test, expect } from '@playwright/test';
import { register } from './helpers';

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await register(page);
    // create a space + channel to message in
    await page.getByTitle(/create space/i).click();
    const modal = page.getByRole('dialog');
    await modal.getByPlaceholder(/name/i).fill(`MsgSpace-${Date.now()}`);
    await modal.getByRole('button', { name: /create/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 8_000 });
    // click into the auto-created general channel if present, else create one
    const general = page.getByText(/# general/i);
    if (await general.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await general.click();
    } else {
      await page.getByRole('button', { name: /\+ text channel/i }).click();
      const cm = page.getByRole('dialog');
      await cm.getByPlaceholder(/name/i).fill('general');
      await cm.getByRole('button', { name: /create/i }).click();
      await expect(cm).not.toBeVisible({ timeout: 8_000 });
      await page.getByText('# general').click();
    }
  });

  test('send a message and see it appear', async ({ page }) => {
    const msg = `Hello e2e ${Date.now()}`;
    const composer = page.getByPlaceholder(/message/i);
    await composer.fill(msg);
    await composer.press('Enter');
    await expect(page.getByText(msg)).toBeVisible({ timeout: 8_000 });
  });

  test('edit a message', async ({ page }) => {
    const original = `Edit-me-${Date.now()}`;
    const edited   = `Edited-${Date.now()}`;
    const composer = page.getByPlaceholder(/message/i);
    await composer.fill(original);
    await composer.press('Enter');
    await expect(page.getByText(original)).toBeVisible({ timeout: 8_000 });

    // hover to reveal toolbar, click edit
    await page.getByText(original).hover();
    await page.getByTitle(/edit/i).click();
    const editArea = page.getByRole('textbox').last();
    await editArea.fill(edited);
    await editArea.press('Enter');
    await expect(page.getByText(edited)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('(edited)')).toBeVisible();
  });

  test('delete a message', async ({ page }) => {
    const msg = `Delete-me-${Date.now()}`;
    const composer = page.getByPlaceholder(/message/i);
    await composer.fill(msg);
    await composer.press('Enter');
    await expect(page.getByText(msg)).toBeVisible({ timeout: 8_000 });

    await page.getByText(msg).hover();
    await page.getByTitle(/delete/i).click();
    await expect(page.getByText(msg)).not.toBeVisible({ timeout: 8_000 });
  });
});
