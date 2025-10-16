import type { SSHConnectionConfig, SessionData, AppConfig, APIResponse } from './index.js';

/**
 * Electron Main Process API interface
 * This is the unified ElectronAPI definition used throughout the application
 */
export interface ElectronAPI {
  // Configuration management
  getConfig: () => Promise<AppConfig>;
  saveConfig: (config: Partial<AppConfig>) => Promise<APIResponse>;

  // Session management
  getSessions: () => Promise<SessionData[]>;
  saveSession: (sessionData: SessionData) => Promise<APIResponse>;
  deleteSession: (sessionId: string) => Promise<APIResponse>;

  // SSH connections
  sshConnect: (connectionConfig: SSHConnectionConfig) => Promise<APIResponse>;
  sshExecute: (connectionId: string, command: string) => Promise<APIResponse<string>>;
  sshDisconnect: (connectionId: string) => Promise<APIResponse>;

  // SSH Shell sessions
  sshCreateShell: (connectionId: string, options?: any) => Promise<APIResponse>;
  sshShellWrite: (connectionId: string, data: string) => Promise<APIResponse>;
  sshShellResize: (connectionId: string, rows: number, cols: number) => Promise<APIResponse>;
  sshShellClose: (connectionId: string) => Promise<APIResponse>;

  // File operations
  getFileList: (connectionId: string, remotePath: string) => Promise<APIResponse<any[]>>;
  uploadFile: (connectionId: string, localPath: string, remotePath: string) => Promise<APIResponse>;
  uploadDroppedFile: (connectionId: string, file: File, remotePath: string) => Promise<APIResponse>;
  selectAndUploadFile: (connectionId: string, remotePath: string) => Promise<APIResponse>;
  downloadFile: (connectionId: string, remotePath: string) => Promise<APIResponse<string>>;
  downloadAndOpenFile: (connectionId: string, remotePath: string) => Promise<APIResponse<string>>;

  // File monitoring
  startFileWatcher: (remotePath: string, localPath: string) => Promise<APIResponse>;
  stopFileWatcher: (localPath: string) => Promise<APIResponse>;

  // SSH key reading
  readSSHKey: (keyPath: string) => Promise<APIResponse<string>>;

  // Event listeners
  onFileChanged: (callback: (event: any, data: any) => void) => void;
  onTerminalData: (callback: (event: any, data: any) => void) => void;
  onTerminalClose: (callback: (event: any, data: any) => void) => void;
  onTerminalError: (callback: (event: any, data: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}
