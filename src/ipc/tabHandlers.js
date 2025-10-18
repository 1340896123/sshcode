"use strict";
/**
 * Tab-related IPC handlers for the main process
 * These handlers manage tab operations and integrate with the database layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTabHandlers = registerTabHandlers;
const electron_1 = require("electron");
const models_1 = require("../database/models");
/**
 * Register all tab-related IPC handlers
 */
function registerTabHandlers() {
    /**
     * Create a new tab
     */
    electron_1.ipcMain.handle('tab:create', async (event, request) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            // Determine position for new tab
            const maxPosition = await tabModel.getMaxPosition();
            const position = request?.position ?? maxPosition + 1;
            // Create tab data
            const tabData = {
                name: request?.name || `Terminal ${maxPosition + 1}`,
                connectionId: request?.connection || '',
                isActive: false,
                isVisible: true,
                position,
                lastAccessed: Date.now(),
                windowState: {
                    width: 1200,
                    height: 800,
                    splitSizes: [50, 50]
                }
            };
            // Create tab in database
            const newTab = await tabModel.create(tabData);
            console.log(`Created tab: ${newTab.name} (${newTab.id})`);
            return { success: true, tab: newTab };
        }
        catch (error) {
            console.error('Failed to create tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create tab'
            };
        }
    });
    /**
     * Get all tabs
     */
    electron_1.ipcMain.handle('tab:getAll', async () => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const tabs = await tabModel.findAll();
            return { success: true, tabs };
        }
        catch (error) {
            console.error('Failed to get tabs:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get tabs'
            };
        }
    });
    /**
     * Get a tab by ID
     */
    electron_1.ipcMain.handle('tab:getById', async (event, tabId) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const tab = await tabModel.findById(tabId);
            if (!tab) {
                return { success: false, error: 'Tab not found' };
            }
            return { success: true, tab };
        }
        catch (error) {
            console.error('Failed to get tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get tab'
            };
        }
    });
    /**
     * Get tabs by connection ID
     */
    electron_1.ipcMain.handle('tab:getByConnectionId', async (event, connectionId) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const tabs = await tabModel.findByConnectionId(connectionId);
            return { success: true, tabs };
        }
        catch (error) {
            console.error('Failed to get tabs by connection ID:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get tabs by connection ID'
            };
        }
    });
    /**
     * Get the active tab
     */
    electron_1.ipcMain.handle('tab:getActive', async () => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const tab = await tabModel.findActive();
            if (!tab) {
                return { success: false, error: 'No active tab found' };
            }
            return { success: true, tab };
        }
        catch (error) {
            console.error('Failed to get active tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get active tab'
            };
        }
    });
    /**
     * Update a tab
     */
    electron_1.ipcMain.handle('tab:update', async (event, tabId, updates) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const updatedTab = await tabModel.update(tabId, updates);
            if (!updatedTab) {
                return { success: false, error: 'Tab not found' };
            }
            console.log(`Updated tab: ${updatedTab.name} (${tabId})`);
            return { success: true, tab: updatedTab };
        }
        catch (error) {
            console.error('Failed to update tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update tab'
            };
        }
    });
    /**
     * Set a tab as active (deactivates all other tabs)
     */
    electron_1.ipcMain.handle('tab:setActive', async (event, tabId, isActive) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            await tabModel.setActive(tabId, isActive);
            // Update last accessed time
            await tabModel.updateLastAccessed(tabId);
            console.log(`Set tab ${tabId} active: ${isActive}`);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to set tab active:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to set tab active'
            };
        }
    });
    /**
     * Delete a tab
     */
    electron_1.ipcMain.handle('tab:delete', async (event, tabId) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            // First check if tab exists
            const tab = await tabModel.findById(tabId);
            if (!tab) {
                return { success: false, error: 'Tab not found' };
            }
            // Delete tab from database
            const success = await tabModel.delete(tabId);
            if (!success) {
                return { success: false, error: 'Failed to delete tab' };
            }
            console.log(`Deleted tab: ${tab.name} (${tabId})`);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to delete tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete tab'
            };
        }
    });
    /**
     * Update tab positions after reordering
     */
    electron_1.ipcMain.handle('tab:updatePositions', async (event, updates) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            await tabModel.updatePositions(updates);
            console.log(`Updated positions for ${updates.length} tabs`);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to update tab positions:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update tab positions'
            };
        }
    });
    /**
     * Update the last accessed timestamp for a tab
     */
    electron_1.ipcMain.handle('tab:updateLastAccessed', async (event, tabId) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            await tabModel.updateLastAccessed(tabId);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to update tab last accessed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update tab last accessed'
            };
        }
    });
    /**
     * Get tab statistics
     */
    electron_1.ipcMain.handle('tab:getStats', async () => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const stats = await tabModel.getStats();
            return { success: true, stats };
        }
        catch (error) {
            console.error('Failed to get tab stats:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get tab stats'
            };
        }
    });
    /**
     * Close a tab (with validation)
     */
    electron_1.ipcMain.handle('tab:close', async (event, tabId) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            // Get all tabs to check if this is the last one
            const allTabs = await tabModel.findAll();
            if (allTabs.length <= 1) {
                return { success: false, error: 'Cannot close the last tab' };
            }
            // Check if tab exists
            const tab = await tabModel.findById(tabId);
            if (!tab) {
                return { success: false, error: 'Tab not found' };
            }
            // Delete tab from database
            const success = await tabModel.delete(tabId);
            if (!success) {
                return { success: false, error: 'Failed to close tab' };
            }
            // If we closed the active tab, we need to activate another one
            const remainingTabs = await tabModel.findAll();
            if (remainingTabs.length > 0 && tab.isActive) {
                // Activate the first remaining tab
                const newActiveTab = remainingTabs.sort((a, b) => a.position - b.position)[0];
                tabModel.setActive(newActiveTab.id, true);
            }
            // Reorder remaining tabs
            const updates = [];
            remainingTabs.sort((a, b) => a.position - b.position).forEach((remainingTab, index) => {
                if (remainingTab.position !== index) {
                    updates.push({ id: remainingTab.id, position: index });
                }
            });
            if (updates.length > 0) {
                await tabModel.updatePositions(updates);
            }
            console.log(`Closed tab: ${tab.name} (${tabId})`);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to close tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to close tab'
            };
        }
    });
    /**
     * Rename a tab
     */
    electron_1.ipcMain.handle('tab:rename', async (event, tabId, newName) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const updatedTab = await tabModel.update(tabId, { name: newName });
            if (!updatedTab) {
                return { success: false, error: 'Tab not found' };
            }
            console.log(`Renamed tab to: ${newName} (${tabId})`);
            return { success: true, tab: updatedTab };
        }
        catch (error) {
            console.error('Failed to rename tab:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to rename tab'
            };
        }
    });
    /**
     * Toggle tab visibility
     */
    electron_1.ipcMain.handle('tab:toggleVisibility', async (event, tabId) => {
        try {
            const tabModel = (0, models_1.getTabModel)();
            const tab = await tabModel.findById(tabId);
            if (!tab) {
                return { success: false, error: 'Tab not found' };
            }
            const updatedTab = await tabModel.update(tabId, { isVisible: !tab.isVisible });
            if (!updatedTab) {
                return { success: false, error: 'Failed to toggle tab visibility' };
            }
            console.log(`Toggled tab ${tabId} visibility to: ${updatedTab.isVisible}`);
            return { success: true, tab: updatedTab };
        }
        catch (error) {
            console.error('Failed to toggle tab visibility:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to toggle tab visibility'
            };
        }
    });
    console.log('Tab IPC handlers registered');
}
