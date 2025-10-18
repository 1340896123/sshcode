"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionModel = void 0;
exports.getConnectionModel = getConnectionModel;
const init_1 = require("../init");
const uuid_1 = require("uuid");
class ConnectionModel {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, init_1.getDatabase)().getDatabase()
        });
    }
    /**
     * Create a new connection
     */
    async create(data) {
        const now = Date.now();
        const connection = {
            ...data,
            id: (0, uuid_1.v4)(),
            bytesTransferred: { sent: 0, received: 0 },
            memoryUsage: 0,
            terminalLines: 0,
            errorCount: 0,
            reconnectAttempts: 0,
            healthStatus: 'healthy',
            createdAt: now,
            updatedAt: now
        };
        const stmt = await this.db.prepare(`
      INSERT INTO connections (
        id, name, host, port, username, auth_type, status,
        last_connected, max_reconnect_attempts, connected_at,
        latency, bytes_sent, bytes_received, memory_usage,
        terminal_lines, last_health_check, health_status,
        error_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        await stmt.run(connection.id, connection.name, connection.host, connection.port, connection.username, connection.authType, connection.status, connection.lastConnected, connection.maxReconnectAttempts, connection.connectedAt, connection.latency, connection.bytesTransferred.sent, connection.bytesTransferred.received, connection.memoryUsage, connection.terminalLines, connection.lastHealthCheck, connection.healthStatus, connection.errorCount, connection.createdAt, connection.updatedAt);
        return connection;
    }
    /**
     * Get a connection by ID
     */
    async findById(id) {
        const stmt = await this.db.prepare('SELECT * FROM connections WHERE id = ?');
        const row = await stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToConnection(row);
    }
    /**
     * Get all connections
     */
    async findAll() {
        const stmt = await this.db.prepare('SELECT * FROM connections ORDER BY name');
        const rows = await stmt.all();
        return rows.map(row => this.mapRowToConnection(row));
    }
    /**
     * Get connections by status
     */
    async findByStatus(status) {
        const stmt = await this.db.prepare('SELECT * FROM connections WHERE status = ? ORDER BY name');
        const rows = await stmt.all(status);
        return rows.map(row => this.mapRowToConnection(row));
    }
    /**
     * Get active connections
     */
    async findActive() {
        const stmt = await this.db.prepare('SELECT * FROM connections WHERE status IN (?, ?) ORDER BY name');
        const rows = await stmt.all('connected', 'connecting');
        return rows.map(row => this.mapRowToConnection(row));
    }
    /**
     * Update a connection
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
        if (updates.host !== undefined) {
            setClause.push('host = ?');
            values.push(updates.host);
        }
        if (updates.port !== undefined) {
            setClause.push('port = ?');
            values.push(updates.port);
        }
        if (updates.username !== undefined) {
            setClause.push('username = ?');
            values.push(updates.username);
        }
        if (updates.authType !== undefined) {
            setClause.push('auth_type = ?');
            values.push(updates.authType);
        }
        if (updates.status !== undefined) {
            setClause.push('status = ?');
            values.push(updates.status);
        }
        if (updates.lastConnected !== undefined) {
            setClause.push('last_connected = ?');
            values.push(updates.lastConnected);
        }
        if (updates.reconnectAttempts !== undefined) {
            setClause.push('reconnect_attempts = ?');
            values.push(updates.reconnectAttempts);
        }
        if (updates.maxReconnectAttempts !== undefined) {
            setClause.push('max_reconnect_attempts = ?');
            values.push(updates.maxReconnectAttempts);
        }
        if (updates.connectedAt !== undefined) {
            setClause.push('connected_at = ?');
            values.push(updates.connectedAt);
        }
        if (updates.latency !== undefined) {
            setClause.push('latency = ?');
            values.push(updates.latency);
        }
        if (updates.bytesTransferred !== undefined) {
            setClause.push('bytes_sent = ?, bytes_received = ?');
            values.push(updates.bytesTransferred.sent, updates.bytesTransferred.received);
        }
        if (updates.memoryUsage !== undefined) {
            setClause.push('memory_usage = ?');
            values.push(updates.memoryUsage);
        }
        if (updates.terminalLines !== undefined) {
            setClause.push('terminal_lines = ?');
            values.push(updates.terminalLines);
        }
        if (updates.lastHealthCheck !== undefined) {
            setClause.push('last_health_check = ?');
            values.push(updates.lastHealthCheck);
        }
        if (updates.healthStatus !== undefined) {
            setClause.push('health_status = ?');
            values.push(updates.healthStatus);
        }
        if (updates.errorCount !== undefined) {
            setClause.push('error_count = ?');
            values.push(updates.errorCount);
        }
        setClause.push('updated_at = ?');
        values.push(updated.updatedAt);
        const stmt = await this.db.prepare(`
      UPDATE connections SET ${setClause.join(', ')} WHERE id = ?
    `);
        await stmt.run(...values, id);
        return updated;
    }
    /**
     * Update connection status
     */
    async updateStatus(id, status) {
        const now = Date.now();
        const stmt = await this.db.prepare(`
      UPDATE connections SET status = ?, updated_at = ? WHERE id = ?
    `);
        await stmt.run(status, now, id);
        // Update connected_at if connecting to connected
        if (status === 'connected') {
            const updateConnectedAt = await this.db.prepare(`
        UPDATE connections SET connected_at = ? WHERE id = ?
      `);
            await updateConnectedAt.run(now, id);
        }
    }
    /**
     * Update bytes transferred
     */
    async updateBytesTransferred(id, bytesSent, bytesReceived) {
        const stmt = await this.db.prepare(`
      UPDATE connections SET
        bytes_sent = bytes_sent + ?,
        bytes_received = bytes_received + ?,
        updated_at = ?
      WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(bytesSent, bytesReceived, now, id);
    }
    /**
     * Increment error count
     */
    async incrementErrorCount(id) {
        const stmt = await this.db.prepare(`
      UPDATE connections SET
        error_count = error_count + 1,
        updated_at = ?
      WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(now, id);
    }
    /**
     * Update health status
     */
    async updateHealthStatus(id, healthStatus) {
        const now = Date.now();
        const stmt = await this.db.prepare(`
      UPDATE connections SET
        health_status = ?,
        last_health_check = ?,
        updated_at = ?
      WHERE id = ?
    `);
        await stmt.run(healthStatus, now, now, id);
    }
    /**
     * Update performance metrics
     */
    async updatePerformanceMetrics(id, metrics) {
        const setClause = [];
        const values = [];
        if (metrics.latency !== undefined) {
            setClause.push('latency = ?');
            values.push(metrics.latency);
        }
        if (metrics.memoryUsage !== undefined) {
            setClause.push('memory_usage = ?');
            values.push(metrics.memoryUsage);
        }
        if (metrics.terminalLines !== undefined) {
            setClause.push('terminal_lines = ?');
            values.push(metrics.terminalLines);
        }
        if (setClause.length === 0)
            return;
        setClause.push('updated_at = ?');
        values.push(Date.now(), id);
        const stmt = await this.db.prepare(`
      UPDATE connections SET ${setClause.join(', ')} WHERE id = ?
    `);
        await stmt.run(...values);
    }
    /**
     * Reset reconnect attempts
     */
    async resetReconnectAttempts(id) {
        const stmt = await this.db.prepare(`
      UPDATE connections SET
        reconnect_attempts = 0,
        updated_at = ?
      WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(now, id);
    }
    /**
     * Increment reconnect attempts
     */
    async incrementReconnectAttempts(id) {
        const stmt = await this.db.prepare(`
      UPDATE connections SET
        reconnect_attempts = reconnect_attempts + 1,
        updated_at = ?
      WHERE id = ?
    `);
        const now = Date.now();
        await stmt.run(now, id);
    }
    /**
     * Delete a connection
     */
    async delete(id) {
        const stmt = await this.db.prepare('DELETE FROM connections WHERE id = ?');
        const result = await stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Get connection statistics
     */
    async getStats() {
        const totalStmt = await this.db.prepare('SELECT COUNT(*) as count FROM connections');
        const connectedStmt = await this.db.prepare('SELECT COUNT(*) as count FROM connections WHERE status = ?');
        const failedStmt = await this.db.prepare('SELECT COUNT(*) as count FROM connections WHERE status = ?');
        const latencyStmt = await this.db.prepare('SELECT AVG(latency) as avgLatency FROM connections WHERE latency IS NOT NULL');
        const bytesStmt = await this.db.prepare('SELECT SUM(bytes_sent) as sent, SUM(bytes_received) as received FROM connections');
        const total = await totalStmt.get();
        const connected = await connectedStmt.get('connected');
        const failed = await failedStmt.get('failed');
        const latency = await latencyStmt.get();
        const bytes = await bytesStmt.get();
        return {
            totalConnections: total.count,
            connectedConnections: connected.count,
            failedConnections: failed.count,
            averageLatency: latency.avgLatency ?? 0,
            totalBytesTransferred: {
                sent: bytes.sent ?? 0,
                received: bytes.received ?? 0
            }
        };
    }
    /**
     * Get connections that need health check
     */
    async getConnectionsNeedingHealthCheck(checkInterval) {
        const cutoffTime = Date.now() - checkInterval;
        const stmt = await this.db.prepare(`
      SELECT * FROM connections
      WHERE status IN (?, ?) AND (last_health_check IS NULL OR last_health_check < ?)
      ORDER BY last_health_check ASC NULLS FIRST
    `);
        const rows = await stmt.all('connected', 'connecting', cutoffTime);
        return rows.map(row => this.mapRowToConnection(row));
    }
    /**
     * Search connections by name or host
     */
    async search(query) {
        const stmt = await this.db.prepare(`
      SELECT * FROM connections
      WHERE name LIKE ? OR host LIKE ? OR username LIKE ?
      ORDER BY name
    `);
        const searchPattern = `%${query}%`;
        const rows = await stmt.all(searchPattern, searchPattern, searchPattern);
        return rows.map(row => this.mapRowToConnection(row));
    }
    /**
     * Map database row to Connection object
     */
    mapRowToConnection(row) {
        return {
            id: row.id,
            name: row.name,
            host: row.host,
            port: row.port,
            username: row.username,
            authType: row.auth_type,
            status: row.status,
            lastConnected: row.last_connected,
            reconnectAttempts: row.reconnect_attempts,
            maxReconnectAttempts: row.max_reconnect_attempts,
            connectedAt: row.connected_at,
            latency: row.latency,
            bytesTransferred: {
                sent: row.bytes_sent,
                received: row.bytes_received
            },
            memoryUsage: row.memory_usage,
            terminalLines: row.terminal_lines,
            lastHealthCheck: row.last_health_check,
            healthStatus: row.health_status,
            errorCount: row.error_count,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.ConnectionModel = ConnectionModel;
// Singleton instance
let connectionModel = null;
function getConnectionModel() {
    if (!connectionModel) {
        connectionModel = new ConnectionModel();
    }
    return connectionModel;
}
