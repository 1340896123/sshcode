"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
let mainWindow = null;
const sshConnections = {};
const sshConnectionConfigs = {};
const sshShells = {};
let appConfig;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 750,
        minWidth: 1000,
        minHeight: 650,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        titleBarStyle: 'default'
    });
    // 在开发环境中加载 Vite 开发服务器，在生产环境中加载构建后的文件
    const isDev = process.argv.includes('--dev');
    if (isDev) {
        // 开发模式：加载 Vite 开发服务器
        console.log('开发模式：加载 Vite 开发服务器');
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        // 生产模式：加载本地构建文件
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        console.log('生产模式：加载HTML文件:', indexPath);
        mainWindow.loadFile(indexPath);
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC handlers
electron_1.ipcMain.handle('save-session', async (event, sessionData) => {
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
        }
        else {
            sessions.push(sessionData);
        }
        fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('get-sessions', async () => {
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
    }
    catch (error) {
        console.error('Error reading sessions:', error);
        return [];
    }
});
electron_1.ipcMain.handle('delete-session', async (event, sessionId) => {
    try {
        const sessionsPath = path.join(__dirname, 'data', 'sessions.json');
        if (fs.existsSync(sessionsPath)) {
            const data = fs.readFileSync(sessionsPath, 'utf8');
            let sessions = JSON.parse(data);
            sessions = sessions.filter(s => s.id !== sessionId);
            fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
        }
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('ssh-connect', async (event, connectionConfig) => {
    console.log('🔗 [SSH-DEBUG] 开始SSH连接请求');
    console.log('📋 [SSH-DEBUG] 连接配置:', {
        id: connectionConfig.id,
        host: connectionConfig.host,
        port: connectionConfig.port,
        username: connectionConfig.username,
        authType: connectionConfig.authType,
        hasPassword: !!connectionConfig.password,
        hasKeyContent: !!connectionConfig.keyContent || !!connectionConfig.privateKey
    });
    const { Client } = require('ssh2');
    const conn = new Client();
    return new Promise((resolve, reject) => {
        const connectConfig = {
            host: connectionConfig.host,
            port: connectionConfig.port || 22,
            username: connectionConfig.username,
            readyTimeout: 30000,
            algorithms: {
                kex: [
                    'diffie-hellman-group-exchange-sha256',
                    'diffie-hellman-group14-sha256',
                    'ecdh-sha2-nistp256'
                ],
                cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
                serverHostKey: ['ssh-rsa', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-ed25519'],
                hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
            }
        };
        console.log('⚙️ [SSH-DEBUG] 基础连接配置准备完成');
        // 根据认证方式添加相应的认证信息
        if (connectionConfig.authType === 'key' &&
            (connectionConfig.keyContent || connectionConfig.privateKey)) {
            try {
                connectConfig.privateKey = connectionConfig.keyContent || connectionConfig.privateKey;
                console.log('🔑 [SSH-DEBUG] 使用密钥认证，密钥长度:', connectConfig.privateKey.length);
            }
            catch (error) {
                console.error('❌ [SSH-DEBUG] 私钥格式错误:', error.message);
                resolve({ success: false, error: '私钥格式错误: ' + error.message });
                return;
            }
        }
        else if (connectionConfig.authType === 'password' && connectionConfig.password) {
            connectConfig.password = connectionConfig.password;
            console.log('🔒 [SSH-DEBUG] 使用密码认证，密码长度:', connectConfig.password.length);
        }
        else {
            console.error('❌ [SSH-DEBUG] 缺少认证信息:', {
                authType: connectionConfig.authType,
                hasPassword: !!connectionConfig.password,
                hasKeyContent: !!(connectionConfig.keyContent || connectionConfig.privateKey)
            });
            resolve({ success: false, error: '缺少认证信息' });
            return;
        }
        console.log('🚀 [SSH-DEBUG] 开始建立SSH连接到:', `${connectConfig.username}@${connectConfig.host}:${connectConfig.port}`);
        conn
            .on('ready', () => {
            console.log('✅ [SSH-DEBUG] SSH连接成功建立');
            sshConnections[connectionConfig.id] = conn;
            sshConnectionConfigs[connectionConfig.id] = { ...connectionConfig };
            console.log('💾 [SSH-DEBUG] 连接已保存到连接池，当前连接数:', Object.keys(sshConnections).length);
            resolve({ success: true, message: 'SSH连接成功' });
        })
            .on('error', err => {
            console.error('❌ [SSH-DEBUG] SSH连接错误:', {
                message: err.message,
                level: err.level,
                code: err.code
            });
            let errorMessage = err.message;
            // 提供更友好的错误信息
            if (err.level === 'client-authentication') {
                errorMessage = '认证失败，请检查用户名和密码/密钥';
            }
            else if (err.code === 'ENOTFOUND') {
                errorMessage = '主机地址无法解析，请检查主机名或IP地址';
            }
            else if (err.code === 'ECONNREFUSED') {
                errorMessage = '连接被拒绝，请检查主机地址和端口';
            }
            else if (err.code === 'ETIMEDOUT') {
                errorMessage = '连接超时，请检查网络连接';
            }
            console.log('📝 [SSH-DEBUG] 最终错误信息:', errorMessage);
            resolve({ success: false, error: errorMessage });
        })
            .connect(connectConfig);
    });
});
electron_1.ipcMain.handle('ssh-execute', async (event, connectionId, command) => {
    const conn = sshConnections[connectionId];
    if (!conn) {
        return { success: false, error: 'SSH连接不存在' };
    }
    return new Promise((resolve, _reject) => {
        // 设置终端环境变量
        const execOptions = {
            env: {
                TERM: 'xterm-256color',
                SHELL: '/bin/bash',
                PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                HOME: `/home/${sshConnectionConfigs[connectionId].username}`,
                USER: sshConnectionConfigs[connectionId].username,
                LANG: 'en_US.UTF-8',
                LC_ALL: 'en_US.UTF-8'
            },
            pty: true,
            rows: 24,
            cols: 80
        };
        conn.exec(command, execOptions, (err, stream) => {
            if (err) {
                _reject({ success: false, error: err.message });
                return;
            }
            let output = '';
            stream
                .on('close', (code, signal) => {
                resolve({ success: true, output, code, signal });
            })
                .on('data', data => {
                output += data.toString();
            })
                .stderr.on('data', data => {
                output += data.toString();
            });
        });
    });
});
// 新增：创建SSH Shell会话
electron_1.ipcMain.handle('ssh-create-shell', async (event, connectionId, options = {}) => {
    const conn = sshConnections[connectionId];
    const config = sshConnectionConfigs[connectionId];
    if (!conn || !config) {
        return { success: false, error: 'SSH连接不存在或配置丢失' };
    }
    try {
        return new Promise((resolve, _reject) => {
            const shellOptions = {
                rows: options.rows || 24,
                cols: options.cols || 80,
                term: options.term || 'xterm-256color',
                env: {
                    TERM: 'xterm-256color',
                    SHELL: '/bin/bash',
                    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                    HOME: `/home/${config.username}`,
                    USER: config.username,
                    LANG: 'en_US.UTF-8',
                    LC_ALL: 'en_US.UTF-8'
                }
            };
            conn.shell(shellOptions, (err, stream) => {
                if (err) {
                    _reject({ success: false, error: err.message });
                    return;
                }
                // 存储Shell会话
                sshShells[connectionId] = stream;
                let outputBuffer = '';
                stream.on('data', data => {
                    const output = data.toString();
                    outputBuffer += output;
                    // 规范化输出数据，确保统一的换行格式
                    let normalizedOutput = output;
                    // 处理连续的多个换行符，保持最多2个换行符
                    normalizedOutput = normalizedOutput.replace(/\r\n\r\n\r\n+/g, '\r\n\r\n');
                    // 处理开头的多余换行符（保留最多1个）
                    normalizedOutput = normalizedOutput.replace(/^\r\n\r\n+/, '\r\n');
                    // 处理结尾的多余换行符（保留最多1个）
                    normalizedOutput = normalizedOutput.replace(/\r\n\r\n+$/, '\r\n');
                    // 不再额外添加换行符，让数据保持原始格式
                    mainWindow.webContents.send('terminal-data', {
                        connectionId,
                        data: normalizedOutput
                    });
                });
                stream.stderr.on('data', data => {
                    const output = data.toString();
                    outputBuffer += output;
                    // 发送错误数据到渲染进程
                    mainWindow.webContents.send('terminal-data', {
                        connectionId,
                        data: output,
                        isError: true
                    });
                });
                stream.on('close', (code, signal) => {
                    console.log(`SSH Shell会话关闭: ${connectionId}, code: ${code}, signal: ${signal}`);
                    delete sshShells[connectionId];
                    // 通知渲染进程会话已关闭
                    mainWindow.webContents.send('terminal-close', {
                        connectionId,
                        code,
                        signal
                    });
                });
                stream.on('error', err => {
                    console.error(`SSH Shell会话错误: ${connectionId}`, err);
                    delete sshShells[connectionId];
                    // 通知渲染进程会话错误
                    mainWindow.webContents.send('terminal-error', {
                        connectionId,
                        error: err.message
                    });
                });
                resolve({
                    success: true,
                    message: 'SSH Shell会话创建成功',
                    initialOutput: outputBuffer
                });
            });
        });
    }
    catch (error) {
        console.error('创建SSH Shell会话失败:', error);
        return { success: false, error: error.message };
    }
});
// 新增：向Shell发送数据
electron_1.ipcMain.handle('ssh-shell-write', async (event, connectionId, data) => {
    console.log(`🔍 [SHELL-DEBUG] 尝试向Shell发送数据:`, {
        connectionId,
        data: data.toString().trim(),
        fullData: data.toString(),
        availableShells: Object.keys(sshShells),
        shellExists: !!sshShells[connectionId]
    });
    const stream = sshShells[connectionId];
    if (!stream) {
        console.error(`❌ [SHELL-DEBUG] SSH Shell会话不存在: ${connectionId}`);
        return { success: false, error: 'SSH Shell会话不存在' };
    }
    try {
        stream.write(data);
        console.log(`✅ [SHELL-DEBUG] 成功向Shell发送数据:`, data.toString().trim());
        return { success: true };
    }
    catch (error) {
        console.error('❌ [SHELL-DEBUG] 向Shell发送数据失败:', error);
        return { success: false, error: error.message };
    }
});
// 新增：调整Shell终端大小
electron_1.ipcMain.handle('ssh-shell-resize', async (event, connectionId, rows, cols) => {
    const stream = sshShells[connectionId];
    if (!stream) {
        return { success: false, error: 'SSH Shell会话不存在' };
    }
    try {
        stream.setWindow(rows, cols, 0, 0);
        return { success: true };
    }
    catch (error) {
        console.error('调整Shell终端大小失败:', error);
        return { success: false, error: error.message };
    }
});
// 新增：关闭Shell会话
electron_1.ipcMain.handle('ssh-shell-close', async (event, connectionId) => {
    const stream = sshShells[connectionId];
    if (stream) {
        stream.end();
        delete sshShells[connectionId];
    }
    return { success: true };
});
electron_1.ipcMain.handle('ssh-disconnect', async (event, connectionId) => {
    const conn = sshConnections[connectionId];
    const stream = sshShells[connectionId];
    // 关闭Shell会话
    if (stream) {
        stream.end();
        delete sshShells[connectionId];
    }
    // 关闭SSH连接
    if (conn) {
        conn.end();
        delete sshConnections[connectionId];
        delete sshConnectionConfigs[connectionId];
    }
    return { success: true };
});
electron_1.ipcMain.handle('get-file-list', async (event, connectionId, remotePath) => {
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
        }
        else if (config.password) {
            connectConfig.password = config.password;
        }
        await sftpClient.connect(connectConfig);
        // 如果路径不存在，尝试使用根目录或用户主目录
        let targetPath = remotePath || '/';
        try {
            const list = await sftpClient.list(targetPath);
            await sftpClient.end();
            return { success: true, files: list };
        }
        catch (pathErr) {
            // 如果路径不存在，尝试备选路径
            if (pathErr.code === 2) {
                // SSH_FX_NO_SUCH_FILE
                console.log(`路径 ${targetPath} 不存在，尝试备选路径`);
                let fallbackPath = '/';
                // 如果是尝试访问用户主目录失败，根据用户名确定正确的路径
                if (targetPath.includes('/home/')) {
                    const username = config.username;
                    if (username === 'root') {
                        fallbackPath = '/root';
                    }
                    else {
                        fallbackPath = '/home/' + username;
                    }
                }
                try {
                    const list = await sftpClient.list(fallbackPath);
                    await sftpClient.end();
                    return { success: true, files: list, fallbackPath };
                }
                catch (fallbackErr) {
                    await sftpClient.end();
                    return {
                        success: false,
                        error: `路径 ${targetPath} 不存在，备选路径 ${fallbackPath} 也不可访问。请检查路径是否正确。`
                    };
                }
            }
            else {
                await sftpClient.end();
                throw pathErr;
            }
        }
    }
    catch (err) {
        console.error('SFTP操作失败:', err);
        // 提供更友好的错误信息
        let errorMessage = err.message;
        if (err.code === 2) {
            errorMessage = `路径不存在: ${remotePath || '/'}，请检查路径是否正确`;
        }
        else if (err.code === 3) {
            errorMessage = `权限不足，无法访问路径: ${remotePath || '/'}`;
        }
        else if (err.code === 4) {
            errorMessage = `连接失败，请检查SSH连接状态`;
        }
        return { success: false, error: errorMessage };
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
        }
        else {
            appConfig = getDefaultConfig();
            saveConfig();
        }
    }
    catch (error) {
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
        autoSave: true,
        autoSaveSessions: true,
        checkUpdates: true
    },
    terminal: {
        font: 'Consolas',
        fontSize: 14,
        fontFamily: 'Consolas',
        copyOnSelect: false,
        bell: false,
        cursorBlink: true
    },
    security: {
        passwordEncryption: false,
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
    }
    catch (error) {
        console.error('保存配置失败:', error);
        return { success: false, error: error.message };
    }
};
// 初始化配置
loadConfig();
// IPC handlers for config
electron_1.ipcMain.handle('getConfig', async () => {
    return appConfig;
});
electron_1.ipcMain.handle('saveConfig', async (event, config) => {
    try {
        appConfig = { ...appConfig, ...config };
        const result = saveConfig();
        return result;
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// 读取SSH密钥文件
electron_1.ipcMain.handle('readSSHKey', async (event, keyPath) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        let fullPath = keyPath;
        // 处理相对路径
        if (keyPath.startsWith('~/')) {
            fullPath = path.join(os.homedir(), keyPath.substring(2));
        }
        else if (!path.isAbsolute(keyPath)) {
            fullPath = path.resolve(keyPath);
        }
        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
            return { success: false, error: '私钥文件不存在: ' + fullPath };
        }
        // 读取文件内容
        const keyContent = fs.readFileSync(fullPath, 'utf8');
        return { success: true, keyContent };
    }
    catch (error) {
        console.error('读取SSH密钥失败:', error);
        return { success: false, error: error.message };
    }
});
// 文件上传功能
electron_1.ipcMain.handle('uploadFile', async (event, connectionId, localPath, remotePath) => {
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
        }
        else if (config.password) {
            connectConfig.password = config.password;
        }
        await sftpClient.connect(connectConfig);
        const fileName = require('path').basename(localPath);
        const remoteFilePath = remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;
        await sftpClient.put(localPath, remoteFilePath);
        await sftpClient.end();
        return { success: true };
    }
    catch (err) {
        console.error('文件上传失败:', err);
        return { success: false, error: err.message };
    }
});
// 上传拖拽的文件
electron_1.ipcMain.handle('uploadDroppedFile', async (event, connectionId, file, remotePath) => {
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
        }
        else if (config.password) {
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
    }
    catch (err) {
        console.error('文件上传失败:', err);
        return { success: false, error: err.message };
    }
});
// 选择并上传文件
electron_1.ipcMain.handle('selectAndUploadFile', async (event, connectionId, remotePath) => {
    try {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
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
            }
            else if (config.password) {
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
    }
    catch (error) {
        console.error('选择文件失败:', error);
        return { success: false, error: error.message };
    }
});
// 下载文件
electron_1.ipcMain.handle('downloadFile', async (event, connectionId, remotePath) => {
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
        }
        else if (config.password) {
            connectConfig.password = config.password;
        }
        await sftpClient.connect(connectConfig);
        // 选择保存位置
        const fileName = require('path').basename(remotePath);
        const saveResult = await electron_1.dialog.showSaveDialog(mainWindow, {
            defaultPath: fileName,
            title: '保存文件'
        });
        if (!saveResult.canceled) {
            await sftpClient.get(remotePath, saveResult.filePath);
            await sftpClient.end();
            return { success: true, localPath: saveResult.filePath };
        }
        else {
            await sftpClient.end();
            return { success: false, error: '用户取消保存' };
        }
    }
    catch (err) {
        console.error('文件下载失败:', err);
        return { success: false, error: err.message };
    }
});
// 下载并打开文件
electron_1.ipcMain.handle('downloadAndOpenFile', async (event, connectionId, remotePath) => {
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
        }
        else if (config.password) {
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
    }
    catch (err) {
        console.error('文件下载并打开失败:', err);
        return { success: false, error: err.message };
    }
});
// 文件监听器
const fileWatchers = new Map();
electron_1.ipcMain.handle('startFileWatcher', async (event, remotePath, localPath) => {
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
    }
    catch (error) {
        console.error('启动文件监听失败:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('stopFileWatcher', async (event, localPath) => {
    try {
        if (fileWatchers.has(localPath)) {
            const fs = require('fs');
            fs.unwatchFile(localPath);
            fileWatchers.delete(localPath);
        }
        return { success: true };
    }
    catch (error) {
        console.error('停止文件监听失败:', error);
        return { success: false, error: error.message };
    }
});
