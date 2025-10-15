import { IpcRenderer } from 'electron';

interface ElectronAPI {
  // Configuration management
  getConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<any>;

  // Session management
  getSessions: () => Promise<any[]>;
  saveSession: (sessionData: any) => Promise<any>;
  deleteSession: (sessionId: string) => Promise<any>;

  // SSH connections
  sshConnect: (connectionConfig: any) => Promise<any>;
  sshExecute: (connectionId: string, command: string) => Promise<any>;
  sshDisconnect: (connectionId: string) => Promise<any>;

  // SSH Shell sessions
  sshCreateShell: (connectionId: string, options?: any) => Promise<any>;
  sshShellWrite: (connectionId: string, data: string) => Promise<any>;
  sshShellResize: (connectionId: string, rows: number, cols: number) => Promise<any>;
  sshShellClose: (connectionId: string) => Promise<any>;

  // File operations
  getFileList: (connectionId: string, remotePath: string) => Promise<any>;
  uploadFile: (connectionId: string, localPath: string, remotePath: string) => Promise<any>;
  uploadDroppedFile: (connectionId: string, file: any, remotePath: string) => Promise<any>;
  selectAndUploadFile: (connectionId: string, remotePath: string) => Promise<any>;
  downloadFile: (connectionId: string, remotePath: string) => Promise<any>;
  downloadAndOpenFile: (connectionId: string, remotePath: string) => Promise<any>;

  // File monitoring
  startFileWatcher: (remotePath: string, localPath: string) => Promise<any>;
  stopFileWatcher: (localPath: string) => Promise<any>;

  // AI connection test
  testAIConnection: (aiConfig: any) => Promise<any>;

  // SSH key reading
  readSSHKey: (keyPath: string) => Promise<any>;

  // Event listeners
  onFileChanged: (callback: (event: any, data: any) => void) => void;
  onTerminalData: (callback: (event: any, data: any) => void) => void;
  onTerminalClose: (callback: (event: any, data: any) => void) => void;
  onTerminalError: (callback: (event: any, data: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};