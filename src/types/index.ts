/**
 * Central type exports for the SSH Code application
 * This file serves as the main entry point for all type definitions
 */

// Re-export all types from specialized modules
export type {
  // SSH Connection types
  SSHConnection,
  SSHConnectionConfig,
  SessionData,
  Connection,
  SystemInfo,
  NetworkHistory
} from './ssh.js';

// Export tabbed connection types
export type {
  // Core tab and connection types
  Tab,
  Connection as TabConnection,
  ConnectionRequest,
  CreateTabRequest,
  UpdateTabRequest,
  WindowState,

  // Authentication and status types
  AuthType,
  ConnectionStatus,
  HealthStatus,
  BytesTransferred,

  // Terminal state types
  TerminalState,
  CursorPosition,
  CommandHistoryEntry,
  TerminalOptions,
  CommandResult,

  // File manager state types
  FileManagerState,
  ViewMode,
  SortBy,
  SortOrder,
  FileTransfer,
  TransferType,
  TransferStatus,
  Bookmark,
  DirectoryListing,
  FileInfo,

  // AI assistant state types
  AIAssistantState,
  AIMessage,
  AIMessageRole,
  AIMessageMetadata,
  ToolCall,
  ToolCallStatus,
  ToolCallContext,
  AIContext,
  SystemInfo as AISystemInfo,

  // Store and composable types
  TabStoreState,
  ConnectionStoreState,
  TabManagerComposable,
  ConnectionManagerComposable,
  TerminalPoolComposable,
  PooledTerminal,
  PoolStats,

  // Event types
  TabEvent,
  ConnectionEvent,

  // Performance and session types
  PerformanceMetrics,
  PerformanceSnapshot,
  SessionData as TabSessionData,
  SessionRestoreOptions
} from './tab.js';

export type {
  // AI Assistant types (excluding duplicates)
  AIConfig,
  ParsedResponse,
  ValidationResult,
  TestResult,
  CommandSuggestion,
  UseAIChatProps,
  Message,
  Action,
  ToolCallHistoryItem,
  AIChatEmits,
  ConfigStatus,
  TerminalInput,
  ToolCallStats,
  RetryInfo,
  CompletionContext,
  CacheEntry,
  CacheStats,
  CommandOptions
} from './ai.js';

export type {
  // Configuration types
  AppConfig,
  MainAppConfig
} from './config.js';

export type {
  // File system types
  FileNode
} from './file.js';

export type {
  // Terminal types
  TerminalData,
  TerminalSession
} from './terminal.js';

export type {
  // Event system types
  AppEvent
} from './events.js';

export type {
  // Component props types
  ConnectionModalProps,
  FileManagerProps
} from './components.js';

export type {
  // API response types
  APIResponse
} from './api.js';

export type {
  // Electron API types
  ElectronAPI
} from './electron.js';

// Additional AI constants types for convenience
export interface QuickAction {
  id: string;
  command: string;
  label: string;
  title: string;
  icon: string;
}

export interface ThemeConfig {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface SecurityConfig {
  ALLOWED_COMMANDS: string[];
  BLOCKED_COMMANDS: string[];
  MAX_COMMAND_LENGTH: number;
  DANGEROUS_PATTERNS: RegExp[];
}
