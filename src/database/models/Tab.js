"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabModel = void 0;
exports.getTabModel = getTabModel;
const init_1 = require("../init");
const uuid_1 = require("uuid");
class TabModel {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, init_1.getDatabase)().getDatabase()
        });
    }
    /**
     * Create a new tab
     */
    async create(data) {
        const now = Date.now();
        const tab = {
            ...data,
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now
        };
        const stmt = await this.db.prepare(`INSERT INTO tabs (
        id, name, connection_id, is_active, is_visible, position,
        last_accessed, created_at, updated_at, window_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const result = await stmt.run(tab.id, tab.name, tab.connectionId, tab.isActive ? 1 : 0, tab.isVisible ? 1 : 0, tab.position, tab.lastAccessed, tab.createdAt, tab.updatedAt, JSON.stringify(tab.windowState));
        if (result.changes === 0) {
            throw new Error(`Failed to create tab: No rows inserted`);
        }
        return tab;
    }
    /**
     * Get a tab by ID
     */
    async findById(id) {
        const stmt = await this.db.prepare('SELECT * FROM tabs WHERE id = ?');
        const row = await stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToTab(row);
    }
    /**
     * Get all tabs, ordered by position
     */
    async findAll() {
        const stmt = await this.db.prepare('SELECT * FROM tabs ORDER BY position');
        const rows = await stmt.all();
        return rows.map(row => this.mapRowToTab(row));
    }
    /**
     * Get all tabs for a connection
     */
    async findByConnectionId(connectionId) {
        const stmt = await this.db.prepare('SELECT * FROM tabs WHERE connection_id = ? ORDER BY position');
        const rows = await stmt.all(connectionId);
        return rows.map(row => this.mapRowToTab(row));
    }
    /**
     * Get the active tab
     */
    async findActive() {
        const stmt = await this.db.prepare('SELECT * FROM tabs WHERE is_active = 1 LIMIT 1');
        const row = await stmt.get();
        if (!row)
            return null;
        return this.mapRowToTab(row);
    }
    /**
     * Update a tab
     */
    async update(id, updates) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        const updated = {
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
    async setActive(id, isActive) {
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
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Delete a tab
     */
    async delete(id) {
        const stmt = await this.db.prepare('DELETE FROM tabs WHERE id = ?');
        const result = await stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Update tab positions after reordering
     */
    async updatePositions(updates) {
        // Manual transaction implementation
        await this.db.exec('BEGIN');
        try {
            const stmt = await this.db.prepare('UPDATE tabs SET position = ? WHERE id = ?');
            for (const update of updates) {
                await stmt.run(update.position, update.id);
            }
            await this.db.exec('COMMIT');
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Get the highest position number
     */
    async getMaxPosition() {
        const stmt = await this.db.prepare('SELECT MAX(position) as maxPosition FROM tabs');
        const result = await stmt.get();
        return result.maxPosition ?? 0;
    }
    /**
     * Update the last accessed timestamp for a tab
     */
    async updateLastAccessed(id) {
        const stmt = await this.db.prepare(`
      UPDATE tabs SET last_accessed = ?, updated_at = ? WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(now, now, id);
    }
    /**
     * Get statistics about tabs
     */
    async getStats() {
        const totalStmt = await this.db.prepare('SELECT COUNT(*) as count FROM tabs');
        const activeStmt = await this.db.prepare('SELECT COUNT(*) as count FROM tabs WHERE is_active = 1');
        const visibleStmt = await this.db.prepare('SELECT COUNT(*) as count FROM tabs WHERE is_visible = 1');
        const total = await totalStmt.get();
        const active = await activeStmt.get();
        const visible = await visibleStmt.get();
        return {
            totalTabs: total.count,
            activeTabs: active.count,
            visibleTabs: visible.count
        };
    }
    /**
     * Map database row to Tab object
     */
    mapRowToTab(row) {
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
exports.TabModel = TabModel;
// Singleton instance
let tabModel = null;
function getTabModel() {
    if (!tabModel) {
        tabModel = new TabModel();
    }
    return tabModel;
}
