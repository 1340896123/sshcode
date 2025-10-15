/**
 * 消息路由器
 * 负责将消息路由到相应的订阅者
 */

export class MessageRouter {
  constructor() {
    this.subscribers = new Map() // 存储订阅者
    this.globalSubscribers = [] // 全局订阅者（接收所有消息）
    this.messageHistory = [] // 消息历史记录
    this.maxHistorySize = 1000 // 最大历史记录数量
    this.routingStats = {
      totalMessages: 0,
      routedMessages: 0,
      failedRoutes: 0,
      unsubscribedMessages: 0
    }
  }

  /**
   * 订阅特定类型的消息
   * @param {string} messageType - 消息类型
   * @param {Object} subscriber - 订阅者配置
   * @param {Function} subscriber.onMessage - 消息处理函数
   * @param {Function} subscriber.onError - 错误处理函数（可选）
   * @param {Object} subscriber.options - 订阅选项（可选）
   * @returns {string} 订阅ID
   */
  subscribe(messageType, subscriber) {
    if (!messageType || !subscriber || typeof subscriber.onMessage !== 'function') {
      throw new Error('Invalid subscription parameters')
    }

    const subscriptionId = this.generateSubscriptionId()
    const subscription = {
      id: subscriptionId,
      messageType,
      subscriber,
      options: {
        priority: subscriber.options?.priority || 'normal',
        filter: subscriber.options?.filter || null,
        once: subscriber.options?.once || false,
        timeout: subscriber.options?.timeout || null,
        ...subscriber.options
      },
      createdAt: Date.now(),
      messageCount: 0,
      lastMessageTime: null
    }

    // 如果是全局订阅
    if (messageType === '*') {
      this.globalSubscribers.push(subscription)
    } else {
      // 按消息类型分组存储
      if (!this.subscribers.has(messageType)) {
        this.subscribers.set(messageType, [])
      }
      this.subscribers.get(messageType).push(subscription)
    }

    console.log(`📡 [ROUTER] 新订阅: ${messageType} -> ${subscriptionId}`)
    return subscriptionId
  }

  /**
   * 取消订阅
   * @param {string} subscriptionId - 订阅ID
   * @returns {boolean} 是否成功取消
   */
  unsubscribe(subscriptionId) {
    // 在全局订阅者中查找
    const globalIndex = this.globalSubscribers.findIndex(sub => sub.id === subscriptionId)
    if (globalIndex !== -1) {
      this.globalSubscribers.splice(globalIndex, 1)
      console.log(`📡 [ROUTER] 取消全局订阅: ${subscriptionId}`)
      return true
    }

    // 在特定类型订阅者中查找
    for (const [messageType, subscriptions] of this.subscribers.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        subscriptions.splice(index, 1)
        console.log(`📡 [ROUTER] 取消订阅: ${messageType} -> ${subscriptionId}`)
        
        // 如果该类型没有订阅者了，删除该类型
        if (subscriptions.length === 0) {
          this.subscribers.delete(messageType)
        }
        
        return true
      }
    }

