import { test as base } from '@playwright/test';

// Extend test fixtures for Electron
export const test = base.extend({
  // Electron-specific fixtures can be added here
  electronApp: async ({}, use) => {
    // This can be used to set up common Electron app state
    await use({});
  },
});

export { expect } from '@playwright/test';