/**
 * 简化版AI命令执行器
 * 使用简单的Promise和事件系统，移除复杂的消息队列依赖
 */

import {
  executeCommand,
  completeAllCommands,
  getPendingCommandsCount,
  getCommandHistory
} from '../../terminal/utils/simpleCommandExecutor.js';
import { emitEvent, EventTypes } from '@/utils/eventSystem.js';
import { useAIStore } from '../stores/ai.js';
import type { CommandOptions } from '@/types/ai.js';

/**
 * 执行命令并等待结果（对外接口）
 */
export async function executeAICommand(
  command: string,
  connectionId: string,
  options: CommandOptions = {}
): Promise<string> {
  console.log(`🚀 [AI-COMMAND-EXECUTOR] 执行AI命令:`, {
    command,
    connectionId,
    options
  });

  try {
    // 如果有toolCallId，则将其作为commandId传递给simpleCommandExecutor
    const commandOptions = options.toolCallId
      ? { ...options, commandId: options.toolCallId }
      : options;

    // 使用简化版命令执行器，确保使用AI API的toolCall ID
    const result = await executeCommand(command, connectionId, commandOptions);

    console.log(`✅ [AI-COMMAND-EXECUTOR] 命令执行完成:`, {
      command,
      connectionId,
      commandId: options.toolCallId || 'no-id',
      resultLength: result?.length || 0
    });

    return result;
  } catch (error) {
    console.error(`❌ [AI-COMMAND-EXECUTOR] 命令执行失败:`, {
      command,
      connectionId,
      error: error.message
    });

    // 发送错误事件
    emitEvent(EventTypes.AI_COMMAND_ERROR, {
      command,
      connectionId,
      error: error.message,
      timestamp: Date.now()
    });

    throw error;
  }
}

/**
 * 处理终端数据输出（兼容接口）
 */
export function handleAITerminalData(connectionId: string, data: string): void {
  console.log(`📡 [AI-COMMAND-EXECUTOR] 处理终端数据:`, {
    connectionId,
    dataLength: data?.length
  });

  // 发送终端输出事件
  emitEvent(EventTypes.TERMINAL_OUTPUT, {
    connectionId,
    output: data,
    timestamp: Date.now()
  });
}

/**
 * 强制完成所有命令（连接断开时使用）
 */
export function completeAllAICommands(connectionId: string): void {
  console.log(`🔄 [AI-COMMAND-EXECUTOR] 完成所有命令: ${connectionId}`);

  // 使用简化版命令执行器的完成方法
  completeAllCommands(connectionId);
}

/**
 * 获取待执行命令数量
 */
export function getPendingAICommandsCount(connectionId: string): number {
  return getPendingCommandsCount(connectionId);
}

/**
 * 获取命令历史
 */
export function getAICommandHistory(limit: number = 20): unknown[] {
  return getCommandHistory(limit);
}

/**
 * 清除所有待执行命令
 */
export function clearAllAICommands(): void {
  console.log(`🧹 [AI-COMMAND-EXECUTOR] 清除所有待执行命令`);

  // 这里需要导入 clearAllCommands 函数，但原文件可能没有导出
  // 暂时保留这个函数的接口，需要检查 simpleCommandExecutor 的实际导出
  console.warn('clearAllCommands function not available from simpleCommandExecutor');
}

// 导出默认实例（兼容性）
export default {
  executeCommand: executeAICommand,
  handleTerminalData: handleAITerminalData,
  completeAllCommands: completeAllAICommands,
  getPendingCommandsCount: getPendingAICommandsCount,
  getCommandHistory: getAICommandHistory,
  clearAllCommands: clearAllAICommands
};
