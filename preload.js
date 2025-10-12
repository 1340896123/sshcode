const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  getConfig: () => ipcRenderer.invoke('getConfig'),
  saveConfig: (config) => ipcRenderer.invoke('saveConfig', config),
  
  // 会话管理
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  saveSession: (sessionData) => ipcRenderer.invoke('save-session', sessionData),
  deleteSession: (sessionId) => ipcRenderer.invoke('delete-session', sessionId),
  
  // SSH 连接
  sshConnect: (connectionConfig) => ipcRenderer.invoke('ssh-connect', connectionConfig),
  sshExecute: (connectionId, command) => ipcRenderer.invoke('ssh-execute', connectionId, command),
  sshDisconnect: (connectionId) => ipcRenderer.invoke('ssh-disconnect', connectionId),
  
  // 文件操作
  getFileList: (connectionId, remotePath) => ipcRenderer.invoke('get-file-list', connectionId, remotePath),
  uploadFile: (connectionId, localPath, remotePath) => ipcRenderer.invoke('uploadFile', connectionId, localPath, remotePath),
  uploadDroppedFile: (connectionId, file, remotePath) => ipcRenderer.invoke('uploadDroppedFile', connectionId, file, remotePath),
  selectAndUploadFile: (connectionId, remotePath) => ipcRenderer.invoke('selectAndUploadFile', connectionId, remotePath),
  downloadFile: (connectionId, remotePath) => ipcRenderer.invoke('downloadFile', connectionId, remotePath),
  downloadAndOpenFile: (connectionId, remotePath) => ipcRenderer.invoke('downloadAndOpenFile', connectionId, remotePath),
  
  // 文件监听
  startFileWatcher: (remotePath, localPath) => ipcRenderer.invoke('startFileWatcher', remotePath, localPath),
  stopFileWatcher: (localPath) => ipcRenderer.invoke('stopFileWatcher', localPath),
  
  // AI 连接测试
  testAIConnection: (aiConfig) => ipcRenderer.invoke('testAIConnection', aiConfig),
  
  // SSH 密钥读取
  readSSHKey: (keyPath) => ipcRenderer.invoke('readSSHKey', keyPath),
  
  // 事件监听
  onFileChanged: (callback) => ipcRenderer.on('fileChanged', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
