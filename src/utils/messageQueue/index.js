/**
 * 消息队列系统入口文件
 * 统一导出所有组件和便捷方法
 */

// 核心组件
export { PriorityQueue } from './PriorityQueue.js'
export { MessageRouter } from './MessageRouter.js'
export { MessageQueue, globalMessageQueue } from './MessageQueue.js'

// 类型定义
export {
  MessageTypes,
  Priority,
  MessageStatus,
  getDefaultPriority
} from './MessageTypes.js'

// 集成模块
export { AIIntegration, aiIntegration } from './AIIntegration.js'
export { QueueMonitor, globalQueueMonitor } from './QueueMonitor.js'

// 便捷方法 - 消息队列
export {
  sendMessage,
  subscribe,
  unsubscribe,
  getQueueStatus
} from './MessageQueue.js'

// 便捷方法 - AI集成
export {
  sendAIChatMessage,
  createAISession,
  closeAISession,
  updateSessionActivity
} from './AIIntegration.js'

// 便捷方法 - 监控
export {
  startMonitoring,
  stopMonitoring,
  getPerformanceReport,
  getHealthStatus
} from './QueueMonitor.js'

/**
 * 创建消息队列实例
 * @param {Object} options - 配置选项
 * @returns {MessageQueue} 消息队列实例
 */
export function createMessageQueue(options = {}) {
  return new MessageQueue(options)
}

/**
 * 创建AI集成实例
 * @param {MessageQueue} messageQueue - 消息队列实例
 * @returns {AIIntegration} AI集成实例
 */
export function createAIIntegration(messageQueue) {
  return new AIIntegration(messageQueue)
}

/**
 * 创建监控器实例
 * @param {MessageQueue} messageQueue - 消息队列实例
 * @returns {QueueMonitor} 监控器实例
 */
export function createQueueMonitor(messageQueue) {
  return new QueueMonitor(messageQueue)
}

/**
 * 初始化完整的消息队列系统
 * @param {Object} options - 配置选项
 * @returns {Object} 系统实例
 */
export function initializeMessageQueueSystem(options = {}) {
  const {
    queueOptions = {},
    enableAI = true,
    enableMonitoring = true,
    monitoringOptions = {}
  } = options

  // 创建消息队列
  const messageQueue = createMessageQueue(queueOptions)

  let aiIntegration = null
  let queueMonitor = null

  // 创建AI集成
  if (enableAI) {
    aiIntegration = createAIIntegration(messageQueue)
  }

  // 创建监控器
  if (enableMonitoring) {
    queueMonitor = createQueueMonitor(messageQueue)
    
    // 自动启动监控
    if (monitoringOptions.autoStart !== false) {
      queueMonitor.startMonitoring(monitoringOptions.interval)
    }
  }

  console.log(`🚀 [QUEUE-SYSTEM] 消息队列系统初始化完成`, {
    queueEnabled: true,
    aiEnabled: enableAI,
    monitoringEnabled: enableMonitoring
  })

  return {
    messageQueue,
    aiIntegration,
    queueMonitor,
    
    // 便捷方法
    sendMessage: (type, data, options) => messageQueue.sendMessage(type, data, options),
    subscribe: (messageType, handler, options) => messageQueue.subscribe(messageType, handler, options),
    unsubscribe: (subscriptionId) => messageQueue.unsubscribe(subscriptionId),
    getStatus: () => messageQueue.getQueueStatus(),
    
    // AI方法
    sendAIChatMessage: enableAI ? (sessionId, message, connection, history) => 
      aiIntegration.sendAIChatMessage(sessionId, message, connection, history) : null,
    createAISession: enableAI ? (connection) => aiIntegration.createAISession(connection) : null,
    closeAISession: enableAI ? (sessionId) => aiIntegration.closeAISession(sessionId) : null,
    
    // 监控方法
    startMonitoring: enableMonitoring ? (interval) => queueMonitor.startMonitoring(interval) : null,
    stopMonitoring: enableMonitoring ? () => queueMonitor.stopMonitoring() : null,
    getPerformanceReport: enableMonitoring ? (timeRange) => queueMonitor.getPerformanceReport(timeRange) : null,
    getHealthStatus: enableMonitoring ? () => queueMonitor.getHealthStatus() : null,
    
    // 系统控制
    start: () => messageQueue.startProcessing(),
    stop: () => messageQueue.stopProcessing(),
    pause: () => messageQueue.pauseProcessing(),
    resume: () => messageQueue.resumeProcessing(),
    clear: () => messageQueue.clearQueue(),
    
    // 销毁系统
    destroy: () => {
      messageQueue.destroy()
      if (queueMonitor) {
        queueMonitor.destroy()
      }
      console.log(`💥 [QUEUE-SYSTEM] 消息队列系统已销毁`)
    }
  }
}

/**
 * 默认系统配置
 */
export const DEFAULT_CONFIG = {
  queueOptions: {
    maxQueueSize: 10000,
    processingInterval: 10,
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000
  },
  enableAI: true,
  enableMonitoring: true,
  monitoringOptions: {
    interval: 5000,
    autoStart: true,
    alertThresholds: {
      queueSize: 1000,
      processingTime: 5000,
      errorRate: 0.1,
      memoryUsage: 0.8
    }
  }
}

// 创建默认系统实例
export const defaultSystem = initializeMessageQueueSystem(DEFAULT_CONFIG)

// 全局便捷方法
export const {
  sendMessage: globalSendMessage,
  subscribe: globalSubscribe,
  unsubscribe: globalUnsubscribe,
  getStatus: globalGetStatus,
  sendAIChatMessage: globalSendAIChatMessage,
  createAISession: globalCreateAISession,
  closeAISession: globalCloseAISession,
  startMonitoring: globalStartMonitoring,
  stopMonitoring: globalStopMonitoring,
  getPerformanceReport: globalGetPerformanceReport,
  getHealthStatus: globalGetHealthStatus
} = defaultSystem

// 版本信息
export const VERSION = '1.0.0'

// 系统信息
export const SYSTEM_INFO = {
  name: 'Message Queue System',
  version: VERSION,
  description: '完整的事件驱动消息队列系统，支持AI对话、工具调用和实时监控',
  author: 'SSH Code Team',
  features: [
    '优先级队列',
    '消息路由',
    '重试机制',
    'AI集成',
    '性能监控',
    '健康检查',
    '统计分析'
  ]
}

console.log(`📦 [QUEUE-SYSTEM] 消息队列系统已加载 (${VERSION})`)
