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
        const stmt = this.db.prepare(`INSERT INTO tabs (
        id, name, connection_id, is_active, is_visible, position,
        last_accessed, created_at, updated_at, window_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const result = stmt.run(tab.id, tab.name, tab.connectionId, tab.isActive ? 1 : 0, tab.isVisible ? 1 : 0, tab.position, tab.lastAccessed, tab.createdAt, tab.updatedAt, JSON.stringify(tab.windowState));
        if (result.changes === 0) {
            throw new Error(`Failed to create tab: No rows inserted`);
        }
        return tab;
    }
    /**
     * Get a tab by ID
     */
    async findById(id) {
        const stmt = this.db.prepare('SELECT * FROM tabs WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToTab(row);
    }
    /**
     * Get all tabs, ordered by position
     */
    findAll() {
        const stmt = this.db.prepare('SELECT * FROM tabs ORDER BY position');
        const rows = stmt.all();
        return rows.map(row => this.mapRowToTab(row));
    }
    /**
     * Get all tabs for a connection
     */
    findByConnectionId(connectionId) {
        const stmt = this.db.prepare('SELECT * FROM tabs WHERE connection_id = ? ORDER BY position');
        const rows = stmt.all(connectionId);
        return rows.map(row => this.mapRowToTab(row));
    }
    /**
     * Get the active tab
     */
    findActive() {
        const stmt = this.db.prepare('SELECT * FROM tabs WHERE is_active = 1 LIMIT 1');
        const row = stmt.get();
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
        const stmt = this.db.prepare(`
      UPDATE tabs SET ${setClause.join(', ')} WHERE id = ?
    `);
        stmt.run(...values, id);
        return updated;
    }
    /**
     * Update a tab's active status (deactivates all other tabs)
     */
    setActive(id, isActive) {
        const db = this.db;
        db.transaction(() => {
            // Deactivate all tabs
            const deactivateStmt = db.prepare('UPDATE tabs SET is_active = 0');
            deactivateStmt.run();
            // Activate the specified tab
            if (isActive) {
                const activateStmt = db.prepare('UPDATE tabs SET is_active = 1 WHERE id = ?');
                activateStmt.run(id);
            }
        })();
    }
    /**
     * Delete a tab
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM tabs WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Update tab positions after reordering
     */
    updatePositions(updates) {
        const db = this.db;
        db.transaction(() => {
            const stmt = db.prepare('UPDATE tabs SET position = ? WHERE id = ?');
            for (const update of updates) {
                stmt.run(update.position, update.id);
            }
        })();
    }
    /**
     * Get the highest position number
     */
    getMaxPosition() {
        const stmt = this.db.prepare('SELECT MAX(position) as maxPosition FROM tabs');
        const result = stmt.get();
        return result.maxPosition ?? 0;
    }
    /**
     * Update the last accessed timestamp for a tab
     */
    updateLastAccessed(id) {
        const stmt = this.db.prepare(`
      UPDATE tabs SET last_accessed = ?, updated_at = ? WHERE id = ?
    `);
        const now = Date.now();
        stmt.run(now, now, id);
    }
    /**
     * Get statistics about tabs
     */
    getStats() {
        const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM tabs');
        const activeStmt = this.db.prepare('SELECT COUNT(*) as count FROM tabs WHERE is_active = 1');
        const visibleStmt = this.db.prepare('SELECT COUNT(*) as count FROM tabs WHERE is_visible = 1');
        return {
            totalTabs: totalStmt.get().count,
            activeTabs: activeStmt.get().count,
            visibleTabs: visibleStmt.get().count
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
