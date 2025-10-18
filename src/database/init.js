"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.initializeDatabase = initializeDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DatabaseManager {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
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
        this.setupDatabase();
    }
    async setupDatabase() {
        try {
            // Open database connection
            this.db = await (0, sqlite_1.open)({
                filename: this.dbPath,
                driver: sqlite3_1.default.Database
            });
            // Enable WAL mode for better performance
            await this.db.exec('PRAGMA journal_mode = WAL');
            await this.db.exec('PRAGMA synchronous = NORMAL');
            await this.db.exec('PRAGMA cache_size = 10000');
            await this.db.exec('PRAGMA temp_store = MEMORY');
            await this.db.exec('PRAGMA mmap_size = 268435456'); // 256MB
            // Create tables
            await this.createTables();
            await this.createIndexes();
            console.log('Database initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }
    async createTables() {
        // Tabs table
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
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
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
        // Sessions table for isolated session management
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        tab_id TEXT NOT NULL UNIQUE,
        working_directory TEXT NOT NULL,
        environment TEXT NOT NULL,
        shell_state TEXT NOT NULL,
        terminal_state TEXT NOT NULL,
        file_manager_state TEXT NOT NULL,
        ai_assistant_state TEXT NOT NULL,
        isolation_level TEXT NOT NULL CHECK(isolation_level IN ('full', 'shared-shell', 'minimal')),
        created_at INTEGER NOT NULL,
        last_activity INTEGER NOT NULL,
        memory_usage INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        health_status TEXT DEFAULT 'healthy',
        FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
        FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE
      );
    `);
        // Session directory history for working directory tracking
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_directory_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        directory TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        duration INTEGER,
        command_count INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);
        // Session metrics for performance monitoring
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_metrics (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        memory_usage INTEGER NOT NULL,
        terminal_lines INTEGER NOT NULL,
        file_operations INTEGER DEFAULT 0,
        ai_messages INTEGER DEFAULT 0,
        response_time INTEGER DEFAULT 0,
        uptime INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);
        // Session events for debugging and monitoring
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        data TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);
        // Session limits configuration
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_limits_config (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        max_total_sessions INTEGER DEFAULT 15,
        max_sessions_per_connection INTEGER DEFAULT 5,
        max_memory_per_session INTEGER DEFAULT 8388608,
        max_total_memory INTEGER DEFAULT 209715200,
        enable_graceful_degradation BOOLEAN DEFAULT 1,
        warning_threshold REAL DEFAULT 0.8,
        critical_threshold REAL DEFAULT 0.95
      );
    `);
    }
    async createIndexes() {
        // Performance indexes
        await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tabs_connection_id ON tabs(connection_id);
      CREATE INDEX IF NOT EXISTS idx_tabs_position ON tabs(position);
      CREATE INDEX IF NOT EXISTS idx_tabs_last_accessed ON tabs(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_terminal_history_tab_timestamp ON terminal_history(tab_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_terminal_buffer_tab_sequence ON terminal_buffer(tab_id, sequence_number);
      CREATE INDEX IF NOT EXISTS idx_ai_messages_tab_timestamp ON ai_messages(tab_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_tool_calls_tab_start_time ON tool_calls(tab_id, start_time);
      CREATE INDEX IF NOT EXISTS idx_file_transfers_tab_status ON file_transfers(tab_id, status);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_tab_created ON bookmarks(tab_id, created_at);

      -- Session-related indexes for performance
      CREATE INDEX IF NOT EXISTS idx_sessions_connection_id ON sessions(connection_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_tab_id ON sessions(tab_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
      CREATE INDEX IF NOT EXISTS idx_sessions_health_status ON sessions(health_status);
      CREATE INDEX IF NOT EXISTS idx_sessions_isolation_level ON sessions(isolation_level);
      CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

      -- Session directory history indexes
      CREATE INDEX IF NOT EXISTS idx_session_directory_history_session_id ON session_directory_history(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_directory_history_timestamp ON session_directory_history(timestamp);

      -- Session metrics indexes
      CREATE INDEX IF NOT EXISTS idx_session_metrics_session_id ON session_metrics(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_metrics_timestamp ON session_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_session_metrics_memory_usage ON session_metrics(memory_usage);

      -- Session events indexes
      CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_events_timestamp ON session_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events(event_type);
    `);
        // Initialize session limits configuration
        await this.initializeSessionLimitsConfig();
    }
    async initializeSessionLimitsConfig() {
        try {
            // Check if config already exists
            const existingConfig = await (await this.db.prepare('SELECT id FROM session_limits_config WHERE id = 1')).get();
            if (!existingConfig) {
                // Insert default session limits configuration
                await (await this.db.prepare(`
          INSERT INTO session_limits_config (
            id, max_total_sessions, max_sessions_per_connection,
            max_memory_per_session, max_total_memory, enable_graceful_degradation,
            warning_threshold, critical_threshold
          ) VALUES (1, 15, 5, 8388608, 209715200, 1, 0.8, 0.95)
        `)).run();
                console.log('Session limits configuration initialized');
            }
        }
        catch (error) {
            console.error('Error initializing session limits configuration:', error);
        }
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
    async getDatabaseInfo() {
        try {
            const stats = fs_1.default.statSync(this.dbPath);
            const pageCount = await (await this.db.prepare('PRAGMA page_count')).get();
            const pageSize = await (await this.db.prepare('PRAGMA page_size')).get();
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
    async transaction(fn) {
        await this.db.exec('BEGIN TRANSACTION');
        try {
            const result = await fn();
            await this.db.exec('COMMIT');
            return result;
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
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
