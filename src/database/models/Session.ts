import { getDatabase } from '../init';
import type { IsolatedSession, SessionEnvironment, ShellState, SessionHealthStatus } from '@/types/session';
import type { TerminalState, FileManagerState, AIAssistantState } from '@/types/tab';
import { v4 as uuidv4 } from 'uuid';

export class SessionModel {
  private db = getDatabase().getDatabase();

  /**
   * Create a new session
   */
  public async create(data: Omit<IsolatedSession, 'id' | 'createdAt' | 'lastActivity' | 'memoryUsage' | 'isActive' | 'healthStatus'>): Promise<IsolatedSession> {
    const now = Date.now();
    const session: IsolatedSession = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      lastActivity: now,
      memoryUsage: 0,
      isActive: true,
      healthStatus: 'healthy'
    };

    const stmt = await this.db.prepare(`
      INSERT INTO sessions (
        id, connection_id, tab_id, working_directory, environment,
        shell_state, terminal_state, file_manager_state, ai_assistant_state,
        isolation_level, created_at, last_activity, memory_usage,
        is_active, health_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
      session.id,
      session.connectionId,
      session.tabId,
      session.workingDirectory,
      JSON.stringify(session.environment),
      JSON.stringify(session.shellState),
      JSON.stringify(session.terminalState),
      JSON.stringify(session.fileManagerState),
      JSON.stringify(session.aiAssistantState),
      session.isolationLevel,
      session.createdAt,
      session.lastActivity,
      session.memoryUsage,
      session.isActive ? 1 : 0,
      session.healthStatus
    );

    return session;
  }

  /**
   * Get a session by ID
   */
  public async findById(id: string): Promise<IsolatedSession | null> {
    const stmt = await this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = await stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToSession(row);
  }

  /**
   * Get session by tab ID
   */
  public async findByTabId(tabId: string): Promise<IsolatedSession | null> {
    const stmt = await this.db.prepare('SELECT * FROM sessions WHERE tab_id = ?');
    const row = await stmt.get(tabId) as any;

    if (!row) return null;

    return this.mapRowToSession(row);
  }

  /**
   * Get sessions by connection ID
   */
  public async findByConnectionId(connectionId: string): Promise<IsolatedSession[]> {
    const stmt = await this.db.prepare('SELECT * FROM sessions WHERE connection_id = ? ORDER BY last_activity DESC');
    const rows = await stmt.all(connectionId) as any[];

    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Get all active sessions
   */
  public async findActive(): Promise<IsolatedSession[]> {
    const stmt = await this.db.prepare('SELECT * FROM sessions WHERE is_active = 1 ORDER BY last_activity DESC');
    const rows = await stmt.all() as any[];

    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Get all sessions
   */
  public async findAll(): Promise<IsolatedSession[]> {
    const stmt = await this.db.prepare('SELECT * FROM sessions ORDER BY last_activity DESC');
    const rows = await stmt.all() as any[];

    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Get sessions by health status
   */
  public async findByHealthStatus(healthStatus: SessionHealthStatus): Promise<IsolatedSession[]> {
    const stmt = await this.db.prepare('SELECT * FROM sessions WHERE health_status = ? ORDER BY last_activity DESC');
    const rows = await stmt.all(healthStatus) as any[];

    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Update a session
   */
  public async update(id: string, updates: Partial<IsolatedSession>): Promise<IsolatedSession | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: IsolatedSession = {
      ...existing,
      ...updates,
      lastActivity: Date.now()
    };

    // Build dynamic UPDATE query
    const setClause = [];
    const values = [];

    if (updates.workingDirectory !== undefined) {
      setClause.push('working_directory = ?');
      values.push(updates.workingDirectory);
    }
    if (updates.environment !== undefined) {
      setClause.push('environment = ?');
      values.push(JSON.stringify(updates.environment));
    }
    if (updates.shellState !== undefined) {
      setClause.push('shell_state = ?');
      values.push(JSON.stringify(updates.shellState));
    }
    if (updates.terminalState !== undefined) {
      setClause.push('terminal_state = ?');
      values.push(JSON.stringify(updates.terminalState));
    }
    if (updates.fileManagerState !== undefined) {
      setClause.push('file_manager_state = ?');
      values.push(JSON.stringify(updates.fileManagerState));
    }
    if (updates.aiAssistantState !== undefined) {
      setClause.push('ai_assistant_state = ?');
      values.push(JSON.stringify(updates.aiAssistantState));
    }
    if (updates.memoryUsage !== undefined) {
      setClause.push('memory_usage = ?');
      values.push(updates.memoryUsage);
    }
    if (updates.isActive !== undefined) {
      setClause.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.healthStatus !== undefined) {
      setClause.push('health_status = ?');
      values.push(updates.healthStatus);
    }

    setClause.push('last_activity = ?');
    values.push(updated.lastActivity);

    const stmt = await this.db.prepare(`
      UPDATE sessions SET ${setClause.join(', ')} WHERE id = ?
    `);

    await stmt.run(...values, id);

    return updated;
  }

  /**
   * Update session activity (last_activity timestamp)
   */
  public async updateActivity(id: string): Promise<void> {
    const stmt = await this.db.prepare(`
      UPDATE sessions SET last_activity = ? WHERE id = ?
    `);

    const now = Date.now();
    await stmt.run(now, id);
  }

  /**
   * Update session memory usage
   */
  public async updateMemoryUsage(id: string, memoryUsage: number): Promise<void> {
    const stmt = await this.db.prepare(`
      UPDATE sessions SET memory_usage = ?, last_activity = ? WHERE id = ?
    `);

    const now = Date.now();
    await stmt.run(memoryUsage, now, id);
  }

  /**
   * Update session health status
   */
  public async updateHealthStatus(id: string, healthStatus: SessionHealthStatus): Promise<void> {
    const stmt = await this.db.prepare(`
      UPDATE sessions SET health_status = ?, last_activity = ? WHERE id = ?
    `);

    const now = Date.now();
    await stmt.run(healthStatus, now, id);
  }

  /**
   * Update working directory
   */
  public async updateWorkingDirectory(id: string, workingDirectory: string): Promise<void> {
    const stmt = await this.db.prepare(`
      UPDATE sessions SET working_directory = ?, last_activity = ? WHERE id = ?
    `);

    const now = Date.now();
    await stmt.run(workingDirectory, now, id);
  }

  /**
   * Activate/deactivate a session
   */
  public async setActive(id: string, isActive: boolean): Promise<void> {
    const stmt = await this.db.prepare(`
      UPDATE sessions SET is_active = ?, last_activity = ? WHERE id = ?
    `);

    const now = Date.now();
    await stmt.run(isActive ? 1 : 0, now, id);
  }

  /**
   * Delete a session
   */
  public async delete(id: string): Promise<boolean> {
    const stmt = await this.db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = await stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Delete sessions by connection ID
   */
  public async deleteByConnectionId(connectionId: string): Promise<number> {
    const stmt = await this.db.prepare('DELETE FROM sessions WHERE connection_id = ?');
    const result = await stmt.run(connectionId);

    return result.changes;
  }

  /**
   * Delete sessions by tab ID
   */
  public async deleteByTabId(tabId: string): Promise<boolean> {
    const stmt = await this.db.prepare('DELETE FROM sessions WHERE tab_id = ?');
    const result = await stmt.run(tabId);

    return result.changes > 0;
  }

  /**
   * Clean up inactive sessions (older than specified time)
   */
  public async cleanupInactive(olderThan: number): Promise<number> {
    const cutoffTime = Date.now() - olderThan;
    const stmt = await this.db.prepare(`
      DELETE FROM sessions WHERE last_activity < ? AND is_active = 0
    `);
    const result = await stmt.run(cutoffTime);

    return result.changes;
  }

  /**
   * Get session statistics
   */
  public async getStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    healthySessions: number;
    unhealthySessions: number;
    totalMemoryUsage: number;
    averageMemoryUsage: number;
  }> {
    const totalStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions');
    const activeStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1');
    const healthyStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE health_status = ?');
    const unhealthyStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE health_status != ?');
    const memoryStmt = await this.db.prepare('SELECT SUM(memory_usage) as total, AVG(memory_usage) as average FROM sessions');

    const total = await totalStmt.get() as { count: number };
    const active = await activeStmt.get() as { count: number };
    const healthy = await healthyStmt.get('healthy') as { count: number };
    const unhealthy = await unhealthyStmt.get('healthy') as { count: number };
    const memory = await memoryStmt.get() as { total: number; average: number };

    return {
      totalSessions: total.count,
      activeSessions: active.count,
      healthySessions: healthy.count,
      unhealthySessions: unhealthy.count,
      totalMemoryUsage: memory.total || 0,
      averageMemoryUsage: memory.average || 0
    };
  }

  /**
   * Get sessions with high memory usage
   */
  public async getHighMemorySessions(threshold: number): Promise<IsolatedSession[]> {
    const stmt = await this.db.prepare('SELECT * FROM sessions WHERE memory_usage > ? ORDER BY memory_usage DESC');
    const rows = await stmt.all(threshold) as any[];

    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Get sessions needing health check (older than specified interval)
   */
  public async getSessionsNeedingHealthCheck(checkInterval: number): Promise<IsolatedSession[]> {
    const cutoffTime = Date.now() - checkInterval;
    const stmt = await this.db.prepare(`
      SELECT * FROM sessions
      WHERE is_active = 1 AND last_activity < ?
      ORDER BY last_activity ASC
    `);
    const rows = await stmt.all(cutoffTime) as any[];

    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Search sessions by working directory or tab name
   */
  public async search(query: string): Promise<IsolatedSession[]> {
    const stmt = await this.db.prepare(`
      SELECT s.* FROM sessions s
      JOIN tabs t ON s.tab_id = t.id
      WHERE s.working_directory LIKE ? OR t.name LIKE ?
      ORDER BY s.last_activity DESC
    `);

    const searchPattern = `%${query}%`;
    const rows = await stmt.all(searchPattern, searchPattern) as any[];
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Batch update session activities
   */
  public async batchUpdateActivities(sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0) return;

    const now = Date.now();
    const stmt = await this.db.prepare(`
      UPDATE sessions SET last_activity = ? WHERE id = ?
    `);

    // Manual transaction implementation
    await this.db.exec('BEGIN');
    try {
      for (const sessionId of sessionIds) {
        await stmt.run(now, sessionId);
      }
      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Map database row to Session object
   */
  private mapRowToSession(row: any): IsolatedSession {
    try {
      return {
        id: row.id,
        connectionId: row.connection_id,
        tabId: row.tab_id,
        sshConnection: null, // Will be restored by session manager
        shellStream: null,   // Will be restored by session manager
        workingDirectory: row.working_directory,
        environment: JSON.parse(row.environment),
        shellState: JSON.parse(row.shell_state),
        terminalState: JSON.parse(row.terminal_state),
        fileManagerState: JSON.parse(row.file_manager_state),
        aiAssistantState: JSON.parse(row.ai_assistant_state),
        isolationLevel: row.isolation_level,
        createdAt: row.created_at,
        lastActivity: row.last_activity,
        memoryUsage: row.memory_usage,
        isActive: Boolean(row.is_active),
        healthStatus: row.health_status as SessionHealthStatus
      };
    } catch (error) {
      console.error(`Failed to map session row to object: ${row.id}`, error);
      throw new Error(`Invalid session data in database for session ${row.id}`);
    }
  }
}

// Singleton instance
let sessionModel: SessionModel | null = null;

export function getSessionModel(): SessionModel {
  if (!sessionModel) {
    sessionModel = new SessionModel();
  }
  return sessionModel;
}