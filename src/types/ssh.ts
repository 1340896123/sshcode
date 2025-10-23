/**
 * SSH Connection related types
 */

// Import SSH2 types
import type { Client } from 'ssh2';
import type { SftpClient } from 'ssh2-sftp-client';

// 连接配置 - 指SSH连接的配置信息
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
  keyPath?: string;
}

// 连接状态 - 指应用的连接管理器状态
export interface Connection {
  id: string;
  config: SSHConnectionConfig;
  status: 'idle' | 'connecting' | 'connected' | 'failed' | 'disconnected' | 'cancelled';
  errorMessage?: string | null;
  connectedAt?: Date | null;
  lastActivity?: Date;
  // 系统监控信息
  systemInfo?: SystemInfo;
  networkHistory?: NetworkHistory;
  // 持久连接池相关
  persistentConnection?: {
    client?: Client;
    connected: boolean;
  };
}

// 会话 - 指使用连接时的状态，每个会话都有独立的生命周期
export interface Session {
  id: string;
  connectionId: string;
  name: string;
  status: 'connecting' | 'connected' | 'failed' | 'disconnected';
  errorMessage?: string | null;
  createdAt: Date;
  connectedAt?: Date | null;
  lastActivity: Date;
  // 活动面板
  activePanel: 'files' | 'terminal' | 'ai';
  // SSH连接资源
  sshConnection?: {
    client?: Client;
    shellStream?: import('ssh2').ClientChannel;
    sftpClient?: SftpClient;
    currentWorkingDirectory?: string;
  };
  // 终端状态
  terminalState?: {
    fontSize: number;
    fontFamily: string;
    history: string[];
  };
  // 是否为活动会话
  isActive: boolean;
}

// 会话数据传输类型 - 用于创建会话时传递配置信息
export interface SessionData {
  connectionId: string;
  name?: string;
  initialPanel?: 'files' | 'terminal' | 'ai';
}

// Note: Legacy SSHConnection type removed - use Connection and Session types instead

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
