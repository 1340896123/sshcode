import { contextBridge, ipcRenderer } from 'electron';

// Import types from the main types file
import type {
  SSHConnectionConfig,
  SessionData,
  AIConfig,
  AppConfig,
  APIResponse
} from './src/types';

// Define the ElectronAPI interface
interface ElectronAPI {
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

  // AI connection test
  testAIConnection: (aiConfig: AIConfig) => Promise<APIResponse>;

  // SSH key reading
  readSSHKey: (keyPath: string) => Promise<APIResponse<string>>;

  // Event listeners
  onFileChanged: (callback: (event: any, data: any) => void) => void;
  onTerminalData: (callback: (event: any, data: any) => void) => void;
  onTerminalClose: (callback: (event: any, data: any) => void) => void;
  onTerminalError: (callback: (event: any, data: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration management
  getConfig: () => ipcRenderer.invoke('getConfig'),
  saveConfig: (config: Partial<AppConfig>) => ipcRenderer.invoke('saveConfig', config),

  // Session management
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  saveSession: (sessionData: SessionData) => ipcRenderer.invoke('save-session', sessionData),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('delete-session', sessionId),

  // SSH connections
  sshConnect: (connectionConfig: SSHConnectionConfig) => ipcRenderer.invoke('ssh-connect', connectionConfig),
  sshExecute: (connectionId: string, command: string) => ipcRenderer.invoke('ssh-execute', connectionId, command),
  sshDisconnect: (connectionId: string) => ipcRenderer.invoke('ssh-disconnect', connectionId),

  // SSH Shell sessions
  sshCreateShell: (connectionId: string, options?: any) => ipcRenderer.invoke('ssh-create-shell', connectionId, options),
  sshShellWrite: (connectionId: string, data: string) => ipcRenderer.invoke('ssh-shell-write', connectionId, data),
  sshShellResize: (connectionId: string, rows: number, cols: number) => ipcRenderer.invoke('ssh-shell-resize', connectionId, rows, cols),
  sshShellClose: (connectionId: string) => ipcRenderer.invoke('ssh-shell-close', connectionId),

  // File operations
  getFileList: (connectionId: string, remotePath: string) => ipcRenderer.invoke('get-file-list', connectionId, remotePath),
  uploadFile: (connectionId: string, localPath: string, remotePath: string) => ipcRenderer.invoke('uploadFile', connectionId, localPath, remotePath),
  uploadDroppedFile: (connectionId: string, file: File, remotePath: string) => ipcRenderer.invoke('uploadDroppedFile', connectionId, file, remotePath),
  selectAndUploadFile: (connectionId: string, remotePath: string) => ipcRenderer.invoke('selectAndUploadFile', connectionId, remotePath),
  downloadFile: (connectionId: string, remotePath: string) => ipcRenderer.invoke('downloadFile', connectionId, remotePath),
  downloadAndOpenFile: (connectionId: string, remotePath: string) => ipcRenderer.invoke('downloadAndOpenFile', connectionId, remotePath),

  // File monitoring
  startFileWatcher: (remotePath: string, localPath: string) => ipcRenderer.invoke('startFileWatcher', remotePath, localPath),
  stopFileWatcher: (localPath: string) => ipcRenderer.invoke('stopFileWatcher', localPath),

  // AI connection test
  testAIConnection: (aiConfig: AIConfig) => ipcRenderer.invoke('testAIConnection', aiConfig),

  // SSH key reading
  readSSHKey: (keyPath: string) => ipcRenderer.invoke('readSSHKey', keyPath),

  // Event listeners
  onFileChanged: (callback: (event: any, data: any) => void) => ipcRenderer.on('fileChanged', callback),
  onTerminalData: (callback: (event: any, data: any) => void) => ipcRenderer.on('terminal-data', callback),
  onTerminalClose: (callback: (event: any, data: any) => void) => ipcRenderer.on('terminal-close', callback),
  onTerminalError: (callback: (event: any, data: any) => void) => ipcRenderer.on('terminal-error', callback),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
} as ElectronAPI);

