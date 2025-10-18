import { getDatabase } from '../init';
import type { TerminalState, CursorPosition, CommandHistoryEntry, TerminalOptions } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class TerminalStateModel {
  private db = getDatabase().getDatabase();

  /**
   * Create or update terminal state for a tab
   */
  public async upsert(tabId: string, data: Partial<TerminalState>): Promise<TerminalState> {
    const existing = await this.findByTabId(tabId);

    if (existing) {
      return (await this.update(tabId, data))!;
    } else {
      return await this.create(tabId, data);
    }
  }

  /**
   * Create terminal state for a tab
   */
  public async create(tabId: string, data: Partial<TerminalState>): Promise<TerminalState> {
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
      await this.insertHistoryEntries(terminalState.history);
    }

    return terminalState;
  }

  /**
   * Get terminal state by tab ID
   */
  public async findByTabId(tabId: string): Promise<TerminalState | null> {
    // Get command history for the tab
    const historyStmt = await this.db.prepare(`
      SELECT * FROM terminal_history
      WHERE tab_id = ?
      ORDER BY timestamp ASC
    `);
    const historyRows = await historyStmt.all(tabId) as any[];

    const history: CommandHistoryEntry[] = historyRows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      command: row.command,
      timestamp: row.timestamp,
      exitCode: row.exit_code,
      duration: row.duration
    }));

    // Get terminal buffer content
    const bufferStmt = await this.db.prepare(`
      SELECT * FROM terminal_buffer
      WHERE tab_id = ?
      ORDER BY sequence_number ASC
    `);
    const bufferRows = await bufferStmt.all(tabId) as any[];

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
  public async update(tabId: string, updates: Partial<TerminalState>): Promise<TerminalState | null> {
    const existing = await this.findByTabId(tabId);
    if (!existing) return null;

    const updated: TerminalState = {
      ...existing,
      ...updates
    };

    // Update history if provided
    if (updates.history) {
      // Delete existing history
      const deleteStmt = await this.db.prepare('DELETE FROM terminal_history WHERE tab_id = ?');
      await deleteStmt.run(tabId);

      // Insert new history
      await this.insertHistoryEntries(updates.history);
    }

    return updated;
  }

  /**
   * Add command to history
   */
  public async addCommandToHistory(tabId: string, command: string, exitCode?: number, duration?: number): Promise<CommandHistoryEntry> {
    const entry: CommandHistoryEntry = {
      id: uuidv4(),
      tabId,
      command,
      timestamp: Date.now(),
      exitCode,
      duration
    };

    const stmt = await this.db.prepare(`
      INSERT INTO terminal_history (id, tab_id, command, timestamp, exit_code, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(entry.id, entry.tabId, entry.command, entry.timestamp, entry.exitCode, entry.duration);

    return entry;
  }

  /**
   * Get command history for a tab
   */
  public async getCommandHistory(tabId: string, limit?: number): Promise<CommandHistoryEntry[]> {
    let query = `
      SELECT * FROM terminal_history
      WHERE tab_id = ?
      ORDER BY timestamp DESC
    `;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const stmt = await this.db.prepare(query);
    const rows = await stmt.all(tabId) as any[];

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
  public async searchHistory(tabId: string, query: string, limit: number = 50): Promise<CommandHistoryEntry[]> {
    const stmt = await this.db.prepare(`
      SELECT * FROM terminal_history
      WHERE tab_id = ? AND command LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = await stmt.all(tabId, `%${query}%`, limit) as any[];
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
  public async clearHistory(tabId: string): Promise<void> {
    const stmt = await this.db.prepare('DELETE FROM terminal_history WHERE tab_id = ?');
    await stmt.run(tabId);
  }

  /**
   * Add terminal buffer entry
   */
  public async addBufferEntry(tabId: string, content: string, type: 'input' | 'output' | 'error' | 'info'): Promise<void> {
    // Get next sequence number
    const seqStmt = await this.db.prepare(`
      SELECT COALESCE(MAX(sequence_number), -1) + 1 as next_seq
      FROM terminal_buffer
      WHERE tab_id = ?
    `);
    const { next_seq } = await seqStmt.get(tabId) as { next_seq: number };

    const stmt = await this.db.prepare(`
      INSERT INTO terminal_buffer (id, tab_id, content, type, sequence_number, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
      uuidv4(),
      tabId,
      content,
      type,
      next_seq,
      Date.now()
    );

    // Trim buffer if it exceeds maximum size
    await this.trimBuffer(tabId);
  }

  /**
   * Get terminal buffer content
   */
  public async getBufferContent(tabId: string, limit?: number): Promise<Array<{
    id: string;
    content: string;
    type: string;
    sequenceNumber: number;
    timestamp: number;
  }>> {
    let query = `
      SELECT * FROM terminal_buffer
      WHERE tab_id = ?
      ORDER BY sequence_number ASC
    `;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const stmt = await this.db.prepare(query);
    const rows = await stmt.all(tabId) as any[];

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
  public async clearBuffer(tabId: string): Promise<void> {
    const stmt = await this.db.prepare('DELETE FROM terminal_buffer WHERE tab_id = ?');
    await stmt.run(tabId);
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
  public async updateOptions(tabId: string, options: Partial<TerminalOptions>): Promise<void> {
    const existing = await this.findByTabId(tabId);
    if (existing) {
      const updatedOptions = { ...existing.options, ...options };
      await this.update(tabId, { options: updatedOptions });
    }
  }

  /**
   * Get terminal statistics
   */
  public async getStats(tabId?: string): Promise<{
    totalCommands: number;
    averageCommandDuration: number;
    successRate: number;
    bufferSize: number;
  }> {
    let whereClause = tabId ? 'WHERE tab_id = ?' : '';
    const whereParams = tabId ? [tabId] : [];

    const totalStmt = await this.db.prepare(`SELECT COUNT(*) as count FROM terminal_history ${whereClause}`);
    const avgDurationStmt = await this.db.prepare(`
      SELECT AVG(duration) as avg_duration FROM terminal_history
      WHERE duration IS NOT NULL ${tabId ? 'AND tab_id = ?' : ''}
    `);
    const successStmt = await this.db.prepare(`
      SELECT COUNT(*) as count FROM terminal_history
      WHERE exit_code = 0 ${tabId ? 'AND tab_id = ?' : ''}
    `);
    const bufferStmt = await this.db.prepare(`
      SELECT COUNT(*) as count FROM terminal_buffer ${whereClause}
    `);

    const total = await totalStmt.get(...whereParams) as { count: number };
    const avgDuration = await avgDurationStmt.get(...(tabId ? [tabId] : [])) as { avg_duration: number | null };
    const success = await successStmt.get(...(tabId ? [tabId] : [])) as { count: number };
    const buffer = await bufferStmt.get(...whereParams) as { count: number };

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
  public async cleanupOldData(olderThanDays: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Clean old history
    const deleteHistoryStmt = await this.db.prepare(`
      DELETE FROM terminal_history WHERE timestamp < ?
    `);
    await deleteHistoryStmt.run(cutoffTime);

    // Clean old buffer entries
    const deleteBufferStmt = await this.db.prepare(`
      DELETE FROM terminal_buffer WHERE timestamp < ?
    `);
    await deleteBufferStmt.run(cutoffTime);
  }

  /**
   * Insert multiple history entries
   */
  private async insertHistoryEntries(entries: CommandHistoryEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO terminal_history (id, tab_id, command, timestamp, exit_code, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Manual transaction implementation
    await this.db.exec('BEGIN');
    try {
      for (const entry of entries) {
        await stmt.run(entry.id, entry.tabId, entry.command, entry.timestamp, entry.exitCode, entry.duration);
      }
      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Trim buffer to maintain reasonable size
   */
  private async trimBuffer(tabId: string, maxSize: number = 1000): Promise<void> {
    const countStmt = await this.db.prepare(`
      SELECT COUNT(*) as count FROM terminal_buffer WHERE tab_id = ?
    `);
    const { count } = await countStmt.get(tabId) as { count: number };

    if (count > maxSize) {
      const deleteStmt = await this.db.prepare(`
        DELETE FROM terminal_buffer
        WHERE id IN (
          SELECT id FROM terminal_buffer
          WHERE tab_id = ?
          ORDER BY sequence_number ASC
          LIMIT ?
        )
      `);
      await deleteStmt.run(tabId, count - maxSize);
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