/**
 * 轻量级事件系统
 * 用于替代复杂的消息队列，提供简单高效的事件通信机制
 */

import mitt from 'mitt'

// 创建全局事件发射器
const emitter = mitt()

// 事件类型定义
export const EventTypes = {
  // AI聊天相关
  AI_MESSAGE_SEND: 'ai-message-send',
  AI_RESPONSE: 'ai-response',
  AI_COMMAND_START: 'ai-command-start',
  AI_COMMAND_COMPLETE: 'ai-command-complete',
  AI_COMMAND_ERROR: 'ai-command-error',
  AI_CONFIG_REQUIRED: 'ai-config-required',

  // 终端和SSH相关
  TERMINAL_OUTPUT: 'terminal-output',
  TERMINAL_COMMAND: 'terminal-command',
  TERMINAL_INPUT: 'terminal-input',
  SSH_COMMAND_EXECUTE: 'ssh-command-execute',

  // 连接管理
  CONNECTION_CONNECT: 'connection-connect',
  CONNECTION_DISCONNECT: 'connection-disconnect',

  // 系统事件
  SYSTEM_ERROR: 'system-error',
  SYSTEM_NOTIFICATION: 'system-notification'
}

// 优先级定义（简化版）
export const Priority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3
}

// 轻量级事件管理器
class SimpleEventManager {
  constructor() {
    this.eventHistory = []
    this.maxHistorySize = 100
    this.listeningComponents = new Set()
  }

  /**
   * 发送事件
   */
  emit(eventType, data, options = {}) {
    const eventData = {
      type: eventType,
      data,
      timestamp: Date.now(),
      priority: options.priority || Priority.NORMAL,
      id: this.generateEventId()
    }

    // 记录事件历史
    this.addToHistory(eventData)

    // 发送事件
    emitter.emit(eventType, eventData)

    console.log(`📡 [EVENT] 发送事件: ${eventType}`, {
      priority: eventData.priority,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : null
    })

    return eventData.id
  }

  /**
   * 监听事件
   */
  on(eventType, handler, componentId = null) {
    if (componentId) {
      this.listeningComponents.add(componentId)
    }

    const wrappedHandler = (eventData) => {
      try {
        handler(eventData.data, eventData)
      } catch (error) {
        console.error(`❌ [EVENT] 事件处理错误 (${eventType}):`, error)
        this.emit(EventTypes.SYSTEM_ERROR, {
          error: error.message,
          eventType,
          componentId
        }, { priority: Priority.HIGH })
      }
    }

    emitter.on(eventType, wrappedHandler)

    // 返回取消监听的函数
    return () => {
      emitter.off(eventType, wrappedHandler)
      if (componentId) {
        this.listeningComponents.delete(componentId)
      }
    }
  }

  /**
   * 一次性监听事件
   */
  once(eventType, handler, componentId = null) {
    if (componentId) {
      this.listeningComponents.add(componentId)
    }

    const wrappedHandler = (eventData) => {
      try {
        handler(eventData.data, eventData)
      } catch (error) {
        console.error(`❌ [EVENT] 一次性事件处理错误 (${eventType}):`, error)
        this.emit(EventTypes.SYSTEM_ERROR, {
          error: error.message,
          eventType,
          componentId
        }, { priority: Priority.HIGH })
      }

      if (componentId) {
        this.listeningComponents.delete(componentId)
      }
    }

    emitter.once(eventType, wrappedHandler)
  }

  /**
   * 取消监听事件
   */
  off(eventType, handler) {
    emitter.off(eventType, handler)
  }

  /**
   * 清除所有监听器
   */
  clear() {
    emitter.all.clear()
    this.listeningComponents.clear()
    console.log('🧹 [EVENT] 已清除所有事件监听器')
  }

  /**
   * 添加到事件历史
   */
  addToHistory(eventData) {
    this.eventHistory.push(eventData)

    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }
  }

  /**
   * 获取事件历史
   */
  getHistory(eventType = null, limit = 50) {
    let history = this.eventHistory

    if (eventType) {
      history = history.filter(event => event.type === eventType)
    }

    return history.slice(-limit)
  }

  /**
   * 获取活跃的监听组件
   */
  getActiveComponents() {
    return Array.from(this.listeningComponents)
  }

  /**
   * 生成事件ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 等待特定事件
   */
  waitFor(eventType, timeout = 30000) {
    return new Promise((resolve, reject) => {
      let timeoutId

      const cleanup = this.once(eventType, (data, eventData) => {
        clearTimeout(timeoutId)
        resolve({ data, eventData })
      })

      timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error(`等待事件 ${eventType} 超时 (${timeout}ms)`))
      }, timeout)
    })
  }

  /**
   * 批量发送事件
   */
  emitBatch(events) {
    const results = []

    events.forEach(({ type, data, options }) => {
      try {
        const eventId = this.emit(type, data, options)
        results.push({ type, eventId, success: true })
      } catch (error) {
        console.error(`❌ [EVENT] 批量发送失败 (${type}):`, error)
        results.push({ type, error: error.message, success: false })
      }
    })

    return results
  }
}

// 创建全局实例
const globalEventManager = new SimpleEventManager()

// 导出便捷函数
export const emitEvent = (eventType, data, options) =>
  globalEventManager.emit(eventType, data, options)

export const onEvent = (eventType, handler, componentId) =>
  globalEventManager.on(eventType, handler, componentId)

export const onceEvent = (eventType, handler, componentId) =>
  globalEventManager.once(eventType, handler, componentId)

export const offEvent = (eventType, handler) =>
  globalEventManager.off(eventType, handler)

export const waitForEvent = (eventType, timeout) =>
  globalEventManager.waitFor(eventType, timeout)

export const clearAllEvents = () =>
  globalEventManager.clear()

// 导出核心实例和管理器
export default globalEventManager

// Vue插件安装函数
export function installEventSystem(app) {
  app.config.globalProperties.$events = globalEventManager
  app.provide('eventManager', globalEventManager)

  console.log('✅ [EVENT] 轻量级事件系统已安装')
}