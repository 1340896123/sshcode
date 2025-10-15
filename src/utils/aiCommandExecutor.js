/**
 * 简化版AI命令执行器
 * 使用简单的Promise和事件系统，移除复杂的消息队列依赖
 */

import { executeCommand } from './simpleCommandExecutor.js'
import { emitEvent, EventTypes } from './eventSystem.js'
import { useAIStore } from '../stores/ai.js'

/**
 * 执行命令并等待结果（对外接口）
 */
export async function executeAICommand(command, connectionId, options = {}) {
  console.log(`🚀 [AI-COMMAND-EXECUTOR] 执行AI命令:`, {
    command,
    connectionId,
    options
  })

  try {
    // 使用简化版命令执行器
    const result = await executeCommand(command, connectionId, options)

    console.log(`✅ [AI-COMMAND-EXECUTOR] 命令执行完成:`, {
      command,
      connectionId,
      resultLength: result?.length || 0
    })

    return result

  } catch (error) {
    console.error(`❌ [AI-COMMAND-EXECUTOR] 命令执行失败:`, {
      command,
      connectionId,
      error: error.message
    })

    // 发送错误事件
    emitEvent(EventTypes.AI_COMMAND_ERROR, {
      command,
      connectionId,
      error: error.message,
      timestamp: Date.now()
    })

    throw error
  }
}

/**
 * 处理终端数据输出（兼容接口）
 */
export function handleAITerminalData(connectionId, data) {
  console.log(`📡 [AI-COMMAND-EXECUTOR] 处理终端数据:`, {
    connectionId,
    dataLength: data?.length
  })

  // 发送终端输出事件
  emitEvent(EventTypes.TERMINAL_OUTPUT, {
    connectionId,
    output: data,
    timestamp: Date.now()
  })
}

/**
 * 强制完成所有命令（连接断开时使用）
 */
export function completeAllAICommands(connectionId) {
  console.log(`🔄 [AI-COMMAND-EXECUTOR] 完成所有命令: ${connectionId}`)

  // 使用简化版命令执行器的完成方法
  const { completeAllCommands } = require('./simpleCommandExecutor.js')
  completeAllCommands(connectionId)
}

/**
 * 获取待执行命令数量
 */
export function getPendingAICommandsCount(connectionId) {
  const { getPendingCommandsCount } = require('./simpleCommandExecutor.js')
  return getPendingCommandsCount(connectionId)
}

/**
 * 获取命令历史
 */
export function getAICommandHistory(limit = 20) {
  const { getCommandHistory } = require('./simpleCommandExecutor.js')
  return getCommandHistory(limit)
}

/**
 * 清除所有待执行命令
 */
export function clearAllAICommands() {
  console.log(`🧹 [AI-COMMAND-EXECUTOR] 清除所有待执行命令`)

  const { default: simpleCommandExecutor } = require('./simpleCommandExecutor.js')
  simpleCommandExecutor.clearAllCommands()
}

// 导出默认实例（兼容性）
export default {
  executeCommand: executeAICommand,
  handleTerminalData: handleAITerminalData,
  completeAllCommands: completeAllAICommands,
  getPendingCommandsCount: getPendingAICommandsCount,
  getCommandHistory: getAICommandHistory,
  clearAllCommands: clearAllAICommands
}