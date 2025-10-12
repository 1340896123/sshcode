# Electron 调试指南

## 概述

本文档详细介绍了如何调试你的 Electron 应用。我已经为你配置好了 VS Code 调试环境，支持主进程、渲染进程和同时调试两种进程。

## 调试配置

已创建的调试配置文件位于 `.vscode/launch.json`，包含三种调试模式：

### 1. 调试主进程 (Debug Main Process)
- **用途**: 调试 Electron 的主进程代码 (main.js)
- **功能**: 可以设置断点、查看变量、调试 IPC 通信等

### 2. 调试渲染进程 (Debug Renderer Process)
- **用途**: 调试前端渲染进程代码 (React 组件)
- **功能**: 调试 DOM、JavaScript、React 组件等

### 3. 调试所有进程 (Debug All Processes)
- **用途**: 同时调试主进程和渲染进程
- **功能**: 最全面的调试模式

## 使用方法

### 方法一：VS Code 调试 (推荐)

1. **打开调试面板**
   - 按 `Ctrl+Shift+D` (Windows) 或 `Cmd+Shift+D` (Mac)
   - 或点击左侧活动栏的调试图标

2. **选择调试配置**
   - 在顶部的下拉菜单中选择调试配置：
     - "Debug Main Process" - 调试主进程
     - "Debug Renderer Process" - 调试渲染进程
     - "Debug All Processes" - 调试所有进程

3. **开始调试**
   - 按 `F5` 或点击绿色播放按钮
   - 或者在代码中设置断点后开始调试

### 方法二：开发者工具调试

1. **开启开发者工具**
   - 你的代码已经配置了 `--dev` 参数会自动打开开发者工具
   - 或者手动按 `F12` / `Ctrl+Shift+I`

2. **调试渲染进程**
   - 在 Elements 面板检查 DOM
   - 在 Console 面板查看日志
   - 在 Sources 面板设置断点

### 方法三：命令行调试

```bash
# 开发模式启动 (自动打开开发者工具)
npm start

# 或者直接使用 electron
npx electron . --dev

# 启用远程调试
npx electron . --dev --remote-debugging-port=9222
```

## 调试技巧

### 主进程调试

1. **设置断点**: 在 main.js 中点击行号左侧设置断点
2. **查看变量**: 在断点处悬停查看变量值
3. **调试 IPC**: 在 ipcMain.handle 处设置断点
4. **控制台输出**: 使用 `console.log()` 输出调试信息

### 渲染进程调试

1. **React DevTools**: 安装 React Developer Tools 扩展
2. **网络请求**: 在 Network 面板查看 API 请求
3. **性能分析**: 使用 Performance 面板分析性能
4. **内存泄漏**: 使用 Memory 面板检查内存使用

### 常见调试场景

#### 1. 调试 SSH 连接问题
```javascript
// 在 main.js 的 ssh-connect handler 中设置断点
ipcMain.handle('ssh-connect', async (event, connectionConfig) => {
  console.log('开始连接:', connectionConfig.host); // 添加日志
  // 在这里设置断点
  const { Client } = require('ssh2');
  // ...
});
```

#### 2. 调试文件上传
```javascript
// 在 uploadFile handler 中设置断点
ipcMain.handle('uploadFile', async (event, connectionId, localPath, remotePath) => {
  console.log('上传文件:', localPath, '->', remotePath); // 添加日志
  // 在这里设置断点
  // ...
});
```

#### 3. 调试 React 组件
```javascript
// 在 React 组件中使用 debugger
const handleConnect = async () => {
  debugger; // 浏览器会在这里暂停
  try {
    const result = await window.electronAPI.sshConnect(connectionConfig);
    // ...
  } catch (error) {
    console.error('连接失败:', error);
  }
};
```

## 日志调试

### 主进程日志
```javascript
// 使用不同级别的日志
console.log('普通日志');
console.error('错误日志');
console.warn('警告日志');
console.info('信息日志');
```

### 渲染进程日志
```javascript
// 在 React 组件中
useEffect(() => {
  console.log('组件挂载');
  return () => {
    console.log('组件卸载');
  };
}, []);
```

## 性能调试

### 1. 启动性能分析
```javascript
// 在 main.js 开头添加
const { app } = require('electron');
app.whenReady().then(() => {
  console.time('app-startup');
  // ...
  console.timeEnd('app-startup');
});
```

### 2. 内存使用监控
```javascript
// 监控内存使用
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('内存使用:', {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
  });
}, 10000);
```

## 常见问题解决

### 1. 断点不生效
- 确保使用了正确的调试配置
- 检查代码是否被压缩
- 重启调试连接

### 2. 渲染进程无法连接
- 确保 `--remote-debugging-port` 参数正确
- 检查防火墙设置
- 尝试不同的端口号

### 3. 主进程调试慢
- 减少不必要的 console.log
- 使用条件断点
- 优化代码结构

## 推荐工具

1. **VS Code 扩展**:
   - Electron Debug
   - React Developer Tools
   - ES7+ React/Redux/React-Native snippets

2. **Chrome 扩展**:
   - React Developer Tools
   - Redux DevTools
   - Vue.js devtools (如果使用 Vue)

3. **Node.js 工具**:
   - node-inspector
   - clinic.js (性能分析)

## 最佳实践

1. **开发环境**:
   - 始终在开发模式下调试
   - 使用源码映射 (source maps)
   - 启用热重载

2. **生产调试**:
   - 使用适当的日志级别
   - 实现错误报告机制
   - 保留调试信息但保护隐私

3. **团队协作**:
   - 统一调试配置
   - 共享调试技巧
   - 记录常见问题解决方案

现在你可以开始使用这些调试方法来开发和维护你的 Electron 应用了！
