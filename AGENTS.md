# SSH 远程应用代理指南

## 构建/测试命令

- **开发**: `npm run start` (启动 Vite 开发服务器并在调试模式下运行 Electron)
- **构建**: `npm run build` (使用 Vite 构建前端)
- **主进程构建**: `npm run build-main` (将 TypeScript 编译为 JavaScript 用于主进程)
- **完整构建**: `npm run build-electron` 或 `npm run dist` (构建主进程 + 前端并创建 Electron 安装包)
- **生产启动**: `npm run start` (构建并在生产模式下启动 Electron)
- **类型检查**: `npm run type-check` (TypeScript 类型检查，不生成文件)
- **代码检查**: `npm run lint` (ESLint 自动修复), `npm run lint:check` (ESLint 不自动修复)
- **验证**: 使用 `npm run type-check` 进行类型验证 - 不要运行自动化测试

## 代码风格

- **框架**: Vue 3 配合 Composition API 和 TypeScript
- **架构**: Electron 应用程序，分离主进程 (Node.js) 和渲染进程 (Vue)
- **导入**: 使用 `@/` 别名指向 src/ 目录 (例如: `import Component from "@/components/Component"`)
- **组件**: 使用 `<script setup>` 语法配合 Composition API，用 TypeScript 接口定义 props
- **类型**: 完整的 TypeScript 支持，避免 `any` 类型，为所有数据结构定义接口
- **CSS**: SCSS 配合全局变量和路径别名，CSS 变量驱动的主题
- **命名**: 组件使用 PascalCase，变量/函数使用 camelCase，文件名使用 kebab-case
- **文件结构**:
  - `/components/`: 按功能组织的 Vue 组件
  - `/composables/`: 可复用的 Vue 组合式函数
  - `/modules/`: 基于功能的模块 (ai-assistant, terminal, file-manager)
  - `/stores/`: Pinia 状态管理存储
  - `/utils/`: 工具函数和服务
  - `/types/`: TypeScript 类型定义
  - `/hooks/`: 自定义 Vue 钩子
  - `/database/`: SQLite 数据库模型和初始化

## 关键依赖

- **Electron**: 桌面应用程序框架
- **Vue 3**: 配合 Composition API 的前端框架
- **Pinia**: 状态管理
- **Vite**: 构建工具和开发服务器
- **TypeScript**: 类型安全
- **SSH2**: SSH 连接库
- **ssh2-sftp-client**: SFTP 文件操作
- **xterm.js**: 终端模拟
- **SCSS**: CSS 预处理器
- **SQLite**: 本地数据库存储
- **js-yaml**: 配置文件解析

## 开发指南

### 环境要求
- 必须在 Electron 上下文中运行以访问 `window.electronAPI`
- 开发服务器运行在端口 3000
- 调试模式下支持热重载

### 代码组织
- **基于功能的模块**: 每个主要功能 (ai-assistant, terminal, file-manager) 都有自己的模块，包含组件、组合式函数、存储和工具
- **组合式函数模式**: 使用 composition API 实现可复用逻辑 (useConnectionManager, useAIChat, useComponentStyles 等)
- **类型安全**: 所有 IPC 通信在主进程/渲染进程边界都有完整的类型定义
- **事件系统**: 使用基于 mitt 的轻量级事件系统进行组件间通信

### SSH 连接架构
- **连接池**: 在主进程中维护持久连接
- **认证**: 支持密码和私钥认证
- **Shell 集成**: 完整的终端模拟，配合 PTY 分配
- **文件操作**: 基于 SFTP 的文件管理，支持拖拽操作

### 配置系统
- **位置**: `config/app.yml` (YAML 格式)
- **运行时**: 启动时加载到内存中，更新立即持久化
- **类型安全**: 所有配置部分都有完整的 TypeScript 接口

### 重要注意事项
- 出于性能考虑，终端输出限制为 1000 行
- 自动清理连接、计时器和文件监视器
- 应用程序重启时会话持久化和恢复
- 具有可配置阈值的内存管理
- 使用 ARIA 属性和键盘导航的无障碍支持

没有其他的特殊规则的文件了
