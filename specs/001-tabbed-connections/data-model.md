# Data Model: Tabbed Connection Management

**Feature**: Tabbed Connection Management
**Date**: 2025-10-18
**Storage**: SQLite + Electron Store (Hybrid)

## Core Entities

### 1. Tab Entity

```typescript
interface Tab {
  id: string;                    // UUID v4
  name: string;                  // User-defined tab name
  connectionId: string;          // Foreign key to Connection
  isActive: boolean;             // Current active tab
  isVisible: boolean;            // Tab is visible in UI
  position: number;              // Tab order position
  lastAccessed: number;          // Timestamp of last access
  createdAt: number;             // Creation timestamp
  updatedAt: number;             // Last update timestamp

  // UI state
  windowState: {
    width: number;
    height: number;
    splitSizes: number[];        // Panel split proportions
  };

  // Component states
  terminalState: TerminalState;
  fileManagerState: FileManagerState;
  aiAssistantState: AIAssistantState;
}
```

### 2. Connection Entity

```typescript
interface Connection {
  id: string;                    // UUID v4
  name: string;                  // Connection display name
  host: string;                  // SSH host
  port: number;                  // SSH port (default: 22)
  username: string;              // SSH username
  authType: 'password' | 'key';  // Authentication type

  // Connection state
  status: 'disconnected' | 'connecting' | 'connected' | 'failed' | 'reconnecting';
  lastConnected?: number;        // Last successful connection timestamp
  reconnectAttempts: number;     // Current reconnection attempt count
  maxReconnectAttempts: number;  // Maximum reconnection attempts

  // Connection metadata
  connectedAt?: number;          // Connection established timestamp
  latency?: number;              // Connection latency in ms
  bytesTransferred: {
    sent: number;
    received: number;
  };

  // Resource usage
  memoryUsage: number;           // Memory usage in bytes
  terminalLines: number;         // Current terminal buffer size

  // Health monitoring
  lastHealthCheck: number;       // Last health check timestamp
  healthStatus: 'healthy' | 'unhealthy' | 'failed';
  errorCount: number;            // Consecutive error count
}
```

### 3. Terminal State Entity

```typescript
interface TerminalState {
  tabId: string;                 // Foreign key to Tab
  cursorPosition: {
    x: number;
    y: number;
  };
  scrollOffset: number;          // Current scroll position
  bufferSize: number;            // Current buffer size

  // Command history (stored in SQLite)
  commandHistory: CommandHistoryEntry[];

  // Terminal options
  options: {
    fontSize: number;
    fontFamily: string;
    theme: string;
    scrollback: number;          // Max 1000 lines
  };
}

interface CommandHistoryEntry {
  id: string;                    // Primary key
  tabId: string;                 // Foreign key
  command: string;               // Command text
  timestamp: number;             // Execution timestamp
  exitCode?: number;             // Command exit code
  duration?: number;             // Execution duration in ms
}
```

### 4. File Manager State Entity

```typescript
interface FileManagerState {
  tabId: string;                 // Foreign key to Tab

  // Navigation state
  currentDirectory: string;      // Current working directory
  directoryHistory: string[];    // Navigation history
  selectedFiles: string[];       // Selected file paths

  // View state
  viewMode: 'list' | 'grid';     // Display mode
  sortBy: 'name' | 'size' | 'modified' | 'type';
  sortOrder: 'asc' | 'desc';
  showHiddenFiles: boolean;

  // Transfer state
  activeTransfers: FileTransfer[];

  // Bookmarks
  bookmarks: Bookmark[];
}

interface FileTransfer {
  id: string;
  tabId: string;
  type: 'upload' | 'download';
  sourcePath: string;
  destinationPath: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused';
  progress: number;              // 0-100
  bytesTransferred: number;
  totalBytes: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

interface Bookmark {
  id: string;
  tabId: string;
  name: string;
  path: string;
  createdAt: number;
}
```

### 5. AI Assistant State Entity

```typescript
interface AIAssistantState {
  tabId: string;                 // Foreign key to Tab

  // Conversation history (stored in SQLite)
  messages: AIMessage[];

  // Tool execution history
  toolCalls: ToolCall[];

  // Context state
  currentContext: AIContext;

  // UI state
  isVisible: boolean;
  inputHeight: number;
  scrollPosition: number;
}

interface AIMessage {
  id: string;                    // Primary key
  tabId: string;                 // Foreign key
  role: 'user' | 'assistant' | 'system';
  content: string;               // Message content
  timestamp: number;             // Message timestamp
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
  };
}

interface ToolCall {
  id: string;                    // Tool call ID
  tabId: string;                 // Foreign key
  command: string;               // Command executed
  status: 'executing' | 'completed' | 'error' | 'timeout';
  result?: string;               // Command output
  error?: string;                // Error message
  startTime: number;             // Execution start time
  endTime?: number;              // Execution end time
  executionTime?: number;        // Duration in ms
  context: {
    workingDirectory: string;
    environment: Record<string, string>;
  };
}

interface AIContext {
  workingDirectory: string;      // Current working directory
  environment: Record<string, string>;  // Environment variables
  systemInfo: SystemInfo;        // System information
  recentCommands: string[];      // Recent command history
}
```

## Database Schema (SQLite)

### Tables

