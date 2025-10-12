const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const axios = require('axios');

let mainWindow;
let sshConnections = {};
let sshConnectionConfigs = {};
let appConfig = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default'
  });

  // 在开发环境中加载本地文件，在生产环境中加载构建后的文件
  const isDev = process.argv.includes('--dev');
  const indexPath = isDev ? 'index.html' : path.join(__dirname, 'dist', 'index.html');
  console.log('加载HTML文件:', indexPath);
  mainWindow.loadFile(indexPath);

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('save-session', async (event, sessionData) => {
  try {
    const sessionsPath = path.join(__dirname, 'data', 'sessions.json');
    const sessionsDir = path.dirname(sessionsPath);
    
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    let sessions = [];
    if (fs.existsSync(sessionsPath)) {
      const data = fs.readFileSync(sessionsPath, 'utf8');
      sessions = JSON.parse(data);
    }

    const existingIndex = sessions.findIndex(s => s.id === sessionData.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = sessionData;
    } else {
      sessions.push(sessionData);
    }

    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-sessions', async () => {
  try {
    const sessionsPath = path.join(__dirname, 'data', 'sessions.json');
    console.log('读取连接文件:', sessionsPath);
    
    if (fs.existsSync(sessionsPath)) {
      const data = fs.readFileSync(sessionsPath, 'utf8');
      const sessions = JSON.parse(data);
      console.log('读取到连接数量:', sessions.length);
      return sessions;
    }
    console.log('连接文件不存在，返回空数组');
    return [];
  } catch (error) {
    console.error('Error reading sessions:', error);
    return [];
  }
});

ipcMain.handle('delete-session', async (event, sessionId) => {
  try {
    const sessionsPath = path.join(__dirname, 'data', 'sessions.json');
    if (fs.existsSync(sessionsPath)) {
      const data = fs.readFileSync(sessionsPath, 'utf8');
      let sessions = JSON.parse(data);
      sessions = sessions.filter(s => s.id !== sessionId);
      fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ssh-connect', async (event, connectionConfig) => {
  const { Client } = require('ssh2');
  const conn = new Client();
  
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      sshConnections[connectionConfig.id] = conn;
      sshConnectionConfigs[connectionConfig.id] = { ...connectionConfig };
      resolve({ success: true, message: 'SSH连接成功' });
    }).on('error', (err) => {
      reject({ success: false, error: err.message });
    }).connect({
      host: connectionConfig.host,
      port: connectionConfig.port || 22,
      username: connectionConfig.username,
      password: connectionConfig.password,
      privateKey: connectionConfig.privateKey
    });
  });
});

ipcMain.handle('ssh-execute', async (event, connectionId, command) => {
  const conn = sshConnections[connectionId];
  if (!conn) {
    return { success: false, error: 'SSH连接不存在' };
  }

  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject({ success: false, error: err.message });
        return;
      }

      let output = '';
      stream.on('close', (code, signal) => {
        resolve({ success: true, output, code, signal });
      }).on('data', (data) => {
        output += data.toString();
      }).stderr.on('data', (data) => {
        output += data.toString();
      });
    });
  });
});

ipcMain.handle('ssh-disconnect', async (event, connectionId) => {
  const conn = sshConnections[connectionId];
  if (conn) {
    conn.end();
    delete sshConnections[connectionId];
    delete sshConnectionConfigs[connectionId];
  }
  return { success: true };
});

ipcMain.handle('get-file-list', async (event, connectionId, remotePath) => {
  const conn = sshConnections[connectionId];
  const config = sshConnectionConfigs[connectionId];
  
  if (!conn || !config) {
    return { success: false, error: 'SSH连接不存在或配置丢失' };
  }

  try {
    const sftp = require('ssh2-sftp-client');
    const sftpClient = new sftp();
    
    const connectConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username
    };

    // 根据认证方式添加相应的认证信息
    if (config.authType === 'key' && config.privateKey) {
      connectConfig.privateKey = config.privateKey;
    } else if (config.password) {
      connectConfig.password = config.password;
    }

    await sftpClient.connect(connectConfig);
    const list = await sftpClient.list(remotePath || '/');
    await sftpClient.end();
    
    return { success: true, files: list };
  } catch (err) {
    console.error('SFTP操作失败:', err);
    return { success: false, error: err.message };
  }
});

// 配置文件管理
const getConfigPath = () => path.join(__dirname, 'config', 'app.yml');

const ensureConfigDir = () => {
  const configDir = path.dirname(getConfigPath());
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
};

const loadConfig = () => {
  try {
    ensureConfigDir();
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      appConfig = yaml.load(fileContents);
    } else {
      appConfig = getDefaultConfig();
      saveConfig();
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    appConfig = getDefaultConfig();
  }
};

