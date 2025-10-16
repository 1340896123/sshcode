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
  result?: any;
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
  data?: any;
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
  connection: SSHConnection;
  connectionId: string;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ParsedResponse['actions'];
  type?: string;
  metadata?: any;
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

export interface AppConfiguration {
  aiCompletion?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    customModel?: string;
  };
}

// AI Command Executor types
export interface CommandOptions {
  timeout?: number;
  silent?: boolean;
  toolCallId?: string;
}

// Re-export SSHConnection for convenience
import type { SSHConnection } from './ssh.js';