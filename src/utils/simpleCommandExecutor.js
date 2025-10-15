/**
 * 简化版命令执行器
 * 使用Promise和事件系统替代复杂的消息队列
 */

import { emitEvent, onEvent, EventTypes, waitForEvent } from './eventSystem.js'
import { useAIStore } from '../stores/ai.js'
import { useTerminalStore } from '../stores/terminal.js'

class SimpleCommandExecutor {
  constructor() {
    this.pendingCommands = new Map()
    this.commandHistory = []
    this.maxHistorySize = 50
    this.defaultTimeout = 60000 // 60秒超时

    // 监听终端输出事件
    this.setupEventListeners()
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听终端输出，用于检测命令完成
    onEvent(EventTypes.TERMINAL_OUTPUT, (data) => {
      this.handleTerminalOutput(data)
    }, 'SimpleCommandExecutor')

    console.log('🔧 [COMMAND-EXECUTOR] 事件监听器已设置')
  }

  /**
   * 执行命令（对外接口）
   */
  async executeCommand(command, connectionId, options = {}) {
    const commandId = options.commandId || this.generateCommandId()
    const timeout = options.timeout || this.defaultTimeout

    console.log(`🚀 [COMMAND-EXECUTOR] 开始执行命令:`, {
      commandId,
      command,
      connectionId,
      timeout
    })

    return new Promise(async (resolve, reject) => {
      // 检查连接状态
      if (!window.electronAPI?.sshShellWrite) {
        const error = new Error('SSH Shell API不可用，请检查Electron主进程连接')
        this.recordCommandError(commandId, command, error)
        reject(error)
        return
      }

      // 存储命令信息
      this.pendingCommands.set(commandId, {
        command,
        connectionId,
        resolve,
        reject,
        startTime: Date.now(),
        output: [],
        completed: false
      })

      // 设置超时
      const timeoutId = setTimeout(() => {
        const executionTime = Date.now() - this.pendingCommands.get(commandId)?.startTime
        console.error(`⏰ [COMMAND-EXECUTOR] 命令执行超时:`, {
          commandId,
          command,
          executionTime
        })

        this.handleCommandTimeout(commandId, command, executionTime)
        reject(new Error(`命令执行超时 (${timeout}ms): ${command}`))
      }, timeout)

      this.pendingCommands.get(commandId).timeoutId = timeoutId

      try {
        // 记录命令开始
        this.recordCommandStart(commandId, command, connectionId)

        // 发送命令到SSH
        const cleanCommand = command.replace(/\r?\n$/, '')
        const result = await window.electronAPI.sshShellWrite(connectionId, cleanCommand + '\r')

        if (!result.success) {
          throw new Error(result.error || 'SSH Shell写入失败')
        }

        console.log(`✅ [COMMAND-EXECUTOR] 命令已发送:`, {
          commandId,
          command,
          connectionId
        })

      } catch (error) {
        console.error(`❌ [COMMAND-EXECUTOR] 命令发送失败:`, {
          commandId,
          command,
          error: error.message
        })

        this.recordCommandError(commandId, command, error)
        this.cleanupCommand(commandId)
        reject(new Error(`命令发送失败: ${error.message}`))
      }
    })
  }

  /**
   * 处理终端输出
   */
  handleTerminalOutput(data) {
    const { connectionId, output } = data

    // 查找该连接的待执行命令
    for (const [commandId, commandInfo] of this.pendingCommands.entries()) {
      if (commandInfo.connectionId === connectionId && !commandInfo.completed) {
        console.log(`📡 [COMMAND-EXECUTOR] 收到命令输出:`, {
          commandId,
          outputLength: output?.length,
          preview: output?.toString().substring(0, 100)
        })

        // 添加到输出缓冲区
        commandInfo.output.push(output)

        // 更新实时输出到AI store
        this.updateRealtimeOutput(commandId, output)

        // 检查命令是否完成
        if (this.isCommandComplete(output, commandInfo.output)) {
          console.log(`✅ [COMMAND-EXECUTOR] 命令完成: ${commandId}`)
          this.completeCommand(commandId)
        }

        break // 每次只处理最新的命令
      }
    }
  }

