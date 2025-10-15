# 消息队列系统

一个完整的事件驱动消息队列系统，专为AI对话、工具调用和实时监控而设计。

## 🚀 特性

- **优先级队列** - 基于二叉堆的高效优先级队列
- **消息路由** - 智能消息路由和订阅者管理
- **重试机制** - 自动重试失败的消息
- **AI集成** - 无缝集成AI对话和工具调用
- **实时监控** - 性能监控、健康检查和统计分析
- **错误处理** - 完善的错误处理和恢复机制
- **类型安全** - 完整的TypeScript类型定义

## 📦 安装

```javascript
import { initializeMessageQueueSystem } from './src/utils/messageQueue/index.js'
```

## 🎯 快速开始

### 基础使用

```javascript
// 初始化系统
const queueSystem = initializeMessageQueueSystem({
  enableAI: true,
  enableMonitoring: true
})

// 订阅消息
const subscriptionId = queueSystem.subscribe('user_action', (message) => {
  console.log('收到消息:', message.data)
})

// 发送消息
queueSystem.sendMessage('user_action', {
  action: 'click',
  target: 'button'
})
```

### AI对话集成

```javascript
// 创建AI会话
const sessionId = queueSystem.createAISession(connection)

// 订阅AI响应
queueSystem.subscribe('ai_response', (message) => {
  console.log('AI回复:', message.data.response)
})

// 发送AI聊天消息
queueSystem.sendAIChatMessage(sessionId, '你好，请帮我查看系统状态', connection, [])
```

## 📚 核心概念

### 消息类型

系统预定义了多种消息类型：

- `AI_CHAT` - AI聊天消息
- `TOOL_CALL` - 工具调用
- `SSH_COMMAND` - SSH命令执行
- `TERMINAL_OUTPUT` - 终端输出
- `SYSTEM_EVENT` - 系统事件
- `USER_ACTION` - 用户操作

### 优先级

消息支持4个优先级等级：

- `CRITICAL` (0) - 系统关键事件
- `HIGH` (1) - 用户交互
- `NORMAL` (2) - AI对话、命令执行
- `LOW` (3) - 后台任务

### 消息状态

- `PENDING` - 等待处理
- `PROCESSING` - 正在处理
- `COMPLETED` - 处理完成
- `FAILED` - 处理失败
- `CANCELLED` - 已取消

## 🔧 API 文档

### MessageQueue

核心消息队列类，负责消息的发送、接收和处理。

```javascript
// 发送消息
const messageId = queueSystem.sendMessage(type, data, options)

// 订阅消息
const subscriptionId = queueSystem.subscribe(messageType, handler, options)

// 取消订阅
queueSystem.unsubscribe(subscriptionId)

// 获取队列状态
const status = queueSystem.getStatus()
```

### AIIntegration

AI对话和工具调用集成模块。

```javascript
// 创建AI会话
const sessionId = queueSystem.createAISession(connection)

// 发送AI聊天消息
queueSystem.sendAIChatMessage(sessionId, message, connection, history)

// 关闭AI会话
queueSystem.closeAISession(sessionId)
```

### QueueMonitor

性能监控和健康检查模块。

```javascript
// 开始监控
queueSystem.startMonitoring(interval)

// 获取性能报告
const report = queueSystem.getPerformanceReport(timeRange)

// 获取健康状态
const health = queueSystem.getHealthStatus()
```

## 📊 监控和统计

### 性能指标

系统会自动收集以下性能指标：

- 队列大小和吞吐量
- 消息处理时间
- 错误率和成功率
- 内存使用情况
- 订阅者统计

### 健康检查

```javascript
const health = queueSystem.getHealthStatus()
console.log(health.status) // healthy, warning, error, critical
console.log(health.message) // 状态描述
```

### 性能报告

```javascript
const report = queueSystem.getPerformanceReport(5 * 60 * 1000) // 最近5分钟
console.log(report.summary)
console.log(report.recommendations)
```

## 🛠️ 配置选项

### 队列配置

```javascript
const queueOptions = {
  maxQueueSize: 10000,        // 最大队列大小
  processingInterval: 10,     // 处理间隔（毫秒）
  enableRetry: true,          // 启用重试
  maxRetries: 3,              // 最大重试次数
  retryDelay: 1000,           // 重试延迟（毫秒）
  enablePersistence: false    // 启用持久化
}
```

### 监控配置

```javascript
const monitoringOptions = {
  interval: 5000,             // 监控间隔（毫秒）
  autoStart: true,            // 自动启动监控
  alertThresholds: {
    queueSize: 1000,          // 队列大小警告阈值
    processingTime: 5000,     // 处理时间警告阈值
    errorRate: 0.1,           // 错误率警告阈值
    memoryUsage: 0.8          // 内存使用率警告阈值
  }
}
```

## 🎨 使用示例

### 基础示例

```javascript
import { runAllExamples } from './examples/BasicUsage.js'

// 运行所有基础示例
runAllExamples()
```

### AI集成示例

```javascript
import { runAllAIExamples } from './examples/AIIntegrationExample.js'

// 运行所有AI集成示例
runAllAIExamples()
```

## 🔍 调试和故障排除

### 启用调试日志

```javascript
// 在控制台中启用详细日志
localStorage.setItem('debug', 'true')
```

### 常见问题

1. **消息处理缓慢**
   - 检查队列大小是否过大
   - 确认处理器函数没有阻塞
   - 考虑增加处理间隔

2. **内存使用过高**
   - 清理历史消息
   - 减少队列大小限制
   - 启用持久化存储

3. **AI响应超时**
   - 检查网络连接
   - 增加超时时间
   - 验证AI服务配置

## 🏗️ 架构设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   应用组件      │    │   消息队列      │    │   处理器        │
│                 │    │                 │    │                 │
│ • UI组件        │───▶│ • 优先级队列    │───▶│ • AI处理器      │
│ • 事件监听器    │    │ • 消息路由器    │    │ • SSH处理器     │
│ • 业务逻辑      │    │ • 重试机制      │    │ • 系统处理器    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户交互      │    │   监控系统      │    │   外部服务      │
│                 │    │                 │    │                 │
│ • 点击事件      │    │ • 性能监控      │    │ • AI API        │
│ • 表单提交      │    │ • 健康检查      │    │ • SSH连接       │
│ • 键盘输入      │    │ • 统计分析      │    │ • 文件系统      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个系统。

## 📄 许可证

MIT License

## 🔗 相关链接

- [基础使用示例](./examples/BasicUsage.js)
- [AI集成示例](./examples/AIIntegrationExample.js)
- [API文档](./docs/api.md)
- [架构设计](./docs/architecture.md)

---

**版本**: 1.0.0  
**更新时间**: 2024-10-15
