/**
 * 核心消息队列系统
 * 统一管理应用中的所有消息和事件
 */

import { PriorityQueue } from './PriorityQueue.js'
import { MessageRouter } from './MessageRouter.js'
import { MessageTypes, Priority, MessageStatus, getDefaultPriority } from './MessageTypes.js'

export class MessageQueue {
  constructor(options = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize || 10000,
      processingInterval: options.processingInterval || 10, // 处理间隔（毫秒）
      enablePersistence: options.enablePersistence || false,
      persistenceKey: options.persistenceKey || 'messageQueue',
      enableRetry: options.enableRetry || true,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    }

    // 核心组件
    this.priorityQueue = new PriorityQueue()
    this.router = new MessageRouter()
    
    // 状态管理
    this.isProcessing = false
    this.isPaused = false
    this.processingTimer = null
    
    // 统计信息
    this.stats = {
      totalMessages: 0,
      processedMessages: 0,
      failedMessages: 0,
      queuedMessages: 0,
      averageProcessingTime: 0,
      startTime: Date.now(),
      lastProcessedTime: null
    }

    // 重试队列
    this.retryQueue = new Map()
    
    // 消息处理器
    this.processors = new Map()
    
    // 事件监听器
    this.eventListeners = new Map()
    
    // 初始化
    this.init()
  }

  /**
   * 初始化消息队列
   */
  init() {
    console.log(`🚀 [QUEUE] 消息队列系统启动`)
    
    // 启动消息处理循环
    this.startProcessing()
    
    // 恢复持久化数据
    if (this.options.enablePersistence) {
      this.restoreFromPersistence()
    }
    
    // 注册默认处理器
    this.registerDefaultProcessors()
    
    // 设置全局错误处理
    this.setupGlobalErrorHandling()
  }

  /**
   * 发送消息到队列
   * @param {string} type - 消息类型
   * @param {Object} data - 消息数据
   * @param {Object} options - 消息选项
   * @returns {string} 消息ID
   */
  sendMessage(type, data, options = {}) {
    const message = {
      type,
      data,
      priority: options.priority || getDefaultPriority(type),
      status: MessageStatus.PENDING,
      retryCount: 0,
      maxRetries: options.maxRetries || this.options.maxRetries,
      timeout: options.timeout || null,
      metadata: options.metadata || {},
      ...options
    }

    try {
      // 检查队列大小限制
      if (this.priorityQueue.size() >= this.options.maxQueueSize) {
        throw new Error(`消息队列已满，最大容量: ${this.options.maxQueueSize}`)
      }

      // 添加到优先级队列
      const messageId = this.priorityQueue.enqueue(message)
      
      this.stats.totalMessages++
      this.stats.queuedMessages++

      console.log(`📤 [QUEUE] 消息入队: ${type} (${messageId})`)

      // 触发消息入队事件
      this.emitEvent('message-enqueued', { message, messageId })

      // 持久化
      if (this.options.enablePersistence) {
        this.saveToPersistence()
      }

      return messageId

    } catch (error) {
      console.error(`❌ [QUEUE] 消息入队失败:`, error)
      this.stats.failedMessages++
      throw error
    }
  }

  /**
   * 发送高优先级消息
   */
  sendCriticalMessage(type, data, options = {}) {
    return this.sendMessage(type, data, { ...options, priority: Priority.CRITICAL })
  }

  /**
   * 发送高优先级消息
   */
  sendHighPriorityMessage(type, data, options = {}) {
    return this.sendMessage(type, data, { ...options, priority: Priority.HIGH })
  }

  /**
   * 发送低优先级消息
   */
  sendLowPriorityMessage(type, data, options = {}) {
    return this.sendMessage(type, data, { ...options, priority: Priority.LOW })
  }

  /**
   * 批量发送消息
   * @param {Array} messages - 消息数组
   * @returns {Array} 消息ID数组
   */
  sendBatchMessages(messages) {
    const messageIds = []
    
    for (const msg of messages) {
      try {
        const messageId = this.sendMessage(msg.type, msg.data, msg.options)
        messageIds.push(messageId)
      } catch (error) {
        console.error(`❌ [QUEUE] 批量消息发送失败:`, error)
        messageIds.push(null)
      }
    }

    return messageIds
  }

  /**
   * 订阅消息
   * @param {string} messageType - 消息类型
   * @param {Function} handler - 处理函数
   * @param {Object} options - 订阅选项
   * @returns {string} 订阅ID
   */
  subscribe(messageType, handler, options = {}) {
    const subscriber = {
      onMessage: handler,
      onError: options.onError || null,
      options
    }

    return this.router.subscribe(messageType, subscriber)
  }

  /**
   * 取消订阅
   * @param {string} subscriptionId - 订阅ID
   */
  unsubscribe(subscriptionId) {
    return this.router.unsubscribe(subscriptionId)
  }

  /**
   * 注册消息处理器
   * @param {string} messageType - 消息类型
   * @param {Function} processor - 处理器函数
   */
  registerProcessor(messageType, processor) {
    this.processors.set(messageType, processor)
    console.log(`🔧 [QUEUE] 注册处理器: ${messageType}`)
  }

  /**
   * 启动消息处理
   */
  startProcessing() {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    this.isPaused = false

    console.log(`▶️ [QUEUE] 开始处理消息`)

    this.processingTimer = setInterval(() => {
      if (!this.isPaused) {
        this.processMessages()
      }
    }, this.options.processingInterval)
  }

  /**
   * 停止消息处理
   */
  stopProcessing() {
    if (!this.isProcessing) {
      return
    }

    this.isProcessing = false

    if (this.processingTimer) {
      clearInterval(this.processingTimer)
      this.processingTimer = null
    }

    console.log(`⏹️ [QUEUE] 停止处理消息`)
  }

  /**
   * 暂停消息处理
   */
  pauseProcessing() {
    this.isPaused = true
    console.log(`⏸️ [QUEUE] 暂停处理消息`)
  }

  /**
   * 恢复消息处理
   */
  resumeProcessing() {
    this.isPaused = false
    console.log(`▶️ [QUEUE] 恢复处理消息`)
  }

  /**
   * 处理消息
   */
  async processMessages() {
    if (this.priorityQueue.isEmpty()) {
      return
    }

    const message = this.priorityQueue.dequeue()
    if (!message) {
      return
    }

    const startTime = Date.now()

    try {
      // 更新消息状态
      message.status = MessageStatus.PROCESSING
      message.processingStartTime = startTime

      console.log(`🔄 [QUEUE] 处理消息: ${message.type} (${message.id})`)

      // 路由消息到订阅者
      const routingResults = await this.router.routeMessage(message)

      // 执行注册的处理器
      await this.executeProcessor(message)

      // 更新统计
      this.stats.processedMessages++
      this.stats.lastProcessedTime = Date.now()
      this.updateAverageProcessingTime(Date.now() - startTime)

      // 更新消息状态
      message.status = MessageStatus.COMPLETED
      message.processingEndTime = Date.now()

      console.log(`✅ [QUEUE] 消息处理完成: ${message.type} (${message.id})`)

      // 触发处理完成事件
      this.emitEvent('message-processed', { message, routingResults })

    } catch (error) {
      console.error(`❌ [QUEUE] 消息处理失败:`, error)

      // 处理重试逻辑
      const shouldRetry = await this.handleRetry(message, error)
      
      if (shouldRetry) {
        // 重新入队
        message.status = MessageStatus.PENDING
        this.priorityQueue.enqueue(message)
      } else {
        // 标记为失败
        message.status = MessageStatus.FAILED
        message.error = error.message
        this.stats.failedMessages++

        // 触发处理失败事件
        this.emitEvent('message-failed', { message, error })
      }
    }

    this.stats.queuedMessages = this.priorityQueue.size()
  }

  /**
   * 执行处理器
   * @param {Object} message - 消息
   */
  async executeProcessor(message) {
    const processor = this.processors.get(message.type)
    if (processor && typeof processor === 'function') {
      try {
        await processor(message)
      } catch (error) {
        console.error(`❌ [QUEUE] 处理器执行失败:`, error)
        throw error
      }
    }
  }

  /**
   * 处理重试逻辑
   * @param {Object} message - 消息
   * @param {Error} error - 错误
   * @returns {boolean} 是否应该重试
   */
  async handleRetry(message, error) {
    if (!this.options.enableRetry) {
      return false
    }

    message.retryCount++

    if (message.retryCount <= message.maxRetries) {
      console.log(`🔄 [QUEUE] 重试消息: ${message.type} (${message.retryCount}/${message.maxRetries})`)
      
      // 添加延迟
      await this.delay(this.options.retryDelay * message.retryCount)
      
      return true
    }

    console.error(`❌ [QUEUE] 消息重试次数超限: ${message.type}`)
    return false
  }

  /**
   * 清空队列
   */
  clearQueue() {
    const clearedCount = this.priorityQueue.size()
    this.priorityQueue.clear()
    this.stats.queuedMessages = 0

    console.log(`🗑️ [QUEUE] 清空队列，清理了 ${clearedCount} 条消息`)
    
    this.emitEvent('queue-cleared', { clearedCount })
  }

  /**
   * 根据类型清空消息
   * @param {string} messageType - 消息类型
   */
  clearMessagesByType(messageType) {
    const removed = this.priorityQueue.removeByType(messageType)
    this.stats.queuedMessages = this.priorityQueue.size()

    console.log(`🗑️ [QUEUE] 清空类型 ${messageType} 的消息，清理了 ${removed.length} 条`)
    
    this.emitEvent('messages-cleared-by-type', { messageType, count: removed.length })
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      queueSize: this.priorityQueue.size(),
      maxQueueSize: this.options.maxQueueSize,
      stats: this.stats,
      queueStats: this.priorityQueue.getStats(),
      routerStats: this.router.getRoutingStats(),
      subscriberStats: this.router.getSubscriberStats()
    }
  }

  /**
   * 获取队列快照
   */
  getSnapshot() {
    return {
      queueSnapshot: this.priorityQueue.getSnapshot(),
      routerSnapshot: this.router.getSnapshot(),
      status: this.getQueueStatus(),
      timestamp: Date.now()
    }
  }

  /**
   * 注册默认处理器
   */
  registerDefaultProcessors() {
    // 系统错误处理器
    this.registerProcessor(MessageTypes.SYSTEM_ERROR, async (message) => {
      console.error(`🚨 [SYSTEM] 系统错误:`, message.data)
      // 可以在这里添加错误报告逻辑
    })

    // 连接状态处理器
    this.registerProcessor(MessageTypes.CONNECTION_STATUS, async (message) => {
      console.log(`🔗 [CONNECTION] 连接状态变化:`, message.data)
    })

    // 队列健康检查处理器
    this.registerProcessor(MessageTypes.QUEUE_HEALTH, async (message) => {
      console.log(`💚 [HEALTH] 队列健康检查:`, this.getQueueStatus())
    })
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandling() {
    // 捕获未处理的Promise拒绝
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        console.error(`❌ [QUEUE] 未处理的Promise拒绝:`, event.reason)
        this.sendCriticalMessage(MessageTypes.SYSTEM_ERROR, {
          error: event.reason,
          source: 'unhandledrejection'
        })
      })
    }
  }

  /**
   * 恢复持久化数据
   */
  restoreFromPersistence() {
    try {
      const data = localStorage.getItem(this.options.persistenceKey)
      if (data) {
        const parsed = JSON.parse(data)
        // 这里可以实现数据恢复逻辑
        console.log(`📂 [QUEUE] 从持久化恢复数据`)
      }
    } catch (error) {
      console.error(`❌ [QUEUE] 恢复持久化数据失败:`, error)
    }
  }

  /**
   * 保存到持久化存储
   */
  saveToPersistence() {
    try {
      const data = JSON.stringify(this.getSnapshot())
      localStorage.setItem(this.options.persistenceKey, data)
    } catch (error) {
      console.error(`❌ [QUEUE] 保存持久化数据失败:`, error)
    }
  }

  /**
   * 更新平均处理时间
   * @param {number} processingTime - 处理时间
   */
  updateAverageProcessingTime(processingTime) {
    if (this.stats.processedMessages === 1) {
      this.stats.averageProcessingTime = processingTime
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.processedMessages - 1) + processingTime) / 
        this.stats.processedMessages
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   */
  emitEvent(eventName, data) {
    const listeners = this.eventListeners.get(eventName) || []
    listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error(`❌ [QUEUE] 事件监听器执行失败:`, error)
      }
    })
  }

  /**
   * 添加事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   */
  addEventListener(eventName, listener) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, [])
    }
    this.eventListeners.get(eventName).push(listener)
  }

  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   */
  removeEventListener(eventName, listener) {
    const listeners = this.eventListeners.get(eventName)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 销毁消息队列
   */
  destroy() {
    console.log(`💥 [QUEUE] 销毁消息队列系统`)
    
    // 停止处理
    this.stopProcessing()
    
    // 清空队列
    this.clearQueue()
    
    // 保存最终状态
    if (this.options.enablePersistence) {
      this.saveToPersistence()
    }
    
    // 清理事件监听器
    this.eventListeners.clear()
    this.processors.clear()
    this.retryQueue.clear()
  }
}

// 创建全局消息队列实例
export const globalMessageQueue = new MessageQueue()

// 导出便捷方法
export const sendMessage = (type, data, options) => globalMessageQueue.sendMessage(type, data, options)
export const subscribe = (messageType, handler, options) => globalMessageQueue.subscribe(messageType, handler, options)
export const unsubscribe = (subscriptionId) => globalMessageQueue.unsubscribe(subscriptionId)
export const getQueueStatus = () => globalMessageQueue.getQueueStatus()
