/**
 * Electron Store service for configuration persistence
 * Provides a unified interface for storing and retrieving application configuration
 */

import Store from 'electron-store';
import type { AppConfig } from '../types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AppConfig = {
  ai: {
    provider: 'custom',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    apiKey: '',
    model: '',
    customModel: 'glm-4.6',
    maxTokens: 8000,
    temperature: 0.7
  },
  general: {
    language: 'zh-CN',
    theme: 'dark',
    autoSave: true,
    autoSaveSessions: true,
    checkUpdates: true
  },
  terminal: {
    font: 'Consolas',
    fontSize: 14,
    fontFamily: 'Consolas',
    copyOnSelect: false,
    bell: false,
    cursorBlink: true
  },
  security: {
    passwordEncryption: false,
    encryptPasswords: false,
    sessionTimeout: 30,
    confirmDangerousCommands: true
  }
};

/**
 * Configuration store service
 */
class ConfigStoreService {
  private store: Store<AppConfig>;
  private static instance: ConfigStoreService;

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'sshcode-config',
      defaults: DEFAULT_CONFIG,
      clearInvalidConfig: true,
      serialize: (value) => JSON.stringify(value, null, 2),
      deserialize: (value) => JSON.parse(value)
    });

    console.log('ConfigStore initialized with path:', this.store.path);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigStoreService {
    if (!ConfigStoreService.instance) {
      ConfigStoreService.instance = new ConfigStoreService();
    }
    return ConfigStoreService.instance;
  }

  /**
   * Get the entire configuration
   */
  public getConfig(): AppConfig {
    try {
      const config = this.store.store;
      console.log('Retrieved configuration from store');
      return config;
    } catch (error) {
      console.error('Failed to get configuration:', error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Get a specific configuration value by path
   */
  public get<T = any>(path: string): T | undefined {
    try {
      const value = this.store.get(path);
      return value as T;
    } catch (error) {
      console.error(`Failed to get configuration value at path '${path}':`, error);
      return undefined;
    }
  }

  /**
   * Set a specific configuration value by path
   */
  public set(path: string, value: any): void {
    try {
      this.store.set(path, value);
      console.log(`Set configuration value at path '${path}'`);
    } catch (error) {
      console.error(`Failed to set configuration value at path '${path}':`, error);
      throw error;
    }
  }

  /**
   * Update multiple configuration values
   */
  public updateConfig(updates: Partial<AppConfig>): void {
    try {
      const currentConfig = this.getConfig();
      const updatedConfig = { ...currentConfig, ...updates };
      this.store.set(updatedConfig);
      console.log('Updated configuration with:', Object.keys(updates));
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  public resetToDefaults(): void {
    try {
      this.store.clear();
      console.log('Reset configuration to defaults');
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      throw error;
    }
  }

  /**
   * Reset a specific section to defaults
   */
  public resetSection(section: keyof AppConfig): void {
    try {
      const sectionDefaults = DEFAULT_CONFIG[section];
      this.set(section, sectionDefaults);
      console.log(`Reset configuration section '${section}' to defaults`);
    } catch (error) {
      console.error(`Failed to reset configuration section '${section}':`, error);
      throw error;
    }
  }

  /**
   * Check if a configuration path exists
   */
  public has(path: string): boolean {
    try {
      return this.store.has(path);
    } catch (error) {
      console.error(`Failed to check configuration path '${path}':`, error);
      return false;
    }
  }

  /**
   * Delete a configuration path
   */
  public delete(path: string): void {
    try {
      this.store.delete(path as keyof AppConfig);
      console.log(`Deleted configuration path '${path}'`);
    } catch (error) {
      console.error(`Failed to delete configuration path '${path}':`, error);
      throw error;
    }
  }

  /**
   * Get AI configuration
   */
  public getAIConfig(): AppConfig['ai'] {
    return this.get('ai') || DEFAULT_CONFIG.ai;
  }

  /**
   * Update AI configuration
   */
  public updateAIConfig(config: Partial<AppConfig['ai']>): void {
    const currentAIConfig = this.getAIConfig();
    this.set('ai', { ...currentAIConfig, ...config });
  }

  /**
   * Get general configuration
   */
  public getGeneralConfig(): AppConfig['general'] {
    return this.get('general') || DEFAULT_CONFIG.general;
  }

  /**
   * Update general configuration
   */
  public updateGeneralConfig(config: Partial<AppConfig['general']>): void {
    const currentGeneralConfig = this.getGeneralConfig();
    this.set('general', { ...currentGeneralConfig, ...config });
  }

  /**
   * Get terminal configuration
   */
  public getTerminalConfig(): AppConfig['terminal'] {
    return this.get('terminal') || DEFAULT_CONFIG.terminal;
  }

  /**
   * Update terminal configuration
   */
  public updateTerminalConfig(config: Partial<AppConfig['terminal']>): void {
    const currentTerminalConfig = this.getTerminalConfig();
    this.set('terminal', { ...currentTerminalConfig, ...config });
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig(): AppConfig['security'] {
    return this.get('security') || DEFAULT_CONFIG.security;
  }

  /**
   * Update security configuration
   */
  public updateSecurityConfig(config: Partial<AppConfig['security']>): void {
    const currentSecurityConfig = this.getSecurityConfig();
    this.set('security', { ...currentSecurityConfig, ...config });
  }

  /**
   * Export configuration to file
   */
  public exportConfig(filePath: string): void {
    try {
      const config = this.getConfig();
      const fs = require('fs');
      const path = require('path');

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      console.log(`Exported configuration to: ${filePath}`);
    } catch (error) {
      console.error('Failed to export configuration:', error);
      throw error;
    }
  }

  /**
   * Import configuration from file
   */
  public importConfig(filePath: string): void {
    try {
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(filePath)) {
        throw new Error(`Configuration file does not exist: ${filePath}`);
      }

      const configData = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(configData);

      // Validate configuration structure
      if (!this.validateConfig(config)) {
        throw new Error('Invalid configuration format');
      }

      this.store.set(config);
      console.log(`Imported configuration from: ${filePath}`);
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw error;
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: any): boolean {
    try {
      // Basic structure validation
      if (typeof config !== 'object' || config === null) {
        return false;
      }

      // Check required sections
      const requiredSections = ['ai', 'general', 'terminal', 'security'];
      for (const section of requiredSections) {
        if (!config[section] || typeof config[section] !== 'object') {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get store file path
   */
  public getStorePath(): string {
    return this.store.path;
  }

  /**
   * Get store size in bytes
   */
  public getStoreSize(): number {
    try {
      const fs = require('fs');
      return fs.statSync(this.store.path).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Backup current configuration
   */
  public backupConfig(): string {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(os.tmpdir(), 'sshcode-backups');
      const backupPath = path.join(backupDir, `config-backup-${timestamp}.json`);

      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      this.exportConfig(backupPath);
      console.log(`Created configuration backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to backup configuration:', error);
      throw error;
    }
  }

  /**
   * Store user preferences (separate from main config)
   */
  public setUserPreference(key: string, value: any): void {
    this.set(`userPrefs.${key}`, value);
  }

  /**
   * Get user preference
   */
  public getUserPreference<T = any>(key: string, defaultValue?: T): T | undefined {
    return this.get(`userPrefs.${key}`) || defaultValue;
  }

  /**
   * Clear all user preferences
   */
  public clearUserPreferences(): void {
    this.delete('userPrefs');
  }
}

// Export singleton instance
export const configStore = ConfigStoreService.getInstance();

// Export class for testing
export { ConfigStoreService };

// Export type for external use
export type ConfigStore = ConfigStoreService;