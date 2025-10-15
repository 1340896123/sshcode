# AI命令执行器事件发送功能改进总结

## 📋 概述

本次改进为 `src/utils/aiCommandExecutor.js` 添加了完整的事件发送机制，提供了统一的事件接口和全面的错误处理。

## 🚀 主要改进

### 1. 统一的事件发送方法

添加了 `dispatchEvent` 方法，统一管理所有事件的发送：

```javascript
dispatchEvent(eventName, detail) {
  const event = new CustomEvent(eventName, {
    detail: {
      ...detail,
      timestamp: detail.timestamp || Date.now()
    }
  });
  
  console.log(`📡 [AI-EVENT] 发送事件: ${eventName}`, detail);
  window.dispatchEvent(event);
}
```

**特性：**
- 自动添加时间戳
- 统一的日志格式
- 事件数据标准化

### 2. 完整的事件类型

| 事件类型 | 触发时机 | 包含数据 |
|---------|---------|---------|
| `ai-tool-call-start` | 命令开始执行时 | command, toolCallId, connectionId, timestamp |
| `ai-realtime-output` | 实时输出数据时 | toolCallId, output, connectionId, command |
| `ai-tool-call-complete` | 命令执行完成时 | command, result, toolCallId, connectionId, executionTime, outputLength |
| `ai-tool-call-error` | 命令执行出错时 | command, toolCallId, connectionId, error, errorType, timestamp |
| `ai-tool-call-timeout` | 命令执行超时时 | command, toolCallId, connectionId, executionTime, timeoutDuration |

### 3. 增强的数据结构

每个事件都包含丰富的上下文信息：

- **基础信息**: 命令内容、工具调用ID、连接ID
- **时间信息**: 执行时间戳、执行耗时
- **结果信息**: 输出内容、输出长度、错误详情
- **状态信息**: 错误类型、超时时长

## 🧪 测试验证

创建了 `test-ai-command-events.html` 测试页面，包含：

### 功能特性
- **实时统计**: 显示各类事件的触发次数
- **事件日志**: 详细记录每个事件的详细信息
- **模拟控制**: 可以手动触发各种事件类型
- **可视化界面**: 美观的事件展示和分类

### 测试用例
1. 命令开始事件测试
2. 实时输出事件测试
3. 命令完成事件测试
4. 命令错误事件测试
5. 命令超时事件测试

## 🔧 使用方法

### 监听事件

```javascript
// 监听命令开始
window.addEventListener('ai-tool-call-start', (event) => {
  console.log('命令开始:', event.detail);
  const { command, toolCallId, connectionId } = event.detail;
  // 处理逻辑
});

// 监听实时输出
window.addEventListener('ai-realtime-output', (event) => {
  console.log('实时输出:', event.detail);
  const { toolCallId, output } = event.detail;
  // 更新UI显示
});

// 监听命令完成
window.addEventListener('ai-tool-call-complete', (event) => {
  console.log('命令完成:', event.detail);
  const { command, result, executionTime } = event.detail;
  // 处理结果
});

// 监听错误
window.addEventListener('ai-tool-call-error', (event) => {
  console.error('命令错误:', event.detail);
  const { error, errorType } = event.detail;
  // 错误处理
});

// 监听超时
window.addEventListener('ai-tool-call-timeout', (event) => {
  console.warn('命令超时:', event.detail);
  const { executionTime, timeoutDuration } = event.detail;
  // 超时处理
});
```

### 在Vue组件中使用

