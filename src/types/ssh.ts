/**
 * SSH Connection related types
 */

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

// Unified Connection interface (extends SSHConnection with additional properties)
export interface Connection extends SSHConnection {
  keyPath?: string;
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