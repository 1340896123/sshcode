import { test, expect } from '@playwright/test';

test.describe('SSH Remote Application - Main Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the Vue app to mount
    await page.waitForSelector('#app', { timeout: 10000 });
  });

  test('application loads correctly', async ({ page }) => {
    // Check if the main app container exists
    await expect(page.locator('#app')).toBeVisible();

    // Check if the header is present
    await expect(page.locator('.header')).toBeVisible();

    // Check if the logo title is present
    await expect(page.locator('.logo-title')).toContainText('SSH Remote');

    // Check if main content area is present
    await expect(page.locator('.tab-manager')).toBeVisible();
  });

  test('header components are visible and functional', async ({ page }) => {
    // Check logo icon
    await expect(page.locator('.logo-icon')).toBeVisible();
    await expect(page.locator('.logo-icon')).toContainText('S');

    // Check session management button
    const sessionBtn = page.locator('.session-btn');
    await expect(sessionBtn).toBeVisible();
    await expect(sessionBtn).toContainText('会话管理');
    await expect(sessionBtn).toContainText('🔗');

    // Check connection status indicator
    const connectionStatus = page.locator('.connection-status');
    await expect(connectionStatus).toBeVisible();
    await expect(connectionStatus).toContainText('未连接');

    // Check settings button
    const settingsBtn = page.locator('.settings-btn');
    await expect(settingsBtn).toBeVisible();
    await expect(settingsBtn).toContainText('⚙️');
  });

  test('session modal opens and closes correctly', async ({ page }) => {
    // Click session management button
    await page.click('.session-btn');

    // Check if modal appears
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-content')).toBeVisible();
    await expect(page.locator('.modal-header h2')).toContainText('会话管理');

    // Check modal content
    await expect(page.locator('.empty-sessions')).toBeVisible();
    await expect(page.locator('.empty-icon')).toContainText('🔗');

    // Check close button
    await expect(page.locator('.close-btn')).toBeVisible();

    // Close modal by clicking close button
    await page.click('.close-btn');

    // Check if modal is hidden
    await expect(page.locator('.modal-overlay')).toBeHidden();
  });

  test('settings modal opens and closes correctly', async ({ page }) => {
    // Click settings button
    await page.click('.settings-btn');

    // Check if modal appears
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-content')).toBeVisible();
    await expect(page.locator('.modal-header h2')).toContainText('设置');

    // Check settings sections
    await expect(page.locator('.settings-section h3')).toContainText('AI 配置');

    // Check form elements
    await expect(page.locator('.setting-select')).toBeVisible();
    await expect(page.locator('.setting-input')).toBeVisible();

    // Close modal by clicking close button
    await page.click('.close-btn');

    // Check if modal is hidden
    await expect(page.locator('.modal-overlay')).toBeHidden();
  });

  test('keyboard shortcuts work correctly', async ({ page }) => {
    // Test Ctrl/Cmd + K for session modal
    if (process.platform === 'darwin') {
      await page.keyboard.press('Meta+k');
    } else {
      await page.keyboard.press('Control+k');
    }

    // Check if session modal opens
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Test Escape key to close modal
    await page.keyboard.press('Escape');

    // Check if modal is hidden
    await expect(page.locator('.modal-overlay')).toBeHidden();
  });

  test('empty state displays correctly', async ({ page }) => {
    // Check main content area shows empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-icon')).toContainText('💻');
    await expect(page.locator('h2')).toContainText('欢迎使用 SSH Remote');
    await expect(page.locator('p')).toContainText('点击上方的"会话管理"按钮创建您的第一个SSH连接');
  });

  test('toast notifications work correctly', async ({ page }) => {
    // Open session modal
    await page.click('.session-btn');

    // Click "新建会话" button (should show a toast)
    await page.click('.primary-btn');

    // Check if toast appears
    await expect(page.locator('.toast-container')).toBeVisible();
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('会话创建功能即将推出');

    // Click toast to remove it
    await page.click('.toast');

    // Wait for toast to disappear
    await expect(page.locator('.toast')).toBeHidden();
  });

  test('responsive design works on different viewports', async ({ page }) => {
    // Test desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.tab-manager')).toBeVisible();

    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.tab-manager')).toBeVisible();

    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.tab-manager')).toBeVisible();
  });

  test('application handles network errors gracefully', async ({ page }) => {
    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Navigate and wait for load
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('Cannot access') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError')
    );

    expect(criticalErrors.length).toBe(0);
  });
});