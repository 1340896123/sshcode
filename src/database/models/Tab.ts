import { getDatabase } from '../init';
import type { Tab, WindowState } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class TabModel {
  private db = getDatabase().getDatabase();

  /**
   * Create a new tab
   */
  public async create(data: Omit<Tab, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tab> {
    const now = Date.now();
    const tab: Tab = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    const stmt = await this.db.prepare(
      `INSERT INTO tabs (
        id, name, connection_id, is_active, is_visible, position,
        last_accessed, created_at, updated_at, window_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = await stmt.run(
      tab.id,
      tab.name,
      tab.connectionId,
      tab.isActive ? 1 : 0,
      tab.isVisible ? 1 : 0,
      tab.position,
      tab.lastAccessed,
      tab.createdAt,
      tab.updatedAt,
      JSON.stringify(tab.windowState)
    );

    if (result.changes === 0) {
      throw new Error(`Failed to create tab: No rows inserted`);
    }

    return tab;
  }

  /**
   * Get a tab by ID
   */
  public async findById(id: string): Promise<Tab | null> {
    const stmt = await this.db.prepare('SELECT * FROM tabs WHERE id = ?');
    const row = await stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToTab(row);
  }

  /**
   * Get all tabs, ordered by position
   */
  public async findAll(): Promise<Tab[]> {
    const stmt = await this.db.prepare('SELECT * FROM tabs ORDER BY position');
    const rows = await stmt.all() as any[];

    return rows.map(row => this.mapRowToTab(row));
  }

  /**
   * Get all tabs for a connection
   */
  public async findByConnectionId(connectionId: string): Promise<Tab[]> {
    const stmt = await this.db.prepare('SELECT * FROM tabs WHERE connection_id = ? ORDER BY position');
    const rows = await stmt.all(connectionId) as any[];

    return rows.map(row => this.mapRowToTab(row));
  }

  /**
   * Get the active tab
   */
  public async findActive(): Promise<Tab | null> {
    const stmt = await this.db.prepare('SELECT * FROM tabs WHERE is_active = 1 LIMIT 1');
    const row = await stmt.get() as any;

    if (!row) return null;

    return this.mapRowToTab(row);
  }

  /**
   * Update a tab
   */
  public async update(id: string, updates: Partial<Omit<Tab, 'id' | 'createdAt'>>): Promise<Tab | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: Tab = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    // Build dynamic UPDATE query
    const setClause = [];
    const values = [];

    if (updates.name !== undefined) {
      setClause.push('name = ?');
      values.push(updates.name);
    }
    if (updates.connectionId !== undefined) {
      setClause.push('connection_id = ?');
      values.push(updates.connectionId);
    }
    if (updates.isActive !== undefined) {
      setClause.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.isVisible !== undefined) {
      setClause.push('is_visible = ?');
      values.push(updates.isVisible ? 1 : 0);
    }
    if (updates.position !== undefined) {
      setClause.push('position = ?');
      values.push(updates.position);
    }
    if (updates.lastAccessed !== undefined) {
      setClause.push('last_accessed = ?');
      values.push(updates.lastAccessed);
    }
    if (updates.windowState !== undefined) {
      setClause.push('window_state = ?');
      values.push(JSON.stringify(updates.windowState));
    }

    setClause.push('updated_at = ?');
    values.push(updated.updatedAt);

    const stmt = await this.db.prepare(`
      UPDATE tabs SET ${setClause.join(', ')} WHERE id = ?
    `);

    await stmt.run(...values, id);

    return updated;
  }

  /**
   * Update a tab's active status (deactivates all other tabs)
   */
  public async setActive(id: string, isActive: boolean): Promise<void> {
    // Manual transaction implementation
    await this.db.exec('BEGIN');
    try {
      // Deactivate all tabs
      const deactivateStmt = await this.db.prepare('UPDATE tabs SET is_active = 0');
      await deactivateStmt.run();

      // Activate the specified tab
      if (isActive) {
        const activateStmt = await this.db.prepare('UPDATE tabs SET is_active = 1 WHERE id = ?');
        await activateStmt.run(id);
      }
      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Delete a tab
   */
  public async delete(id: string): Promise<boolean> {
    const stmt = await this.db.prepare('DELETE FROM tabs WHERE id = ?');
    const result = await stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Update tab positions after reordering
   */
  public async updatePositions(updates: { id: string; position: number }[]): Promise<void> {
    // Manual transaction implementation
    await this.db.exec('BEGIN');
    try {
      const stmt = await this.db.prepare('UPDATE tabs SET position = ? WHERE id = ?');

      for (const update of updates) {
        await stmt.run(update.position, update.id);
      }
      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get the highest position number
   */
  public async getMaxPosition(): Promise<number> {
    const stmt = await this.db.prepare('SELECT MAX(position) as maxPosition FROM tabs');
    const result = await stmt.get() as { maxPosition: number | null };

    return result.maxPosition ?? 0;
  }

  /**
   * Update the last accessed timestamp for a tab
   */
  public async updateLastAccessed(id: string): Promise<void> {
    const stmt = await this.db.prepare(`
      UPDATE tabs SET last_accessed = ?, updated_at = ? WHERE id = ?
    `);

    const now = Date.now();
    await stmt.run(now, now, id);
  }

  /**
   * Get statistics about tabs
   */
  public async getStats(): Promise<{
    totalTabs: number;
    activeTabs: number;
    visibleTabs: number;
  }> {
    const totalStmt = await this.db.prepare('SELECT COUNT(*) as count FROM tabs');
    const activeStmt = await this.db.prepare('SELECT COUNT(*) as count FROM tabs WHERE is_active = 1');
    const visibleStmt = await this.db.prepare('SELECT COUNT(*) as count FROM tabs WHERE is_visible = 1');

    const total = await totalStmt.get() as { count: number };
    const active = await activeStmt.get() as { count: number };
    const visible = await visibleStmt.get() as { count: number };

    return {
      totalTabs: total.count,
      activeTabs: active.count,
      visibleTabs: visible.count
    };
  }

  /**
   * Map database row to Tab object
   */
  private mapRowToTab(row: any): Tab {
    return {
      id: row.id,
      name: row.name,
      connectionId: row.connection_id,
      isActive: Boolean(row.is_active),
      isVisible: Boolean(row.is_visible),
      position: row.position,
      lastAccessed: row.last_accessed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      windowState: row.window_state ? JSON.parse(row.window_state) : {
        width: 1200,
        height: 800,
        splitSizes: [50, 50]
      }
    };
  }
}

// Singleton instance
let tabModel: TabModel | null = null;

export function getTabModel(): TabModel {
  if (!tabModel) {
    tabModel = new TabModel();
  }
  return tabModel;
}