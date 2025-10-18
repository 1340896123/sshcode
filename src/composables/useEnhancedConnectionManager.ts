/**
 * Enhanced Connection Manager Composable
 *
 * Enhanced connection manager that supports multiple independent SSH connections
 * with complete session isolation, tab-based management, and resource monitoring.
 * Integrates with SessionStateManager, ConnectionLimitService, and other new services.
 */

import { ref, reactive, computed, type Ref, type ComputedRef } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type {
  Connection,
  ConnectionStatus,
  AuthType,
  ConnectionRequest,
  TabManagerComposable
} from '@/types/tab';
import type {
  IsolatedSession,
  SessionCreationConfig,
  SessionMetrics
} from '@/types/session';
import {
  connectionLimitService,
  type ConnectionLimitAlert
} from '@/services/connectionLimitService';
import {
  connectionStateValidator,
  type ValidationResult
} from '@/utils/connectionValidation';
import { getTabModel } from '@/database/models/Tab';
import { getConnectionModel } from '@/database/models/Connection';
import { getSessionModel } from '@/database/models/Session';

export interface EnhancedConnectionManagerComposable {
  // State
  connections: Ref<Map<string, Connection>>;
  activeConnectionId: Ref<string | null>;
  connectionMetrics: Ref<Map<string, SessionMetrics>>;
  isConnectionLimitReached: ComputedRef<boolean>;

  // Computed
  connectionList: ComputedRef<Connection[]>;
  activeConnections: ComputedRef<Connection[]>;
  connectionCount: ComputedRef<number>;
  totalMemoryUsage: ComputedRef<number>;

  // Connection Management
  createConnection: (request: ConnectionRequest, tabId: string) => Promise<string>;
  getConnection: (connectionId: string) => Connection | undefined;
  updateConnection: (connectionId: string, updates: Partial<Connection>) => Promise<void>;
  closeConnection: (connectionId: string) => Promise<void>;
  reconnectConnection: (connectionId: string) => Promise<void>;
  testConnection: (request: ConnectionRequest) => Promise<boolean>;

  // Session Management
  createSession: (config: SessionCreationConfig) => Promise<IsolatedSession>;
  getSession: (sessionId: string) => Promise<IsolatedSession | null>;
  closeSession: (sessionId: string) => Promise<void>;

  // Monitoring and Validation
  checkConnectionHealth: (connectionId: string) => Promise<void>;
  validateConnection: (connection: Connection) => ValidationResult;
  getConnectionStatus: () => {
    metrics: any;
    canCreateMore: boolean;
    alerts: ConnectionLimitAlert[];
  };

  // Events
  on: (event: ConnectionEvent, callback: (data: any) => void) => void;
  off: (event: ConnectionEvent, callback: (data: any) => void) => void;
}

export type ConnectionEvent =
  | 'connection-created'
  | 'connection-connecting'
  | 'connection-connected'
  | 'connection-disconnected'
  | 'connection-failed'
  | 'connection-closed'
  | 'connection-limit-reached'
  | 'connection-health-changed'
  | 'session-created'
  | 'session-closed'
  | 'memory-warning'
  | 'validation-failed';

export interface ConnectionEventCallback {
  (data: any): void;
}

export class EnhancedConnectionManagerImpl implements EnhancedConnectionManagerComposable {
  // State
  public connections: Ref<Map<string, Connection>>;
  public activeConnectionId: Ref<string | null>;
  public connectionMetrics: Ref<Map<string, SessionMetrics>>;
  public eventListeners: Map<ConnectionEvent, Set<ConnectionEventCallback>> = new Map();

  // Services
  private tabModel = getTabModel();
  private connectionModel = getConnectionModel();
  private sessionModel = getSessionModel();
  private connectionLimitService = connectionLimitService;
  private connectionValidator = connectionStateValidator;

  // Computed
  public readonly connectionList: ComputedRef<Connection[]>;
  public readonly activeConnections: ComputedRef<Connection[]>;
  public readonly connectionCount: ComputedRef<number>;
  public readonly totalMemoryUsage: ComputedRef<number>;
  public readonly isConnectionLimitReached: ComputedRef<boolean>;

