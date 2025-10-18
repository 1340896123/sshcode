"use strict";
/**
 * IPC handlers module
 * Centralizes all IPC handler registration for the main process
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigHandlers = exports.registerConnectionHandlers = exports.registerTabHandlers = exports.IPC_CHANNELS = void 0;
exports.registerIPCHandlers = registerIPCHandlers;
const tabHandlers_1 = require("./tabHandlers");
const connectionHandlers_1 = require("./connectionHandlers");
const configHandlers_1 = require("./configHandlers");
/**
 * Register all IPC handlers for the application
 */
function registerIPCHandlers() {
    // Register tab-related handlers
    (0, tabHandlers_1.registerTabHandlers)();
    // Register connection-related handlers
    (0, connectionHandlers_1.registerConnectionHandlers)();
    // Register configuration-related handlers
    (0, configHandlers_1.registerConfigHandlers)();
    console.log('All IPC handlers registered successfully');
}
/**
 * IPC channel constants for type safety
 */
exports.IPC_CHANNELS = {
    // Tab operations
    TAB_CREATE: 'tab:create',
    TAB_GET_ALL: 'tab:getAll',
    TAB_GET_BY_ID: 'tab:getById',
    TAB_GET_BY_CONNECTION_ID: 'tab:getByConnectionId',
    TAB_GET_ACTIVE: 'tab:getActive',
    TAB_UPDATE: 'tab:update',
    TAB_SET_ACTIVE: 'tab:setActive',
    TAB_DELETE: 'tab:delete',
    TAB_CLOSE: 'tab:close',
    TAB_UPDATE_POSITIONS: 'tab:updatePositions',
    TAB_UPDATE_LAST_ACCESSED: 'tab:updateLastAccessed',
    TAB_GET_STATS: 'tab:getStats',
    TAB_RENAME: 'tab:rename',
    TAB_TOGGLE_VISIBILITY: 'tab:toggleVisibility',
    // Connection operations
    CONNECTION_CREATE: 'connection:create',
    CONNECTION_GET_ALL: 'connection:getAll',
    CONNECTION_GET_BY_ID: 'connection:getById',
    CONNECTION_GET_BY_STATUS: 'connection:getByStatus',
    CONNECTION_GET_ACTIVE: 'connection:getActive',
    CONNECTION_UPDATE: 'connection:update',
    CONNECTION_UPDATE_STATUS: 'connection:updateStatus',
    CONNECTION_UPDATE_BYTES_TRANSFERRED: 'connection:updateBytesTransferred',
    CONNECTION_INCREMENT_ERROR_COUNT: 'connection:incrementErrorCount',
    CONNECTION_UPDATE_HEALTH_STATUS: 'connection:updateHealthStatus',
    CONNECTION_UPDATE_PERFORMANCE_METRICS: 'connection:updatePerformanceMetrics',
    CONNECTION_RESET_RECONNECT_ATTEMPTS: 'connection:resetReconnectAttempts',
    CONNECTION_INCREMENT_RECONNECT_ATTEMPTS: 'connection:incrementReconnectAttempts',
    CONNECTION_DELETE: 'connection:delete',
    CONNECTION_GET_STATS: 'connection:getStats',
    CONNECTION_GET_NEEDING_HEALTH_CHECK: 'connection:getNeedingHealthCheck',
    CONNECTION_SEARCH: 'connection:search',
    CONNECTION_TEST: 'connection:test',
    // Configuration operations
    CONFIG_GET_ALL: 'config:getAll',
    CONFIG_GET: 'config:get',
    CONFIG_SET: 'config:set',
    CONFIG_UPDATE: 'config:update',
    CONFIG_RESET: 'config:reset',
    CONFIG_RESET_SECTION: 'config:resetSection',
    CONFIG_HAS: 'config:has',
    CONFIG_DELETE: 'config:delete',
    CONFIG_GET_AI: 'config:getAI',
    CONFIG_UPDATE_AI: 'config:updateAI',
    CONFIG_GET_GENERAL: 'config:getGeneral',
    CONFIG_UPDATE_GENERAL: 'config:updateGeneral',
    CONFIG_GET_TERMINAL: 'config:getTerminal',
    CONFIG_UPDATE_TERMINAL: 'config:updateTerminal',
    CONFIG_GET_SECURITY: 'config:getSecurity',
    CONFIG_UPDATE_SECURITY: 'config:updateSecurity',
    CONFIG_EXPORT: 'config:export',
    CONFIG_IMPORT: 'config:import',
    CONFIG_BACKUP: 'config:backup',
    CONFIG_GET_STORE_INFO: 'config:getStoreInfo',
    CONFIG_SET_USER_PREFERENCE: 'config:setUserPreference',
    CONFIG_GET_USER_PREFERENCE: 'config:getUserPreference',
    CONFIG_CLEAR_USER_PREFERENCES: 'config:clearUserPreferences'
};
// Re-export individual handler modules for direct access if needed
var tabHandlers_2 = require("./tabHandlers");
Object.defineProperty(exports, "registerTabHandlers", { enumerable: true, get: function () { return tabHandlers_2.registerTabHandlers; } });
var connectionHandlers_2 = require("./connectionHandlers");
Object.defineProperty(exports, "registerConnectionHandlers", { enumerable: true, get: function () { return connectionHandlers_2.registerConnectionHandlers; } });
var configHandlers_2 = require("./configHandlers");
Object.defineProperty(exports, "registerConfigHandlers", { enumerable: true, get: function () { return configHandlers_2.registerConfigHandlers; } });
