/**
 * Database service with connection pooling and error handling
 * Provides a high-level interface for database operations with automatic retry and logging
 */

import { databasePool } from './databasePool';
import type { PooledConnection } from './databasePool';

/**
 * Database operation options
 */
interface DatabaseOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  useTransaction?: boolean;
}

/**
 * Database operation result
 */
interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  executionTime?: number;
  retryCount?: number;
}

/**
 * Default database options
 */
const DEFAULT_OPTIONS: Required<DatabaseOptions> = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  useTransaction: false
};

/**
 * Database service class
 */
class DatabaseService {
  private static instance: DatabaseService;

  constructor() {
    console.log('DatabaseService initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Execute a database query with automatic retry and error handling
   */
  public async execute<T = any>(
    queryFn: (connection: PooledConnection) => T,
    options: DatabaseOptions = {}
  ): Promise<DatabaseResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;

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
      } catch (error) {
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
  public async transaction<T = any>(
    transactionFn: (connection: PooledConnection) => T,
    options: DatabaseOptions = {}
  ): Promise<DatabaseResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options, useTransaction: true };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await databasePool.transaction(transactionFn);
        const executionTime = Date.now() - startTime;

        return {
          success: true,
          data: result,
          executionTime,
          retryCount: attempt
        };
      } catch (error) {
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
  public async prepareAndExecute<T = any>(
    sql: string,
    params: any[] = [],
    options: DatabaseOptions = {}
  ): Promise<DatabaseResult<T>> {
    return this.execute((connection) => {
      const stmt = connection.connection.prepare(sql);
      if (params.length > 0) {
        return stmt.run(...params);
      } else {
        return stmt.run();
      }
    }, options);
  }

  /**
   * Execute a query that returns results
   */
  public async query<T = any>(
    sql: string,
    params: any[] = [],
    options: DatabaseOptions = {}
  ): Promise<DatabaseResult<T[]>> {
    return this.execute((connection) => {
      const stmt = connection.connection.prepare(sql);
      if (params.length > 0) {
        return stmt.all(...params);
      } else {
        return stmt.all();
      }
    }, options);
  }

  /**
   * Execute a query that returns a single result
   */
  public async querySingle<T = any>(
    sql: string,
    params: any[] = [],
    options: DatabaseOptions = {}
  ): Promise<DatabaseResult<T | null>> {
    return this.execute((connection) => {
      const stmt = connection.connection.prepare(sql);
      if (params.length > 0) {
        return stmt.get(...params);
      } else {
        return stmt.get();
      }
    }, options);
  }

  /**
   * Check database health
   */
  public async healthCheck(): Promise<DatabaseResult<{ status: string; timestamp: number }>> {
    return this.querySingle(
      'SELECT 1 as status, ? as timestamp',
      [Date.now()],
      { maxRetries: 1, retryDelayMs: 100 }
    );
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<DatabaseResult<{
    poolStats: any;
    tableStats: any;
    databaseSize: number;
  }>> {
    const poolStats = databasePool.getStats();

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
    } catch (error) {
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
  public async maintenance(): Promise<DatabaseResult<{ vacuumed: boolean; analyzed: boolean }>> {
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
    } catch (error) {
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
  public async backup(backupPath: string): Promise<DatabaseResult<string>> {
    const fs = require('fs');
    const path = require('path');

    // Ensure backup directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    return this.execute((connection) => {
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
  public async close(): Promise<void> {
    console.log('Closing DatabaseService...');
    await databasePool.close();
    console.log('DatabaseService closed');
  }

  /**
   * Private helper methods
   */

  private async executeWithTimeout<T>(
    queryFn: (connection: PooledConnection) => T,
    timeoutMs: number
  ): Promise<T> {
    if (timeoutMs <= 0) {
      return await databasePool.execute(queryFn);
    }

    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Database operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await databasePool.execute(queryFn);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private isRetryableError(error: Error): boolean {
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();

// Export class for testing
export { DatabaseService };

// Export types
export type { DatabaseOptions, DatabaseResult };