  /**
   * 判断命令是否完成
   */
  isCommandComplete(latestData, allOutput) {
    // 清理ANSI转义序列
    const cleanData = (data) => data.replace(/\x1b\[[0-9;]*[mGKHJABCFMPQRSUVWSTfhjlqurwxwzy]|\x1b\[[0-9]*[ABCDHIJKLMPRSTUVWXYZ]|\x1b\[[0-9]*n/g, '')

    const output = allOutput.join('')
    const cleanOutput = cleanData(output)
    const cleanLatestData = cleanData(latestData)
    const outputEnd = cleanOutput.slice(-300)

    // 检测命令完成的标志
    const patterns = [
      /root@[a-zA-Z0-9._-]+:[~\/][a-zA-Z0-9._\/-]*[#]\s*$/,
      /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+:[~\/][a-zA-Z0-9._\/-]*[$#]\s*$/,
      /[A-Z]:[\\\/][a-zA-Z0-9._\\\/-]*[>$]\s*$/,
      /[$#>]\s*$/
    ]

    const hasPrompt = patterns.some(pattern =>
      pattern.test(cleanLatestData) || pattern.test(cleanOutput)
    )

    const hasCommandResult = output.length > latestData.length + 10
    const hasErrorAndPrompt = /不是内部或外部命令|command not found/i.test(cleanOutput) && hasPrompt

    return hasPrompt && (hasCommandResult || hasErrorAndPrompt || cleanLatestData.includes('\n'))
  }

  /**
   * 完成命令执行
   */
  completeCommand(commandId) {
    const commandInfo = this.pendingCommands.get(commandId)
    if (!commandInfo || commandInfo.completed) {
      return
    }

    commandInfo.completed = true
    const output = commandInfo.output.join('')
    const executionTime = Date.now() - commandInfo.startTime

    console.log(`✅ [COMMAND-EXECUTOR] 命令执行完成:`, {
      commandId,
      command: commandInfo.command,
      executionTime,
      outputLength: output.length
    })

    // 记录命令完成
    this.recordCommandComplete(commandId, commandInfo.command, output, executionTime)

    // 清理资源
    this.cleanupCommand(commandId)

    // 返回结果
    commandInfo.resolve(output)
  }

  /**
   * 处理命令超时
   */
  handleCommandTimeout(commandId, command, executionTime) {
    console.error(`⏰ [COMMAND-EXECUTOR] 命令超时:`, {
      commandId,
      command,
      executionTime
    })

    // 记录超时
    this.recordCommandTimeout(commandId, command, executionTime)

    // 更新AI store
    const aiStore = useAIStore()
    if (aiStore) {
      aiStore.timeoutToolCall({
        id: commandId,
        command,
        executionTime,
        timeoutDuration: this.defaultTimeout
      })
    }

    this.cleanupCommand(commandId)
  }

  /**
   * 记录命令开始
   */
  recordCommandStart(commandId, command, connectionId) {
    // 更新AI store
    const aiStore = useAIStore()
    if (aiStore) {
      aiStore.startToolCall({
        id: commandId,
        command,
        connectionId,
        timestamp: Date.now()
      })
    }

    // 更新Terminal store
    const terminalStore = useTerminalStore()
    if (terminalStore) {
      terminalStore.startCommand({
        commandId,
        command,
        connectionId
      })
    }

    // 发送事件
    emitEvent(EventTypes.AI_COMMAND_START, {
      commandId,
      command,
      connectionId
    })
  }

  /**
   * 记录命令完成
   */
  recordCommandComplete(commandId, command, result, executionTime) {
    // 更新AI store
    const aiStore = useAIStore()
    if (aiStore) {
      aiStore.completeToolCall({
        id: commandId,
        command,
        result,
        executionTime
      })
    }

    // 更新Terminal store
    const terminalStore = useTerminalStore()
    if (terminalStore) {
      terminalStore.completeCommand({
        commandId,
        result
      })
    }

    // 添加到历史记录
    this.addToHistory({
      commandId,
      command,
      result,
      executionTime,
      status: 'completed'
    })

    // 发送事件
    emitEvent(EventTypes.AI_COMMAND_COMPLETE, {
      commandId,
      command,
      result,
      executionTime
    })
  }

  /**
   * 记录命令错误
   */
  recordCommandError(commandId, command, error) {
    console.error(`❌ [COMMAND-EXECUTOR] 命令执行失败:`, {
      commandId,
      command,
      error: error.message
    })

    // 更新AI store
    const aiStore = useAIStore()
    if (aiStore) {
      aiStore.errorToolCall({
        id: commandId,
        command,
        error: error.message,
        executionTime: 0
      })
    }

    // 更新Terminal store
    const terminalStore = useTerminalStore()
    if (terminalStore) {
      terminalStore.errorCommand({
        commandId,
        error: error.message
      })
    }

    // 添加到历史记录
    this.addToHistory({
      commandId,
      command,
      error: error.message,
      status: 'error'
    })

    // 发送事件
    emitEvent(EventTypes.AI_COMMAND_ERROR, {
      commandId,
      command,
      error: error.message
    })
  }

  /**
   * 记录命令超时
   */
  recordCommandTimeout(commandId, command, executionTime) {
    // 添加到历史记录
    this.addToHistory({
      commandId,
      command,
      executionTime,
      status: 'timeout'
    })
  }

  /**
   * 更新实时输出
   */
  updateRealtimeOutput(commandId, output) {
    const aiStore = useAIStore()
    if (aiStore) {
      aiStore.updateRealtimeOutput(commandId, output.toString())
    }
  }

  /**
   * 添加到历史记录
   */
  addToHistory(record) {
    this.commandHistory.push({
      ...record,
      timestamp: Date.now()
    })

    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift()
    }
  }

  /**
   * 清理命令资源
   */
  cleanupCommand(commandId) {
    const commandInfo = this.pendingCommands.get(commandId)
    if (commandInfo?.timeoutId) {
      clearTimeout(commandInfo.timeoutId)
    }

    this.pendingCommands.delete(commandId)
  }

  /**
   * 生成命令ID
   */
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取待执行命令数量
   */
  getPendingCommandsCount(connectionId) {
    let count = 0
    for (const commandInfo of this.pendingCommands.values()) {
      if (commandInfo.connectionId === connectionId && !commandInfo.completed) {
        count++
      }
    }
    return count
  }

  /**
   * 强制完成所有命令（连接断开时使用）
   */
  completeAllCommands(connectionId) {
    for (const [commandId, commandInfo] of this.pendingCommands.entries()) {
      if (commandInfo.connectionId === connectionId && !commandInfo.completed) {
        commandInfo.completed = true
        const output = commandInfo.output.join('')
        this.completeCommand(commandId)
      }
    }
  }

  /**
   * 获取命令历史
   */
  getCommandHistory(limit = 20) {
    return this.commandHistory.slice(-limit)
  }

  /**
   * 清除所有待执行命令
   */
  clearAllCommands() {
    for (const [commandId, commandInfo] of this.pendingCommands.entries()) {
      if (commandInfo.timeoutId) {
        clearTimeout(commandInfo.timeoutId)
      }
      commandInfo.reject(new Error('命令执行器已重置'))
    }
    this.pendingCommands.clear()
    console.log('🧹 [COMMAND-EXECUTOR] 已清除所有待执行命令')
  }
}

// 创建全局实例
const simpleCommandExecutor = new SimpleCommandExecutor()

// 导出便捷函数
export const executeCommand = (command, connectionId, options) =>
  simpleCommandExecutor.executeCommand(command, connectionId, options)

export const getPendingCommandsCount = (connectionId) =>
  simpleCommandExecutor.getPendingCommandsCount(connectionId)

export const completeAllCommands = (connectionId) =>
  simpleCommandExecutor.completeAllCommands(connectionId)

export const getCommandHistory = (limit) =>
  simpleCommandExecutor.getCommandHistory(limit)

export default simpleCommandExecutor