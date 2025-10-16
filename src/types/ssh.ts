/**
 * SSH Connection related types
 */

// Import SSH2 types
import type { Client } from 'ssh2';
import type { SftpClient } from 'ssh2-sftp-client';

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
  shellStream?: import('ssh2').ClientChannel;
  sftpClient?: SftpClient;
  client?: Client;
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
  terminalOutput?: string[];
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

// SSH2 connection configuration types
export interface SSH2ConnectConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  readyTimeout?: number;
  algorithms?: {
    kex?: string[];
    cipher?: string[];
    serverHostKey?: string[];
    hmac?: string[];
  };
}

// SFTP client configuration types (simplified version for ssh2-sftp-client)
export interface SFTPConnectConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}
