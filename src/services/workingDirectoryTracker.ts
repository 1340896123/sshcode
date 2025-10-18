/**
 * Working Directory Tracker Service
 *
 * Service for tracking and managing working directory changes across isolated sessions.
 * Provides real-time directory change detection, history management, and shell integration.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import type {
  WorkingDirectoryTracker as IWorkingDirectoryTracker,
  DirectoryHistoryEntry,
  DirectoryChangeCallback,
  DirectoryTrackingConfig
} from '../types/session';

export class WorkingDirectoryTracker extends EventEmitter implements IWorkingDirectoryTracker {
  private db: Database.Database;
  private trackingSessions: Map<string, boolean> = new Map();
  private currentDirectories: Map<string, string> = new Map();
  private directoryHistory: Map<string, DirectoryHistoryEntry[]> = new Map();
  private changeCallbacks: Set<DirectoryChangeCallback> = new Set();
  private trackingInterval: NodeJS.Timeout | null = null;
  private config: DirectoryTrackingConfig;

  constructor(db: Database.Database, config?: Partial<DirectoryTrackingConfig>) {
    super();
    this.db = db;
    this.config = {
      enableHistory: true,
      maxHistoryEntries: 100,
      enableRealTimeTracking: true,
      trackingInterval: 5000, // 5 seconds
      shellPromptIntegration: true,
      customPromptCommand: undefined,
      ...config
    };

    this.initializeDatabase();
    this.startPeriodicTracking();
  }

  // ============================================================================
  // DIRECTORY TRACKING MANAGEMENT
  // ============================================================================

  async trackWorkingDirectory(sessionId: string, initialDirectory: string): Promise<void> {
    try {
      // Store current directory
      this.currentDirectories.set(sessionId, initialDirectory);
      this.trackingSessions.set(sessionId, true);

      // Initialize directory history for this session
      if (!this.directoryHistory.has(sessionId)) {
        this.directoryHistory.set(sessionId, []);
      }

      // Add initial directory to history
      if (this.config.enableHistory) {
        await this.addToDirectoryHistory(sessionId, initialDirectory);
      }

      // Load existing history from database
      await this.loadDirectoryHistory(sessionId);

      console.log(`Started tracking working directory for session ${sessionId}: ${initialDirectory}`);
    } catch (error) {
      console.error(`Failed to start tracking working directory for session ${sessionId}:`, error);
      throw error;
    }
  }

  async updateWorkingDirectory(sessionId: string, newDirectory: string): Promise<void> {
    const oldDirectory = this.currentDirectories.get(sessionId);
    if (oldDirectory === newDirectory) {
      return; // No change
    }

    try {
      // Update current directory
      this.currentDirectories.set(sessionId, newDirectory);

      // Add to history
      if (this.config.enableHistory) {
        await this.addToDirectoryHistory(sessionId, newDirectory);
      }

      // Save to database
      await this.saveDirectoryChange(sessionId, oldDirectory, newDirectory);

      // Emit change event
      this.emit('directory-changed', { sessionId, oldDirectory, newDirectory });

      // Notify callbacks
      this.changeCallbacks.forEach(callback => {
        try {
          callback(sessionId, oldDirectory!, newDirectory);
        } catch (error) {
          console.error('Error in directory change callback:', error);
        }
      });

      console.log(`Session ${sessionId} directory changed from ${oldDirectory} to ${newDirectory}`);
    } catch (error) {
      console.error(`Failed to update working directory for session ${sessionId}:`, error);
      throw error;
    }
  }

  getWorkingDirectory(sessionId: string): string | null {
    return this.currentDirectories.get(sessionId) || null;
  }

  // ============================================================================
  // DIRECTORY HISTORY MANAGEMENT
  // ============================================================================

  getDirectoryHistory(sessionId: string): DirectoryHistoryEntry[] {
    return this.directoryHistory.get(sessionId) || [];
  }

  async addToDirectoryHistory(sessionId: string, directory: string): Promise<void> {
    if (!this.config.enableHistory) {
      return;
    }

    const history = this.directoryHistory.get(sessionId) || [];
    const now = Date.now();

    // Check if this is the same as the last entry
    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.directory === directory) {
      // Update the last entry's duration instead of creating a new one
      lastEntry.duration = now - lastEntry.timestamp;
      return;
    }

    // Create new history entry
    const entry: DirectoryHistoryEntry = {
      directory,
      timestamp: now,
      commandCount: 0 // Will be updated when commands are executed
    };

    // Add to history
    history.push(entry);

    // Limit history size
    if (history.length > this.config.maxHistoryEntries) {
      history.shift();
    }

    // Update stored history
    this.directoryHistory.set(sessionId, history);

    // Save to database
    await this.saveDirectoryHistoryEntry(sessionId, entry);
  }

  async clearDirectoryHistory(sessionId: string): Promise<void> {
    this.directoryHistory.set(sessionId, []);

    // Clear from database
    try {
      this.db.prepare('DELETE FROM session_directory_history WHERE session_id = ?').run(sessionId);
      console.log(`Cleared directory history for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to clear directory history for session ${sessionId}:`, error);
    }
  }

  // ============================================================================
  // DIRECTORY TRACKING CONTROL
  // ============================================================================

  async enableDirectoryTracking(sessionId: string): Promise<void> {
    this.trackingSessions.set(sessionId, true);
    console.log(`Enabled directory tracking for session ${sessionId}`);
  }

  async disableDirectoryTracking(sessionId: string): Promise<void> {
    this.trackingSessions.set(sessionId, false);
    console.log(`Disabled directory tracking for session ${sessionId}`);
  }

  isDirectoryTrackingEnabled(sessionId: string): boolean {
    return this.trackingSessions.get(sessionId) || false;
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  onDirectoryChanged(callback: DirectoryChangeCallback): void {
    this.changeCallbacks.add(callback);
  }

  offDirectoryChanged(callback: DirectoryChangeCallback): void {
    this.changeCallbacks.delete(callback);
  }

  // ============================================================================
  // SHELL INTEGRATION
  // ============================================================================

  /**
   * Generates shell commands for directory tracking integration
   */
  getDirectoryTrackingCommands(sessionId: string): string[] {
    const commands: string[] = [];

    if (this.config.shellPromptIntegration) {
      // Command to update working directory in shell prompt
      const customCommand = this.config.customPromptCommand || `
# Update working directory tracker
__update_working_directory() {
  echo "__DIR_CHANGE:$PWD" >&2
}

# Hook into cd command
cd() {
  builtin cd "$@"
  __update_working_directory
}

# Hook into pushd/popd
pushd() {
  builtin pushd "$@"
  __update_working_directory
}

popd() {
  builtin popd
  __update_working_directory
}

# Update on every command prompt
PROMPT_COMMAND="__update_working_directory; $PROMPT_COMMAND"
`;

      commands.push(customCommand);
    }

    return commands;
  }

  /**
   * Parses shell output for directory change notifications
   */
  parseShellOutput(sessionId: string, output: string): void {
    if (!this.trackingSessions.get(sessionId)) {
      return;
    }

    // Look for directory change markers
    const dirChangeMatch = output.match(/__DIR_CHANGE:(.+)/);
    if (dirChangeMatch) {
      const newDirectory = dirChangeMatch[1].trim();
      this.updateWorkingDirectory(sessionId, newDirectory);
    }
  }

  /**
   * Updates command count for current directory
   */
  async incrementCommandCount(sessionId: string): Promise<void> {
    const history = this.directoryHistory.get(sessionId);
    if (history && history.length > 0) {
      const currentEntry = history[history.length - 1];
      currentEntry.commandCount++;

      // Update in database
      try {
        this.db.prepare(`
          UPDATE session_directory_history
          SET command_count = command_count + 1
          WHERE session_id = ? AND timestamp = ?
        `).run(sessionId, currentEntry.timestamp);
      } catch (error) {
        console.error(`Failed to update command count for session ${sessionId}:`, error);
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Gets all sessions being tracked
   */
  getTrackedSessions(): string[] {
    return Array.from(this.trackingSessions.keys()).filter(id => this.trackingSessions.get(id));
  }

  /**
   * Gets statistics about directory tracking
   */
  getTrackingStatistics(): {
    totalSessions: number;
    activeSessions: number;
    totalHistoryEntries: number;
    averageHistoryEntries: number;
  } {
    const sessions = Array.from(this.directoryHistory.keys());
    const activeSessions = sessions.filter(id => this.trackingSessions.get(id));
    const totalEntries = sessions.reduce((sum, sessionId) => {
      return sum + this.directoryHistory.get(sessionId)!.length;
    }, 0);

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalHistoryEntries: totalEntries,
      averageHistoryEntries: sessions.length > 0 ? Math.round(totalEntries / sessions.length) : 0
    };
  }

  /**
   * Forces a directory check for all tracked sessions
   */
  async forceDirectoryCheck(): Promise<void> {
    for (const sessionId of this.getTrackedSessions()) {
      try {
        // In a real implementation, this would check the actual working directory
        // via the SSH connection and update if necessary
        const currentDir = this.currentDirectories.get(sessionId);
        if (currentDir) {
          // Emit a check event that can be handled by the SSH connection manager
          this.emit('directory-check-requested', { sessionId, currentDirectory: currentDir });
        }
      } catch (error) {
        console.error(`Failed to check directory for session ${sessionId}:`, error);
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeDatabase(): void {
    // Ensure the session_directory_history table exists
    // (This should already be created by the database initialization)
    try {
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='session_directory_history'
      `).get() as { name?: string };

      if (!tableExists) {
        this.db.exec(`
          CREATE TABLE session_directory_history (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            directory TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            duration INTEGER,
            command_count INTEGER DEFAULT 0,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
          );
        `);

        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_session_directory_history_session_id
          ON session_directory_history(session_id);
        `);

        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_session_directory_history_timestamp
          ON session_directory_history(timestamp);
        `);
      }
    } catch (error) {
      console.error('Error initializing directory tracking database:', error);
    }
  }

  private async loadDirectoryHistory(sessionId: string): Promise<void> {
    try {
      const entries = this.db.prepare(`
        SELECT directory, timestamp, duration, command_count
        FROM session_directory_history
        WHERE session_id = ?
        ORDER BY timestamp ASC
      `).all(sessionId) as DirectoryHistoryEntry[];

      this.directoryHistory.set(sessionId, entries);
      console.log(`Loaded ${entries.length} directory history entries for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to load directory history for session ${sessionId}:`, error);
    }
  }

  private async saveDirectoryHistoryEntry(sessionId: string, entry: DirectoryHistoryEntry): Promise<void> {
    try {
      this.db.prepare(`
        INSERT INTO session_directory_history (
          id, session_id, directory, timestamp, duration, command_count
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        sessionId,
        entry.directory,
        entry.timestamp,
        entry.duration || null,
        entry.commandCount
      );
    } catch (error) {
      console.error(`Failed to save directory history entry for session ${sessionId}:`, error);
    }
  }

  private async saveDirectoryChange(sessionId: string, oldDirectory: string | undefined, newDirectory: string): Promise<void> {
    // Save the directory change event to session events for debugging
    try {
      this.db.prepare(`
        INSERT INTO session_events (id, session_id, event_type, timestamp, data)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        sessionId,
        'directory_changed',
        Date.now(),
        JSON.stringify({ oldDirectory, newDirectory })
      );
    } catch (error) {
      console.error(`Failed to save directory change event for session ${sessionId}:`, error);
    }
  }

  private startPeriodicTracking(): void {
    if (!this.config.enableRealTimeTracking) {
      return;
    }

    this.trackingInterval = setInterval(async () => {
      try {
        await this.forceDirectoryCheck();
      } catch (error) {
        console.error('Error during periodic directory check:', error);
      }
    }, this.config.trackingInterval);
  }

  // Cleanup method
  destroy(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.trackingSessions.clear();
    this.currentDirectories.clear();
    this.directoryHistory.clear();
    this.changeCallbacks.clear();
    this.removeAllListeners();
  }
}

export default WorkingDirectoryTracker;