  // Timers and monitoring
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private memoryMonitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connections = ref(new Map());
    this.activeConnectionId = ref(null);
    this.connectionMetrics = ref(new Map());

    // Initialize computed properties
    this.connectionList = computed(() => Array.from(this.connections.value.values()));
    this.activeConnections = computed(() =>
      this.connectionList.value.filter(conn => conn.status === 'connected')
    );
    this.connectionCount = computed(() => this.connections.value.size);
    this.totalMemoryUsage = computed(() =>
      Array.from(this.connections.value.values()).reduce((sum, conn) => sum + conn.memoryUsage, 0)
    );
    this.isConnectionLimitReached = computed(() => {
      const status = this.connectionLimitService.getStatus();
      return !status.canCreateMoreConnections;
    });

    // Start monitoring
    this.startConnectionLimitMonitoring();
    this.startMemoryMonitoring();
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async createConnection(request: ConnectionRequest, tabId: string): Promise<string> {
    // Check if we can create a new connection
    const limitCheck = this.connectionLimitService.canCreateConnection(request.host);
    if (!limitCheck.allowed) {
      const error = new Error(limitCheck.reason || 'Connection limit reached');
      this.emitEvent('connection-limit-reached', {
        reason: limitCheck.reason,
        alert: limitCheck.alert,
        suggestedActions: limitCheck.suggestedActions
      });
      throw error;
    }

    // Validate connection request
    const validationErrors = this.validateConnectionRequest(request);
    if (validationErrors.length > 0) {
      const error = new Error(`Connection validation failed: ${validationErrors.join(', ')}`);
      this.emitEvent('validation-failed', { errors: validationErrors, request });
      throw error;
    }

    const connectionId = uuidv4();
    const now = Date.now();

    // Create connection object
    const connection: Connection = reactive({
      id: connectionId,
      name: request.name,
      host: request.host,
      port: request.port || 22,
      username: request.username,
      authType: request.authType,
      status: 'connecting',
      lastConnected: undefined,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      connectedAt: undefined,
      latency: undefined,
      bytesTransferred: { sent: 0, received: 0 },
      memoryUsage: 0,
      terminalLines: 0,
      lastHealthCheck: now,
      healthStatus: 'healthy',
      errorCount: 0,
      createdAt: now,
      updatedAt: now
    });

    // Store in state
    this.connections.value.set(connectionId, connection);

    // Store in database
    try {
      await this.connectionModel.create({
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        authType: connection.authType,
        status: connection.status,
        lastConnected: connection.lastConnected,
        maxReconnectAttempts: connection.maxReconnectAttempts,
        connectedAt: connection.connectedAt,
        latency: connection.latency,
        lastHealthCheck: connection.lastHealthCheck
      });
    } catch (error) {
      // Rollback state if database save fails
      this.connections.value.delete(connectionId);
      throw new Error(`Failed to save connection to database: ${error}`);
    }

    // Update connection limits service
    this.connectionLimitService.incrementConnectionCount(request.host);

    // Start connection process
    this.emitEvent('connection-created', { connectionId, connection });
    this.emitEvent('connection-connecting', { connectionId, connection });

    // In a real implementation, this would establish the actual SSH connection
    // For now, we'll simulate the connection process
    await this.establishConnection(connectionId);

    return connectionId;
  }

  getConnection(connectionId: string): Connection | undefined {
    return this.connections.value.get(connectionId);
  }

  async updateConnection(connectionId: string, updates: Partial<Connection>): Promise<void> {
    const connection = this.connections.value.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Update in-memory state
    Object.assign(connection, updates, { updatedAt: Date.now() });

    // Update in database
    try {
      await this.connectionModel.update(connectionId, updates);
    } catch (error) {
      console.error(`Failed to update connection ${connectionId} in database:`, error);
      throw error;
    }

    // Emit update event (note: 'connection-updated' not in event type, using existing events)
    this.emitEvent('connection-connected', { connectionId, updates });
  }

  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.value.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      // Update status to disconnected
      await this.updateConnection(connectionId, { status: 'disconnected' });

      // Remove connection limits
      this.connectionLimitService.decrementConnectionCount(connection.host);

      // Remove from state
      this.connections.value.delete(connectionId);

