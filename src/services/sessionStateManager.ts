/**
 * Session State Manager Service
 *
 * Core service for managing isolated SSH sessions with complete state isolation,
 * working directory tracking, and resource management for tabbed connections.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import type {
  SessionStateManager as ISessionStateManager,
  SessionCreationConfig,
  SessionEvent,
  SessionEventCallback,
  IsolatedSession,
  SessionEnvironment,
  ShellState,
  SessionHealthStatus,
  SessionMetrics,
  WorkingDirectoryTracker,
  SessionPersistenceService,
  SessionMemoryManager
} from '../types/session';
import type {
  SessionLimitConfig,
  SessionLimitStatus,
  ConnectionStatus,
  TerminalState,
  FileManagerState,
  AIAssistantState
} from '../types/tab';

export class SessionStateManager extends EventEmitter implements ISessionStateManager {
  private sessions: Map<string, IsolatedSession> = new Map();
  private sessionByConnection: Map<string, Set<string>> = new Map();
  private sessionByTab: Map<string, string> = new Map();
  private db: Database.Database;
  private workingDirectoryTracker: WorkingDirectoryTracker;
  private persistenceService: SessionPersistenceService;
  private memoryManager: SessionMemoryManager;
  private sessionLimitConfig: SessionLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    db: Database.Database,
    workingDirectoryTracker: WorkingDirectoryTracker,
    persistenceService: SessionPersistenceService,
    memoryManager: SessionMemoryManager,
    sessionLimitConfig: SessionLimitConfig
  ) {
    super();
    this.db = db;
    this.workingDirectoryTracker = workingDirectoryTracker;
    this.persistenceService = persistenceService;
    this.memoryManager = memoryManager;
    this.sessionLimitConfig = sessionLimitConfig;

    this.initializeDatabase();
    this.startPeriodicTasks();
  }

  // ============================================================================
  // SESSION LIFECYCLE MANAGEMENT
  // ============================================================================

  async createSession(config: SessionCreationConfig): Promise<IsolatedSession> {
    // Check session limits
    const limitStatus = await this.checkSessionLimits(config.connectionId);
    if (!limitStatus.canCreateSession) {
      throw new Error(`Cannot create session: ${limitStatus.suggestedActions.join(', ')}`);
    }

    const sessionId = uuidv4();
    const now = Date.now();

    // Create isolated session environment
    const environment = await this.createIsolatedEnvironment(sessionId, config);

    // Create shell state
    const shellState: ShellState = {
      ptyId: `pty_${sessionId}`,
      shellProcess: config.shellCommand || '/bin/bash',
      isInteractive: true,
      commandHistory: [],
      runningCommand: null
    };

    // Create initial session state
    const session: IsolatedSession = {
      id: sessionId,
      connectionId: config.connectionId,
      tabId: config.tabId,
      sshConnection: null, // Will be set when connection is established
      shellStream: null,   // Will be set when shell is created
      workingDirectory: config.workingDirectory || '/home/user',
      environment,
      terminalState: this.createInitialTerminalState(),
      fileManagerState: this.createInitialFileManagerState(),
      aiAssistantState: this.createInitialAIAssistantState(),
      shellState,
      isolationLevel: config.isolationLevel,
      createdAt: now,
      lastActivity: now,
      memoryUsage: 0,
      isActive: true,
      healthStatus: 'healthy'
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Update connection mapping
    if (!this.sessionByConnection.has(config.connectionId)) {
      this.sessionByConnection.set(config.connectionId, new Set());
    }
    this.sessionByConnection.get(config.connectionId)!.add(sessionId);

    // Update tab mapping
    this.sessionByTab.set(config.tabId, sessionId);

    // Initialize working directory tracking
    await this.workingDirectoryTracker.trackWorkingDirectory(sessionId, session.workingDirectory);

    // Save session to database
    await this.persistenceService.saveSession(session);

    // Emit session created event
    this.emit('session-created', { sessionId, session });

    console.log(`Created isolated session ${sessionId} for connection ${config.connectionId}, tab ${config.tabId}`);
    return session;
  }

  getSession(sessionId: string): IsolatedSession | null {
    return this.sessions.get(sessionId) || null;
  }

  async updateSession(sessionId: string, updates: Partial<IsolatedSession>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update session
    Object.assign(session, updates, {
      lastActivity: Date.now(),
      updatedAt: Date.now()
    });

    // Update working directory tracker if directory changed
    if (updates.workingDirectory && updates.workingDirectory !== session.workingDirectory) {
      await this.workingDirectoryTracker.updateWorkingDirectory(sessionId, updates.workingDirectory);
    }

    // Save updated session
    await this.persistenceService.saveSession(session);

    // Emit update event
    this.emit('session-updated', { sessionId, session, updates });
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Cleanup SSH connection and shell
    if (session.shellStream) {
      session.shellStream.destroy();
    }
    if (session.sshConnection) {
      session.sshConnection.end();
    }

    // Cleanup working directory tracking
    await this.workingDirectoryTracker.disableDirectoryTracking(sessionId);

    // Remove from mappings
    const connectionSessions = this.sessionByConnection.get(session.connectionId);
    if (connectionSessions) {
      connectionSessions.delete(sessionId);
      if (connectionSessions.size === 0) {
        this.sessionByConnection.delete(session.connectionId);
      }
    }
    this.sessionByTab.delete(session.tabId);

    // Remove from memory
    this.sessions.delete(sessionId);

    // Emit close event
    this.emit('session-closed', { sessionId, session });

    console.log(`Closed session ${sessionId}`);
  }

  async closeAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.closeSession(id)));
  }

  // ============================================================================
  // SESSION QUERIES
  // ============================================================================

  getSessionsByConnection(connectionId: string): IsolatedSession[] {
    const sessionIds = this.sessionByConnection.get(connectionId) || new Set();
    return Array.from(sessionIds).map(id => this.sessions.get(id)!).filter(Boolean);
  }

  getSessionsByTab(tabId: string): IsolatedSession[] {
    const sessionId = this.sessionByTab.get(tabId);
    return sessionId ? [this.sessions.get(sessionId)!].filter(Boolean) : [];
  }

  getActiveSessions(): IsolatedSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  getInactiveSessions(threshold: number = 30 * 60 * 1000): IsolatedSession[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      session => !session.isActive || (now - session.lastActivity) > threshold
    );
  }

  // ============================================================================
  // SESSION HEALTH MANAGEMENT
  // ============================================================================

  async checkSessionHealth(sessionId: string): Promise<SessionHealthStatus> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 'error';
    }

    try {
      // Check SSH connection health
      if (!session.sshConnection || session.sshConnection.destroyed) {
        return 'disconnected';
      }

      // Check shell stream health
      if (!session.shellStream || session.shellStream.destroyed) {
        return 'disconnected';
      }

      // Check memory usage
      const memoryUsage = await this.memoryManager.getSessionMemoryUsage(sessionId);
      if (memoryUsage.totalUsage > this.sessionLimitConfig.maxMemoryPerSession) {
        return 'unhealthy';
      }

      // Check activity
      const timeSinceActivity = Date.now() - session.lastActivity;
      if (timeSinceActivity > 60 * 60 * 1000) { // 1 hour
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      console.error(`Health check failed for session ${sessionId}:`, error);
      return 'error';
    }
  }

  async cleanupInactiveSessions(): Promise<number> {
    const inactiveSessions = this.getInactiveSessions();
    let cleanedCount = 0;

    for (const session of inactiveSessions) {
      try {
        await this.closeSession(session.id);
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to cleanup inactive session ${session.id}:`, error);
      }
    }

    return cleanedCount;
  }

  // ============================================================================
  // SESSION METRICS
  // ============================================================================

  getSessionMetrics(sessionId: string): SessionMetrics {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Use cached memory usage for synchronous operation
    const memoryUsage = session.memoryUsage || 0;
    const uptime = Date.now() - session.createdAt;

    return {
      sessionId,
      connectionId: session.connectionId,
      memoryUsage,
      terminalLines: session.terminalState.history.length,
      fileOperations: session.fileManagerState.activeTransfers.length,
      aiMessages: session.aiAssistantState.messages.length,
      lastActivity: session.lastActivity,
      uptime,
      responseTime: 0 // Would be calculated from actual performance data
    };
  }

  getAllSessionMetrics(): SessionMetrics[] {
    const sessionIds = Array.from(this.sessions.keys());
    return sessionIds.map(id => this.getSessionMetrics(id));
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  on(event: SessionEvent, callback: SessionEventCallback): this {
    return super.on(event, callback);
  }

  off(event: SessionEvent, callback: SessionEventCallback): this {
    return super.off(event, callback);
  }

  emit(event: SessionEvent, data: any): boolean {
    return super.emit(event, data);
  }

  // ============================================================================
  // SESSION LIMITS MANAGEMENT
  // ============================================================================

  private async checkSessionLimits(connectionId: string): Promise<SessionLimitStatus> {
    const connectionSessions = this.sessionByConnection.get(connectionId) || new Set();
    const totalMemory = await this.memoryManager.getTotalMemoryUsage();

    const currentSessions = this.sessions.size;
    const maxSessions = this.sessionLimitConfig.maxTotalSessions;
    const currentMemory = totalMemory;
    const maxMemory = this.sessionLimitConfig.maxTotalMemory;
    const sessionsPerConnection = new Map<string, number>();

    // Calculate sessions per connection
    for (const [connId, sessionIds] of this.sessionByConnection) {
      sessionsPerConnection.set(connId, sessionIds.size);
    }

    let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
    const suggestedActions: string[] = [];
    let canCreateSession = true;

    // Check total session limit
    if (currentSessions >= maxSessions) {
      warningLevel = 'critical';
      canCreateSession = false;
      suggestedActions.push('Close inactive sessions');
      suggestedActions.push('Increase maximum session limit');
    } else if (currentSessions >= maxSessions * 0.8) {
      warningLevel = 'warning';
      suggestedActions.push('Consider closing inactive sessions');
    }

    // Check per-connection limit
    if (connectionSessions.size >= this.sessionLimitConfig.maxSessionsPerConnection) {
      warningLevel = 'critical';
      canCreateSession = false;
      suggestedActions.push(`Maximum sessions per connection reached (${this.sessionLimitConfig.maxSessionsPerConnection})`);
    }

    // Check memory limit
    if (currentMemory >= maxMemory) {
      warningLevel = 'critical';
      canCreateSession = false;
      suggestedActions.push('Memory limit reached - close sessions to free memory');
      suggestedActions.push('Enable automatic memory cleanup');
    } else if (currentMemory >= maxMemory * 0.8) {
      warningLevel = 'warning';
      suggestedActions.push('Memory usage high - consider cleanup');
    }

    return {
      currentSessions,
      maxSessions,
      currentMemory,
      maxMemory,
      sessionsPerConnection,
      warningLevel,
      canCreateSession,
      suggestedActions
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async createIsolatedEnvironment(sessionId: string, config: SessionCreationConfig): Promise<SessionEnvironment> {
    const baseEnvironment = process.env;

    return {
      SESSION_ID: sessionId,
      TAB_ID: config.tabId,
      HISTFILE: `/tmp/.bash_history_${sessionId}`,
      PWD: config.workingDirectory || '/home/user',
      SHELL: config.shellCommand || '/bin/bash',
      TERM: 'xterm-256color',
      USER: baseEnvironment.USER || 'user',
      HOME: baseEnvironment.HOME || '/home/user',
      PATH: baseEnvironment.PATH || '/usr/local/bin:/usr/bin:/bin',
      customVars: config.environment || {}
    };
  }

  private createInitialTerminalState(): TerminalState {
    return {
      tabId: '',
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
    };
  }

  private createInitialFileManagerState(): FileManagerState {
    return {
      tabId: '',
      currentDirectory: '/home/user',
      directoryHistory: [],
      selectedFiles: [],
      viewMode: 'list',
      sortBy: 'name',
      sortOrder: 'asc',
      showHiddenFiles: false,
      activeTransfers: [],
      bookmarks: []
    };
  }

  private createInitialAIAssistantState(): AIAssistantState {
    return {
      tabId: '',
      messages: [],
      toolCalls: [],
      currentContext: {
        workingDirectory: '/home/user',
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
    };
  }

  private initializeDatabase(): void {
    // Create sessions table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        connectionId TEXT NOT NULL,
        tabId TEXT NOT NULL,
        workingDirectory TEXT NOT NULL,
        environment TEXT NOT NULL,
        shellState TEXT NOT NULL,
        terminalState TEXT NOT NULL,
        fileManagerState TEXT NOT NULL,
        aiAssistantState TEXT NOT NULL,
        isolationLevel TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        lastActivity INTEGER NOT NULL,
        memoryUsage INTEGER DEFAULT 0,
        isActive BOOLEAN DEFAULT 1,
        healthStatus TEXT DEFAULT 'healthy'
      );
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_connectionId ON sessions(connectionId);
      CREATE INDEX IF NOT EXISTS idx_sessions_tabId ON sessions(tabId);
      CREATE INDEX IF NOT EXISTS idx_sessions_lastActivity ON sessions(lastActivity);
      CREATE INDEX IF NOT EXISTS idx_sessions_healthStatus ON sessions(healthStatus);
    `);
  }

  private startPeriodicTasks(): void {
    // Cleanup inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleaned = await this.cleanupInactiveSessions();
        if (cleaned > 0) {
          console.log(`Cleaned up ${cleaned} inactive sessions`);
        }
      } catch (error) {
        console.error('Error during session cleanup:', error);
      }
    }, 5 * 60 * 1000);

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      for (const [sessionId, session] of this.sessions) {
        const healthStatus = await this.checkSessionHealth(sessionId);
        if (healthStatus !== session.healthStatus) {
          await this.updateSession(sessionId, { healthStatus });
          this.emit('session-health-changed', { sessionId, oldStatus: session.healthStatus, newStatus: healthStatus });
        }
      }
    }, 30 * 1000);
  }

  // Cleanup method
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.closeAllSessions();
    this.removeAllListeners();
  }
}

export default SessionStateManager;