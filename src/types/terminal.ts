/**
 * Terminal related types
 */

export interface TerminalData {
  output: string;
  timestamp: number;
  type: 'input' | 'output' | 'error';
}

export interface TerminalSession {
  id: string;
  connectionId: string;
  terminal?: import('@xterm/xterm').Terminal;
  history: TerminalData[];
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