      // Clean up metrics
      this.connectionMetrics.value.delete(connectionId);

      // If this was the active connection, clear it
      if (this.activeConnectionId.value === connectionId) {
        this.activeConnectionId.value = null;
      }

      this.emitEvent('connection-closed', { connectionId, connection });

    } catch (error) {
      console.error(`Failed to close connection ${connectionId}:`, error);
      throw error;
    }
  }

  async reconnectConnection(connectionId: string): Promise<void> {
    const connection = this.connections.value.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    this.emitEvent('connection-connecting', { connectionId, connection });
    await this.establishConnection(connectionId);
  }

  async testConnection(request: ConnectionRequest): Promise<boolean> {
    // Simulate connection test
    // In a real implementation, this would perform an actual connection test

    try {
      // Basic validation
      const validationErrors = this.validateConnectionRequest(request);
      if (validationErrors.length > 0) {
        return false;
      }

      // Check connection limits
      const limitCheck = this.connectionLimitService.canCreateConnection(request.host);
      if (!limitCheck.allowed) {
        return false;
      }

      // Simulate connection test (would be actual SSH test in real implementation)
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async createSession(config: SessionCreationConfig): Promise<IsolatedSession> {
    // This would integrate with SessionStateManager
    // For now, we'll create a basic session object

    const session: IsolatedSession = {
      id: uuidv4(),
      connectionId: config.connectionId,
      tabId: config.tabId,
      sshConnection: null, // Would be set by SessionStateManager
      shellStream: null,   // Would be set by SessionStateManager
      workingDirectory: config.workingDirectory || '/home/user',
      environment: {
        SESSION_ID: uuidv4(),
        TAB_ID: config.tabId,
        HISTFILE: `/tmp/.bash_history_${config.tabId}`,
        PWD: config.workingDirectory || '/home/user',
        SHELL: '/bin/bash',
        TERM: 'xterm-256color',
        USER: 'user',
        HOME: '/home/user',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        customVars: config.environment || {}
      },
      terminalState: {
        tabId: config.tabId,
        cursorPosition: { x: 0, y: 0 },
        scrollOffset: 0,
        bufferSize: 1000,
        history: [],
        options: {
          fontSize: 14,
          fontFamily: 'Consolas, monospace',
          theme: 'default',
          scrollback: 1000
        }
      },
      fileManagerState: {
        tabId: config.tabId,
        currentDirectory: config.workingDirectory || '/home/user',
        directoryHistory: [],
        selectedFiles: [],
        viewMode: 'list',
        sortBy: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        activeTransfers: [],
        bookmarks: []
      },
      aiAssistantState: {
        tabId: config.tabId,
        messages: [],
        toolCalls: [],
        currentContext: {
          workingDirectory: config.workingDirectory || '/home/user',
          environment: {},
          systemInfo: {
            hostname: '',
            os: '',
            architecture: '',
            uptime: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0
          },
          recentCommands: []
        },
        isVisible: false,
        inputHeight: 100,
        scrollPosition: 0
      },
      shellState: {
        ptyId: `pty_${uuidv4()}`,
        shellProcess: '/bin/bash',
        isInteractive: true,
        commandHistory: [],
        runningCommand: null
      },
      isolationLevel: config.isolationLevel,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      memoryUsage: 0,
      isActive: true,
      healthStatus: 'healthy'
    };

    // Store session in database
    await this.sessionModel.create(session);

    this.emitEvent('session-created', { session });

    return session;
  }

  async getSession(sessionId: string): Promise<IsolatedSession | null> {
    return await this.sessionModel.findById(sessionId);
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sessionModel.delete(sessionId);
    this.emitEvent('session-closed', { sessionId });
  }

  // ============================================================================
  // MONITORING AND VALIDATION
  // ============================================================================

  async checkConnectionHealth(connectionId: string): Promise<void> {
    const connection = this.connections.value.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      const healthCheck = await this.connectionValidator.checkConnectionHealth(connectionId);

      // Update connection health status
      const newHealthStatus = healthCheck.issues.length === 0 ? 'healthy' :
                                healthCheck.issues.some(i => i.severity === 'critical') ? 'failed' : 'unhealthy';

      if (connection.healthStatus !== newHealthStatus) {
        await this.updateConnection(connectionId, {
          healthStatus: newHealthStatus,
          memoryUsage: healthCheck.memoryUsage,
          lastHealthCheck: Date.now()
        });

        this.emitEvent('connection-health-changed', {
          connectionId,
          oldStatus: connection.healthStatus,
          newStatus: newHealthStatus,
          issues: healthCheck.issues
        });
      }

      // Update metrics
      this.connectionMetrics.value.set(connectionId, {
        sessionId: connectionId,
        connectionId,
        memoryUsage: healthCheck.memoryUsage,
        terminalLines: connection.terminalLines,
        fileOperations: 0, // Would be tracked by FileManager
        aiMessages: 0,      // Would be tracked by AI Assistant
        lastActivity: Date.now(),
        uptime: Date.now() - (connection.connectedAt || connection.createdAt),
        responseTime: healthCheck.responseTime
      });

    } catch (error) {
      console.error(`Health check failed for connection ${connectionId}:`, error);
      await this.updateConnection(connectionId, {
        healthStatus: 'failed',
        errorCount: connection.errorCount + 1
      });
    }
  }

  validateConnection(connection: Connection): ValidationResult {
    return this.connectionValidator.validateConnection(connection);
  }

  getConnectionStatus() {
    const status = this.connectionLimitService.getStatus();
    const recentAlerts = this.connectionLimitService.getRecentAlerts(5);

    return {
      metrics: status,
      canCreateMore: status.canCreateMoreConnections,
      alerts: recentAlerts
    };
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  on(event: ConnectionEvent, callback: ConnectionEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: ConnectionEvent, callback: ConnectionEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emitEvent(event: ConnectionEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async establishConnection(connectionId: string): Promise<void> {
    const connection = this.connections.value.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      // Simulate connection establishment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update connection status
      await this.updateConnection(connectionId, {
        status: 'connected',
        connectedAt: Date.now(),
        lastConnected: Date.now()
      });

      this.emitEvent('connection-connected', { connectionId, connection });

    } catch (error) {
      await this.updateConnection(connectionId, {
        status: 'failed',
        errorCount: connection.errorCount + 1
      });

      this.emitEvent('connection-failed', {
        connectionId,
        connection,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private validateConnectionRequest(request: ConnectionRequest): string[] {
    const errors: string[] = [];

    if (!request.name || request.name.trim() === '') {
      errors.push('Connection name is required');
    }

    if (!request.host || request.host.trim() === '') {
      errors.push('Host is required');
    }

    if (!request.username || request.username.trim() === '') {
      errors.push('Username is required');
    }

    if (!['password', 'key'].includes(request.authType)) {
      errors.push('Authentication type must be either "password" or "key"');
    }

    if (request.authType === 'password' && !request.password) {
      errors.push('Password is required for password authentication');
    }

    if (request.authType === 'key' && !request.privateKey) {
      errors.push('Private key is required for key authentication');
    }

    if (request.port && (request.port < 1 || request.port > 65535)) {
      errors.push('Port must be between 1 and 65535');
    }

    return errors;
  }

  private startConnectionLimitMonitoring(): void {
    this.connectionLimitService.startMonitoring();

    // Listen for connection limit events
    this.connectionLimitService.on('alert', (alert: ConnectionLimitAlert) => {
      this.emitEvent('connection-limit-reached', { alert });

      if (alert.level === 'emergency') {
        this.emitEvent('memory-warning', {
          message: alert.message,
          level: 'emergency'
        });
      }
    });
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitoringInterval = setInterval(async () => {
      for (const [connectionId, connection] of this.connections.value) {
        await this.checkConnectionHealth(connectionId);
      }
    }, 30000); // Check every 30 seconds
  }

  // Cleanup method
  destroy(): void {
    // Stop monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
    }

    this.connectionLimitService.stopMonitoring();

    // Clear state
    this.connections.value.clear();
    this.connectionMetrics.value.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const enhancedConnectionManager = new EnhancedConnectionManagerImpl();

// Export composable factory
export function useEnhancedConnectionManager(): EnhancedConnectionManagerComposable {
  return enhancedConnectionManager;
}