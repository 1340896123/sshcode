"use strict";
/**
 * Configuration-related IPC handlers for the main process
 * These handlers manage application configuration using Electron Store
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigHandlers = registerConfigHandlers;
const electron_1 = require("electron");
const configStore_1 = require("../services/configStore");
/**
 * Register all configuration-related IPC handlers
 */
function registerConfigHandlers() {
    /**
     * Get the entire configuration
     */
    electron_1.ipcMain.handle('config:getAll', async () => {
        try {
            const config = configStore_1.configStore.getConfig();
            return { success: true, config };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:get', async (event, path) => {
        try {
            const value = configStore_1.configStore.get(path);
            return { success: true, value };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:set', async (event, path, value) => {
        try {
            configStore_1.configStore.set(path, value);
            console.log(`Configuration updated: ${path}`);
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:update', async (event, updates) => {
        try {
            configStore_1.configStore.updateConfig(updates);
            console.log('Configuration updated with:', Object.keys(updates));
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:reset', async () => {
        try {
            configStore_1.configStore.resetToDefaults();
            console.log('Configuration reset to defaults');
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:resetSection', async (event, section) => {
        try {
            configStore_1.configStore.resetSection(section);
            console.log(`Configuration section '${section}' reset to defaults`);
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:has', async (event, path) => {
        try {
            const exists = configStore_1.configStore.has(path);
            return { success: true, exists };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:delete', async (event, path) => {
        try {
            configStore_1.configStore.delete(path);
            console.log(`Configuration path deleted: ${path}`);
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:getAI', async () => {
        try {
            const aiConfig = configStore_1.configStore.getAIConfig();
            return { success: true, config: aiConfig };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:updateAI', async (event, config) => {
        try {
            configStore_1.configStore.updateAIConfig(config);
            console.log('AI configuration updated');
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:getGeneral', async () => {
        try {
            const generalConfig = configStore_1.configStore.getGeneralConfig();
            return { success: true, config: generalConfig };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:updateGeneral', async (event, config) => {
        try {
            configStore_1.configStore.updateGeneralConfig(config);
            console.log('General configuration updated');
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:getTerminal', async () => {
        try {
            const terminalConfig = configStore_1.configStore.getTerminalConfig();
            return { success: true, config: terminalConfig };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:updateTerminal', async (event, config) => {
        try {
            configStore_1.configStore.updateTerminalConfig(config);
            console.log('Terminal configuration updated');
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:getSecurity', async () => {
        try {
            const securityConfig = configStore_1.configStore.getSecurityConfig();
            return { success: true, config: securityConfig };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:updateSecurity', async (event, config) => {
        try {
            configStore_1.configStore.updateSecurityConfig(config);
            console.log('Security configuration updated');
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:export', async (event, filePath) => {
        try {
            configStore_1.configStore.exportConfig(filePath);
            console.log(`Configuration exported to: ${filePath}`);
            return { success: true, filePath };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:import', async (event, filePath) => {
        try {
            configStore_1.configStore.importConfig(filePath);
            console.log(`Configuration imported from: ${filePath}`);
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:backup', async () => {
        try {
            const backupPath = configStore_1.configStore.backupConfig();
            return { success: true, backupPath };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:getStoreInfo', async () => {
        try {
            const path = configStore_1.configStore.getStorePath();
            const size = configStore_1.configStore.getStoreSize();
            return { success: true, info: { path, size } };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:setUserPreference', async (event, key, value) => {
        try {
            configStore_1.configStore.setUserPreference(key, value);
            return { success: true };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:getUserPreference', async (event, key, defaultValue) => {
        try {
            const value = configStore_1.configStore.getUserPreference(key, defaultValue);
            return { success: true, value };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('config:clearUserPreferences', async () => {
        try {
            configStore_1.configStore.clearUserPreferences();
            return { success: true };
        }
        catch (error) {
            console.error('Failed to clear user preferences:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear user preferences'
            };
        }
    });
    console.log('Configuration IPC handlers registered');
}
