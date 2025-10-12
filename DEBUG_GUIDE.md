# Vite + Electron 调试指南

本项目现在支持完整的 Vite + Electron 调试功能。

## 调试脚本说明

### 基础调试脚本

- `npm run debug` - 并行启动 Vite 开发服务器和 Electron，支持热重载
- `npm run debug-renderer` - 仅启动 Vite 开发服务器（用于调试渲染进程）
- `npm run debug-main` - 仅启动 Electron 主进程（用于调试主进程）

### 高级调试脚本

- `npm run debug:inspect` - 启动调试并开启 Node.js 检查器（端口 9229）
- `npm run debug:break` - 启动调试并在第一行代码暂停（用于调试启动问题）

## VSCode 调试配置

项目已配置完整的 VSCode 调试环境，包含以下调试选项：

### 调试配置说明

1. **调试主进程** - 调试 Electron 主进程代码（main.js）
2. **调试渲染进程** - 调试 Vue 渲染进程代码
3. **同时调试主进程和渲染进程** - 一次启动两个进程的调试
4. **调试主进程（断点暂停）** - 在启动时暂停，便于调试启动问题
5. **完整调试会话** - 复合配置，同时调试主进程和渲染进程

### 使用方法

1. 在 VSCode 中打开项目
2. 按 `F5` 或点击调试面板的运行按钮
3. 选择合适的调试配置
4. 在代码中设置断点
5. 开始调试

## 调试端口说明

- **3000** - Vite 开发服务器端口
- **9222** - Electron 渲染进程调试端口
- **9229** - Electron 主进程 Node.js 调试端口

## 调试功能特性

### 渲染进程调试
- ✅ 热重载支持
- ✅ Vue DevTools 支持
- ✅ 浏览器开发者工具
- ✅ 源码映射

### 主进程调试
- ✅ Node.js Inspector 支持
- ✅ 断点调试
- ✅ 变量检查
- ✅ 调用堆栈

## 常见调试场景

### 1. 调试 Vue 组件
```bash
npm run debug
# 或者在 VSCode 中选择 "调试渲染进程"
```

### 2. 调试主进程 IPC 通信
```bash
npm run debug:inspect
# 或者在 VSCode 中选择 "调试主进程"
```

### 3. 调试启动问题
```bash
npm run debug:break
# 或者在 VSCode 中选择 "调试主进程（断点暂停）"
```

### 4. 完整应用调试
```bash
npm run debug
# 或者在 VSCode 中选择 "完整调试会话"
```

## 开发工作流

### 推荐的开发流程

1. **启动调试环境**
   ```bash
   npm run debug
   ```

2. **在 VSCode 中设置断点**
   - 主进程断点：在 main.js 中设置
   - 渲染进程断点：在 Vue 组件中设置

3. **使用调试配置**
   - 按 `F5` 选择调试配置
   - 或使用调试面板选择具体配置

4. **热重载开发**
   - 修改 Vue 组件会自动重载
   - 修改主进程需要重启调试

## 调试技巧

### 主进程调试技巧
- 使用 `console.log` 在主进程中输出调试信息
- 在 VSCode 中使用 "调试控制台" 执行表达式
- 使用 "变量" 面板检查作用域变量

### 渲染进程调试技巧
- 使用浏览器开发者工具
- 安装 Vue DevTools 扩展
- 使用 Vue DevTools 检查组件状态

### 性能调试
- 使用 Chrome Performance 面板分析渲染进程性能
- 使用 Node.js Profiler 分析主进程性能

## 故障排除

### 常见问题

1. **Vite 服务器启动失败**
   - 检查端口 3000 是否被占用
   - 确认 node_modules 已正确安装

2. **Electron 无法连接到 Vite 服务器**
   - 确认 Vite 服务器已启动
   - 检查防火墙设置

3. **调试器无法连接**
   - 确认调试端口未被占用
   - 重启 VSCode 调试会话

4. **热重载不工作**
   - 检查 Vite 配置
   - 确认文件保存正确

### 调试命令参考

```bash
# 查看可用的调试脚本
npm run

# 启动基础调试
npm run debug

# 启动高级调试（带检查器）
npm run debug:inspect

# 仅启动 Vite 服务器
npm run debug-renderer

# 仅启动 Electron 主进程
npm run debug-main
```

## 生产环境调试

生产环境构建后的调试：

```bash
# 构建应用
npm run build

# 启动生产版本
npm start
```

生产环境调试功能有限，建议主要在开发环境中进行调试。
