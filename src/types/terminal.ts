/**
 * Terminal related types
 */

// 终端数据类型
export interface TerminalData {
  output: string;
  timestamp: number;
  type: 'input' | 'output' | 'error';
}

// Legacy: 保持向后兼容
export interface TerminalSession {
  id: string;
  connectionId: string;
  name: string;
  terminal?: import('@xterm/xterm').Terminal;
  history: TerminalData[];
  shellStream?: import('ssh2').ClientChannel;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  currentWorkingDirectory?: string;
  commandHistory: string[];
  shellOptions?: ShellOptions;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string | null;
  // Session-specific state
  envVars?: Record<string, string>;
  isDirty?: boolean; // Has unsaved changes/output
}

// Legacy: 保持向后兼容
export interface SessionManager {
  sessions: Map<string, TerminalSession>;
  activeSessionId: string | null;
  connectionId: string;
}

// 创建会话的选项
export interface CreateSessionOptions {
  name?: string;
  shellOptions?: ShellOptions;
  envVars?: Record<string, string>;
  workingDirectory?: string;
  initialPanel?: 'files' | 'terminal' | 'ai';
}

// Shell options for creating SSH shell sessions
export interface ShellOptions {
  rows?: number;
  cols?: number;
  term?: string;
}

// Event data types
export interface FileChangedEventData {
  remotePath: string;
  localPath: string;
}

export interface TerminalDataEventData {
  connectionId: string;
  data: string;
  isError?: boolean;
}

export interface TerminalCloseEventData {
  connectionId: string;
  code: number | null;
  signal: string | null;
}

export interface TerminalErrorEventData {
  connectionId: string;
  error: string;
}

// Terminal output line type
export interface TerminalOutputLine {
  type: 'info' | 'success' | 'warning' | 'error' | 'input' | 'output';
  content: string;
  timestamp: Date;
}

// System data from connection pool
export interface SystemDataFromPool {
  cpu?: number;
  memory?: number;
  disk?: number;
  networkDown?: number;
  networkUp?: number;
  timestamp?: number;
}
