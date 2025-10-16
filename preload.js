"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose secure API to renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Configuration management
    getConfig: () => electron_1.ipcRenderer.invoke('getConfig'),
    saveConfig: (config) => electron_1.ipcRenderer.invoke('saveConfig', config),
    // Session management
    getSessions: () => electron_1.ipcRenderer.invoke('get-sessions'),
    saveSession: (sessionData) => electron_1.ipcRenderer.invoke('save-session', sessionData),
    deleteSession: (sessionId) => electron_1.ipcRenderer.invoke('delete-session', sessionId),
    // SSH connections
    sshConnect: (connectionConfig) => electron_1.ipcRenderer.invoke('ssh-connect', connectionConfig),
    sshExecute: (connectionId, command) => electron_1.ipcRenderer.invoke('ssh-execute', connectionId, command),
    sshDisconnect: (connectionId) => electron_1.ipcRenderer.invoke('ssh-disconnect', connectionId),
    // SSH Shell sessions
    sshCreateShell: (connectionId, options) => electron_1.ipcRenderer.invoke('ssh-create-shell', connectionId, options),
    sshShellWrite: (connectionId, data) => electron_1.ipcRenderer.invoke('ssh-shell-write', connectionId, data),
    sshShellResize: (connectionId, rows, cols) => electron_1.ipcRenderer.invoke('ssh-shell-resize', connectionId, rows, cols),
    sshShellClose: (connectionId) => electron_1.ipcRenderer.invoke('ssh-shell-close', connectionId),
    // File operations
    getFileList: (connectionId, remotePath) => electron_1.ipcRenderer.invoke('get-file-list', connectionId, remotePath),
    uploadFile: (connectionId, localPath, remotePath) => electron_1.ipcRenderer.invoke('uploadFile', connectionId, localPath, remotePath),
    uploadDroppedFile: (connectionId, file, remotePath) => electron_1.ipcRenderer.invoke('uploadDroppedFile', connectionId, file, remotePath),
    selectAndUploadFile: (connectionId, remotePath) => electron_1.ipcRenderer.invoke('selectAndUploadFile', connectionId, remotePath),
    downloadFile: (connectionId, remotePath) => electron_1.ipcRenderer.invoke('downloadFile', connectionId, remotePath),
    downloadAndOpenFile: (connectionId, remotePath) => electron_1.ipcRenderer.invoke('downloadAndOpenFile', connectionId, remotePath),
    // File monitoring
    startFileWatcher: (remotePath, localPath) => electron_1.ipcRenderer.invoke('startFileWatcher', remotePath, localPath),
    stopFileWatcher: (localPath) => electron_1.ipcRenderer.invoke('stopFileWatcher', localPath),
    // SSH key reading
    readSSHKey: (keyPath) => electron_1.ipcRenderer.invoke('readSSHKey', keyPath),
    // Event listeners
    onFileChanged: (callback) => electron_1.ipcRenderer.on('fileChanged', callback),
    onTerminalData: (callback) => electron_1.ipcRenderer.on('terminal-data', callback),
    onTerminalClose: (callback) => electron_1.ipcRenderer.on('terminal-close', callback),
    onTerminalError: (callback) => electron_1.ipcRenderer.on('terminal-error', callback),
    removeAllListeners: (channel) => electron_1.ipcRenderer.removeAllListeners(channel)
});
