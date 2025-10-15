/**
 * AI对话系统集成
 * 将现有的AI对话和工具调用系统迁移到消息队列
 */

import { MessageTypes, Priority } from './MessageTypes.js'
import { globalMessageQueue } from './MessageQueue.js'
import { callAIAPI } from '../aiService.js'
import { executeAICommand } from '../aiCommandExecutor.js'

export class AIIntegration {
  constructor() {
    this.activeSessions = new Map() // 活跃的AI会话
    this.pendingCommands = new Map() // 待处理的命令
    this.sessionCounter = 0
    this.commandCounter = 0
    
    this.setupMessageHandlers()
  }

  /**
   * 设置消息处理器
   */
  setupMessageHandlers() {
    // AI聊天消息处理
    globalMessageQueue.registerProcessor(MessageTypes.AI_CHAT, async (message) => {
      await this.handleAIChatMessage(message)
    })

    // 工具调用处理
    globalMessageQueue.registerProcessor(MessageTypes.TOOL_CALL, async (message) => {
      await this.handleToolCallMessage(message)
    })

    // SSH命令处理
    globalMessageQueue.registerProcessor(MessageTypes.SSH_COMMAND, async (message) => {
      await this.handleSSHCommandMessage(message)
    })

    // 终端输出处理
    globalMessageQueue.registerProcessor(MessageTypes.TERMINAL_OUTPUT, async (message) => {
      await this.handleTerminalOutputMessage(message)
    })

    console.log(`🤖 [AI-INTEGRATION] AI消息处理器已注册`)
  }

  /**
   * 发送AI聊天消息
   * @param {string} sessionId - 会话ID
   * @param {string} message - 用户消息
   * @param {Object} connection - 连接信息
   * @param {Array} history - 消息历史
   * @returns {string} 消息ID
   */
  sendAIChatMessage(sessionId, message, connection, history = []) {
    return globalMessageQueue.sendMessage(MessageTypes.AI_CHAT, {
      sessionId,
      message,
      connection,
      history,
      timestamp: Date.now()
    }, {
      priority: Priority.NORMAL,
      timeout: 60000 // 60秒超时
    })
  }

  /**
   * 发送工具调用消息
   * @param {string} sessionId - 会话ID
   * @param {Object} toolCall - 工具调用信息
   * @returns {string} 消息ID
   */
  sendToolCallMessage(sessionId, toolCall) {
    return globalMessageQueue.sendMessage(MessageTypes.TOOL_CALL, {
      sessionId,
      toolCall,
      timestamp: Date.now()
    }, {
      priority: Priority.HIGH,
      timeout: 120000 // 2分钟超时
    })
  }

  /**
   * 发送SSH命令消息
   * @param {string} sessionId - 会话ID
   * @param {string} command - 命令
   * @param {string} connectionId - 连接ID
   * @returns {string} 消息ID
   */
  sendSSHCommandMessage(sessionId, command, connectionId) {
    const commandId = `cmd-${++this.commandCounter}-${Date.now()}`
    
    return globalMessageQueue.sendMessage(MessageTypes.SSH_COMMAND, {
      sessionId,
      commandId,
      command,
      connectionId,
      timestamp: Date.now()
    }, {
      priority: Priority.HIGH,
      timeout: 180000 // 3分钟超时
    })
  }

  /**
   * 处理AI聊天消息
   * @param {Object} message - 消息对象
   */
  async handleAIChatMessage(message) {
    const { sessionId, userMessage, connection, history } = message.data
    
    console.log(`🤖 [AI-INTEGRATION] 处理AI聊天消息:`, {
      sessionId,
      messageLength: userMessage?.length,
      connectionId: connection?.id
    })

    try {
      // 发送AI响应开始事件
      this.sendAIResponseEvent(sessionId, {
        type: 'start',
        sessionId,
        timestamp: Date.now()
      })

      // 调用AI API
      const response = await callAIAPI(userMessage, history, connection)

      // 发送AI响应完成事件
      this.sendAIResponseEvent(sessionId, {
        type: 'complete',
        sessionId,
        response,
        timestamp: Date.now()
      })

      // 如果响应包含工具调用，发送工具调用消息
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          this.sendToolCallMessage(sessionId, toolCall)
        }
      }

