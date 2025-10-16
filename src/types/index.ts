// SSH Connection specific types
export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  authType: 'password' | 'key';
  connected: boolean;
  shellStream?: any;
  sftpClient?: any;
  client?: any;
  status: 'connecting' | 'connected' | 'failed' | 'disconnected' | 'cancelled';
  currentWorkingDirectory?: string;
}

export interface SSHConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  keyContent?: string;
}

export interface SessionData {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  keyPath?: string;
  keyContent?: string;
}

// Unified Connection interface
export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  keyPath?: string;
  keyContent?: string;
  status: 'connecting' | 'connected' | 'failed' | 'disconnected' | 'cancelled';
  connected: boolean;
  shellStream?: any;
  sftpClient?: any;
  client?: any;
  currentWorkingDirectory?: string;
  connectStep?: number;
  errorMessage?: string | null;
  connectedAt?: Date | null;
  terminalOutput?: any[];
  currentCommand?: string;
  showAutocomplete?: boolean;
  lastActivity?: Date;
  activePanel?: string;
  systemInfo?: SystemInfo;
  networkHistory?: NetworkHistory;
}

// System monitoring types
export interface SystemInfo {
  cpu: number;
  memory: number;
  disk: number;
  networkUp: number;
  networkDown: number;
  lastUpdate: Date | null;
}

export interface NetworkHistory {
  lastNetworkDown: number;
  lastNetworkUp: number;
  lastUpdateTime: number;
}

// File System types
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  permissions?: string;
  children?: FileNode[];
}

// Terminal types
export interface TerminalData {
  output: string;
  timestamp: number;
  type: 'input' | 'output' | 'error';
}

export interface TerminalSession {
  id: string;
  connectionId: string;
  terminal?: any;
  history: TerminalData[];
}

// AI types
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

// Event System types
export interface AppEvent {
  type: string;
  data?: any;
  timestamp: number;
}

// Configuration types
export interface AppConfig {
  ai: AIConfig;
  general: {
    theme: 'light' | 'dark';
    language: string;
    autoSave: boolean;
  };
  terminal: {
    fontSize: number;
    fontFamily: string;
    copyOnSelect: boolean;
  };
  security: {
    passwordEncryption: boolean;
    sessionTimeout: number;
    confirmDangerousCommands: boolean;
  };
}

// Component Props types
export interface ConnectionModalProps {
  visible: boolean;
  connection?: SSHConnection | null;
  onSave: (connection: SSHConnection) => void;
  onCancel: () => void;
}

export interface FileManagerProps {
  connection: SSHConnection;
  onFileSelect: (file: FileNode) => void;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Additional AI Service types
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

// AI Command Completion types
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

// AI Chat types
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

// Electron IPC types
export interface ElectronAPI {
  // SSH operations
  sshConnect: (config: SSHConnection) => Promise<APIResponse<string>>;
  sshDisconnect: (connectionId: string) => Promise<APIResponse>;
  sshExecuteCommand: (connectionId: string, command: string) => Promise<APIResponse<string>>;

  // File operations
  sftpListDirectory: (connectionId: string, path: string) => Promise<APIResponse<FileNode[]>>;
  sftpUploadFile: (
    connectionId: string,
    localPath: string,
    remotePath: string
  ) => Promise<APIResponse>;
  sftpDownloadFile: (
    connectionId: string,
    remotePath: string,
    localPath: string
  ) => Promise<APIResponse>;

  // Configuration
  getConfig: () => Promise<APIResponse<AppConfig>>;
  saveConfig: (config: AppConfig) => Promise<APIResponse>;

  // Dialog operations
  showOpenDialog: (options: any) => Promise<APIResponse<string[]>>;
  showSaveDialog: (options: any) => Promise<APIResponse<string>>;
}

export {};
