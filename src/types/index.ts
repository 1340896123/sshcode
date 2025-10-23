/**
 * Central type exports for the SSH Code application
 * This file serves as the main entry point for all type definitions
 */

// Re-export all types from specialized modules
export type {
  // SSH Connection types
  SSHConnectionConfig,
  SessionData,
  Connection,
  SystemInfo,
  NetworkHistory
} from './ssh.ts';

export type {
  // AI Assistant types
  AIMessage,
  ToolCall,
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
  ToolCallStatus,
  ConfigStatus,
  TerminalInput,
  ToolCallStats,
  RetryInfo,
  CompletionContext,
  CacheEntry,
  CacheStats,
  CommandOptions
} from './ai.ts';

export type {
  // Configuration types
  AppConfig,
  MainAppConfig
} from './config.ts';

export type {
  // File system types
  FileNode
} from './file.ts';

export type {
  // Terminal types
  TerminalData,
  TerminalSession
} from './terminal.ts';

export type {
  // Event system types
  AppEvent
} from './events.ts';

export type {
  // Component props types
  ConnectionModalProps,
  FileManagerProps
} from './components.ts';

export type {
  // API response types
  APIResponse
} from './api.ts';

export type {
  // Electron API types
  ElectronAPI
} from './electron.ts';

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