```sql
-- Tabs table
CREATE TABLE tabs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  position INTEGER NOT NULL,
  last_accessed INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  window_state TEXT,              -- JSON
  FOREIGN KEY (connection_id) REFERENCES connections(id)
);

-- Connections table
CREATE TABLE connections (
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

-- Terminal command history
CREATE TABLE terminal_history (
  id TEXT PRIMARY KEY,
  tab_id TEXT NOT NULL,
  command TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  exit_code INTEGER,
  duration INTEGER,
  FOREIGN KEY (tab_id) REFERENCES tabs(id)
);

-- Terminal output buffer (for session persistence)
CREATE TABLE terminal_buffer (
  id TEXT PRIMARY KEY,
  tab_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('input', 'output', 'error', 'info')),
  sequence_number INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (tab_id) REFERENCES tabs(id)
);

-- AI messages
CREATE TABLE ai_messages (
  id TEXT PRIMARY KEY,
  tab_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT,                  -- JSON
  FOREIGN KEY (tab_id) REFERENCES tabs(id)
);

-- Tool calls
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  tab_id TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('executing', 'completed', 'error', 'timeout')),
  result TEXT,
  error TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  execution_time INTEGER,
  context TEXT,                   -- JSON
  FOREIGN KEY (tab_id) REFERENCES tabs(id)
);

-- File transfers
CREATE TABLE file_transfers (
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
  FOREIGN KEY (tab_id) REFERENCES tabs(id)
);

-- Bookmarks
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  tab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tab_id) REFERENCES tabs(id)
);

-- Indexes for performance
CREATE INDEX idx_tabs_connection_id ON tabs(connection_id);
CREATE INDEX idx_tabs_position ON tabs(position);
CREATE INDEX idx_terminal_history_tab_timestamp ON terminal_history(tab_id, timestamp);
CREATE INDEX idx_terminal_buffer_tab_sequence ON terminal_buffer(tab_id, sequence_number);
CREATE INDEX idx_ai_messages_tab_timestamp ON ai_messages(tab_id, timestamp);
CREATE INDEX idx_tool_calls_tab_start_time ON tool_calls(tab_id, start_time);
CREATE INDEX idx_file_transfers_tab_status ON file_transfers(tab_id, status);
```

## Electron Store Configuration

### Configuration Structure

```typescript
interface AppConfig {
  // Tab management
  tabs: {
    maxTabs: number;             // Default: 15
    confirmClose: boolean;       // Default: true
    showTooltips: boolean;       // Default: true
  };

  // Connection management
  connections: {
    autoReconnect: boolean;      // Default: true
    reconnectInterval: number;   // Default: 5000 (ms)
    maxReconnectAttempts: number; // Default: 5
    healthCheckInterval: number; // Default: 30000 (ms)
  };

  // Terminal settings
  terminal: {
    fontSize: number;            // Default: 14
    fontFamily: string;          // Default: 'Consolas, Monaco...'
    scrollback: number;          // Default: 1000
    theme: string;               // Default: 'dark'
  };

  // Performance settings
  performance: {
    maxMemoryUsage: number;      // Default: 200 (MB)
    bufferLimit: number;         // Default: 200 (lines)
    cacheSize: number;           // Default: 8 (cached components)
  };

  // UI settings
  ui: {
    animations: boolean;         // Default: true
    showConnectionStatus: boolean; // Default: true
    compactMode: boolean;        // Default: false
  };
}
```

## Data Relationships

### Entity Relationship Diagram

```
Tab (1) ──────── (1) Connection
  │
  ├── (1) ──── (N) TerminalState
  │              └── (N) CommandHistoryEntry
  │              └── (N) TerminalBufferEntry
  │
  ├── (1) ──── (N) FileManagerState
  │              └── (N) FileTransfer
  │              └── (N) Bookmark
  │
  └── (1) ──── (N) AIAssistantState
                 └── (N) AIMessage
                 └── (N) ToolCall
```

## Data Validation Rules

### Tab Validation
- `id`: Required, UUID v4 format
- `name`: Required, max 100 characters
- `position`: Required, non-negative integer
- `connectionId`: Required, must reference existing connection

### Connection Validation
- `id`: Required, UUID v4 format
- `host`: Required, valid hostname or IP
- `port`: Required, 1-65535 range
- `username`: Required, non-empty string
- `authType`: Required, 'password' or 'key'

### Terminal State Validation
- `cursorPosition.x`: Required, non-negative integer
- `cursorPosition.y`: Required, non-negative integer
- `scrollOffset`: Required, non-negative integer
- `bufferSize`: Required, 0-1000 range

## Performance Considerations

### Memory Management
- Terminal buffer limited to 1000 lines per tab
- Circular buffer implementation for output history
- Lazy loading of inactive tab data
- Automatic cleanup of disconnected resources

### Database Optimization
- WAL mode for concurrent access
- Regular VACUUM operations
- Index optimization for common queries
- Connection pooling for database access

### Caching Strategy
- In-memory cache for active tab states
- LRU eviction for inactive tabs
- Persistent cache for frequently accessed data

## Migration Strategy

### Version 1.0 → 1.1 (Tab Support)
1. Create new tables for tabs and related entities
2. Migrate existing connections to tab format
3. Create default tab for existing connection
4. Update application state management

### Data Backup
- Automatic backup before schema changes
- Export/import functionality for user data
- Rollback capability for failed migrations