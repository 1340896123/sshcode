import { contextBridge, ipcRenderer } from 'electron';
import type {
  ElectronAPI,
  SSHConnectionConfig,
  SessionData,
  AppConfig,
  APIResponse
} from './src/types/index';
import type {
  ShellOptions,
  FileChangedEventData,
  TerminalDataEventData,
  TerminalCloseEventData,
  TerminalErrorEventData
} from './src/types/terminal';

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration management
  getConfig: () => ipcRenderer.invoke('getConfig'),
  saveConfig: (config: Partial<AppConfig>) => ipcRenderer.invoke('saveConfig', config),

  // Connection management
  getConnections: () => ipcRenderer.invoke('get-connections'),
  saveConnection: (connectionData: SSHConnectionConfig) => ipcRenderer.invoke('save-connection', connectionData),
  deleteConnection: (connectionId: string) => ipcRenderer.invoke('delete-connection', connectionId),

  // SSH connections
  sshConnect: (connectionConfig: SSHConnectionConfig) =>
    ipcRenderer.invoke('ssh-connect', connectionConfig),
  sshExecute: (connectionId: string, command: string) =>
    ipcRenderer.invoke('ssh-execute', connectionId, command),
  sshDisconnect: (connectionId: string) => ipcRenderer.invoke('ssh-disconnect', connectionId),

  // SSH Shell sessions
  sshCreateShell: (connectionId: string, options?: ShellOptions) =>
    ipcRenderer.invoke('ssh-create-shell', connectionId, options),
  sshShellWrite: (connectionId: string, data: string) =>
    ipcRenderer.invoke('ssh-shell-write', connectionId, data),
  sshShellResize: (connectionId: string, rows: number, cols: number) =>
    ipcRenderer.invoke('ssh-shell-resize', connectionId, rows, cols),
  sshShellClose: (connectionId: string) => ipcRenderer.invoke('ssh-shell-close', connectionId),

  // File operations
  getFileList: (connectionId: string, remotePath: string) =>
    ipcRenderer.invoke('get-file-list', connectionId, remotePath),
  uploadFile: (connectionId: string, localPath: string, remotePath: string) =>
    ipcRenderer.invoke('uploadFile', connectionId, localPath, remotePath),
  uploadDroppedFile: (connectionId: string, file: File, remotePath: string) =>
    ipcRenderer.invoke('uploadDroppedFile', connectionId, file, remotePath),
  selectAndUploadFile: (connectionId: string, remotePath: string) =>
    ipcRenderer.invoke('selectAndUploadFile', connectionId, remotePath),
  downloadFile: (connectionId: string, remotePath: string) =>
    ipcRenderer.invoke('downloadFile', connectionId, remotePath),
  downloadAndOpenFile: (connectionId: string, remotePath: string) =>
    ipcRenderer.invoke('downloadAndOpenFile', connectionId, remotePath),

  // File monitoring
  startFileWatcher: (remotePath: string, localPath: string) =>
    ipcRenderer.invoke('startFileWatcher', remotePath, localPath),
  stopFileWatcher: (localPath: string) => ipcRenderer.invoke('stopFileWatcher', localPath),

  // SSH key reading
  readSSHKey: (keyPath: string) => ipcRenderer.invoke('readSSHKey', keyPath),

  // Event listeners
  onFileChanged: (
    callback: (event: Electron.IpcRendererEvent, data: FileChangedEventData) => void
  ) => ipcRenderer.on('fileChanged', callback),
  onTerminalData: (
    callback: (event: Electron.IpcRendererEvent, data: TerminalDataEventData) => void
  ) => ipcRenderer.on('terminal-data', callback),
  onTerminalClose: (
    callback: (event: Electron.IpcRendererEvent, data: TerminalCloseEventData) => void
  ) => ipcRenderer.on('terminal-close', callback),
  onTerminalError: (
    callback: (event: Electron.IpcRendererEvent, data: TerminalErrorEventData) => void
  ) => ipcRenderer.on('terminal-error', callback),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
} as ElectronAPI);
