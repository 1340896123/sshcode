import { test, expect } from '@playwright/test';

test.describe('SSH Remote Application - UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });
  });

  test('header styling and layout', async ({ page }) => {
    const header = page.locator('.header');

    // Check header positioning
    await expect(header).toHaveCSS('position', 'relative');
    await expect(header).toHaveCSS('z-index', '100');

    // Check header dimensions
    const headerBox = await header.boundingBox();
    expect(headerBox.height).toBeCloseTo(64, 5);

    // Check gradient background
    const headerBg = await header.evaluate((el) => {
      return getComputedStyle(el).background;
    });
    expect(headerBg).toContain('gradient');
  });

  test('logo component styling', async ({ page }) => {
    const logoIcon = page.locator('.logo-icon');
    const logoTitle = page.locator('.logo-title');

    // Check logo icon styling
    await expect(logoIcon).toHaveCSS('display', 'flex');
    await expect(logoIcon).toHaveCSS('align-items', 'center');
    await expect(logoIcon).toHaveCSS('justify-content', 'center');

    // Check logo icon dimensions and shape
    const iconBox = await logoIcon.boundingBox();
    expect(iconBox.width).toBeCloseTo(36, 2);
    expect(iconBox.height).toBeCloseTo(36, 2);

    // Check logo title text styling
    await expect(logoTitle).toHaveCSS('font-size', '20px');
    await expect(logoTitle).toHaveCSS('font-weight', '700');

    // Check text gradient (if applicable)
    const titleStyle = await logoTitle.evaluate((el) => {
      return getComputedStyle(el);
    });
    expect(titleStyle.backgroundClip).toContain('text');
  });

  test('button interactions and hover states', async ({ page }) => {
    const sessionBtn = page.locator('.session-btn');
    const settingsBtn = page.locator('.settings-btn');

    // Test session button hover
    await sessionBtn.hover();
    const sessionHoverStyle = await sessionBtn.evaluate((el) => {
      return getComputedStyle(el);
    });
    expect(sessionHoverStyle.transform).toContain('translateY');

    // Test settings button hover
    await settingsBtn.hover();
    const settingsHoverStyle = await settingsBtn.evaluate((el) => {
      return getComputedStyle(el);
    });
    expect(settingsHoverStyle.transform).toContain('translateY');

    // Test button click states
    await sessionBtn.dispatchEvent('mousedown');
    const sessionMouseDownStyle = await sessionBtn.evaluate((el) => {
      return getComputedStyle(el);
    });
    expect(sessionMouseDownStyle.transform).toContain('scale');
  });

  test('connection status indicator', async ({ page }) => {
    const statusIndicator = page.locator('.connection-status');
    const statusDot = page.locator('.status-dot');
    const statusText = page.locator('.status-text');

    // Check initial state (disconnected)
    await expect(statusIndicator).toHaveClass(/connected/);
    await expect(statusText).toContainText('未连接');

    // Check status dot styling
    const dotBgColor = await statusDot.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(dotBgColor).toBe('rgb(115, 115, 115)'); // gray-600 color
  });

  test('modal animations and transitions', async ({ page }) => {
    // Open session modal
    await page.click('.session-btn');

    const modalOverlay = page.locator('.modal-overlay');
    const modalContent = page.locator('.modal-content');

    // Check modal overlay opacity
    const overlayOpacity = await modalOverlay.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(overlayOpacity).toContain('rgba');

    // Check modal content positioning
    await expect(modalContent).toHaveCSS('position', 'relative');
    await expect(modalContent).toHaveCSS('z-index', '1050');

    // Check modal content styling
    const modalBg = await modalContent.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(modalBg).toBe('rgb(38, 38, 38)'); // surface color

    // Test modal close animation
    await page.click('.close-btn');
    await expect(modalOverlay).toBeHidden();
  });

  test('toast notification animations', async ({ page }) => {
    // Trigger a toast notification
    await page.click('.session-btn');
    await page.click('.primary-btn');

    const toast = page.locator('.toast');
    const toastContainer = page.locator('.toast-container');

    // Check toast container positioning
    await expect(toastContainer).toHaveCSS('position', 'fixed');
    await expect(toastContainer).toHaveCSS('top', '20px');
    await expect(toastContainer).toHaveCSS('right', '20px');
    await expect(toastContainer).toHaveCSS('z-index', '1000');

    // Check toast styling
    await expect(toast).toHaveCSS('display', 'flex');
    await expect(toast).toHaveCSS('align-items', 'center');
    await expect(toast).toHaveCSS('gap', '8px');

    // Check toast icon
    const toastIcon = toast.locator('.toast-icon');
    await expect(toastIcon).toContainText('ℹ️');

    // Check toast close button
    const toastClose = toast.locator('.toast-close');
    await expect(toastClose).toContainText('×');

    // Remove toast
    await toast.click();
    await expect(toast).toBeHidden();
  });

  test('form element styling in settings modal', async ({ page }) => {
    // Open settings modal
    await page.click('.settings-btn');

    const selectElement = page.locator('.setting-select');
    const inputElement = page.locator('.setting-input');

    // Check select element styling
    await expect(selectElement).toHaveCSS('width', '100%');
    await expect(selectElement).toHaveCSS('padding');
    await expect(selectElement).toHaveCSS('border', '1px solid rgb(64, 64, 64)');

    // Check input element styling
    await expect(inputElement).toHaveCSS('width', '100%');
    await expect(inputElement).toHaveCSS('background-color', 'rgb(45, 45, 45)');
    await expect(inputElement).toHaveCSS('color', 'rgb(255, 255, 255)');

    // Test input focus state
    await inputElement.focus();
    const inputFocusStyle = await inputElement.evaluate((el) => {
      return getComputedStyle(el);
    });
    expect(inputFocusStyle.borderColor).toBe('rgb(24, 144, 255)'); // primary color
  });

  test('scrollbar styling', async ({ page }) => {
    // Open settings modal to enable scrolling
    await page.click('.settings-btn');

    const modalBody = page.locator('.modal-body');

    // Check if scrollbar styles are applied
    const scrollbarStyles = await modalBody.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        overflowY: style.overflowY,
        scrollbarWidth: style.scrollbarWidth
      };
    });

    expect(scrollbarStyles.overflowY).toBe('auto');
  });

  test('color scheme and theme consistency', async ({ page }) => {
    const app = page.locator('#app');
    const header = page.locator('.header');
    const modal = page.locator('.modal-content');

    // Check main background colors
    const appBg = await app.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(appBg).toBe('rgb(26, 26, 26)'); // bg-primary

    // Check text colors
    const primaryText = await header.evaluate((el) => {
      return getComputedStyle(el).color;
    });
    expect(primaryText).toBe('rgb(255, 255, 255)'); // text-primary

    // Check modal background
    await page.click('.settings-btn');
    const modalBg = await modal.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(modalBg).toBe('rgb(38, 38, 38)'); // surface color
  });
});