const getDefaultConfig = () => ({
  ai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.7
  },
  general: {
    language: 'zh-CN',
    theme: 'dark',
    autoSaveSessions: true,
    checkUpdates: true
  },
  terminal: {
    font: 'Consolas',
    fontSize: 14,
    bell: false,
    cursorBlink: true
  },
  security: {
    encryptPasswords: false,
    sessionTimeout: 30,
    confirmDangerousCommands: true
  }
});

const saveConfig = () => {
  try {
    ensureConfigDir();
    const configPath = getConfigPath();
    const yamlContent = yaml.dump(appConfig, { indent: 2 });
    fs.writeFileSync(configPath, yamlContent, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('保存配置失败:', error);
    return { success: false, error: error.message };
  }
};

// 初始化配置
loadConfig();

// IPC handlers for config
ipcMain.handle('getConfig', async () => {
  return appConfig;
});

ipcMain.handle('saveConfig', async (event, config) => {
  try {
    appConfig = { ...appConfig, ...config };
    const result = saveConfig();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('testAIConnection', async (event, aiConfig) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (aiConfig.provider === 'openai') {
      headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
    } else if (aiConfig.provider === 'anthropic') {
      headers['x-api-key'] = aiConfig.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
    }

    const response = await axios.post(
      `${aiConfig.baseUrl}/chat/completions`,
      {
        model: aiConfig.model,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test. Please respond with "Connection successful".'
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      },
      {
        headers,
        timeout: 10000
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return { success: true, message: 'AI连接测试成功' };
    } else {
      return { success: false, error: 'AI响应格式异常' };
    }
  } catch (error) {
    console.error('AI连接测试失败:', error);
    let errorMessage = 'AI连接测试失败';
    
    if (error.response) {
      errorMessage = `API错误: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`;
    } else if (error.request) {
      errorMessage = '网络连接失败，请检查URL和网络';
    } else {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
});

// 读取SSH密钥文件
ipcMain.handle('readSSHKey', async (event, keyPath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    let fullPath = keyPath;
    
    // 处理相对路径
    if (keyPath.startsWith('~/')) {
      fullPath = path.join(os.homedir(), keyPath.substring(2));
    } else if (!path.isAbsolute(keyPath)) {
      fullPath = path.resolve(keyPath);
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: '私钥文件不存在: ' + fullPath };
    }
    
    // 读取文件内容
    const keyContent = fs.readFileSync(fullPath, 'utf8');
    
    return { success: true, keyContent };
  } catch (error) {
    console.error('读取SSH密钥失败:', error);
    return { success: false, error: error.message };
  }
});

// 文件上传功能
ipcMain.handle('uploadFile', async (event, connectionId, localPath, remotePath) => {
  const conn = sshConnections[connectionId];
  const config = sshConnectionConfigs[connectionId];
  
  if (!conn || !config) {
    return { success: false, error: 'SSH连接不存在或配置丢失' };
  }

  try {
    const sftp = require('ssh2-sftp-client');
    const sftpClient = new sftp();
    
    const connectConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username
    };

    // 根据认证方式添加相应的认证信息
    if (config.authType === 'key' && config.privateKey) {
      connectConfig.privateKey = config.privateKey;
    } else if (config.password) {
      connectConfig.password = config.password;
    }

    await sftpClient.connect(connectConfig);
    
    const fileName = require('path').basename(localPath);
    const remoteFilePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
    
    await sftpClient.put(localPath, remoteFilePath);
    await sftpClient.end();
    
    return { success: true };
  } catch (err) {
    console.error('文件上传失败:', err);
    return { success: false, error: err.message };
  }
});

// 上传拖拽的文件
ipcMain.handle('uploadDroppedFile', async (event, connectionId, file, remotePath) => {
  const conn = sshConnections[connectionId];
  const config = sshConnectionConfigs[connectionId];
  
  if (!conn || !config) {
    return { success: false, error: 'SSH连接不存在或配置丢失' };
  }

  try {
    const sftp = require('ssh2-sftp-client');
    const sftpClient = new sftp();
    
    const connectConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username
    };

    // 根据认证方式添加相应的认证信息
    if (config.authType === 'key' && config.privateKey) {
      connectConfig.privateKey = config.privateKey;
    } else if (config.password) {
      connectConfig.password = config.password;
    }

    await sftpClient.connect(connectConfig);
    
    // 从File对象获取文件路径
    const filePath = file.path;
    const fileName = file.name;
    const remoteFilePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
    
    await sftpClient.put(filePath, remoteFilePath);
    await sftpClient.end();
    
    return { success: true };
  } catch (err) {
    console.error('文件上传失败:', err);
    return { success: false, error: err.message };
  }
});

// 选择并上传文件
ipcMain.handle('selectAndUploadFile', async (event, connectionId, remotePath) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: '选择要上传的文件'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const localPath = result.filePaths[0];
      
      // 调用上传文件处理函数
      const conn = sshConnections[connectionId];
      const config = sshConnectionConfigs[connectionId];
      
      if (!conn || !config) {
        return { success: false, error: 'SSH连接不存在或配置丢失' };
      }

      const sftp = require('ssh2-sftp-client');
      const sftpClient = new sftp();
      
      const connectConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username
      };

      // 根据认证方式添加相应的认证信息
      if (config.authType === 'key' && config.privateKey) {
        connectConfig.privateKey = config.privateKey;
      } else if (config.password) {
        connectConfig.password = config.password;
      }

      await sftpClient.connect(connectConfig);
      
      const fileName = require('path').basename(localPath);
      const remoteFilePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
      
      await sftpClient.put(localPath, remoteFilePath);
      await sftpClient.end();
      
      return { success: true };
    }
    
    return { success: false, error: '用户取消选择' };
  } catch (error) {
    console.error('选择文件失败:', error);
    return { success: false, error: error.message };
  }
});

