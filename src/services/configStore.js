"use strict";
/**
 * Electron Store service for configuration persistence
 * Provides a unified interface for storing and retrieving application configuration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigStoreService = exports.configStore = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
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
    constructor() {
        Object.defineProperty(this, "store", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.store = new electron_store_1.default({
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
    static getInstance() {
        if (!ConfigStoreService.instance) {
            ConfigStoreService.instance = new ConfigStoreService();
        }
        return ConfigStoreService.instance;
    }
    /**
     * Get the entire configuration
     */
    getConfig() {
        try {
            const config = this.store.store;
            console.log('Retrieved configuration from store');
            return config;
        }
        catch (error) {
            console.error('Failed to get configuration:', error);
            return DEFAULT_CONFIG;
        }
    }
    /**
     * Get a specific configuration value by path
     */
    get(path) {
        try {
            const value = this.store.get(path);
            return value;
        }
        catch (error) {
            console.error(`Failed to get configuration value at path '${path}':`, error);
            return undefined;
        }
    }
    /**
     * Set a specific configuration value by path
     */
    set(path, value) {
        try {
            this.store.set(path, value);
            console.log(`Set configuration value at path '${path}'`);
        }
        catch (error) {
            console.error(`Failed to set configuration value at path '${path}':`, error);
            throw error;
        }
    }
    /**
     * Update multiple configuration values
     */
    updateConfig(updates) {
        try {
            const currentConfig = this.getConfig();
            const updatedConfig = { ...currentConfig, ...updates };
            this.store.set(updatedConfig);
            console.log('Updated configuration with:', Object.keys(updates));
        }
        catch (error) {
            console.error('Failed to update configuration:', error);
            throw error;
        }
    }
    /**
     * Reset configuration to defaults
     */
    resetToDefaults() {
        try {
            this.store.clear();
            console.log('Reset configuration to defaults');
        }
        catch (error) {
            console.error('Failed to reset configuration:', error);
            throw error;
        }
    }
    /**
     * Reset a specific section to defaults
     */
    resetSection(section) {
        try {
            const sectionDefaults = DEFAULT_CONFIG[section];
            this.set(section, sectionDefaults);
            console.log(`Reset configuration section '${section}' to defaults`);
        }
        catch (error) {
            console.error(`Failed to reset configuration section '${section}':`, error);
            throw error;
        }
    }
    /**
     * Check if a configuration path exists
     */
    has(path) {
        try {
            return this.store.has(path);
        }
        catch (error) {
            console.error(`Failed to check configuration path '${path}':`, error);
            return false;
        }
    }
    /**
     * Delete a configuration path
     */
    delete(path) {
        try {
            this.store.delete(path);
            console.log(`Deleted configuration path '${path}'`);
        }
        catch (error) {
            console.error(`Failed to delete configuration path '${path}':`, error);
            throw error;
        }
    }
    /**
     * Get AI configuration
     */
    getAIConfig() {
        return this.get('ai') || DEFAULT_CONFIG.ai;
    }
    /**
     * Update AI configuration
     */
    updateAIConfig(config) {
        const currentAIConfig = this.getAIConfig();
        this.set('ai', { ...currentAIConfig, ...config });
    }
    /**
     * Get general configuration
     */
    getGeneralConfig() {
        return this.get('general') || DEFAULT_CONFIG.general;
    }
    /**
     * Update general configuration
     */
    updateGeneralConfig(config) {
        const currentGeneralConfig = this.getGeneralConfig();
        this.set('general', { ...currentGeneralConfig, ...config });
    }
    /**
     * Get terminal configuration
     */
    getTerminalConfig() {
        return this.get('terminal') || DEFAULT_CONFIG.terminal;
    }
    /**
     * Update terminal configuration
     */
    updateTerminalConfig(config) {
        const currentTerminalConfig = this.getTerminalConfig();
        this.set('terminal', { ...currentTerminalConfig, ...config });
    }
    /**
     * Get security configuration
     */
    getSecurityConfig() {
        return this.get('security') || DEFAULT_CONFIG.security;
    }
    /**
     * Update security configuration
     */
    updateSecurityConfig(config) {
        const currentSecurityConfig = this.getSecurityConfig();
        this.set('security', { ...currentSecurityConfig, ...config });
    }
    /**
     * Export configuration to file
     */
    exportConfig(filePath) {
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
        }
        catch (error) {
            console.error('Failed to export configuration:', error);
            throw error;
        }
    }
    /**
     * Import configuration from file
     */
    importConfig(filePath) {
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
        }
        catch (error) {
            console.error('Failed to import configuration:', error);
            throw error;
        }
    }
    /**
     * Validate configuration structure
     */
    validateConfig(config) {
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
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get store file path
     */
    getStorePath() {
        return this.store.path;
    }
    /**
     * Get store size in bytes
     */
    getStoreSize() {
        try {
            const fs = require('fs');
            return fs.statSync(this.store.path).size;
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * Backup current configuration
     */
    backupConfig() {
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
        }
        catch (error) {
            console.error('Failed to backup configuration:', error);
            throw error;
        }
    }
    /**
     * Store user preferences (separate from main config)
     */
    setUserPreference(key, value) {
        this.set(`userPrefs.${key}`, value);
    }
    /**
     * Get user preference
     */
    getUserPreference(key, defaultValue) {
        return this.get(`userPrefs.${key}`) || defaultValue;
    }
    /**
     * Clear all user preferences
     */
    clearUserPreferences() {
        this.delete('userPrefs');
    }
}
exports.ConfigStoreService = ConfigStoreService;
// Export singleton instance
exports.configStore = ConfigStoreService.getInstance();
