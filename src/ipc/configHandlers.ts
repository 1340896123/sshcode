/**
 * Configuration-related IPC handlers for the main process
 * These handlers manage application configuration using Electron Store
 */

import { ipcMain } from 'electron';
import { configStore } from '../services/configStore';
import type { AppConfig } from '../types';

/**
 * Register all configuration-related IPC handlers
 */
export function registerConfigHandlers(): void {
  /**
   * Get the entire configuration
   */
  ipcMain.handle('config:getAll', async () => {
    try {
      const config = configStore.getConfig();
      return { success: true, config };
    } catch (error) {
      console.error('Failed to get configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration'
      };
    }
  });

  /**
   * Get a specific configuration value by path
   */
  ipcMain.handle('config:get', async (event, path: string) => {
    try {
      const value = configStore.get(path);
      return { success: true, value };
    } catch (error) {
      console.error('Failed to get configuration value:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration value'
      };
    }
  });

  /**
   * Set a specific configuration value by path
   */
  ipcMain.handle('config:set', async (event, path: string, value: any) => {
    try {
      configStore.set(path, value);
      console.log(`Configuration updated: ${path}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to set configuration value:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set configuration value'
      };
    }
  });

  /**
   * Update multiple configuration values
   */
  ipcMain.handle('config:update', async (event, updates: Partial<AppConfig>) => {
    try {
      configStore.updateConfig(updates);
      console.log('Configuration updated with:', Object.keys(updates));
      return { success: true };
    } catch (error) {
      console.error('Failed to update configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration'
      };
    }
  });

  /**
   * Reset configuration to defaults
   */
  ipcMain.handle('config:reset', async () => {
    try {
      configStore.resetToDefaults();
      console.log('Configuration reset to defaults');
      return { success: true };
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset configuration'
      };
    }
  });

  /**
   * Reset a specific section to defaults
   */
  ipcMain.handle('config:resetSection', async (event, section: keyof AppConfig) => {
    try {
      configStore.resetSection(section);
      console.log(`Configuration section '${section}' reset to defaults`);
      return { success: true };
    } catch (error) {
      console.error('Failed to reset configuration section:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset configuration section'
      };
    }
  });

  /**
   * Check if a configuration path exists
   */
  ipcMain.handle('config:has', async (event, path: string) => {
    try {
      const exists = configStore.has(path);
      return { success: true, exists };
    } catch (error) {
      console.error('Failed to check configuration path:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check configuration path'
      };
    }
  });

  /**
   * Delete a configuration path
   */
  ipcMain.handle('config:delete', async (event, path: string) => {
    try {
      configStore.delete(path);
      console.log(`Configuration path deleted: ${path}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete configuration path:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete configuration path'
      };
    }
  });

  /**
   * Get AI configuration
   */
  ipcMain.handle('config:getAI', async () => {
    try {
      const aiConfig = configStore.getAIConfig();
      return { success: true, config: aiConfig };
    } catch (error) {
      console.error('Failed to get AI configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI configuration'
      };
    }
  });

  /**
   * Update AI configuration
   */
  ipcMain.handle('config:updateAI', async (event, config: Partial<AppConfig['ai']>) => {
    try {
      configStore.updateAIConfig(config);
      console.log('AI configuration updated');
      return { success: true };
    } catch (error) {
      console.error('Failed to update AI configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update AI configuration'
      };
    }
  });

  /**
   * Get general configuration
   */
  ipcMain.handle('config:getGeneral', async () => {
    try {
      const generalConfig = configStore.getGeneralConfig();
      return { success: true, config: generalConfig };
    } catch (error) {
      console.error('Failed to get general configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get general configuration'
      };
    }
  });

  /**
   * Update general configuration
   */
  ipcMain.handle('config:updateGeneral', async (event, config: Partial<AppConfig['general']>) => {
    try {
      configStore.updateGeneralConfig(config);
      console.log('General configuration updated');
      return { success: true };
    } catch (error) {
      console.error('Failed to update general configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update general configuration'
      };
    }
  });

  /**
   * Get terminal configuration
   */
  ipcMain.handle('config:getTerminal', async () => {
    try {
      const terminalConfig = configStore.getTerminalConfig();
      return { success: true, config: terminalConfig };
    } catch (error) {
      console.error('Failed to get terminal configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get terminal configuration'
      };
    }
  });

  /**
   * Update terminal configuration
   */
  ipcMain.handle('config:updateTerminal', async (event, config: Partial<AppConfig['terminal']>) => {
    try {
      configStore.updateTerminalConfig(config);
      console.log('Terminal configuration updated');
      return { success: true };
    } catch (error) {
      console.error('Failed to update terminal configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update terminal configuration'
      };
    }
  });

  /**
   * Get security configuration
   */
  ipcMain.handle('config:getSecurity', async () => {
    try {
      const securityConfig = configStore.getSecurityConfig();
      return { success: true, config: securityConfig };
    } catch (error) {
      console.error('Failed to get security configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get security configuration'
      };
    }
  });

  /**
   * Update security configuration
   */
  ipcMain.handle('config:updateSecurity', async (event, config: Partial<AppConfig['security']>) => {
    try {
      configStore.updateSecurityConfig(config);
      console.log('Security configuration updated');
      return { success: true };
    } catch (error) {
      console.error('Failed to update security configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update security configuration'
      };
    }
  });

  /**
   * Export configuration to file
   */
  ipcMain.handle('config:export', async (event, filePath: string) => {
    try {
      configStore.exportConfig(filePath);
      console.log(`Configuration exported to: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      console.error('Failed to export configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export configuration'
      };
    }
  });

  /**
   * Import configuration from file
   */
  ipcMain.handle('config:import', async (event, filePath: string) => {
    try {
      configStore.importConfig(filePath);
      console.log(`Configuration imported from: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import configuration'
      };
    }
  });

  /**
   * Backup current configuration
   */
  ipcMain.handle('config:backup', async () => {
    try {
      const backupPath = configStore.backupConfig();
      return { success: true, backupPath };
    } catch (error) {
      console.error('Failed to backup configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to backup configuration'
      };
    }
  });

  /**
   * Get store information
   */
  ipcMain.handle('config:getStoreInfo', async () => {
    try {
      const path = configStore.getStorePath();
      const size = configStore.getStoreSize();
      return { success: true, info: { path, size } };
    } catch (error) {
      console.error('Failed to get store info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get store info'
      };
    }
  });

  /**
   * Set user preference
   */
  ipcMain.handle('config:setUserPreference', async (event, key: string, value: any) => {
    try {
      configStore.setUserPreference(key, value);
      return { success: true };
    } catch (error) {
      console.error('Failed to set user preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set user preference'
      };
    }
  });

  /**
   * Get user preference
   */
  ipcMain.handle('config:getUserPreference', async (event, key: string, defaultValue?: any) => {
    try {
      const value = configStore.getUserPreference(key, defaultValue);
      return { success: true, value };
    } catch (error) {
      console.error('Failed to get user preference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user preference'
      };
    }
  });

  /**
   * Clear all user preferences
   */
  ipcMain.handle('config:clearUserPreferences', async () => {
    try {
      configStore.clearUserPreferences();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear user preferences'
      };
    }
  });

  console.log('Configuration IPC handlers registered');
}