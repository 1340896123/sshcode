"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.initializeDatabase = initializeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DatabaseManager {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dbPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Use userData directory for database storage
        const userDataPath = electron_1.app.getPath('userData');
        const dbDir = path_1.default.join(userDataPath, 'database');
        // Ensure database directory exists
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.dbPath = path_1.default.join(dbDir, 'sshclient.db');
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.setupDatabase();
    }
    setupDatabase() {
        try {
            // Enable WAL mode for better performance
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('temp_store = MEMORY');
            this.db.pragma('mmap_size = 268435456'); // 256MB
            // Create tables
            this.createTables();
            this.createIndexes();
            console.log('Database initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }
    createTables() {
        // Tabs table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tabs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        is_visible BOOLEAN DEFAULT TRUE,
        position INTEGER NOT NULL,
        last_accessed INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        window_state TEXT,
        FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
      );
    `);
        // Connections table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 22,
        username TEXT NOT NULL,
        auth_type TEXT NOT NULL CHECK(auth_type IN ('password', 'key')),
        status TEXT NOT NULL DEFAULT 'disconnected',
        last_connected INTEGER,
        reconnect_attempts INTEGER DEFAULT 0,
        max_reconnect_attempts INTEGER DEFAULT 5,
        connected_at INTEGER,
        latency INTEGER,
        bytes_sent INTEGER DEFAULT 0,
        bytes_received INTEGER DEFAULT 0,
        memory_usage INTEGER DEFAULT 0,
        terminal_lines INTEGER DEFAULT 0,
        last_health_check INTEGER,
        health_status TEXT DEFAULT 'healthy',
        error_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
        // Terminal command history
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS terminal_history (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        command TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        exit_code INTEGER,
        duration INTEGER,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
        // Terminal output buffer (for session persistence)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS terminal_buffer (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('input', 'output', 'error', 'info')),
        sequence_number INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
        // AI messages
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
        // Tool calls
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tool_calls (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        command TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('executing', 'completed', 'error', 'timeout')),
        result TEXT,
        error TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        execution_time INTEGER,
        context TEXT,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
        // File transfers
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_transfers (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('upload', 'download')),
        source_path TEXT NOT NULL,
        destination_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        bytes_transferred INTEGER DEFAULT 0,
        total_bytes INTEGER DEFAULT 0,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        error TEXT,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
        // Bookmarks
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
    }
    createIndexes() {
        // Performance indexes
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tabs_connection_id ON tabs(connection_id);
      CREATE INDEX IF NOT EXISTS idx_tabs_position ON tabs(position);
      CREATE INDEX IF NOT EXISTS idx_tabs_last_accessed ON tabs(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_terminal_history_tab_timestamp ON terminal_history(tab_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_terminal_buffer_tab_sequence ON terminal_buffer(tab_id, sequence_number);
      CREATE INDEX IF NOT EXISTS idx_ai_messages_tab_timestamp ON ai_messages(tab_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_tool_calls_tab_start_time ON tool_calls(tab_id, start_time);
      CREATE INDEX IF NOT EXISTS idx_file_transfers_tab_status ON file_transfers(tab_id, status);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_tab_created ON bookmarks(tab_id, created_at);
    `);
    }
    getDatabase() {
        return this.db;
    }
    close() {
        try {
            this.db.close();
            console.log('Database connection closed');
        }
        catch (error) {
            console.error('Error closing database:', error);
        }
    }
    // Database maintenance methods
    vacuum() {
        try {
            this.db.exec('VACUUM');
            console.log('Database vacuum completed');
        }
        catch (error) {
            console.error('Error vacuuming database:', error);
        }
    }
    analyze() {
        try {
            this.db.exec('ANALYZE');
            console.log('Database analyze completed');
        }
        catch (error) {
            console.error('Error analyzing database:', error);
        }
    }
    getDatabaseInfo() {
        try {
            const stats = fs_1.default.statSync(this.dbPath);
            const pageCount = this.db.prepare('PRAGMA page_count').get();
            const pageSize = this.db.prepare('PRAGMA page_size').get();
            return {
                path: this.dbPath,
                size: stats.size,
                pageCount: pageCount.page_count,
                pageSize: pageSize.page_size
            };
        }
        catch (error) {
            console.error('Error getting database info:', error);
            throw error;
        }
    }
    // Transaction helper
    transaction(fn) {
        const transaction = this.db.transaction(fn);
        return transaction();
    }
}
exports.DatabaseManager = DatabaseManager;
// Singleton instance
let databaseManager = null;
function getDatabase() {
    if (!databaseManager) {
        databaseManager = new DatabaseManager();
    }
    return databaseManager;
}
function closeDatabase() {
    if (databaseManager) {
        databaseManager.close();
        databaseManager = null;
    }
}
// Initialize database on app startup
function initializeDatabase() {
    return getDatabase();
}
