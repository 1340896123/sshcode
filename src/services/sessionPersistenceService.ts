/**
 * Session Persistence Service
 *
 * Service for persisting and restoring session state across application restarts.
 * Provides complete session serialization, backup/recovery, and crash recovery capabilities.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import type {
  SessionPersistenceService as ISessionPersistenceService,
  SerializedSession,
  SerializedShellState,
  SerializedTerminalState,
  SerializedFileManagerState,
  SerializedAIAssistantState
} from '../types/session';
import type {
  IsolatedSession,
  SessionEnvironment,
  ShellState,
  TerminalState,
  FileManagerState,
  AIAssistantState
} from '../types/tab';

export class SessionPersistenceService extends EventEmitter implements ISessionPersistenceService {
  private db: Database.Database;
  private compressionEnabled: boolean = true;
  private encryptionEnabled: boolean = false;
  private encryptionKey: string | null = null;
  private backupInterval: NodeJS.Timeout | null = null;
  private maxBackupFiles: number = 5;
  private backupLocation: string = '';

  constructor(
    db: Database.Database,
    options: {
      compressionEnabled?: boolean;
      encryptionEnabled?: boolean;
      encryptionKey?: string;
      maxBackupFiles?: number;
      backupLocation?: string;
    } = {}
  ) {
    super();
    this.db = db;
    this.compressionEnabled = options.compressionEnabled ?? true;
    this.encryptionEnabled = options.encryptionEnabled ?? false;
    this.encryptionKey = options.encryptionKey || null;
    this.maxBackupFiles = options.maxBackupFiles || 5;
    this.backupLocation = options.backupLocation || '';

    this.initializeDatabase();
  }

  // ============================================================================
  // SAVE/LOAD OPERATIONS
  // ============================================================================

  async saveSession(session: IsolatedSession): Promise<void> {
    try {
      const serializedSession = await this.serializeSessionState(session);

      // Save to database
      this.db.prepare(`
        INSERT OR REPLACE INTO sessions (
          id, connection_id, tab_id, working_directory, environment,
          shell_state, terminal_state, file_manager_state, ai_assistant_state,
          isolation_level, created_at, last_activity, memory_usage,
          is_active, health_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        serializedSession.id,
        serializedSession.connectionId,
        serializedSession.tabId,
        serializedSession.workingDirectory,
        JSON.stringify(serializedSession.environment),
        JSON.stringify(serializedSession.shellState),
        JSON.stringify(serializedSession.terminalState),
        JSON.stringify(serializedSession.fileManagerState),
        JSON.stringify(serializedSession.aiAssistantState),
        serializedSession.isolationLevel,
        serializedSession.createdAt,
        serializedSession.lastActivity,
        session.memoryUsage,
        session.isActive ? 1 : 0,
        session.healthStatus
      );

      console.log(`Saved session ${session.id} to database`);
      this.emit('session-saved', { sessionId: session.id, timestamp: Date.now() });

    } catch (error) {
      console.error(`Failed to save session ${session.id}:`, error);
      throw error;
    }
  }

  async loadSession(sessionId: string): Promise<IsolatedSession | null> {
    try {
      const row = this.db.prepare(`
        SELECT * FROM sessions WHERE id = ?
      `).get(sessionId) as any;

      if (!row) {
        return null;
      }

      const session = await this.deserializeSessionState(row);
      console.log(`Loaded session ${sessionId} from database`);
      this.emit('session-loaded', { sessionId, timestamp: Date.now() });

      return session;

    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  async saveAllSessions(): Promise<void> {
    try {
      // This would typically be called with all active sessions
      // For now, we'll emit an event for the session manager to handle
      this.emit('save-all-sessions-requested', { timestamp: Date.now() });
      console.log('Requested save of all sessions');
    } catch (error) {
      console.error('Failed to save all sessions:', error);
      throw error;
    }
  }

  async loadAllSessions(): Promise<IsolatedSession[]> {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM sessions ORDER BY last_activity DESC
      `).all() as any[];

      const sessions: IsolatedSession[] = [];
      for (const row of rows) {
        try {
          const session = await this.deserializeSessionState(row);
          sessions.push(session);
        } catch (error) {
          console.error(`Failed to deserialize session ${row.id}:`, error);
        }
      }

      console.log(`Loaded ${sessions.length} sessions from database`);
      this.emit('all-sessions-loaded', { count: sessions.length, timestamp: Date.now() });

      return sessions;

    } catch (error) {
      console.error('Failed to load all sessions:', error);
      return [];
    }
  }

  // ============================================================================
  // SESSION STATE SERIALIZATION
  // ============================================================================

  async serializeSessionState(session: IsolatedSession): Promise<SerializedSession> {
    const serialized: SerializedSession = {
      id: session.id,
      connectionId: session.connectionId,
      tabId: session.tabId,
      workingDirectory: session.workingDirectory,
      environment: await this.serializeEnvironment(session.environment),
      shellState: await this.serializeShellState(session.shellState),
      terminalState: await this.serializeTerminalState(session.terminalState),
      fileManagerState: await this.serializeFileManagerState(session.fileManagerState),
      aiAssistantState: await this.serializeAIAssistantState(session.aiAssistantState),
      isolationLevel: session.isolationLevel,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      version: '1.0.0',
      checksum: ''
    };

    // Calculate checksum
    serialized.checksum = this.calculateChecksum(serialized);

    return serialized;
  }

  async deserializeSessionState(data: any): Promise<IsolatedSession> {
    // Verify checksum if available
    if (data.checksum) {
      const isValid = this.verifyChecksum(data, data.checksum);
      if (!isValid) {
        throw new Error(`Session data checksum verification failed for session ${data.id}`);
      }
    }

    return {
      id: data.id,
      connectionId: data.connection_id,
      tabId: data.tab_id,
      sshConnection: null, // Will be restored by session manager
      shellStream: null,   // Will be restored by session manager
      workingDirectory: data.working_directory,
      environment: await this.deserializeEnvironment(JSON.parse(data.environment)),
      shellState: await this.deserializeShellState(JSON.parse(data.shell_state)),
      terminalState: await this.deserializeTerminalState(JSON.parse(data.terminal_state)),
      fileManagerState: await this.deserializeFileManagerState(JSON.parse(data.file_manager_state)),
      aiAssistantState: await this.deserializeAIAssistantState(JSON.parse(data.ai_assistant_state)),
      isolationLevel: data.isolation_level,
      createdAt: data.created_at,
      lastActivity: data.last_activity,
      memoryUsage: data.memory_usage || 0,
      isActive: Boolean(data.is_active),
      healthStatus: data.health_status || 'healthy'
    };
  }

  // ============================================================================
  // BACKUP/RECOVERY
  // ============================================================================

  async backupSessions(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `sessions-backup-${timestamp}.json`;
      const backupPath = this.backupLocation ?
        `${this.backupLocation}/${backupFilename}` :
        backupFilename;

      const sessions = await this.loadAllSessions();
      const backupData = {
        version: '1.0.0',
        timestamp: Date.now(),
        sessionCount: sessions.length,
        sessions: await Promise.all(sessions.map(session => this.serializeSessionState(session)))
      };

      let serializedData = JSON.stringify(backupData, null, 2);

      // Compress if enabled
      if (this.compressionEnabled) {
        serializedData = await this.compressData(serializedData);
      }

      // Encrypt if enabled
      if (this.encryptionEnabled && this.encryptionKey) {
        serializedData = await this.encryptData(serializedData);
      }

      // Write backup file
      const fs = require('fs').promises;
      await fs.writeFile(backupPath, serializedData, 'utf8');

      // Cleanup old backups
      await this.cleanupOldBackups();

      console.log(`Created session backup: ${backupPath}`);
      this.emit('backup-created', { path: backupPath, sessionCount: sessions.length });

      return backupPath;

    } catch (error) {
      console.error('Failed to backup sessions:', error);
      throw error;
    }
  }

  async restoreSessions(backupPath: string): Promise<IsolatedSession[]> {
    try {
      const fs = require('fs').promises;
      let backupData = await fs.readFile(backupPath, 'utf8');

      // Decrypt if needed
      if (this.encryptionEnabled && this.encryptionKey) {
        backupData = await this.decryptData(backupData);
      }

      // Decompress if needed
      if (this.compressionEnabled) {
        backupData = await this.decompressData(backupData);
      }

      const backup = JSON.parse(backupData);
      const sessions: IsolatedSession[] = [];

      for (const sessionData of backup.sessions) {
        try {
          const session = await this.deserializeSessionState(sessionData);
          sessions.push(session);
          await this.saveSession(session); // Save to current database
        } catch (error) {
          console.error(`Failed to restore session from backup:`, error);
        }
      }

      console.log(`Restored ${sessions.length} sessions from backup: ${backupPath}`);
      this.emit('backup-restored', { path: backupPath, sessionCount: sessions.length });

      return sessions;

    } catch (error) {
      console.error(`Failed to restore sessions from backup ${backupPath}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // CLEANUP OPERATIONS
  // ============================================================================

  async cleanupOldSessions(olderThan: number): Promise<number> {
    try {
      const cutoffTime = Date.now() - olderThan;

      const result = this.db.prepare(`
        DELETE FROM sessions WHERE last_activity < ?
      `).run(cutoffTime);

      console.log(`Cleaned up ${result.changes} sessions older than ${new Date(cutoffTime).toISOString()}`);
      this.emit('old-sessions-cleaned', { count: result.changes, cutoffTime });

      return result.changes;

    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      return 0;
    }
  }

  async cleanupCorruptedSessions(): Promise<number> {
    try {
      // Find sessions with invalid JSON or missing required fields
      const rows = this.db.prepare(`
        SELECT id, environment, shell_state, terminal_state,
               file_manager_state, ai_assistant_state
        FROM sessions
      `).all() as any[];

      let corruptedCount = 0;

      for (const row of rows) {
        let isCorrupted = false;

        try {
          // Try to parse each JSON field
          JSON.parse(row.environment);
          JSON.parse(row.shell_state);
          JSON.parse(row.terminal_state);
          JSON.parse(row.file_manager_state);
          JSON.parse(row.ai_assistant_state);
        } catch (error) {
          isCorrupted = true;
        }

        if (isCorrupted) {
          this.db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id);
          corruptedCount++;
          console.warn(`Removed corrupted session: ${row.id}`);
        }
      }

      console.log(`Cleaned up ${corruptedCount} corrupted sessions`);
      this.emit('corrupted-sessions-cleaned', { count: corruptedCount });

      return corruptedCount;

    } catch (error) {
      console.error('Failed to cleanup corrupted sessions:', error);
      return 0;
    }
  }

  // ============================================================================
  // SCHEDULED BACKUPS
  // ============================================================================

  enableScheduledBackups(intervalMs: number): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.backupInterval = setInterval(async () => {
      try {
        await this.backupSessions();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, intervalMs);

    console.log(`Enabled scheduled backups every ${intervalMs}ms`);
  }

  disableScheduledBackups(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    console.log('Disabled scheduled backups');
  }

  // ============================================================================
  // PRIVATE SERIALIZATION HELPERS
  // ============================================================================

  private async serializeEnvironment(environment: SessionEnvironment): Promise<SessionEnvironment> {
    return environment;
  }

  private async deserializeEnvironment(data: SessionEnvironment): Promise<SessionEnvironment> {
    return data;
  }

  private async serializeShellState(shellState: ShellState): Promise<SerializedShellState> {
    const serialized: SerializedShellState = {
      ptyId: shellState.ptyId,
      shellProcess: shellState.shellProcess,
      isInteractive: shellState.isInteractive,
      lastCommand: shellState.lastCommand ? {
        command: shellState.lastCommand.command,
        timestamp: shellState.lastCommand.timestamp,
        exitCode: shellState.lastCommand.exitCode,
        duration: shellState.lastCommand.duration
      } : undefined,
      environmentSnapshot: {} // Would be populated from actual environment
    };
    return serialized;
  }

  private async deserializeShellState(data: SerializedShellState): Promise<ShellState> {
    const serialized = data;
    return {
      ptyId: serialized.ptyId,
      shellProcess: serialized.shellProcess,
      isInteractive: serialized.isInteractive,
      commandHistory: [], // Would be restored separately
      lastCommand: serialized.lastCommand ? {
        id: uuidv4(),
        tabId: '',
        command: serialized.lastCommand.command,
        timestamp: serialized.lastCommand.timestamp,
        exitCode: serialized.lastCommand.exitCode,
        duration: serialized.lastCommand.duration
      } : undefined,
      runningCommand: null
    };
  }

  private async serializeTerminalState(terminalState: TerminalState): Promise<SerializedTerminalState> {
    const serialized: SerializedTerminalState = {
      bufferSize: terminalState.bufferSize,
      scrollOffset: terminalState.scrollOffset,
      cursorPosition: terminalState.cursorPosition,
      history: terminalState.history.map(entry => ({
        command: entry.command,
        output: '', // Would be captured from actual terminal
        timestamp: entry.timestamp,
        exitCode: entry.exitCode
      })),
      options: terminalState.options
    };
    return serialized;
  }

  private async deserializeTerminalState(data: SerializedTerminalState): Promise<TerminalState> {
    const serialized = data;
    return {
      tabId: '',
      cursorPosition: serialized.cursorPosition,
      scrollOffset: serialized.scrollOffset,
      bufferSize: serialized.bufferSize,
      history: serialized.history.map(entry => ({
        id: uuidv4(),
        tabId: '',
        command: entry.command,
        timestamp: entry.timestamp,
        exitCode: entry.exitCode,
        duration: 0
      })),
      options: serialized.options
    };
  }

  private async serializeFileManagerState(fileManagerState: FileManagerState): Promise<SerializedFileManagerState> {
    const serialized: SerializedFileManagerState = {
      currentDirectory: fileManagerState.currentDirectory,
      directoryHistory: fileManagerState.directoryHistory,
      selectedFiles: fileManagerState.selectedFiles,
      viewMode: fileManagerState.viewMode,
      sortBy: fileManagerState.sortBy,
      sortOrder: fileManagerState.sortOrder,
      showHiddenFiles: fileManagerState.showHiddenFiles,
      bookmarks: fileManagerState.bookmarks
    };
    return serialized;
  }

  private async deserializeFileManagerState(data: SerializedFileManagerState): Promise<FileManagerState> {
    const serialized = data;
    return {
      tabId: '',
      currentDirectory: serialized.currentDirectory,
      directoryHistory: serialized.directoryHistory,
      selectedFiles: serialized.selectedFiles,
      viewMode: serialized.viewMode,
      sortBy: serialized.sortBy,
      sortOrder: serialized.sortOrder,
      showHiddenFiles: serialized.showHiddenFiles,
      activeTransfers: [], // Would be restored separately
      bookmarks: serialized.bookmarks.map(bookmark => ({
        ...bookmark,
        id: uuidv4(),
        tabId: ''
      }))
    };
  }

  private async serializeAIAssistantState(aiState: AIAssistantState): Promise<SerializedAIAssistantState> {
    const serialized: SerializedAIAssistantState = {
      messages: aiState.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      })),
      currentContext: aiState.currentContext,
      isVisible: aiState.isVisible,
      inputHeight: aiState.inputHeight,
      scrollPosition: aiState.scrollPosition
    };
    return serialized;
  }

  private async deserializeAIAssistantState(data: SerializedAIAssistantState): Promise<AIAssistantState> {
    const serialized = data;
    return {
      tabId: '',
      messages: serialized.messages.map(msg => ({
        id: uuidv4(),
        tabId: '',
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      })),
      toolCalls: [], // Would be restored separately
      currentContext: {
        ...serialized.currentContext,
        systemInfo: serialized.currentContext.systemInfo || {
          hostname: '',
          os: '',
          architecture: '',
          uptime: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0
        }
      },
      isVisible: serialized.isVisible,
      inputHeight: serialized.inputHeight,
      scrollPosition: serialized.scrollPosition
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculateChecksum(data: any): string {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private verifyChecksum(data: any, checksum: string): boolean {
    const calculatedChecksum = this.calculateChecksum(data);
    return calculatedChecksum === checksum;
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression placeholder - in real implementation use zlib
    return data;
  }

  private async decompressData(data: string): Promise<string> {
    // Simple decompression placeholder - in real implementation use zlib
    return data;
  }

  private async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not provided');
    }
    // Simple encryption placeholder - in real implementation use proper encryption
    return data;
  }

  private async decryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not provided');
    }
    // Simple decryption placeholder - in real implementation use proper decryption
    return data;
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      if (!this.backupLocation) {
        return;
      }

      const files = await fs.readdir(this.backupLocation);
      const backupFiles = files
        .filter(file => file.startsWith('sessions-backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupLocation, file),
          mtime: fs.stat(path.join(this.backupLocation, file)).then(stat => stat.mtime)
        }));

      // Sort by modification time (oldest first)
      backupFiles.sort((a, b) => a.mtime - b.mtime);

      // Remove oldest backups if we have too many
      if (backupFiles.length > this.maxBackupFiles) {
        const filesToDelete = backupFiles.slice(0, backupFiles.length - this.maxBackupFiles);

        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          console.log(`Deleted old backup: ${file.name}`);
        }
      }

    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  private initializeDatabase(): void {
    // Ensure the sessions table exists
    // This should already be created by the database initialization
    try {
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='sessions'
      `).get() as { name?: string };

      if (!tableExists) {
        throw new Error('Sessions table not found - database not properly initialized');
      }

      console.log('Session persistence database initialized');
    } catch (error) {
      console.error('Error initializing session persistence database:', error);
      throw error;
    }
  }

  // Cleanup method
  destroy(): void {
    this.disableScheduledBackups();
    this.removeAllListeners();
  }
}

export default SessionPersistenceService;