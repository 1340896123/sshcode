"use strict";
/**
 * Database service with connection pooling and error handling
 * Provides a high-level interface for database operations with automatic retry and logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = exports.databaseService = void 0;
const databasePool_1 = require("./databasePool");
/**
 * Default database options
 */
const DEFAULT_OPTIONS = {
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
    useTransaction: false
};
/**
 * Database service class
 */
class DatabaseService {
    constructor() {
        console.log('DatabaseService initialized');
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    /**
     * Execute a database query with automatic retry and error handling
     */
    async execute(queryFn, options = {}) {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const startTime = Date.now();
        let lastError;
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const result = await this.executeWithTimeout(queryFn, opts.timeoutMs);
                const executionTime = Date.now() - startTime;
                return {
                    success: true,
                    data: result,
                    executionTime,
                    retryCount: attempt
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Database operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}):`, lastError.message);
                if (attempt < opts.maxRetries) {
                    await this.delay(opts.retryDelayMs * Math.pow(2, attempt)); // Exponential backoff
                }
            }
        }
        const executionTime = Date.now() - startTime;
        console.error(`Database operation failed after ${opts.maxRetries + 1} attempts:`, lastError);
        return {
            success: false,
            error: lastError,
            executionTime,
            retryCount: opts.maxRetries
        };
    }
    /**
     * Execute a database transaction with automatic retry and error handling
     */
    async transaction(transactionFn, options = {}) {
        const opts = { ...DEFAULT_OPTIONS, ...options, useTransaction: true };
        const startTime = Date.now();
        let lastError;
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const result = await databasePool_1.databasePool.transaction(transactionFn);
                const executionTime = Date.now() - startTime;
                return {
                    success: true,
                    data: result,
                    executionTime,
                    retryCount: attempt
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Database transaction failed (attempt ${attempt + 1}/${opts.maxRetries + 1}):`, lastError.message);
                // Check if this is a retryable error
                if (!this.isRetryableError(lastError) || attempt === opts.maxRetries) {
                    break;
                }
                await this.delay(opts.retryDelayMs * Math.pow(2, attempt)); // Exponential backoff
            }
        }
        const executionTime = Date.now() - startTime;
        console.error(`Database transaction failed after ${opts.maxRetries + 1} attempts:`, lastError);
        return {
            success: false,
            error: lastError,
            executionTime,
            retryCount: opts.maxRetries
        };
    }
    /**
     * Execute a prepared statement with parameters
     */
    async prepareAndExecute(sql, params = [], options = {}) {
        return this.execute((connection) => {
            const stmt = connection.connection.prepare(sql);
            if (params.length > 0) {
                return stmt.run(...params);
            }
            else {
                return stmt.run();
            }
        }, options);
    }
    /**
     * Execute a query that returns results
     */
    async query(sql, params = [], options = {}) {
        return this.execute((connection) => {
            const stmt = connection.connection.prepare(sql);
            if (params.length > 0) {
                return stmt.all(...params);
            }
            else {
                return stmt.all();
            }
        }, options);
    }
    /**
     * Execute a query that returns a single result
     */
    async querySingle(sql, params = [], options = {}) {
        return this.execute((connection) => {
            const stmt = connection.connection.prepare(sql);
            if (params.length > 0) {
                return stmt.get(...params);
            }
            else {
                return stmt.get();
            }
        }, options);
    }
    /**
     * Check database health
     */
    async healthCheck() {
        return this.querySingle('SELECT 1 as status, ? as timestamp', [Date.now()], { maxRetries: 1, retryDelayMs: 100 });
    }
    /**
     * Get database statistics
     */
    async getStats() {
        const poolStats = databasePool_1.databasePool.getStats();
        try {
            // Get table row counts
            const tables = await this.query(`
        SELECT name as tableName,
               (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=t.name) as exists
        FROM sqlite_master t
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
            // Get database size
            const sizeResult = await this.querySingle(`
        SELECT SUM(page_count * page_size) as size
        FROM pragma_page_count(), pragma_page_size()
      `);
            return {
                success: true,
                data: {
                    poolStats,
                    tableStats: tables.data,
                    databaseSize: sizeResult.data?.size || 0
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                data: { poolStats, tableStats: [], databaseSize: 0 }
            };
        }
    }
    /**
     * Perform database maintenance
     */
    async maintenance() {
        console.log('Starting database maintenance...');
        try {
            // VACUUM the database
            console.log('Running VACUUM...');
            await this.execute((connection) => {
                connection.connection.exec('VACUUM');
                return true;
            }, { timeoutMs: 60000 }); // VACUUM can take a long time
            // ANALYZE the database
            console.log('Running ANALYZE...');
            await this.execute((connection) => {
                connection.connection.exec('ANALYZE');
                return true;
            });
            console.log('Database maintenance completed successfully');
            return {
                success: true,
                data: { vacuumed: true, analyzed: true }
            };
        }
        catch (error) {
            console.error('Database maintenance failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                data: { vacuumed: false, analyzed: false }
            };
        }
    }
    /**
     * Backup the database
     */
    async backup(backupPath) {
        return this.execute(async (connection) => {
            const fs = require('fs');
            const path = require('path');
            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            // For SQLite, we would use the backup API
            // For now, we'll copy the database file
            const dbPath = require('../database/init').getDatabase().getDatabasePath();
            fs.copyFileSync(dbPath, backupPath);
            return backupPath;
        });
    }
    /**
     * Close the database service
     */
    async close() {
        console.log('Closing DatabaseService...');
        await databasePool_1.databasePool.close();
        console.log('DatabaseService closed');
    }
    /**
     * Private helper methods
     */
    async executeWithTimeout(queryFn, timeoutMs) {
        if (timeoutMs <= 0) {
            return await databasePool_1.databasePool.execute(queryFn);
        }
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Database operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            try {
                const result = await databasePool_1.databasePool.execute(queryFn);
                clearTimeout(timeout);
                resolve(result);
            }
            catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
    isRetryableError(error) {
        // Define which errors are retryable
        const retryablePatterns = [
            /database is locked/i,
            /connection is closed/i,
            /timeout/i,
            /connection reset/i,
            /connection refused/i
        ];
        return retryablePatterns.some(pattern => pattern.test(error.message));
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.DatabaseService = DatabaseService;
// Export singleton instance
exports.databaseService = DatabaseService.getInstance();
