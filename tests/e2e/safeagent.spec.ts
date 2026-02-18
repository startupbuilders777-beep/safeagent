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
    await expect(page).toHaveTitle(/SafeAgent/i);
    expect(consoleErrors).toHaveLength(0);
  });

  test('homepage has expected content', async ({ page }) => {
    await page.goto('/');
    // Check for key elements
    await expect(page.getByRole('heading', { name: /safeagent/i })).toBeVisible();
    expect(consoleErrors).toHaveLength(0);
  });

  test('can navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('dashboard loads without errors', async ({ page }) => {
    await page.goto('/dashboard');
    // Dashboard may redirect to login if not authenticated
    // Just check it loads without console errors
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Authentication Flow', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/.*register/);
  });
});

test.describe('API Endpoints', () => {
  test('health check endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
