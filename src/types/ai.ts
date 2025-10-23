/**
 * AI Assistant related types
 */

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  timestamp: number;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
  result?: unknown;
}

export interface AIConfig {
  provider?: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
  customModel?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ParsedResponse {
  content: string;
  actions: Array<{
    id: string;
    type: string;
    label: string;
    command: string;
  }> | null;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface TestResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  suggestions?: CommandSuggestion[];
}

export interface CommandSuggestion {
  command: string;
  description: string;
  confidence: number;
  type: 'ai' | 'fallback';
  category:
    | 'git'
    | 'package'
    | 'service'
    | 'container'
    | 'file'
    | 'process'
    | 'network'
    | 'general'
    | 'help';
}

export interface UseAIChatProps {
  connection: import('./ssh.js').Connection;
  connectionId: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ParsedResponse['actions'];
  type?: string;
  metadata?: Record<string, unknown>;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface Action {
  id: string;
  type: string;
  label: string;
  command?: string;
  prompt?: string;
}

export interface ToolCallHistoryItem extends ToolCall {
  command: string;
  connectionId: string;
  status: 'executing' | 'completed' | 'error' | 'timeout';
  startTime: number;
  endTime?: number;
  result?: string;
  error?: string;
  executionTime: number;
  realtimeOutput?: string;
}

export interface AIChatEmits {
  (e: 'execute-command', command: string): void;
  (e: 'show-notification', message: string, type: string): void;
  (e: 'show-settings'): void;
  (e: 'focus-input'): void;
}

// Additional AI Store types
export interface ToolCallStatus {
  id: string;
  command: string;
  connectionId: string;
  status: 'executing' | 'completed' | 'error' | 'timeout';
  startTime: number;
  endTime?: number;
  result?: string;
  error?: string;
  executionTime: number;
  realtimeOutput?: string;
}

export interface ConfigStatus {
  isConfigured: boolean;
  message: string;
}

export interface TerminalInput {
  text: string;
  connectionId: string | null;
  isVisible: boolean;
}

export interface ToolCallStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgExecutionTime: number;
}

export interface RetryInfo {
  command: string;
  connectionId: string;
}

// AI Completion Service types
export interface CompletionContext {
  currentDirectory?: string;
  recentCommands?: string[];
  connectionId?: string;
}

export interface CacheEntry {
  suggestions: CommandSuggestion[];
  timestamp: number;
}

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  cacheSize: number;
}

// 移除重复的AppConfiguration接口，使用config.ts中的AppConfig

// AI Command Executor types
export interface CommandOptions {
  timeout?: number;
  silent?: boolean;
  toolCallId?: string;
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  output?: T;  // Add output property for compatibility
  error?: string;
  message?: string;
}

export interface AIResponseChoice {
  message?: {
    role: string;
    content?: string;
    tool_calls?: ToolCall[];
  };
  delta?: {
    role?: string;
    content?: string;
    tool_calls?: ToolCall[];
  };
  finish_reason?: string;  // Add finish_reason property
  index?: number;
}

export interface AIResponse {
  choices: AIResponseChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  id?: string;
  created?: number;
}

// Note: SSH connections are managed through Connection and Session types from ssh.ts
