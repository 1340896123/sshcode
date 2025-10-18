import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  TabConnection as Connection,
  ConnectionRequest,
  ConnectionStoreState,
  ConnectionStatus,
  HealthStatus,
  AuthType
} from '@/types';
import { getConnectionModel } from '@/database/models';

/**
 * Connection Store - Manages SSH connection state and operations
 */
export const useConnectionStore = defineStore('connection', () => {
  // State
  const connections = ref<Map<string, Connection>>(new Map());
  const activeConnections = ref<Set<string>>(new Set());
  const maxConnections = 10;
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters (Computed)
  const connectionList = computed(() => Array.from(connections.value.values()));
  const activeConnectionList = computed(() =>
    connectionList.value.filter(conn => activeConnections.value.has(conn.id))
  );
  const connectedConnections = computed(() =>
    connectionList.value.filter(conn => conn.status === 'connected')
  );
  const failedConnections = computed(() =>
    connectionList.value.filter(conn => conn.status === 'failed')
  );
  const canCreateConnection = computed(() => connections.value.size < maxConnections);

  // Actions
  /**
   * Load all connections from database
   */
  async function loadConnections(): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      const connectionModel = getConnectionModel();
      const dbConnections = connectionModel.findAll();

      // Clear current state
      connections.value.clear();
      activeConnections.value.clear();

      // Load connections into state
      for (const connection of dbConnections) {
        connections.value.set(connection.id, connection);
        if (connection.status === 'connected' || connection.status === 'connecting') {
          activeConnections.value.add(connection.id);
        }
      }

      console.log(`Loaded ${connections.value.size} connections from database`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load connections';
      console.error('Failed to load connections:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Create a new connection
   */
  async function createConnection(config: ConnectionRequest): Promise<string> {
    try {
      if (!canCreateConnection.value) {
        throw new Error(`Maximum number of connections (${maxConnections}) reached`);
      }

      isLoading.value = true;
      error.value = null;

      const connectionModel = getConnectionModel();

      // Create connection data
      const connectionData = {
        name: config.name,
        host: config.host,
        port: config.port || 22,
        username: config.username,
        authType: config.authType,
        status: 'disconnected' as ConnectionStatus,
        maxReconnectAttempts: 5,
        lastHealthCheck: Date.now()
      };

      // Create connection in database
      const newConnection = connectionModel.create(connectionData);

      // Add to state
      connections.value.set(newConnection.id, newConnection);

      console.log(`Created connection: ${newConnection.name} (${newConnection.id})`);
      return newConnection.id;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create connection';
      console.error('Failed to create connection:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get connection by ID
   */
  function getConnection(connectionId: string): Connection | undefined {
    return connections.value.get(connectionId);
  }

  /**
   * Update connection status
   */
  async function updateConnectionStatus(connectionId: string, status: ConnectionStatus): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const connectionModel = getConnectionModel();

      // Update in database
      connectionModel.updateStatus(connectionId, status);

      // Update local state
      const updatedConnection = { ...connection, status, updatedAt: Date.now() };
      connections.value.set(connectionId, updatedConnection);

      // Update active connections set
      if (status === 'connected' || status === 'connecting') {
        activeConnections.value.add(connectionId);
      } else {
        activeConnections.value.delete(connectionId);
      }

      console.log(`Updated connection ${connection.name} status to: ${status}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update connection status';
      console.error('Failed to update connection status:', err);
      throw err;
    }
  }

  /**
   * Connect to a server
   */
  async function connect(connectionId: string): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      await updateConnectionStatus(connectionId, 'connecting');

      // Reset reconnect attempts when manually connecting
      const connectionModel = getConnectionModel();
      connectionModel.resetReconnectAttempts(connectionId);

      // Update local state
      connections.value.set(connectionId, {
        ...connection,
        reconnectAttempts: 0,
        updatedAt: Date.now()
      });

      console.log(`Connecting to: ${connection.name}`);
    } catch (err) {
      await updateConnectionStatus(connectionId, 'failed');
      throw err;
    }
  }

  /**
   * Disconnect from a server
   */
  async function disconnect(connectionId: string): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      await updateConnectionStatus(connectionId, 'disconnected');

      console.log(`Disconnected from: ${connection.name}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect';
      console.error('Failed to disconnect:', err);
      throw err;
    }
  }

  /**
   * Close a connection completely
   */
  async function closeConnection(connectionId: string): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const connectionModel = getConnectionModel();

      // Delete from database
      const success = connectionModel.delete(connectionId);
      if (!success) {
        throw new Error(`Failed to delete connection from database: ${connectionId}`);
      }

      // Remove from state
      connections.value.delete(connectionId);
      activeConnections.value.delete(connectionId);

      console.log(`Closed connection: ${connection.name} (${connectionId})`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to close connection';
      console.error('Failed to close connection:', err);
      throw err;
    }
  }

  /**
   * Test a connection configuration
   */
  async function testConnection(config: ConnectionRequest): Promise<boolean> {
    try {
      // This would typically make an actual SSH connection test
      // For now, we'll simulate the test
      console.log(`Testing connection to ${config.host}:${config.port || 22}`);

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Basic validation
      if (!config.host || !config.username) {
        return false;
      }

      return true;
    } catch (err) {
      console.error('Connection test failed:', err);
      return false;
    }
  }

  /**
   * Reconnect a connection
   */
  async function reconnectConnection(connectionId: string): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const connectionModel = getConnectionModel();

      // Check if we've exceeded max reconnect attempts
      if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
        throw new Error(`Maximum reconnect attempts (${connection.maxReconnectAttempts}) exceeded`);
      }

      // Increment reconnect attempts
      connectionModel.incrementReconnectAttempts(connectionId);

      // Update local state
      connections.value.set(connectionId, {
        ...connection,
        reconnectAttempts: connection.reconnectAttempts + 1,
        updatedAt: Date.now()
      });

      // Attempt to connect
      await connect(connectionId);

      console.log(`Reconnecting to: ${connection.name} (attempt ${connection.reconnectAttempts + 1})`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reconnect';
      console.error('Failed to reconnect:', err);
      throw err;
    }
  }

  /**
   * Update connection performance metrics
   */
  async function updatePerformanceMetrics(connectionId: string, metrics: {
    latency?: number;
    memoryUsage?: number;
    terminalLines?: number;
    bytesSent?: number;
    bytesReceived?: number;
  }): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const connectionModel = getConnectionModel();

      // Update performance metrics in database
      await connectionModel.updatePerformanceMetrics(connectionId, {
        latency: metrics.latency,
        memoryUsage: metrics.memoryUsage,
        terminalLines: metrics.terminalLines
      });

      // Update bytes transferred if provided
      if (metrics.bytesSent !== undefined || metrics.bytesReceived !== undefined) {
        await connectionModel.updateBytesTransferred(
          connectionId,
          metrics.bytesSent || 0,
          metrics.bytesReceived || 0
        );
      }

      // Update local state
      const updatedConnection = { ...connection };
      if (metrics.latency !== undefined) updatedConnection.latency = metrics.latency;
      if (metrics.memoryUsage !== undefined) updatedConnection.memoryUsage = metrics.memoryUsage;
      if (metrics.terminalLines !== undefined) updatedConnection.terminalLines = metrics.terminalLines;
      if (metrics.bytesSent !== undefined) updatedConnection.bytesTransferred.sent += metrics.bytesSent;
      if (metrics.bytesReceived !== undefined) updatedConnection.bytesTransferred.received += metrics.bytesReceived;
      updatedConnection.updatedAt = Date.now();

      connections.value.set(connectionId, updatedConnection);
    } catch (err) {
      console.error('Failed to update performance metrics:', err);
      // Don't throw here as this is a metrics update
    }
  }

  /**
   * Update connection health status
   */
  async function updateHealthStatus(connectionId: string, healthStatus: HealthStatus): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const connectionModel = getConnectionModel();

      // Update health status in database
      connectionModel.updateHealthStatus(connectionId, healthStatus);

      // Update local state
      const updatedConnection = {
        ...connection,
        healthStatus,
        lastHealthCheck: Date.now(),
        updatedAt: Date.now()
      };

      connections.value.set(connectionId, updatedConnection);

      console.log(`Updated connection ${connection.name} health status to: ${healthStatus}`);
    } catch (err) {
      console.error('Failed to update health status:', err);
    }
  }

  /**
   * Increment error count for a connection
   */
  async function incrementErrorCount(connectionId: string): Promise<void> {
    try {
      const connection = connections.value.get(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const connectionModel = getConnectionModel();
      connectionModel.incrementErrorCount(connectionId);

      // Update local state
      const updatedConnection = {
        ...connection,
        errorCount: connection.errorCount + 1,
        updatedAt: Date.now()
      };

      connections.value.set(connectionId, updatedConnection);
    } catch (err) {
      console.error('Failed to increment error count:', err);
    }
  }

  /**
   * Search connections by query
   */
  function searchConnections(query: string): Connection[] {
    const lowerQuery = query.toLowerCase();
    return connectionList.value.filter(conn =>
      conn.name.toLowerCase().includes(lowerQuery) ||
      conn.host.toLowerCase().includes(lowerQuery) ||
      conn.username.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get connections by status
   */
  function getConnectionsByStatus(status: ConnectionStatus): Connection[] {
    return connectionList.value.filter(conn => conn.status === status);
  }

  /**
   * Get connection statistics
   */
  function getStats(): {
    totalConnections: number;
    connectedConnections: number;
    failedConnections: number;
    averageLatency: number;
    totalBytesTransferred: { sent: number; received: number };
    canCreateMore: boolean;
  } {
    const stats = getConnectionModel().getStats();
    return {
      ...stats,
      canCreateMore: canCreateConnection.value
    };
  }

  /**
   * Get connections that need health checks
   */
  function getConnectionsNeedingHealthCheck(checkInterval: number = 30000): Connection[] {
    return getConnectionModel().getConnectionsNeedingHealthCheck(checkInterval);
  }

  /**
   * Clear all connections (for testing/reset purposes)
   */
  async function clearAllConnections(): Promise<void> {
    try {
      const connectionModel = getConnectionModel();
      const allConnections = connectionModel.findAll();

      for (const connection of allConnections) {
        connectionModel.delete(connection.id);
      }

      connections.value.clear();
      activeConnections.value.clear();

      console.log('Cleared all connections');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to clear connections';
      console.error('Failed to clear connections:', err);
      throw err;
    }
  }

  return {
    // State
    connections,
    activeConnections,
    isLoading,
    error,
    maxConnections,

    // Getters
    connectionList,
    activeConnectionList,
    connectedConnections,
    failedConnections,
    canCreateConnection,

    // Actions
    loadConnections,
    createConnection,
    getConnection,
    updateConnectionStatus,
    connect,
    disconnect,
    closeConnection,
    testConnection,
    reconnectConnection,
    updatePerformanceMetrics,
    updateHealthStatus,
    incrementErrorCount,
    searchConnections,
    getConnectionsByStatus,
    getStats,
    getConnectionsNeedingHealthCheck,
    clearAllConnections
  };
});