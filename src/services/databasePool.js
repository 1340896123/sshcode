"use strict";
/**
 * Database connection pooling service
 * Provides connection pooling and error handling for SQLite operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasePoolService = exports.databasePool = void 0;
const init_1 = require("../database/init");
/**
 * Default pool configuration
 */
const DEFAULT_POOL_CONFIG = {
    maxConnections: 10,
    minConnections: 2,
    acquireTimeoutMs: 30000,
    idleTimeoutMs: 300000, // 5 minutes
    createTimeoutMs: 10000,
    destroyTimeoutMs: 5000,
    reapIntervalMs: 60000, // 1 minute
    createRetryIntervalMs: 1000
};
/**
 * Database connection pool service
 */
class DatabasePoolService {
    constructor(config = {}) {
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "connections", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "waitingQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "reapingInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "isClosing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.config = { ...DEFAULT_POOL_CONFIG, ...config };
        this.startReaping();
        console.log('Database connection pool initialized with config:', this.config);
    }
    /**
     * Get singleton instance
     */
    static getInstance(config) {
        if (!DatabasePoolService.instance) {
            DatabasePoolService.instance = new DatabasePoolService(config);
        }
        return DatabasePoolService.instance;
    }
    /**
     * Acquire a connection from the pool
     */
    async acquire() {
        if (this.isClosing) {
            throw new Error('Connection pool is closing');
        }
        // Try to find an available connection
        const availableConnection = this.findAvailableConnection();
        if (availableConnection) {
            return this.markConnectionInUse(availableConnection);
        }
        // If we can create more connections, create a new one
        if (this.connections.size < this.config.maxConnections) {
            return await this.createNewConnection();
        }
        // Wait for a connection to become available
        return await this.waitForConnection();
    }
    /**
     * Release a connection back to the pool
     */
    release(connection) {
        if (!this.connections.has(connection.id)) {
            console.warn('Attempted to release unknown connection:', connection.id);
            return;
        }
        connection.inUse = false;
        connection.lastUsedAt = Date.now();
        // Check if anyone is waiting for this connection
        const waitingIndex = this.waitingQueue.findIndex(item => {
            if (Date.now() - item.createdAt > this.config.acquireTimeoutMs) {
                // Request has timed out
                clearTimeout(item.timeout);
                item.reject(new Error('Connection acquire timeout'));
                return true;
            }
            return false;
        });
        if (waitingIndex >= 0) {
            const waiting = this.waitingQueue.splice(waitingIndex, 1)[0];
            clearTimeout(waiting.timeout);
            this.markConnectionInUse(connection);
            waiting.resolve(connection);
        }
    }
    /**
     * Execute a query with automatic connection management
     */
    async execute(queryFn) {
        const connection = await this.acquire();
        try {
            return await queryFn(connection);
        }
        finally {
            this.release(connection);
        }
    }
    /**
     * Execute a transaction with automatic connection management
     */
    async transaction(transactionFn) {
        const connection = await this.acquire();
        try {
            // Begin transaction
            connection.connection.exec('BEGIN TRANSACTION');
            const result = await transactionFn(connection);
            // Commit transaction
            connection.connection.exec('COMMIT');
            return result;
        }
        catch (error) {
            // Rollback transaction
            try {
                connection.connection.exec('ROLLBACK');
            }
            catch (rollbackError) {
                console.error('Failed to rollback transaction:', rollbackError);
            }
            throw error;
        }
        finally {
            this.release(connection);
        }
    }
    /**
     * Get pool statistics
     */
    getStats() {
        const activeConnections = Array.from(this.connections.values()).filter(c => c.inUse).length;
        const idleConnections = this.connections.size - activeConnections;
        return {
            totalConnections: this.connections.size,
            activeConnections,
            idleConnections,
            waitingRequests: this.waitingQueue.length,
            config: { ...this.config }
        };
    }
    /**
     * Close all connections and stop the pool
     */
    async close() {
        if (this.isClosing) {
            return;
        }
        this.isClosing = true;
        // Stop reaping
        if (this.reapingInterval) {
            clearInterval(this.reapingInterval);
            this.reapingInterval = null;
        }
        // Reject all waiting requests
        const waitingRequests = this.waitingQueue.splice(0);
        waitingRequests.forEach(request => {
            clearTimeout(request.timeout);
            request.reject(new Error('Connection pool is closing'));
        });
        // Close all connections
        const closePromises = Array.from(this.connections.values()).map(connection => this.destroyConnection(connection));
        await Promise.all(closePromises);
        this.connections.clear();
        console.log('Database connection pool closed');
    }
    /**
     * Validate all connections in the pool
     */
    validateConnections() {
        let validConnections = 0;
        let invalidConnections = 0;
        for (const connection of this.connections.values()) {
            if (connection.validate()) {
                validConnections++;
            }
            else {
                invalidConnections++;
                console.warn(`Invalid connection found: ${connection.id}`);
                this.destroyConnection(connection).catch(error => {
                    console.error('Failed to destroy invalid connection:', error);
                });
            }
        }
        return {
            validConnections,
            invalidConnections,
            totalConnections: this.connections.size
        };
    }
    /**
     * Resize the pool to a new max connection count
     */
    async resize(newMaxConnections) {
        const oldMaxConnections = this.config.maxConnections;
        this.config.maxConnections = newMaxConnections;
        if (newMaxConnections < oldMaxConnections) {
            // Need to destroy excess connections
            const connectionsToDestroy = Math.max(0, this.connections.size - newMaxConnections);
            const idleConnections = Array.from(this.connections.values())
                .filter(c => !c.inUse)
                .slice(0, connectionsToDestroy);
            await Promise.all(idleConnections.map(conn => this.destroyConnection(conn)));
        }
        console.log(`Pool resized from ${oldMaxConnections} to ${newMaxConnections} connections`);
    }
    /**
     * Private methods
     */
    findAvailableConnection() {
        for (const connection of this.connections.values()) {
            if (!connection.inUse && connection.validate()) {
                return connection;
            }
        }
        return null;
    }
    markConnectionInUse(connection) {
        connection.inUse = true;
        connection.useCount++;
        connection.lastUsedAt = Date.now();
        return connection;
    }
    async createNewConnection() {
        const id = this.generateConnectionId();
        const startTime = Date.now();
        try {
            const dbConnection = (0, init_1.getDatabase)().getDatabase();
            const pooledConnection = {
                id,
                connection: dbConnection,
                createdAt: Date.now(),
                lastUsedAt: Date.now(),
                inUse: true,
                useCount: 1,
                validate: () => this.validateConnection(pooledConnection),
                destroy: () => this.destroyConnection(pooledConnection)
            };
            this.connections.set(id, pooledConnection);
            console.log(`Created new database connection: ${id}`);
            return pooledConnection;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error(`Failed to create database connection after ${duration}ms:`, error);
            throw new Error(`Failed to create database connection: ${error.message}`);
        }
    }
    async waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
                if (index >= 0) {
                    this.waitingQueue.splice(index, 1);
                }
                reject(new Error('Connection acquire timeout'));
            }, this.config.acquireTimeoutMs);
            this.waitingQueue.push({
                resolve,
                reject,
                timeout,
                createdAt: Date.now()
            });
        });
    }
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    validateConnection(connection) {
        try {
            // Simple validation - try to execute a simple query
            connection.connection.prepare('SELECT 1').get();
            return true;
        }
        catch (error) {
            console.warn(`Connection validation failed for ${connection.id}:`, error);
            return false;
        }
    }
    async destroyConnection(connection) {
        try {
            this.connections.delete(connection.id);
            // For SQLite, we don't need to close individual connections
            // as they share the same underlying database instance
            console.log(`Destroyed database connection: ${connection.id}`);
        }
        catch (error) {
            console.error(`Failed to destroy connection ${connection.id}:`, error);
        }
    }
    startReaping() {
        this.reapingInterval = setInterval(() => {
            this.reapIdleConnections();
        }, this.config.reapIntervalMs);
    }
    reapIdleConnections() {
        if (this.isClosing) {
            return;
        }
        const now = Date.now();
        const connectionsToReap = [];
        for (const connection of this.connections.values()) {
            if (!connection.inUse &&
                this.connections.size > this.config.minConnections &&
                (now - connection.lastUsedAt) > this.config.idleTimeoutMs) {
                connectionsToReap.push(connection);
            }
        }
        if (connectionsToReap.length > 0) {
            console.log(`Reaping ${connectionsToReap.length} idle connections`);
            connectionsToReap.forEach(connection => {
                this.destroyConnection(connection).catch(error => {
                    console.error(`Failed to reap connection ${connection.id}:`, error);
                });
            });
        }
    }
}
exports.DatabasePoolService = DatabasePoolService;
// Export singleton instance
exports.databasePool = DatabasePoolService.getInstance();
