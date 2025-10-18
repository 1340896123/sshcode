import { getDatabase } from '../init';
import type { TerminalState, CursorPosition, CommandHistoryEntry, TerminalOptions } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class TerminalStateModel {
  private db = getDatabase().getDatabase();

  /**
   * Create or update terminal state for a tab
   */
  public upsert(tabId: string, data: Partial<TerminalState>): TerminalState {
    const existing = this.findByTabId(tabId);

    if (existing) {
      return this.update(tabId, data)!;
    } else {
      return this.create(tabId, data);
    }
  }

  /**
   * Create terminal state for a tab
   */
  public create(tabId: string, data: Partial<TerminalState>): TerminalState {
    const terminalState: TerminalState = {
      tabId,
      cursorPosition: data.cursorPosition || { x: 0, y: 0 },
      scrollOffset: data.scrollOffset || 0,
      bufferSize: data.bufferSize || 1000,
      history: data.history || [],
      options: data.options || {
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        theme: 'default',
        scrollback: 1000
      }
    };

    // Insert command history entries
    if (terminalState.history.length > 0) {
      this.insertHistoryEntries(terminalState.history);
    }

    return terminalState;
  }

  /**
   * Get terminal state by tab ID
   */
  public findByTabId(tabId: string): TerminalState | null {
    // Get command history for the tab
    const historyStmt = this.db.prepare(`
      SELECT * FROM terminal_history
      WHERE tab_id = ?
      ORDER BY timestamp ASC
    `);
    const historyRows = historyStmt.all(tabId) as any[];

    const history: CommandHistoryEntry[] = historyRows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      command: row.command,
      timestamp: row.timestamp,
      exitCode: row.exit_code,
      duration: row.duration
    }));

    // Get terminal buffer content
    const bufferStmt = this.db.prepare(`
      SELECT * FROM terminal_buffer
      WHERE tab_id = ?
      ORDER BY sequence_number ASC
    `);
    const bufferRows = bufferStmt.all(tabId) as any[];

    // Note: Buffer content is not directly returned in TerminalState
    // but can be accessed via separate methods if needed

    // Return terminal state with history
    return {
      tabId,
      cursorPosition: { x: 0, y: 0 }, // Default position
      scrollOffset: 0, // Default scroll
      bufferSize: 1000, // Default buffer size
      history,
      options: {
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        theme: 'default',
        scrollback: 1000
      }
    };
  }

  /**
   * Update terminal state for a tab
   */
  public update(tabId: string, updates: Partial<TerminalState>): TerminalState | null {
    const existing = this.findByTabId(tabId);
    if (!existing) return null;

    const updated: TerminalState = {
      ...existing,
      ...updates
    };

    // Update history if provided
    if (updates.history) {
      // Delete existing history
      const deleteStmt = this.db.prepare('DELETE FROM terminal_history WHERE tab_id = ?');
      deleteStmt.run(tabId);

      // Insert new history
      this.insertHistoryEntries(updates.history);
    }

    return updated;
  }

  /**
   * Add command to history
   */
  public addCommandToHistory(tabId: string, command: string, exitCode?: number, duration?: number): CommandHistoryEntry {
    const entry: CommandHistoryEntry = {
      id: uuidv4(),
      tabId,
      command,
      timestamp: Date.now(),
      exitCode,
      duration
    };

    const stmt = this.db.prepare(`
      INSERT INTO terminal_history (id, tab_id, command, timestamp, exit_code, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(entry.id, entry.tabId, entry.command, entry.timestamp, entry.exitCode, entry.duration);

    return entry;
  }

  /**
   * Get command history for a tab
   */
  public getCommandHistory(tabId: string, limit?: number): CommandHistoryEntry[] {
    let query = `
      SELECT * FROM terminal_history
      WHERE tab_id = ?
      ORDER BY timestamp DESC
    `;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(tabId) as any[];

    return rows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      command: row.command,
      timestamp: row.timestamp,
      exitCode: row.exit_code,
      duration: row.duration
    }));
  }

  /**
   * Search command history
   */
  public searchHistory(tabId: string, query: string, limit: number = 50): CommandHistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM terminal_history
      WHERE tab_id = ? AND command LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(tabId, `%${query}%`, limit) as any[];
    return rows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      command: row.command,
      timestamp: row.timestamp,
      exitCode: row.exit_code,
      duration: row.duration
    }));
  }

  /**
   * Clear command history for a tab
   */
  public clearHistory(tabId: string): void {
    const stmt = this.db.prepare('DELETE FROM terminal_history WHERE tab_id = ?');
    stmt.run(tabId);
  }

  /**
   * Add terminal buffer entry
   */
  public addBufferEntry(tabId: string, content: string, type: 'input' | 'output' | 'error' | 'info'): void {
    // Get next sequence number
    const seqStmt = this.db.prepare(`
      SELECT COALESCE(MAX(sequence_number), -1) + 1 as next_seq
      FROM terminal_buffer
      WHERE tab_id = ?
    `);
    const { next_seq } = seqStmt.get(tabId) as { next_seq: number };

    const stmt = this.db.prepare(`
      INSERT INTO terminal_buffer (id, tab_id, content, type, sequence_number, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      tabId,
      content,
      type,
      next_seq,
      Date.now()
    );

    // Trim buffer if it exceeds maximum size
    this.trimBuffer(tabId);
  }

  /**
   * Get terminal buffer content
   */
  public getBufferContent(tabId: string, limit?: number): Array<{
    id: string;
    content: string;
    type: string;
    sequenceNumber: number;
    timestamp: number;
  }> {
    let query = `
      SELECT * FROM terminal_buffer
      WHERE tab_id = ?
      ORDER BY sequence_number ASC
    `;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(tabId) as any[];

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      type: row.type,
      sequenceNumber: row.sequence_number,
      timestamp: row.timestamp
    }));
  }

  /**
   * Clear terminal buffer for a tab
   */
  public clearBuffer(tabId: string): void {
    const stmt = this.db.prepare('DELETE FROM terminal_buffer WHERE tab_id = ?');
    stmt.run(tabId);
  }

  /**
   * Update cursor position
   */
  public updateCursorPosition(tabId: string, position: CursorPosition): void {
    // Store cursor position in terminal state (could be a separate table if needed)
    // For now, this is handled at the application level
  }

  /**
   * Update scroll offset
   */
  public updateScrollOffset(tabId: string, offset: number): void {
    // Store scroll offset in terminal state (could be a separate table if needed)
    // For now, this is handled at the application level
  }

  /**
   * Update terminal options
   */
  public updateOptions(tabId: string, options: Partial<TerminalOptions>): void {
    const existing = this.findByTabId(tabId);
    if (existing) {
      const updatedOptions = { ...existing.options, ...options };
      this.update(tabId, { options: updatedOptions });
    }
  }

  /**
   * Get terminal statistics
   */
  public getStats(tabId?: string): {
    totalCommands: number;
    averageCommandDuration: number;
    successRate: number;
    bufferSize: number;
  } {
    let whereClause = tabId ? 'WHERE tab_id = ?' : '';
    const whereParams = tabId ? [tabId] : [];

    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM terminal_history ${whereClause}`);
    const avgDurationStmt = this.db.prepare(`
      SELECT AVG(duration) as avg_duration FROM terminal_history
      WHERE duration IS NOT NULL ${tabId ? 'AND tab_id = ?' : ''}
    `);
    const successStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM terminal_history
      WHERE exit_code = 0 ${tabId ? 'AND tab_id = ?' : ''}
    `);
    const bufferStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM terminal_buffer ${whereClause}
    `);

    const total = totalStmt.get(...whereParams) as { count: number };
    const avgDuration = avgDurationStmt.get(...(tabId ? [tabId] : [])) as { avg_duration: number | null };
    const success = successStmt.get(...(tabId ? [tabId] : [])) as { count: number };
    const buffer = bufferStmt.get(...whereParams) as { count: number };

    return {
      totalCommands: total.count,
      averageCommandDuration: avgDuration.avg_duration ?? 0,
      successRate: total.count > 0 ? success.count / total.count : 0,
      bufferSize: buffer.count
    };
  }

  /**
   * Cleanup old terminal data
   */
  public cleanupOldData(olderThanDays: number = 30): void {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Clean old history
    const deleteHistoryStmt = this.db.prepare(`
      DELETE FROM terminal_history WHERE timestamp < ?
    `);
    deleteHistoryStmt.run(cutoffTime);

    // Clean old buffer entries
    const deleteBufferStmt = this.db.prepare(`
      DELETE FROM terminal_buffer WHERE timestamp < ?
    `);
    deleteBufferStmt.run(cutoffTime);
  }

  /**
   * Insert multiple history entries
   */
  private insertHistoryEntries(entries: CommandHistoryEntry[]): void {
    if (entries.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO terminal_history (id, tab_id, command, timestamp, exit_code, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const db = this.db;
    const transaction = db.transaction(() => {
      for (const entry of entries) {
        stmt.run(entry.id, entry.tabId, entry.command, entry.timestamp, entry.exitCode, entry.duration);
      }
    });

    transaction();
  }

  /**
   * Trim buffer to maintain reasonable size
   */
  private trimBuffer(tabId: string, maxSize: number = 1000): void {
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM terminal_buffer WHERE tab_id = ?
    `);
    const { count } = countStmt.get(tabId) as { count: number };

    if (count > maxSize) {
      const deleteStmt = this.db.prepare(`
        DELETE FROM terminal_buffer
        WHERE id IN (
          SELECT id FROM terminal_buffer
          WHERE tab_id = ?
          ORDER BY sequence_number ASC
          LIMIT ?
        )
      `);
      deleteStmt.run(tabId, count - maxSize);
    }
  }
}

// Singleton instance
let terminalStateModel: TerminalStateModel | null = null;

export function getTerminalStateModel(): TerminalStateModel {
  if (!terminalStateModel) {
    terminalStateModel = new TerminalStateModel();
  }
  return terminalStateModel;
}