// 下载文件
ipcMain.handle('downloadFile', async (event, connectionId, remotePath) => {
  const conn = sshConnections[connectionId];
  const config = sshConnectionConfigs[connectionId];
  
  if (!conn || !config) {
    return { success: false, error: 'SSH连接不存在或配置丢失' };
  }

  try {
    const sftp = require('ssh2-sftp-client');
    const sftpClient = new sftp();
    
    const connectConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username
    };

    // 根据认证方式添加相应的认证信息
    if (config.authType === 'key' && config.privateKey) {
      connectConfig.privateKey = config.privateKey;
    } else if (config.password) {
      connectConfig.password = config.password;
    }

    await sftpClient.connect(connectConfig);
    
    // 选择保存位置
    const fileName = require('path').basename(remotePath);
    const saveResult = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      title: '保存文件'
    });

    if (!saveResult.canceled) {
      await sftpClient.get(remotePath, saveResult.filePath);
      await sftpClient.end();
      
      return { success: true, localPath: saveResult.filePath };
    } else {
      await sftpClient.end();
      return { success: false, error: '用户取消保存' };
    }
  } catch (err) {
    console.error('文件下载失败:', err);
    return { success: false, error: err.message };
  }
});

// 下载并打开文件
ipcMain.handle('downloadAndOpenFile', async (event, connectionId, remotePath) => {
  const conn = sshConnections[connectionId];
  const config = sshConnectionConfigs[connectionId];
  
  if (!conn || !config) {
    return { success: false, error: 'SSH连接不存在或配置丢失' };
  }

  try {
    const sftp = require('ssh2-sftp-client');
    const sftpClient = new sftp();
    const os = require('os');
    const path = require('path');
    
    const connectConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username
    };

    // 根据认证方式添加相应的认证信息
    if (config.authType === 'key' && config.privateKey) {
      connectConfig.privateKey = config.privateKey;
    } else if (config.password) {
      connectConfig.password = config.password;
    }

    await sftpClient.connect(connectConfig);
    
    // 创建临时目录
    const tempDir = path.join(os.tmpdir(), 'sshcode-files');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const fileName = path.basename(remotePath);
    const localPath = path.join(tempDir, fileName);
    
    await sftpClient.get(remotePath, localPath);
    await sftpClient.end();
    
    // 使用系统默认程序打开文件
    const { shell } = require('electron');
    await shell.openPath(localPath);
    
    return { success: true, localPath };
  } catch (err) {
    console.error('文件下载并打开失败:', err);
    return { success: false, error: err.message };
  }
});

// 文件监听器
const fileWatchers = new Map();

ipcMain.handle('startFileWatcher', async (event, remotePath, localPath) => {
  try {
    const fs = require('fs');
    
    // 如果已经在监听这个文件，先停止
    if (fileWatchers.has(localPath)) {
      fileWatchers.get(localPath).close();
    }
    
    // 创建文件监听器
    const watcher = fs.watchFile(localPath, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        // 文件发生变化，发送事件到渲染进程
        mainWindow.webContents.send('fileChanged', {
          remotePath,
          localPath
        });
      }
    });
    
    fileWatchers.set(localPath, watcher);
    
    return { success: true };
  } catch (error) {
    console.error('启动文件监听失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stopFileWatcher', async (event, localPath) => {
  try {
    if (fileWatchers.has(localPath)) {
      const fs = require('fs');
      fs.unwatchFile(localPath);
      fileWatchers.delete(localPath);
    }
    
    return { success: true };
  } catch (error) {
    console.error('停止文件监听失败:', error);
    return { success: false, error: error.message };
  }
});
