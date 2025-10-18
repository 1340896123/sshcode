"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionModel = void 0;
exports.getSessionModel = getSessionModel;
const init_1 = require("../init");
const uuid_1 = require("uuid");
class SessionModel {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, init_1.getDatabase)().getDatabase()
        });
    }
    /**
     * Create a new session
     */
    async create(data) {
        const now = Date.now();
        const session = {
            ...data,
            id: (0, uuid_1.v4)(),
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
        await stmt.run(session.id, session.connectionId, session.tabId, session.workingDirectory, JSON.stringify(session.environment), JSON.stringify(session.shellState), JSON.stringify(session.terminalState), JSON.stringify(session.fileManagerState), JSON.stringify(session.aiAssistantState), session.isolationLevel, session.createdAt, session.lastActivity, session.memoryUsage, session.isActive ? 1 : 0, session.healthStatus);
        return session;
    }
    /**
     * Get a session by ID
     */
    async findById(id) {
        const stmt = await this.db.prepare('SELECT * FROM sessions WHERE id = ?');
        const row = await stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToSession(row);
    }
    /**
     * Get session by tab ID
     */
    async findByTabId(tabId) {
        const stmt = await this.db.prepare('SELECT * FROM sessions WHERE tab_id = ?');
        const row = await stmt.get(tabId);
        if (!row)
            return null;
        return this.mapRowToSession(row);
    }
    /**
     * Get sessions by connection ID
     */
    async findByConnectionId(connectionId) {
        const stmt = await this.db.prepare('SELECT * FROM sessions WHERE connection_id = ? ORDER BY last_activity DESC');
        const rows = await stmt.all(connectionId);
        return rows.map(row => this.mapRowToSession(row));
    }
    /**
     * Get all active sessions
     */
    async findActive() {
        const stmt = await this.db.prepare('SELECT * FROM sessions WHERE is_active = 1 ORDER BY last_activity DESC');
        const rows = await stmt.all();
        return rows.map(row => this.mapRowToSession(row));
    }
    /**
     * Get all sessions
     */
    async findAll() {
        const stmt = await this.db.prepare('SELECT * FROM sessions ORDER BY last_activity DESC');
        const rows = await stmt.all();
        return rows.map(row => this.mapRowToSession(row));
    }
    /**
     * Get sessions by health status
     */
    async findByHealthStatus(healthStatus) {
        const stmt = await this.db.prepare('SELECT * FROM sessions WHERE health_status = ? ORDER BY last_activity DESC');
        const rows = await stmt.all(healthStatus);
        return rows.map(row => this.mapRowToSession(row));
    }
    /**
     * Update a session
     */
    async update(id, updates) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        const updated = {
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
    async updateActivity(id) {
        const stmt = await this.db.prepare(`
      UPDATE sessions SET last_activity = ? WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(now, id);
    }
    /**
     * Update session memory usage
     */
    async updateMemoryUsage(id, memoryUsage) {
        const stmt = await this.db.prepare(`
      UPDATE sessions SET memory_usage = ?, last_activity = ? WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(memoryUsage, now, id);
    }
    /**
     * Update session health status
     */
    async updateHealthStatus(id, healthStatus) {
        const stmt = await this.db.prepare(`
      UPDATE sessions SET health_status = ?, last_activity = ? WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(healthStatus, now, id);
    }
    /**
     * Update working directory
     */
    async updateWorkingDirectory(id, workingDirectory) {
        const stmt = await this.db.prepare(`
      UPDATE sessions SET working_directory = ?, last_activity = ? WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(workingDirectory, now, id);
    }
    /**
     * Activate/deactivate a session
     */
    async setActive(id, isActive) {
        const stmt = await this.db.prepare(`
      UPDATE sessions SET is_active = ?, last_activity = ? WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(isActive ? 1 : 0, now, id);
    }
    /**
     * Delete a session
     */
    async delete(id) {
        const stmt = await this.db.prepare('DELETE FROM sessions WHERE id = ?');
        const result = await stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Delete sessions by connection ID
     */
    async deleteByConnectionId(connectionId) {
        const stmt = await this.db.prepare('DELETE FROM sessions WHERE connection_id = ?');
        const result = await stmt.run(connectionId);
        return result.changes;
    }
    /**
     * Delete sessions by tab ID
     */
    async deleteByTabId(tabId) {
        const stmt = await this.db.prepare('DELETE FROM sessions WHERE tab_id = ?');
        const result = await stmt.run(tabId);
        return result.changes > 0;
    }
    /**
     * Clean up inactive sessions (older than specified time)
     */
    async cleanupInactive(olderThan) {
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
    async getStats() {
        const totalStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions');
        const activeStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1');
        const healthyStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE health_status = ?');
        const unhealthyStmt = await this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE health_status != ?');
        const memoryStmt = await this.db.prepare('SELECT SUM(memory_usage) as total, AVG(memory_usage) as average FROM sessions');
        const total = await totalStmt.get();
        const active = await activeStmt.get();
        const healthy = await healthyStmt.get('healthy');
        const unhealthy = await unhealthyStmt.get('healthy');
        const memory = await memoryStmt.get();
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
    async getHighMemorySessions(threshold) {
        const stmt = await this.db.prepare('SELECT * FROM sessions WHERE memory_usage > ? ORDER BY memory_usage DESC');
        const rows = await stmt.all(threshold);
        return rows.map(row => this.mapRowToSession(row));
    }
    /**
     * Get sessions needing health check (older than specified interval)
     */
    async getSessionsNeedingHealthCheck(checkInterval) {
        const cutoffTime = Date.now() - checkInterval;
        const stmt = await this.db.prepare(`
      SELECT * FROM sessions
      WHERE is_active = 1 AND last_activity < ?
      ORDER BY last_activity ASC
    `);
        const rows = await stmt.all(cutoffTime);
        return rows.map(row => this.mapRowToSession(row));
    }
    /**
     * Search sessions by working directory or tab name
     */
    async search(query) {
        const stmt = await this.db.prepare(`
      SELECT s.* FROM sessions s
      JOIN tabs t ON s.tab_id = t.id
      WHERE s.working_directory LIKE ? OR t.name LIKE ?
      ORDER BY s.last_activity DESC
    `);
        const searchPattern = `%${query}%`;
        const rows = await stmt.all(searchPattern, searchPattern);
        return rows.map(row => this.mapRowToSession(row));
    }
    /**
     * Batch update session activities
     */
    async batchUpdateActivities(sessionIds) {
        if (sessionIds.length === 0)
            return;
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
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Map database row to Session object
     */
    mapRowToSession(row) {
        try {
            return {
                id: row.id,
                connectionId: row.connection_id,
                tabId: row.tab_id,
                sshConnection: null, // Will be restored by session manager
                shellStream: null, // Will be restored by session manager
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
                healthStatus: row.health_status
            };
        }
        catch (error) {
            console.error(`Failed to map session row to object: ${row.id}`, error);
            throw new Error(`Invalid session data in database for session ${row.id}`);
        }
    }
}
exports.SessionModel = SessionModel;
// Singleton instance
let sessionModel = null;
function getSessionModel() {
    if (!sessionModel) {
        sessionModel = new SessionModel();
    }
    return sessionModel;
}
