import { test, expect } from '@playwright/test';

test.describe('SSH Remote Application - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });
  });

  test('page has proper heading structure', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('h1')).toBeVisible();

    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);

    // Check if main heading is descriptive
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible();
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    const firstFocusable = await page.evaluate(() => document.activeElement.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(firstFocusable)).toBeTruthy();

    // Test session button keyboard access
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Check if modal opens with keyboard
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-overlay')).toBeHidden();
  });

  test('buttons have proper ARIA attributes', async ({ page }) => {
    const sessionBtn = page.locator('.session-btn');
    const settingsBtn = page.locator('.settings-btn');
    const closeBtn = page.locator('.close-btn');

    // Check if buttons are properly marked as buttons
    await expect(sessionBtn).toHaveAttribute('role', 'button');
    await expect(settingsBtn).toHaveAttribute('role', 'button');
    await expect(closeBtn).toHaveAttribute('role', 'button');

    // Check if close button is accessible after opening modal
    await page.click('.session-btn');
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toHaveAttribute('aria-label', '关闭');
  });

  test('modal accessibility features', async ({ page }) => {
    // Open modal
    await page.click('.session-btn');

    const modal = page.locator('.modal-overlay');
    const modalContent = page.locator('.modal-content');

    // Check for proper ARIA attributes
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modalContent).toHaveAttribute('tabindex', '-1');

    // Check for focus trapping
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'H2'].includes(focusedElement)).toBeTruthy();

    // Test focus trapping within modal
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should still be within modal
    const modalContainsFocus = await page.evaluate(() => {
      const modal = document.querySelector('.modal-content');
      return modal.contains(document.activeElement);
    });
    expect(modalContainsFocus).toBeTruthy();
  });

  test('form accessibility in settings modal', async ({ page }) => {
    // Open settings modal
    await page.click('.settings-btn');

    // Check form labels
    const labels = page.locator('label');
    await expect(labels).toHaveCount(4); // Should have labels for form elements

    // Check if inputs are properly labeled
    const inputs = page.locator('input, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      } else {
        // Check if input has aria-label or is wrapped in label
        const ariaLabel = await input.getAttribute('aria-label');
        const parent = await input.locator('..');
        const isChildOfLabel = await parent.evaluate((el, child) => {
          return el.tagName === 'LABEL' && el.contains(child);
        }, await input.elementHandle());

        expect(ariaLabel !== null || isChildOfLabel).toBeTruthy();
      }
    }
  });

  test('color contrast and visual accessibility', async ({ page }) => {
    // Test that text is readable against background
    const header = page.locator('.header');
    const headerStyle = await header.evaluate((el) => {
      return {
        color: getComputedStyle(el).color,
        backgroundColor: getComputedStyle(el).backgroundColor
      };
    });

    // Ensure text color and background color are different
    expect(headerStyle.color).not.toBe(headerStyle.backgroundColor);

    // Test modal text contrast
    await page.click('.settings-btn');
    const modalContent = page.locator('.modal-content');
    const modalStyle = await modalContent.evaluate((el) => {
      return {
        color: getComputedStyle(el).color,
        backgroundColor: getComputedStyle(el).backgroundColor
      };
    });

    expect(modalStyle.color).not.toBe(modalStyle.backgroundColor);
  });

  test('screen reader support', async ({ page }) => {
    // Check for proper semantic HTML
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible(); // Should be implied by main content area

    // Check for proper ARIA landmarks
    await expect(page.locator('[role="dialog"]')).toBeHidden(); // Initially hidden

    // Open modal and check ARIA attributes
    await page.click('.session-btn');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[aria-modal="true"]')).toBeVisible();
  });

  test('focus management', async ({ page }) => {
    // Test initial focus
    await page.keyboard.press('Tab');
    const firstFocusable = await page.evaluate(() => document.activeElement);
    expect(firstFocusable.tagName).toBe('BUTTON');

    // Test visible focus indicators
    const sessionBtn = page.locator('.session-btn');
    await sessionBtn.focus();
    const focusStyle = await sessionBtn.evaluate((el) => {
      return getComputedStyle(el, ':focus');
    });

    // Should have some kind of focus styling
    expect(focusStyle.outline || focusStyle.boxShadow).toBeTruthy();
  });

  test('toast notification accessibility', async ({ page }) => {
    // Trigger a toast
    await page.click('.session-btn');
    await page.click('.primary-btn');

    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();

    // Check if toast has proper ARIA attributes
    await expect(toast).toHaveAttribute('role', 'alert');

    // Test if toast is keyboard accessible
    await toast.focus();
    const isFocused = await toast.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBeTruthy();

    // Test if toast can be dismissed with keyboard
    await page.keyboard.press('Enter');
    await expect(toast).toBeHidden();
  });

  test('skip links and navigation aids', async ({ page }) => {
    // Check for skip links (should be present for accessibility)
    const skipLinks = page.locator('a[href^="#"]');

    // Even if not present, the app should have logical tab order
    await page.keyboard.press('Tab');
    let lastElement = await page.evaluate(() => document.activeElement);

    // Tab through all focusable elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const currentElement = await page.evaluate(() => document.activeElement);

      // Should progress through different elements
      if (currentElement !== lastElement) {
        lastElement = currentElement;
      }
    }

    // Ensure we can navigate the entire interface with keyboard
    const isNavigable = await page.evaluate(() => {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return focusableElements.length > 0;
    });

    expect(isNavigable).toBeTruthy();
  });

  test('error states and validation accessibility', async ({ page }) => {
    // Test that error messages are accessible
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Navigate and check for errors
    await page.goto('/');
    await page.waitForSelector('#app', { timeout: 10000 });

    // Check for critical JavaScript errors that would affect accessibility
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('Cannot access') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError')
    );

    expect(criticalErrors.length).toBe(0);
  });
});