    return false
  }

  /**
   * 路由消息到订阅者
   * @param {Object} message - 要路由的消息
   * @returns {Promise<Object>} 路由结果统计
   */
  async routeMessage(message) {
    if (!message || !message.type) {
      throw new Error('Invalid message format')
    }

    this.routingStats.totalMessages++
    const startTime = Date.now()

    // 添加到历史记录
    this.addToHistory(message)

    const results = {
      messageId: message.id,
      messageType: message.type,
      totalSubscribers: 0,
      successfulRoutes: 0,
      failedRoutes: 0,
      skippedRoutes: 0,
      executionTime: 0
    }

    try {
      // 获取所有相关的订阅者
      const targetSubscribers = this.getTargetSubscribers(message.type)
      results.totalSubscribers = targetSubscribers.length

      if (targetSubscribers.length === 0) {
        this.routingStats.unsubscribedMessages++
        console.log(`📡 [ROUTER] 消息无订阅者: ${message.type}`)
      }

      // 并行处理所有订阅者
      const routingPromises = targetSubscribers.map(subscription => 
        this.routeToSubscriber(subscription, message)
      )

      const routingResults = await Promise.allSettled(routingPromises)

      // 统计结果
      routingResults.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.successfulRoutes++
          } else {
            results.failedRoutes++
          }
        } else {
          results.failedRoutes++
          console.error(`📡 [ROUTER] 路由异常:`, result.reason)
        }
      })

      this.routingStats.routedMessages += results.successfulRoutes
      this.routingStats.failedRoutes += results.failedRoutes

    } catch (error) {
      console.error(`📡 [ROUTER] 路由消息失败:`, error)
      this.routingStats.failedRoutes++
    }

    results.executionTime = Date.now() - startTime

    console.log(`📡 [ROUTER] 消息路由完成:`, {
      messageId: message.id,
      messageType: message.type,
      successRate: `${results.successfulRoutes}/${results.totalSubscribers}`,
      executionTime: `${results.executionTime}ms`
    })

    return results
  }

  /**
   * 获取目标订阅者
   * @param {string} messageType - 消息类型
   * @returns {Array} 订阅者列表
   */
  getTargetSubscribers(messageType) {
    const subscribers = []

    // 添加全局订阅者
    subscribers.push(...this.globalSubscribers)

    // 添加特定类型的订阅者
    if (this.subscribers.has(messageType)) {
      subscribers.push(...this.subscribers.get(messageType))
    }

    // 按优先级排序
    return subscribers.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
      const aPriority = priorityOrder[a.options.priority] || 2
      const bPriority = priorityOrder[b.options.priority] || 2
      return aPriority - bPriority
    })
  }

  /**
   * 路由消息到单个订阅者
   * @param {Object} subscription - 订阅信息
   * @param {Object} message - 消息
   * @returns {Promise<Object>} 路由结果
   */
  async routeToSubscriber(subscription, message) {
    const startTime = Date.now()

    try {
      // 应用过滤器
      if (subscription.options.filter && !subscription.options.filter(message)) {
        return {
          subscriptionId: subscription.id,
          success: false,
          reason: 'filtered',
          executionTime: Date.now() - startTime
        }
      }

      // 设置超时
      let timeoutId = null
      if (subscription.options.timeout) {
        timeoutId = setTimeout(() => {
          console.warn(`📡 [ROUTER] 订阅者处理超时: ${subscription.id}`)
        }, subscription.options.timeout)
      }

      try {
        // 调用订阅者的处理函数
        const result = await subscription.subscriber.onMessage(message)

        // 清除超时
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        // 更新订阅者统计
        subscription.messageCount++
        subscription.lastMessageTime = Date.now()

        // 如果是一次性订阅，自动取消
        if (subscription.options.once) {
          this.unsubscribe(subscription.id)
        }

        return {
          subscriptionId: subscription.id,
          success: true,
          result,
          executionTime: Date.now() - startTime
        }

      } catch (error) {
        // 清除超时
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        // 调用错误处理函数
        if (typeof subscription.subscriber.onError === 'function') {
          try {
            await subscription.subscriber.onError(error, message)
          } catch (errorHandlerError) {
            console.error(`📡 [ROUTER] 订阅者错误处理失败:`, errorHandlerError)
          }
        }

        throw error
      }

    } catch (error) {
      console.error(`📡 [ROUTER] 路由到订阅者失败:`, {
        subscriptionId: subscription.id,
        messageType: message.type,
        error: error.message
      })

      return {
        subscriptionId: subscription.id,
        success: false,
        reason: 'error',
        error: error.message,
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * 添加消息到历史记录
   * @param {Object} message - 消息
   */
  addToHistory(message) {
    this.messageHistory.push({
      ...message,
      routedAt: Date.now()
    })

    // 限制历史记录大小
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift()
    }
  }

  /**
   * 获取消息历史记录
   * @param {Object} options - 查询选项
   * @returns {Array} 消息历史
   */
  getMessageHistory(options = {}) {
    let history = [...this.messageHistory]

    // 按消息类型过滤
    if (options.messageType) {
      history = history.filter(msg => msg.type === options.messageType)
    }

    // 按时间范围过滤
    if (options.since) {
      history = history.filter(msg => msg.timestamp >= options.since)
    }

    if (options.until) {
      history = history.filter(msg => msg.timestamp <= options.until)
    }

    // 限制数量
    if (options.limit) {
      history = history.slice(-options.limit)
    }

    return history
  }

  /**
   * 获取订阅者统计信息
   * @returns {Object} 统计信息
   */
  getSubscriberStats() {
    const stats = {
      totalSubscribers: this.globalSubscribers.length,
      subscriptionsByType: {},
      globalSubscribers: this.globalSubscribers.length,
      activeSubscribers: 0,
      inactiveSubscribers: 0
    }

    // 统计各类型的订阅者数量
    for (const [messageType, subscriptions] of this.subscribers.entries()) {
      stats.subscriptionsByType[messageType] = subscriptions.length
      stats.totalSubscribers += subscriptions.length

      // 统计活跃/非活跃订阅者
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      subscriptions.forEach(sub => {
        if (sub.lastMessageTime && sub.lastMessageTime > fiveMinutesAgo) {
          stats.activeSubscribers++
        } else {
          stats.inactiveSubscribers++
        }
      })
    }

    return stats
  }

  /**
   * 获取路由统计信息
   * @returns {Object} 统计信息
   */
  getRoutingStats() {
    return {
      ...this.routingStats,
      successRate: this.routingStats.totalMessages > 0 
        ? (this.routingStats.routedMessages / this.routingStats.totalMessages * 100).toFixed(2) + '%'
        : '0%',
      failureRate: this.routingStats.totalMessages > 0
        ? (this.routingStats.failedRoutes / this.routingStats.totalMessages * 100).toFixed(2) + '%'
        : '0%',
      unsubscribeRate: this.routingStats.totalMessages > 0
        ? (this.routingStats.unsubscribedMessages / this.routingStats.totalMessages * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  /**
   * 清理非活跃订阅者
   * @param {number} inactiveThreshold - 非活跃阈值（毫秒）
   * @returns {number} 清理的订阅者数量
   */
  cleanupInactiveSubscribers(inactiveThreshold = 30 * 60 * 1000) { // 默认30分钟
    const now = Date.now()
    let cleanedCount = 0

    // 清理全局订阅者
    this.globalSubscribers = this.globalSubscribers.filter(sub => {
      const isActive = !sub.lastMessageTime || (now - sub.lastMessageTime) < inactiveThreshold
      if (!isActive) {
        cleanedCount++
        console.log(`📡 [ROUTER] 清理非活跃全局订阅者: ${sub.id}`)
      }
      return isActive
    })

    // 清理特定类型订阅者
    for (const [messageType, subscriptions] of this.subscribers.entries()) {
      const activeSubscriptions = subscriptions.filter(sub => {
        const isActive = !sub.lastMessageTime || (now - sub.lastMessageTime) < inactiveThreshold
        if (!isActive) {
          cleanedCount++
          console.log(`📡 [ROUTER] 清理非活跃订阅者: ${messageType} -> ${sub.id}`)
        }
        return isActive
      })

      if (activeSubscriptions.length === 0) {
        this.subscribers.delete(messageType)
      } else {
        this.subscribers.set(messageType, activeSubscriptions)
      }
    }

    return cleanedCount
  }

  /**
   * 生成订阅ID
   */
  generateSubscriptionId() {
    return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.routingStats = {
      totalMessages: 0,
      routedMessages: 0,
      failedRoutes: 0,
      unsubscribedMessages: 0
    }
    console.log(`📡 [ROUTER] 统计信息已重置`)
  }

  /**
   * 获取路由器快照
   */
  getSnapshot() {
    return {
      subscriberStats: this.getSubscriberStats(),
      routingStats: this.getRoutingStats(),
      messageHistorySize: this.messageHistory.length,
      timestamp: Date.now()
    }
  }
}
