// SSH Connection types
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
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
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
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
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

// Electron IPC types
export interface ElectronAPI {
  // SSH operations
  sshConnect: (config: SSHConnection) => Promise<APIResponse<string>>;
  sshDisconnect: (connectionId: string) => Promise<APIResponse>;
  sshExecuteCommand: (connectionId: string, command: string) => Promise<APIResponse<string>>;

  // File operations
  sftpListDirectory: (connectionId: string, path: string) => Promise<APIResponse<FileNode[]>>;
  sftpUploadFile: (connectionId: string, localPath: string, remotePath: string) => Promise<APIResponse>;
  sftpDownloadFile: (connectionId: string, remotePath: string, localPath: string) => Promise<APIResponse>;

  // Configuration
  getConfig: () => Promise<APIResponse<AppConfig>>;
  saveConfig: (config: AppConfig) => Promise<APIResponse>;

  // Dialog operations
  showOpenDialog: (options: any) => Promise<APIResponse<string[]>>;
  showSaveDialog: (options: any) => Promise<APIResponse<string>>;
}

export {};
