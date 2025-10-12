# SettingsModal.vue 加载问题修复总结

## 问题描述

用户报告在 Electron 应用中，SettingsModal.vue 组件的保存功能正常，但加载功能有问题。应用使用 `npm run debug` 命令启动，加载的是网页而不是本地文件。

## 根本原因分析

经过分析，发现问题的根本原因是：

1. **缺少预加载脚本（Preload Script）**：Electron 主进程定义了 IPC handlers，但没有设置预加载脚本来安全地暴露这些 API 给渲染进程
2. **不安全的 webPreferences 配置**：使用了过时的 `nodeIntegration: true` 和 `contextIsolation: false`
3. **错误处理不完善**：当 `window.electronAPI` 不存在时，缺少适当的 fallback 机制

## 修复方案

### 1. 创建预加载脚本 (`preload.js`)

```javascript
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
```

### 2. 修改主进程窗口配置 (`main.js`)

```javascript
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,        // 禁用 node 集成
      contextIsolation: true,        // 启用上下文隔离
      enableRemoteModule: false,     // 禁用 remote 模块
      preload: path.join(__dirname, 'preload.js')  // 添加预加载脚本
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default'
  });
  // ... 其余代码保持不变
}
```

### 3. 改进 SettingsModal.vue 的错误处理

#### 原始的 `loadSettings` 函数问题：
- 只检查 `window.electronAPI` 是否存在
- 没有适当的 fallback 机制
- 错误处理不完善

#### 修复后的改进：

```javascript
const loadSettings = async () => {
  try {
    console.log('开始加载设置...')
    
    if (window.electronAPI) {
      console.log('检测到 Electron 环境，使用 electronAPI 加载配置')
      const savedSettings = await window.electronAPI.getConfig()
      console.log('获取到的保存设置:', savedSettings)
      
      if (savedSettings) {
        await applySettings(savedSettings)
      } else {
        console.log('未找到保存的设置，使用默认设置')
        await tryLoadFromLocalStorage()
      }
    } else {
      console.warn('未检测到 electronAPI，尝试从 localStorage 加载配置')
      await tryLoadFromLocalStorage()
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    // 发出通知给用户
    emit('show-notification', '加载设置失败，使用默认配置', 'warning')
    
    // 最后的 fallback：使用默认设置
    Object.assign(settings, defaultSettings)
  }
}

const tryLoadFromLocalStorage = async () => {
  try {
    const localSettings = localStorage.getItem('sshcode-settings')
    if (localSettings) {
      const parsedSettings = JSON.parse(localSettings)
      console.log('从 localStorage 加载设置成功:', parsedSettings)
      await applySettings(parsedSettings)
    } else {
      console.log('localStorage 中也没有设置，使用默认设置')
      Object.assign(settings, defaultSettings)
    }
  } catch (error) {
    console.error('从 localStorage 加载设置失败:', error)
    Object.assign(settings, defaultSettings)
  }
}
```

### 4. 更新构建配置 (`package.json`)

确保 `preload.js` 文件包含在构建中：

```json
"build": {
  "files": [
    "**/*",
    "!node_modules/**/*",
    "preload.js"
  ],
  // ... 其余配置
}
```

## 修复效果

### 修复前的问题：
1. ❌ `window.electronAPI` 未定义
2. ❌ 无法调用主进程的 `getConfig` 方法
3. ❌ 设置加载失败，只能使用默认配置
4. ❌ 保存功能正常（因为有 localStorage fallback）

### 修复后的改进：
1. ✅ `window.electronAPI` 正确暴露
2. ✅ 可以安全调用主进程 API
3. ✅ 设置加载正常工作
4. ✅ 多层 fallback 机制确保兼容性
5. ✅ 用户友好的错误提示

## 为什么保存能工作？

在原始代码中，`saveSettings` 函数有这样的逻辑：

```javascript
if (window.electronAPI) {
  await window.electronAPI.saveConfig(serializableSettings)
} else {
  localStorage.setItem('sshcode-settings', JSON.stringify(serializableSettings))
}
```

当 `window.electronAPI` 不存在时，它会 fallback 到 localStorage，所以保存功能看起来是正常的。但加载时没有相应的 fallback 逻辑来处理 Electron 环境。

## 测试验证

创建了 `test-settings-fix.html` 测试页面来验证修复：

1. **Electron API 测试**：验证 `window.electronAPI` 是否可用
2. **配置加载测试**：测试从不同源加载配置
3. **配置保存测试**：测试保存功能
4. **Fallback 机制测试**：验证 localStorage fallback

## 最佳实践

这个修复遵循了 Electron 的最佳实践：

1. **安全第一**：使用 `contextIsolation: true` 和预加载脚本
2. **渐进增强**：多层 fallback 机制
3. **错误处理**：完善的错误处理和用户提示
4. **向后兼容**：保持与现有代码的兼容性

## 总结

通过添加预加载脚本、更新安全配置和改进错误处理，成功解决了 SettingsModal.vue 的加载问题。现在应用在 Electron 环境中可以正常加载和保存设置，同时在浏览器环境中也有适当的 fallback 机制。
