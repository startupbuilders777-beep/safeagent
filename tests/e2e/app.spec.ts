import { test, expect } from '@playwright/test';

test.describe('SafeAgent E2E Tests', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('homepage loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/./);
    expect(consoleErrors).toHaveLength(0);
  });

  test('homepage has expected content', async ({ page }) => {
    await page.goto('/');
    // SafeAgent is a security-focused app, check for key elements
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expect(consoleErrors).toHaveLength(0);
  });
});