```vue
<template>
  <div>
    <div v-if="isExecuting">正在执行: {{ currentCommand }}</div>
    <div>{{ output }}</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isExecuting: false,
      currentCommand: '',
      output: '',
      error: null
    }
  },
  mounted() {
    // 监听事件
    window.addEventListener('ai-tool-call-start', this.handleCommandStart);
    window.addEventListener('ai-realtime-output', this.handleRealtimeOutput);
    window.addEventListener('ai-tool-call-complete', this.handleCommandComplete);
    window.addEventListener('ai-tool-call-error', this.handleCommandError);
    window.addEventListener('ai-tool-call-timeout', this.handleCommandTimeout);
  },
  beforeUnmount() {
    // 清理事件监听
    window.removeEventListener('ai-tool-call-start', this.handleCommandStart);
    window.removeEventListener('ai-realtime-output', this.handleRealtimeOutput);
    window.removeEventListener('ai-tool-call-complete', this.handleCommandComplete);
    window.removeEventListener('ai-tool-call-error', this.handleCommandError);
    window.removeEventListener('ai-tool-call-timeout', this.handleCommandTimeout);
  },
  methods: {
    handleCommandStart(event) {
      this.isExecuting = true;
      this.currentCommand = event.detail.command;
      this.output = '';
      this.error = null;
    },
    handleRealtimeOutput(event) {
      this.output += event.detail.output;
    },
    handleCommandComplete(event) {
      this.isExecuting = false;
      console.log(`命令执行完成，耗时: ${event.detail.executionTime}ms`);
    },
    handleCommandError(event) {
      this.isExecuting = false;
      this.error = event.detail.error;
    },
    handleCommandTimeout(event) {
      this.isExecuting = false;
      this.error = `命令执行超时 (${event.detail.timeoutDuration}ms)`;
    }
  }
}
</script>
```

## 📊 事件数据结构详解

### ai-tool-call-start
```javascript
{
  command: "ls -la",
  toolCallId: "ai-1697358000000-abc123def",
  connectionId: "ssh-connection-1",
  timestamp: 1697358000000
}
```

### ai-realtime-output
```javascript
{
  toolCallId: "ai-1697358000000-abc123def",
  output: "total 8\ndrwxr-xr-x 2 user user 4096",
  connectionId: "ssh-connection-1",
  command: "ls -la"
}
```

### ai-tool-call-complete
```javascript
{
  command: "ls -la",
  result: "total 8\ndrwxr-xr-x 2 user user 4096...",
  toolCallId: "ai-1697358000000-abc123def",
  connectionId: "ssh-connection-1",
  executionTime: 1234,
  outputLength: 256
}
```

### ai-tool-call-error
```javascript
{
  command: "invalid-command",
  toolCallId: "ai-1697358000000-abc123def",
  connectionId: "ssh-connection-1",
  error: "命令发送失败: SSH Shell API不可用",
  errorType: "send_failed",
  timestamp: 1697358000000
}
```

### ai-tool-call-timeout
```javascript
{
  command: "sleep 70",
  toolCallId: "ai-1697358000000-abc123def",
  connectionId: "ssh-connection-1",
  executionTime: 60000,
  timeoutDuration: 60000
}
```

## 🎯 最佳实践

### 1. 事件监听器管理
- 在组件挂载时添加事件监听器
- 在组件卸载时清理事件监听器
- 避免内存泄漏

### 2. 错误处理
- 始终监听错误和超时事件
- 提供用户友好的错误提示
- 记录详细的错误信息用于调试

### 3. 性能优化
- 对于大量输出，考虑防抖处理
- 合理控制输出缓冲区大小
- 及时清理已完成的命令数据

### 4. 调试技巧
- 使用浏览器开发者工具查看事件日志
- 利用测试页面验证事件逻辑
- 检查事件数据的完整性和正确性

## 🔍 调试和监控

### 控制台日志
所有事件都会在控制台输出详细日志，格式为：
```
📡 [AI-EVENT] 发送事件: ai-tool-call-start {command: "...", toolCallId: "...", ...}
```

### 测试页面
打开 `test-ai-command-events.html` 可以：
- 实时查看事件触发情况
- 模拟各种事件类型
- 监控事件统计数据
- 查看详细的事件日志

## 🚀 后续改进建议

1. **事件持久化**: 可选择性地将重要事件保存到本地存储
2. **事件过滤**: 添加事件过滤机制，避免不必要的性能开销
3. **事件重放**: 支持事件重放功能，便于调试和测试
4. **性能监控**: 添加事件处理性能监控
5. **事件聚合**: 对于高频事件（如实时输出），考虑聚合处理

## 📝 总结

本次改进为AI命令执行器提供了完整、可靠的事件发送机制，使应用程序能够：

- **实时监控**命令执行状态
- **及时响应**执行结果和错误
- **灵活处理**各种执行场景
- **便于调试**和问题排查

通过统一的事件接口和丰富的数据结构，开发者可以轻松地集成AI命令执行功能到各种应用场景中。
