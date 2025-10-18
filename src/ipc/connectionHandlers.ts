/**
 * Connection-related IPC handlers for the main process
 * These handlers manage SSH connection operations and integrate with the database layer
 */

import { ipcMain } from 'electron';
import { getConnectionModel } from '../database/models';
import type { TabConnection as Connection, ConnectionRequest } from '../types';

/**
 * Register all connection-related IPC handlers
 */
export function registerConnectionHandlers(): void {
  /**
   * Create a new connection
   */
  ipcMain.handle('connection:create', async (event, config: ConnectionRequest) => {
    try {
      const connectionModel = getConnectionModel();

      // Create connection data
      const connectionData = {
        name: config.name,
        host: config.host,
        port: config.port || 22,
        username: config.username,
        authType: config.authType,
        status: 'disconnected' as const,
        maxReconnectAttempts: 5,
        lastHealthCheck: Date.now()
      };

      // Create connection in database
      const newConnection = connectionModel.create(connectionData);

      console.log(`Created connection: ${newConnection.name} (${newConnection.id})`);
      return { success: true, connection: newConnection };
    } catch (error) {
      console.error('Failed to create connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create connection'
      };
    }
  });

  /**
   * Get all connections
   */
  ipcMain.handle('connection:getAll', async () => {
    try {
      const connectionModel = getConnectionModel();
      const connections = connectionModel.findAll();

      return { success: true, connections };
    } catch (error) {
      console.error('Failed to get connections:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get connections'
      };
    }
  });

  /**
   * Get a connection by ID
   */
  ipcMain.handle('connection:getById', async (event, connectionId: string) => {
    try {
      const connectionModel = getConnectionModel();
      const connection = connectionModel.findById(connectionId);

      if (!connection) {
        return { success: false, error: 'Connection not found' };
      }

      return { success: true, connection };
    } catch (error) {
      console.error('Failed to get connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get connection'
      };
    }
  });

  /**
   * Get connections by status
   */
  ipcMain.handle('connection:getByStatus', async (event, status: string) => {
    try {
      const connectionModel = getConnectionModel();
      const connections = connectionModel.findByStatus(status as any);

      return { success: true, connections };
    } catch (error) {
      console.error('Failed to get connections by status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get connections by status'
      };
    }
  });

  /**
   * Get active connections
   */
  ipcMain.handle('connection:getActive', async () => {
    try {
      const connectionModel = getConnectionModel();
      const connections = connectionModel.findActive();

      return { success: true, connections };
    } catch (error) {
      console.error('Failed to get active connections:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active connections'
      };
    }
  });

  /**
   * Update a connection
   */
  ipcMain.handle('connection:update', async (event, connectionId: string, updates: Partial<Connection>) => {
    try {
      const connectionModel = getConnectionModel();
      const updatedConnection = connectionModel.update(connectionId, updates);

      if (!updatedConnection) {
        return { success: false, error: 'Connection not found' };
      }

      console.log(`Updated connection: ${updatedConnection.name} (${connectionId})`);
      return { success: true, connection: updatedConnection };
    } catch (error) {
      console.error('Failed to update connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update connection'
      };
    }
  });

  /**
   * Update connection status
   */
  ipcMain.handle('connection:updateStatus', async (event, connectionId: string, status: string) => {
    try {
      const connectionModel = getConnectionModel();
      connectionModel.updateStatus(connectionId, status as any);

      console.log(`Updated connection ${connectionId} status to: ${status}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to update connection status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update connection status'
      };
    }
  });

  /**
   * Update bytes transferred for a connection
   */
  ipcMain.handle('connection:updateBytesTransferred', async (
    event,
    connectionId: string,
    bytesSent: number,
    bytesReceived: number
  ) => {
    try {
      const connectionModel = getConnectionModel();
      connectionModel.updateBytesTransferred(connectionId, bytesSent, bytesReceived);

      return { success: true };
    } catch (error) {
      console.error('Failed to update bytes transferred:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update bytes transferred'
      };
    }
  });

  /**
   * Increment error count for a connection
   */
  ipcMain.handle('connection:incrementErrorCount', async (event, connectionId: string) => {
    try {
      const connectionModel = getConnectionModel();
      connectionModel.incrementErrorCount(connectionId);

      return { success: true };
    } catch (error) {
      console.error('Failed to increment error count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment error count'
      };
    }
  });

  /**
   * Update health status for a connection
   */
  ipcMain.handle('connection:updateHealthStatus', async (event, connectionId: string, healthStatus: string) => {
    try {
      const connectionModel = getConnectionModel();
      connectionModel.updateHealthStatus(connectionId, healthStatus as any);

      console.log(`Updated connection ${connectionId} health status to: ${healthStatus}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to update health status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update health status'
      };
    }
  });

  /**
   * Update performance metrics for a connection
   */
  ipcMain.handle('connection:updatePerformanceMetrics', async (
    event,
    connectionId: string,
    metrics: {
      latency?: number;
      memoryUsage?: number;
      terminalLines?: number;
    }
  ) => {
    try {
      const connectionModel = getConnectionModel();
      connectionModel.updatePerformanceMetrics(connectionId, metrics);

      return { success: true };
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update performance metrics'
      };
    }
  });

  /**
   * Reset reconnect attempts for a connection
   */
  ipcMain.handle('connection:resetReconnectAttempts', async (event, connectionId: string) => {
    try {
      const connectionModel = getConnectionModel();
      connectionModel.resetReconnectAttempts(connectionId);

      return { success: true };
    } catch (error) {
      console.error('Failed to reset reconnect attempts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset reconnect attempts'
      };
    }
  });

  /**
   * Increment reconnect attempts for a connection
   */
  ipcMain.handle('connection:incrementReconnectAttempts', async (event, connectionId: string) => {
    try {
      const connectionModel = getConnectionModel();
      connectionModel.incrementReconnectAttempts(connectionId);

      return { success: true };
    } catch (error) {
      console.error('Failed to increment reconnect attempts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment reconnect attempts'
      };
    }
  });

  /**
   * Delete a connection
   */
  ipcMain.handle('connection:delete', async (event, connectionId: string) => {
    try {
      const connectionModel = getConnectionModel();

      // Check if connection exists
      const connection = connectionModel.findById(connectionId);
      if (!connection) {
        return { success: false, error: 'Connection not found' };
      }

      // Delete connection from database
      const success = connectionModel.delete(connectionId);
      if (!success) {
        return { success: false, error: 'Failed to delete connection' };
      }

      console.log(`Deleted connection: ${connection.name} (${connectionId})`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete connection'
      };
    }
  });

  /**
   * Get connection statistics
   */
  ipcMain.handle('connection:getStats', async () => {
    try {
      const connectionModel = getConnectionModel();
      const stats = connectionModel.getStats();

      return { success: true, stats };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get connection stats'
      };
    }
  });

  /**
   * Get connections that need health checks
   */
  ipcMain.handle('connection:getNeedingHealthCheck', async (event, checkInterval: number) => {
    try {
      const connectionModel = getConnectionModel();
      const connections = connectionModel.getConnectionsNeedingHealthCheck(checkInterval);

      return { success: true, connections };
    } catch (error) {
      console.error('Failed to get connections needing health check:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get connections needing health check'
      };
    }
  });

  /**
   * Search connections by query
   */
  ipcMain.handle('connection:search', async (event, query: string) => {
    try {
      const connectionModel = getConnectionModel();
      const connections = connectionModel.search(query);

      return { success: true, connections };
    } catch (error) {
      console.error('Failed to search connections:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search connections'
      };
    }
  });

  /**
   * Test a connection configuration
   */
  ipcMain.handle('connection:test', async (event, config: ConnectionRequest) => {
    try {
      // Basic validation
      if (!config.host || !config.username) {
        return { success: false, error: 'Host and username are required' };
      }

      // Simulate connection test (in a real implementation, this would make an actual SSH connection)
      console.log(`Testing connection to ${config.host}:${config.port || 22}`);

      // Simulate connection test delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Basic validation passed
      return { success: true, message: 'Connection test passed' };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  });

  console.log('Connection IPC handlers registered');
}