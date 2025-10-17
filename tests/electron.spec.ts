import { test, _electron as electron } from '@playwright/test';
import { expect } from '@playwright/test';

test.describe('SSH Remote App Electron Tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      executablePath: require('electron'),
      args: ['.'],
      timeout: 30000,
    });

    // Get the first window that's opened
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('app launches successfully', async () => {
    expect(await window.title()).toBe('SSH Remote App');
  });

  test('main window is visible', async () => {
    const isVisible = await window.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should have connection management interface', async () => {
    // Wait for Vue app to load
    await window.waitForSelector('.app-container', { timeout: 10000 });

    // Check for connection button or interface
    const connectionInterface = await window.locator('[data-testid="connection-interface"], .connection-panel, button:has-text("Connect")').first();
    await expect(connectionInterface).toBeVisible({ timeout: 5000 });
  });

  test('should have terminal component', async () => {
    // Check for terminal component
    const terminal = await window.locator('.xterm, .terminal-container, [data-testid="terminal"]').first();
    await expect(terminal).toBeVisible({ timeout: 5000 });
  });

  test('should have file manager component', async () => {
    // Check for file manager component
    const fileManager = await window.locator('.file-manager, .file-explorer, [data-testid="file-manager"]').first();
    await expect(fileManager).toBeVisible({ timeout: 5000 });
  });

  test('should have AI assistant component', async () => {
    // Check for AI assistant component
    const aiAssistant = await window.locator('.ai-assistant, .ai-chat, [data-testid="ai-assistant"]').first();
    await expect(aiAssistant).toBeVisible({ timeout: 5000 });
  });

  test('menu bar interactions', async () => {
    // Test menu interactions if available
    const menuBar = await window.locator('.menu-bar, .app-menu, [data-testid="menu-bar"]').first();
    if (await menuBar.isVisible()) {
      // Test menu clicks
      const fileMenu = await menuBar.locator('button:has-text("File"), [role="menuitem"]:has-text("File")').first();
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        // Check if dropdown appears
        const dropdown = await window.locator('.dropdown, .menu-dropdown, [role="menu"]').first();
        await expect(dropdown).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('window resize handling', async () => {
    // Test window resize
    const initialSize = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    // Resize window
    await window.setSize(1200, 800);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newSize = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    expect(newSize.width).toBe(1200);
    expect(newSize.height).toBe(800);
  });

  test('app should handle errors gracefully', async () => {
    // Check for error handling by triggering console errors
    const consoleErrors: string[] = [];

    window.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Trigger potential error scenario
    await window.evaluate(() => {
      // Simulate a network error scenario
      setTimeout(() => {
        console.error('Test error for error handling verification');
      }, 100);
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify error handling works (should not crash app)
    const isVisible = await window.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should have proper accessibility attributes', async () => {
    // Check for basic accessibility
    const appContainer = await window.locator('.app-container, #app, main').first();
    await expect(appContainer).toBeVisible();

    // Check for ARIA labels where appropriate
    const buttons = await window.locator('button[aria-label], button[title]').all();
    expect(buttons.length).toBeGreaterThan(0);
  });
});