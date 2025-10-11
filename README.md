# SSH Remote App

一个基于Electron开发的SSH远程连接应用，集成了文件管理、终端操作和AI助手功能。

## 功能特性

### 🔗 会话管理
- **完整的SSH会话管理** - 创建、编辑、删除SSH连接
- **会话分组** - 支持生产、开发、测试环境分组
- **连接测试** - 保存前测试SSH连接可用性
- **多种认证方式** - 支持密码和SSH密钥认证
- **会话搜索** - 快速查找和管理大量会话
- **连接状态显示** - 实时显示连接状态

### 📁 文件浏览器
- 浏览远程服务器文件目录
- 支持文件和目录的基本操作
- 右键菜单功能（新建、删除、重命名等）
- 文件大小和修改时间显示
- 目录导航和面包屑

### 💻 终端操作
- 完整的SSH终端功能
- 命令历史记录（上下键浏览）
- 清空和复制终端输出
- 支持各种Linux/Unix命令
- 实时命令执行和结果显示

### 🤖 AI助手
- **多AI提供商支持** - OpenAI、Anthropic、Ollama、自定义API
- **智能命令执行** - 自然语言描述，AI执行命令
- **配置管理** - YAML格式配置文件存储
- **连接测试** - AI API连接状态检测
- **降级处理** - AI不可用时的本地处理

### ⚙️ 应用设置
- **AI配置** - Base URL、API Key、模型参数配置
- **主题设置** - 深色/浅色主题切换
- **终端设置** - 字体、字号、光标样式
- **安全设置** - 密码加密、会话超时
- **多语言支持** - 中英文界面

## 安装和运行

### 环境要求
- Node.js 16.0+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式运行
```bash
npm run dev
```

### 生产模式运行
```bash
npm start
```

### 打包应用
```bash
npm run build
```

## 使用说明

### 1. 配置AI助手（首次使用）
1. 点击右上角"设置"按钮
2. 选择"AI配置"标签
3. 选择AI提供商（OpenAI、Anthropic等）
4. 填写Base URL和API Key
5. 选择模型名称（如gpt-3.5-turbo）
6. 点击"测试连接"验证配置
7. 保存配置

### 2. 创建SSH会话
1. 点击顶部"会话管理"按钮
2. 点击"新建会话"
3. 填写连接信息：
   - 会话名称（可选，便于识别）
   - 分组（生产/开发/测试环境）
   - 主机地址（IP或域名）
   - 端口（默认22）
   - 用户名
   - 认证方式（密码或SSH密钥）
   - 描述（可选）
4. 点击"测试连接"验证配置
5. 点击"保存会话"

### 3. 连接SSH服务器
1. 在会话列表中找到目标会话
2. 点击"连接"按钮
3. 等待连接成功提示
4. 连接成功后可以使用终端和文件浏览器

### 4. 使用终端
- 直接在终端输入框输入命令
- 按Enter执行命令
- 使用↑↓键浏览命令历史
- 支持常见的Linux/Unix命令
- 可以清空终端和复制输出

### 5. 文件浏览器
- 双击目录进入子目录
- 右键点击文件/目录显示操作菜单
- 支持新建、删除、重命名等操作
- 面包屑显示当前路径

### 6. AI助手交互
- 在右侧聊天框输入问题或命令
- 自然语言交互示例：
  - "执行命令 ls -la"
  - "列出当前目录的文件"
  - "显示系统信息"
  - "创建一个名为test的目录"
  - "查看磁盘使用情况"
- AI会分析请求并执行相应命令
- 支持系统信息查询和文件操作建议

## 快捷键

- `Ctrl/Cmd + K` - 打开会话管理
- `Ctrl/Cmd + \` - 聚焦终端输入
- `Ctrl/Cmd + /` - 聚焦AI聊天
- `Esc` - 关闭所有模态框

## 项目结构

```
sshcode/
├── main.js                 # 主进程文件
├── index.html             # 主界面HTML
├── package.json           # 项目配置和依赖
├── renderer/              # 渲染进程文件
│   ├── session-manager.js # SSH会话管理
│   ├── settings.js        # 应用设置管理
│   ├── terminal.js        # 终端功能
│   ├── file-explorer.js   # 文件浏览器
│   ├── ai-chat.js         # AI聊天和API调用
│   └── main.js            # 渲染进程主文件
├── styles/                # 样式文件
│   ├── main.css           # 主样式和布局
│   └── components.css     # 组件样式和模态框
├── data/                  # 数据存储目录
│   └── sessions.json      # SSH会话配置文件
└── config/                # 应用配置目录
    └── app.yml            # YAML格式配置文件
```

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **SSH2** - SSH客户端库
- **ssh2-sftp-client** - SFTP文件传输
- **js-yaml** - YAML配置文件解析
- **axios** - HTTP客户端（AI API调用）
- **HTML/CSS/JavaScript** - 前端技术
- **Node.js** - 后端运行时

## 配置文件说明

### app.yml (应用配置)
```yaml
ai:
  provider: openai          # AI提供商
  baseUrl: https://api.openai.com/v1
  apiKey: your-api-key
  model: gpt-3.5-turbo
  maxTokens: 2000
  temperature: 0.7

general:
  language: zh-CN
  theme: dark
  autoSaveSessions: true

terminal:
  font: Consolas
  fontSize: 14
  bell: false
  cursorBlink: true

security:
  encryptPasswords: false
  sessionTimeout: 30
```

### sessions.json (SSH会话)
```json
[
  {
    "id": "1",
    "name": "生产服务器",
    "group": "production",
    "host": "192.168.1.100",
    "port": 22,
    "username": "admin",
    "authType": "password",
    "password": "encrypted-password"
  }
]
```

## 开发说明

### 主进程功能
- 窗口管理
- SSH连接管理
- 文件系统操作
- IPC通信处理

### 渲染进程功能
- 用户界面渲染
- 会话管理界面
- 终端交互
- 文件浏览器
- AI聊天界面

### 数据存储
- 会话信息存储在本地JSON文件
- 支持多个会话配置
- 密码明文存储（生产环境建议加密）

## 注意事项

1. **安全性**：当前版本密码以明文存储，生产环境建议使用加密存储
2. **AI功能**：当前为模拟AI响应，实际使用需要集成真实的AI API
3. **文件传输**：文件上传下载功能正在开发中
4. **兼容性**：支持Windows、macOS、Linux

## 待开发功能

- [ ] 文件上传下载
- [ ] SSH密钥认证
- [ ] 真实AI API集成
- [ ] 主题切换
- [ ] 多语言支持
- [ ] 会话分组
- [ ] 命令自动补全
- [ ] 文件编辑器
- [ ] 端口转发管理

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License