      console.log(`✅ [AI-INTEGRATION] AI聊天处理完成:`, sessionId)

    } catch (error) {
      console.error(`❌ [AI-INTEGRATION] AI聊天处理失败:`, error)

      // 发送AI响应错误事件
      this.sendAIResponseEvent(sessionId, {
        type: 'error',
        sessionId,
        error: error.message,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 处理工具调用消息
   * @param {Object} message - 消息对象
   */
  async handleToolCallMessage(message) {
    const { sessionId, toolCall } = message.data
    
    console.log(`🔧 [AI-INTEGRATION] 处理工具调用:`, {
      sessionId,
      toolName: toolCall.function?.name,
      toolCallId: toolCall.id
    })

    try {
      // 发送工具调用开始事件
      this.sendToolCallEvent(sessionId, {
        type: 'start',
        sessionId,
        toolCall,
        timestamp: Date.now()
      })

      if (toolCall.function?.name === 'execute_command') {
        const args = JSON.parse(toolCall.function.arguments)
        const connectionId = this.getSessionConnectionId(sessionId)
        
        if (connectionId) {
          // 发送SSH命令消息
          this.sendSSHCommandMessage(sessionId, args.command, connectionId)
        } else {
          throw new Error('未找到有效的连接ID')
        }
      } else {
        throw new Error(`不支持的工具类型: ${toolCall.function?.name}`)
      }

    } catch (error) {
      console.error(`❌ [AI-INTEGRATION] 工具调用处理失败:`, error)

      // 发送工具调用错误事件
      this.sendToolCallEvent(sessionId, {
        type: 'error',
        sessionId,
        toolCall,
        error: error.message,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 处理SSH命令消息
   * @param {Object} message - 消息对象
   */
  async handleSSHCommandMessage(message) {
    const { sessionId, commandId, command, connectionId } = message.data
    
    console.log(`💻 [AI-INTEGRATION] 执行SSH命令:`, {
      sessionId,
      commandId,
      command,
      connectionId
    })

    try {
      // 存储待处理的命令
      this.pendingCommands.set(commandId, {
        sessionId,
        command,
        connectionId,
        startTime: Date.now()
      })

      // 发送命令执行开始事件
      this.sendCommandEvent(sessionId, {
        type: 'start',
        sessionId,
        commandId,
        command,
        connectionId,
        timestamp: Date.now()
      })

      // 执行命令
      const result = await executeAICommand(command, connectionId)

      // 清理待处理命令
      this.pendingCommands.delete(commandId)

      // 发送命令执行完成事件
      this.sendCommandEvent(sessionId, {
        type: 'complete',
        sessionId,
        commandId,
        command,
        connectionId,
        result,
        executionTime: Date.now() - this.pendingCommands.get(commandId)?.startTime,
        timestamp: Date.now()
      })

      console.log(`✅ [AI-INTEGRATION] SSH命令执行完成:`, commandId)

    } catch (error) {
      console.error(`❌ [AI-INTEGRATION] SSH命令执行失败:`, error)

      // 清理待处理命令
      this.pendingCommands.delete(commandId)

      // 发送命令执行错误事件
      this.sendCommandEvent(sessionId, {
        type: 'error',
        sessionId,
        commandId,
        command,
        connectionId,
        error: error.message,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 处理终端输出消息
   * @param {Object} message - 消息对象
   */
  async handleTerminalOutputMessage(message) {
    const { connectionId, output } = message.data
    
    console.log(`📡 [AI-INTEGRATION] 处理终端输出:`, {
      connectionId,
      outputLength: output?.length
    })

    // 查找相关的待处理命令
    for (const [commandId, commandInfo] of this.pendingCommands.entries()) {
      if (commandInfo.connectionId === connectionId) {
        // 发送实时输出事件
        this.sendCommandEvent(commandInfo.sessionId, {
          type: 'output',
          sessionId: commandInfo.sessionId,
          commandId,
          connectionId,
          output,
          timestamp: Date.now()
        })
      }
    }
  }

  /**
   * 创建AI会话
   * @param {Object} connection - 连接信息
   * @returns {string} 会话ID
   */
  createAISession(connection) {
    const sessionId = `ai-session-${++this.sessionCounter}-${Date.now()}`
    
    this.activeSessions.set(sessionId, {
      id: sessionId,
      connection,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0
    })

    console.log(`🆕 [AI-INTEGRATION] 创建AI会话:`, sessionId)
    
    // 发送会话创建事件
    globalMessageQueue.sendMessage(MessageTypes.SYSTEM_EVENT, {
      type: 'ai-session-created',
      sessionId,
      connection,
      timestamp: Date.now()
    })

    return sessionId
  }

  /**
   * 关闭AI会话
   * @param {string} sessionId - 会话ID
   */
  closeAISession(sessionId) {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      this.activeSessions.delete(sessionId)
      
      console.log(`🔚 [AI-INTEGRATION] 关闭AI会话:`, sessionId)
      
      // 发送会话关闭事件
      globalMessageQueue.sendMessage(MessageTypes.SYSTEM_EVENT, {
        type: 'ai-session-closed',
        sessionId,
        session,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 获取会话连接ID
   * @param {string} sessionId - 会话ID
   * @returns {string|null} 连接ID
   */
  getSessionConnectionId(sessionId) {
    const session = this.activeSessions.get(sessionId)
    return session?.connection?.id || null
  }

  /**
   * 更新会话活动时间
   * @param {string} sessionId - 会话ID
   */
  updateSessionActivity(sessionId) {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
      session.messageCount++
    }
  }

  /**
   * 发送AI响应事件
   * @param {string} sessionId - 会话ID
   * @param {Object} eventData - 事件数据
   */
  sendAIResponseEvent(sessionId, eventData) {
    globalMessageQueue.sendMessage(MessageTypes.AI_RESPONSE, {
      sessionId,
      ...eventData
    }, {
      priority: Priority.HIGH
    })
  }

  /**
   * 发送工具调用事件
   * @param {string} sessionId - 会话ID
   * @param {Object} eventData - 事件数据
   */
  sendToolCallEvent(sessionId, eventData) {
    globalMessageQueue.sendMessage(MessageTypes.TOOL_CALL_RESULT, {
      sessionId,
      ...eventData
    }, {
      priority: Priority.HIGH
    })
  }

  /**
   * 发送命令事件
   * @param {string} sessionId - 会话ID
   * @param {Object} eventData - 事件数据
   */
  sendCommandEvent(sessionId, eventData) {
    globalMessageQueue.sendMessage(MessageTypes.SSH_OUTPUT, {
      sessionId,
      ...eventData
    }, {
      priority: Priority.HIGH
    })
  }

  /**
   * 获取会话统计信息
   * @returns {Object} 统计信息
   */
  getSessionStats() {
    const sessions = Array.from(this.activeSessions.values())
    const now = Date.now()
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => now - s.lastActivity < 5 * 60 * 1000).length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
      averageSessionDuration: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (now - s.createdAt), 0) / sessions.length 
        : 0,
      pendingCommands: this.pendingCommands.size
    }
  }

  /**
   * 清理非活跃会话
   * @param {number} inactiveThreshold - 非活跃阈值（毫秒）
   */
  cleanupInactiveSessions(inactiveThreshold = 30 * 60 * 1000) { // 默认30分钟
    const now = Date.now()
    let cleanedCount = 0

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > inactiveThreshold) {
        this.closeAISession(sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [AI-INTEGRATION] 清理了 ${cleanedCount} 个非活跃会话`)
    }

    return cleanedCount
  }

  /**
   * 获取集成快照
   * @returns {Object} 快照数据
   */
  getSnapshot() {
    return {
      sessionStats: this.getSessionStats(),
      activeSessions: Array.from(this.activeSessions.values()),
      pendingCommands: Array.from(this.pendingCommands.entries()),
      timestamp: Date.now()
    }
  }
}

// 创建全局AI集成实例
export const aiIntegration = new AIIntegration()

// 导出便捷方法
export const sendAIChatMessage = (sessionId, message, connection, history) => 
  aiIntegration.sendAIChatMessage(sessionId, message, connection, history)

export const createAISession = (connection) => aiIntegration.createAISession(connection)

export const closeAISession = (sessionId) => aiIntegration.closeAISession(sessionId)

export const updateSessionActivity = (sessionId) => aiIntegration.updateSessionActivity(sessionId)
