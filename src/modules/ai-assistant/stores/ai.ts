/**
 * AI状态管理Store
 * 使用Pinia管理AI助手状态，替代window事件通信
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ToolCallStatus,
  ConfigStatus,
  TerminalInput,
  ToolCallStats,
  RetryInfo
} from '@/types/ai.js';

// Re-export ToolCallStatus as ToolCall for compatibility
export type ToolCall = ToolCallStatus;

export const useAIStore = defineStore('ai', () => {
  // 状态
  const toolCalls = ref(new Map<string, ToolCall>()); // 工具调用状态
  const activeToolCall = ref<ToolCall | null>(null); // 当前活跃工具调用
  const toolCallHistory = ref<ToolCall[]>([]); // 工具调用历史
  const configStatus = ref<ConfigStatus>({
    isConfigured: false,
    message: ''
  }); // 配置状态
  const terminalInput = ref<TerminalInput>({
    text: '',
    connectionId: null,
    isVisible: false
  }); // 终端输入状态

  // 计算属性
  const hasActiveToolCall = computed(() => activeToolCall.value !== null);
  const getToolCallById = computed(() => {
    return (id: string) => toolCalls.value.get(id);
  });
  const getToolCallsByConnectionId = computed(() => {
    return (connectionId: string) =>
      Array.from(toolCalls.value.values()).filter(tc => tc.connectionId === connectionId);
  });

  // 工具调用相关方法
  const startToolCall = (toolCallData: {
    id: string;
    command: string;
    connectionId: string;
    timestamp?: number;
  }) => {
    const { id, command, connectionId, timestamp = Date.now() } = toolCallData;

    const toolCall = {
      id,
      command,
      connectionId,
      status: 'executing',
      startTime: timestamp,
      result: null,
      error: null,
      executionTime: 0
    };

    toolCalls.value.set(id, toolCall);
    activeToolCall.value = toolCall;
    toolCallHistory.value.push(toolCall);
  };

  const completeToolCall = toolCallData => {
    const { id, result, executionTime } = toolCallData;
    const toolCall = toolCalls.value.get(id);

    if (toolCall) {
      toolCall.status = 'completed';
      toolCall.result = result;
      toolCall.endTime = Date.now();
      toolCall.executionTime = executionTime || toolCall.endTime - toolCall.startTime;

      if (activeToolCall.value?.id === id) {
        activeToolCall.value = null;
      }
    }
  };

  const errorToolCall = toolCallData => {
    const { id, error, executionTime } = toolCallData;
    const toolCall = toolCalls.value.get(id);

    if (toolCall) {
      toolCall.status = 'error';
      toolCall.error = error;
      toolCall.endTime = Date.now();
      toolCall.executionTime = executionTime || toolCall.endTime - toolCall.startTime;

      if (activeToolCall.value?.id === id) {
        activeToolCall.value = null;
      }
    }
  };

  const timeoutToolCall = toolCallData => {
    const { id, executionTime, timeoutDuration } = toolCallData;
    const toolCall = toolCalls.value.get(id);

    if (toolCall) {
      toolCall.status = 'timeout';
      toolCall.error = `命令执行超时 (${timeoutDuration}ms)`;
      toolCall.endTime = Date.now();
      toolCall.executionTime = executionTime;

      if (activeToolCall.value?.id === id) {
        activeToolCall.value = null;
      }
    }
  };

  const removeToolCall = id => {
    toolCalls.value.delete(id);
    if (activeToolCall.value?.id === id) {
      activeToolCall.value = null;
    }
  };

  const clearToolCalls = () => {
    toolCalls.value.clear();
    activeToolCall.value = null;
  };

  const clearToolCallHistory = () => {
    toolCallHistory.value = [];
  };

  // 配置相关方法
  const setConfigRequired = (message = '请先配置AI服务设置才能使用AI助手功能') => {
    configStatus.value = {
      isConfigured: false,
      message
    };
  };

  const setConfigured = () => {
    configStatus.value = {
      isConfigured: true,
      message: ''
    };
  };

  // 终端输入相关方法
  const setTerminalInput = (text, connectionId = null) => {
    terminalInput.value = {
      text,
      connectionId,
      isVisible: true
    };
  };

  const showTerminalInput = () => {
    terminalInput.value.isVisible = true;
  };

  const hideTerminalInput = () => {
    terminalInput.value.isVisible = false;
  };

  const clearTerminalInput = () => {
    terminalInput.value = {
      text: '',
      connectionId: null,
      isVisible: false
    };
  };

  // 工具调用统计
  const getToolCallStats = computed(() => {
    const total = toolCallHistory.value.length;
    const successful = toolCallHistory.value.filter(tc => tc.status === 'completed').length;
    const failed = toolCallHistory.value.filter(
      tc => tc.status === 'error' || tc.status === 'timeout'
    ).length;
    const avgExecutionTime =
      total > 0
        ? toolCallHistory.value.reduce((sum, tc) => sum + (tc.executionTime || 0), 0) / total
        : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime)
    };
  });

  // 重试工具调用
  const retryToolCall = id => {
    const toolCall = toolCalls.value.get(id) || toolCallHistory.value.find(tc => tc.id === id);
    if (toolCall && toolCall.command) {
      // 这里返回重试信息，让组件处理实际的重试逻辑
      return {
        command: toolCall.command,
        connectionId: toolCall.connectionId
      };
    }
    return null;
  };

  // 获取实时的工具调用输出
  const getRealtimeOutput = id => {
    const toolCall = toolCalls.value.get(id);
    if (toolCall && toolCall.status === 'executing') {
      return toolCall.realtimeOutput || '';
    }
    return '';
  };

  // 更新实时输出
  const updateRealtimeOutput = (id, output) => {
    const toolCall = toolCalls.value.get(id);
    if (toolCall) {
      toolCall.realtimeOutput = output;
    }
  };

  return {
    // 状态
    toolCalls,
    activeToolCall,
    toolCallHistory,
    configStatus,
    terminalInput,

    // 计算属性
    hasActiveToolCall,
    getToolCallById,
    getToolCallsByConnectionId,
    getToolCallStats,

    // 工具调用方法
    startToolCall,
    completeToolCall,
    errorToolCall,
    timeoutToolCall,
    removeToolCall,
    clearToolCalls,
    clearToolCallHistory,
    retryToolCall,
    getRealtimeOutput,
    updateRealtimeOutput,

    // 配置方法
    setConfigRequired,
    setConfigured,

    // 终端输入方法
    setTerminalInput,
    showTerminalInput,
    hideTerminalInput,
    clearTerminalInput
  };
});
