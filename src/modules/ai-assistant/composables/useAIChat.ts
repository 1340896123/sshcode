import { ref, nextTick, onUnmounted, type Ref, type SetupContext } from 'vue';
import { callAIAPI } from '../utils/aiService';
import type {
  ParsedResponse,
  Connection,
  UseAIChatProps,
  Message,
  Action,
  ToolCallHistoryItem,
  AIChatEmits,
  ToolCallStatus,
  ToolCallStats
} from '@/types/index';
import type {
  AIResponseEventData,
  CommandStartEventData,
  CommandCompleteEventData,
  CommandErrorEventData,
  ConfigRequiredEventData,
  TerminalOutputEventData
} from '@/types/events';
import { onEvent, offEvent, EventTypes } from '@/utils/eventSystem';
import { useAIStore } from '../stores/ai';

export function useAIChat(props: UseAIChatProps, emit: AIChatEmits) {
  // 状态管理
  const messages: Ref<Message[]> = ref([]);
  const userInput: Ref<string> = ref('');
  const isProcessing: Ref<boolean> = ref(false);
  const isConnected: Ref<boolean> = ref(true);
  const messageIdCounter: Ref<number> = ref(0);
  const lastMessageId: Ref<string | null> = ref(null); // 防止重复发送

  /**
   * 生成唯一消息ID
   */
  const generateMessageId = (): string => {
    // 使用时间戳 + 随机数确保唯一性，格式: msg-timestamp-random
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  const pendingToolCalls: Ref<Map<string, ToolCallHistoryItem>> = ref(new Map()); // 存储待处理的工具调用
  const toolCallHistory: Ref<ToolCallHistoryItem[]> = ref([]); // 工具调用历史记录
  const activeToolCall: Ref<ToolCallHistoryItem | null> = ref(null); // 当前活跃的工具调用
  const realtimeOutputs: Ref<Map<string, string>> = ref(new Map()); // 存储实时输出数据

  // AI store引用
  const aiStore = useAIStore();

  // 事件监听器清理函数存储
  const eventCleanupFunctions: (() => void)[] = [];

  // 组件ID（用于事件系统）
  const componentId = `AIChat-${props.connectionId || 'default'}`;

  /**
   * 初始化事件监听器
   */
  const initializeEventListeners = (): void => {
    // 监听AI响应
    const cleanupAIResponse = onEvent(
      EventTypes.AI_RESPONSE,
      (data: AIResponseEventData) => {
        handleAIResponse(data);
      },
      componentId
    );
    eventCleanupFunctions.push(cleanupAIResponse);

    // 监听命令执行事件
    const cleanupCommandStart = onEvent(
      EventTypes.AI_COMMAND_START,
      (data: CommandStartEventData) => {
        handleCommandStart(data);
      },
      componentId
    );
    eventCleanupFunctions.push(cleanupCommandStart);

    const cleanupCommandComplete = onEvent(
      EventTypes.AI_COMMAND_COMPLETE,
      (data: CommandCompleteEventData) => {
        handleCommandComplete(data);
      },
      componentId
    );
    eventCleanupFunctions.push(cleanupCommandComplete);

    const cleanupCommandError = onEvent(
      EventTypes.AI_COMMAND_ERROR,
      (data: CommandErrorEventData) => {
        handleCommandError(data);
      },
      componentId
    );
    eventCleanupFunctions.push(cleanupCommandError);

    // 监听配置需求事件
    const cleanupConfigRequired = onEvent(
      EventTypes.AI_CONFIG_REQUIRED,
      (data: ConfigRequiredEventData) => {
        handleConfigRequired(data);
      },
      componentId
    );
    eventCleanupFunctions.push(cleanupConfigRequired);

    // 监听终端输出（用于实时更新）
    const cleanupTerminalOutput = onEvent(
      EventTypes.TERMINAL_OUTPUT,
      (data: TerminalOutputEventData) => {
        handleTerminalOutput(data);
      },
      componentId
    );
    eventCleanupFunctions.push(cleanupTerminalOutput);
  };

  /**
   * 发送消息
   */
  const sendMessage = async (): Promise<void> => {
    const message = userInput.value.trim();
    if (!message || isProcessing.value) return;

    // 生成消息ID并检查是否重复
    const currentMessageId = `${message}-${Date.now()}`;
    if (lastMessageId.value === currentMessageId) {
      console.warn('检测到重复消息，忽略发送');
      return;
    }
    lastMessageId.value = currentMessageId;

    // 添加用户消息到UI
    addMessage('user', message);

    // 清空输入框并设置处理状态
    userInput.value = '';
    isProcessing.value = true;

    try {
      // 直接调用AI API，不再通过消息队列
      // Convert Message[] to AIMessage[] format
      const convertedMessages = messages.value
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.getTime()
        }));

      const response = await callAIAPI(
        message,
        convertedMessages,
        props.connection
      );

      // 处理AI响应
      if (response.content) {
        addMessage('assistant', response.content, response.actions);
      }
    } catch (error) {
      console.error('AI消息发送失败:', error);

      // 检查是否是配置未设置的错误
      if ((error as Error).message === 'AI_CONFIG_NOT_SET') {
        addMessage(
          'assistant',
          '⚠️ **AI服务未配置**\n\n请先设置AI服务配置才能使用AI助手功能。\n\n点击右上角设置按钮进行配置。'
        );
        emit('show-notification', '请先配置AI服务设置', 'error');
        emit('show-settings');
      } else {
        addMessage(
          'assistant',
          `❌ **AI服务错误**\n\n${(error as Error).message}\n\n请检查网络连接和AI服务配置，或稍后重试。`
        );
        emit('show-notification', 'AI服务调用失败', 'error');
      }
    } finally {
      isProcessing.value = false;
      lastMessageId.value = null;
    }
  };

  /**
   * 添加消息
   */
  const addMessage = (
    role: Message['role'],
    content: string,
    actions: ParsedResponse['actions'] = null
  ): void => {
    // 检查消息内容是否为空或只包含空白字符
    if (!content || !content.trim()) {
      console.warn('跳过空消息');
      return;
    }

    // 检查是否重复添加相同的消息
    const lastMessage = messages.value[messages.value.length - 1];
    if (
      lastMessage &&
      lastMessage.role === role &&
      lastMessage.content === content &&
      Math.abs(new Date(lastMessage.timestamp).getTime() - Date.now()) < 1000
    ) {
      console.warn('检测到重复消息，跳过添加');
      return;
    }

    const message: Message = {
      id: generateMessageId(),
      role,
      content: content.trim(), // 确保内容没有前后空白
      timestamp: new Date(),
      actions
    };
    messages.value.push(message);
  };

  /**
   * 添加系统消息（工具调用提示）
   */
  const addSystemMessage = (
    content: string,
    type: string = 'info',
    metadata: Record<string, unknown> = null
  ): void => {
    const message: Message = {
      id: generateMessageId(),
      role: 'system',
      content: content.trim(),
      timestamp: new Date(),
      type,
      metadata,
      isCollapsible: type === 'tool-result' || type === 'tool-start' || type === 'tool-complete' || type === 'tool-error',
      // 工具调用结果默认为折叠状态，但开始消息展开显示
      defaultCollapsed: type === 'tool-result' || type === 'tool-complete' || type === 'tool-error'
    };

    console.log(`📝 [AI-CHAT] 添加系统消息:`, {
      id: message.id,
      type: message.type,
      role: message.role,
      contentLength: message.content.length,
      metadata: message.metadata,
      isCollapsible: message.isCollapsible,
      defaultCollapsed: message.defaultCollapsed
    });
    messages.value.push(message);
  };

  /**
   * 执行操作
   */
  const executeAction = (action: Action): void => {
    if (action.type === 'command' && action.command) {
      emit('execute-command', action.command);
      addMessage('assistant', `正在执行命令: \`${action.command}\``);
    } else if (action.type === 'prompt' && action.prompt) {
      userInput.value = action.prompt;
      nextTick(() => {
        // 聚焦输入框由父组件处理
        emit('focus-input');
      });
    }
  };

  /**
   * 清空聊天
   */
  const clearChat = (): void => {
    messages.value = [];
    toolCallHistory.value = [];
    activeToolCall.value = null;
    pendingToolCalls.value.clear();
    realtimeOutputs.value.clear();

    // 清理AI store中的工具调用历史
    if (aiStore) {
      aiStore.clearToolCalls();
    }

    emit('show-notification', '对话已清空', 'success');
  };

  /**
   * 获取工具调用统计
   */
  const getToolCallStats = (): ToolCallStats => {
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
  };

  /**
   * 重试工具调用
   */
  const retryToolCall = (toolCallId: string): void => {
    const toolCall = toolCallHistory.value.find(tc => tc.id === toolCallId);
    if (toolCall && toolCall.command) {
      emit('execute-command', toolCall.command);
      addMessage('assistant', `🔄 重试执行命令: \`${toolCall.command}\``);
    }
  };

  /**
   * 清理工具调用历史
   */
  const clearToolCallHistory = (): void => {
    toolCallHistory.value = [];
    emit('show-notification', '工具调用历史已清空', 'success');
  };

  /**
   * 添加外部文本输入
   */
  const addUserInput = (text: string): void => {
    if (text && text.trim()) {
      userInput.value = text.trim();
      nextTick(() => {
        // 聚焦输入框由父组件处理
        emit('focus-input');
      });
    }
  };

  /**
   * 获取实时输出
   */
  const getRealtimeOutput = (toolCallId: string): string => {
    return realtimeOutputs.value.get(toolCallId) || '';
  };

  /**
   * 清理实时输出
   */
  const clearRealtimeOutput = (toolCallId: string): void => {
    realtimeOutputs.value.delete(toolCallId);
  };

  /**
   * 事件处理器
   */
  const handleAIResponse = (data: AIResponseEventData): void => {
    // AI响应现在直接在sendMessage中处理，这里可以处理其他情况
  };

  const handleCommandStart = (data: CommandStartEventData): void => {
    console.log(`🚀 [AI-CHAT] 收到命令开始事件:`, data);

    const toolCall: ToolCallHistoryItem = {
      id: data.commandId,
      type: 'function',
      function: {
        name: 'execute_command',
        arguments: JSON.stringify({ command: data.command })
      },
      command: data.command,
      status: 'executing',
      startTime: Date.now(),
      connectionId: data.connectionId,
      result: undefined,
      error: undefined,
      executionTime: 0
    };

    console.log(`🔍 [AI-CHAT] 即将添加到历史记录的工具调用:`, {
      id: toolCall.id,
      command: toolCall.command,
      status: toolCall.status,
      function: toolCall.function
    });

    toolCallHistory.value.push(toolCall);
    activeToolCall.value = toolCall;

    console.log(`📝 [AI-CHAT] 工具调用历史状态 (添加后):`, toolCallHistory.value.map(tc => ({
      id: tc.id,
      command: tc.command,
      status: tc.status
    })));

    // 检查是否已经存在相同的工具开始消息，避免重复
    const existingToolStartMessage = messages.value.find(
      msg => msg.type === 'tool-start' && msg.metadata?.toolCallId === data.commandId
    );

    if (existingToolStartMessage) {
      console.log(`⚠️ [AI-CHAT] 工具开始消息已存在，跳过添加: ${data.commandId}`);
      return;
    }

    console.log(`✅ [AI-CHAT] 添加工具开始消息: ${data.commandId}, command: ${data.command}`);

    // 添加工具调用开始消息 - 使用空的content，让CommandExecution组件处理显示
    addSystemMessage('', 'tool-start', {
      toolCallId: data.commandId,
      command: data.command,
      connectionId: data.connectionId
    });
  };

  const handleCommandComplete = (data: CommandCompleteEventData): void => {
    console.log(`✅ [AI-CHAT] 收到命令完成事件:`, {
      commandId: data.commandId,
      command: data.command,
      executionTime: data.executionTime,
      result: data.result?.substring(0, 50) + '...'
    });

    const executionTime = data.executionTime || 0;

    // 从工具调用历史中获取命令信息（如果data.command为undefined）
    const toolCall = toolCallHistory.value.find(tc => tc.id === data.commandId);
    const actualCommand = data.command || toolCall?.command;

    console.log(`🔧 [AI-CHAT] 实际命令: ${actualCommand}, 来自历史: ${toolCall?.command}`);
    console.log(`🔍 [AI-CHAT] ToolCallHistory状态:`, toolCallHistory.value.map(tc => ({
      id: tc.id,
      command: tc.command,
      status: tc.status,
      result: tc.result?.substring(0, 50) + '...'
    })));

    // 更新工具调用历史
    if (toolCall) {
      toolCall.status = 'completed';
      toolCall.endTime = Date.now();
      toolCall.executionTime = executionTime;
      toolCall.result = data.result;
    }

    // 更新活跃工具调用
    if (activeToolCall.value?.id === data.commandId) {
      activeToolCall.value = null;
    }

    // 清理实时输出
    clearRealtimeOutput(data.commandId);

    // 检查是否已经存在相同的工具开始消息
    const existingToolStartMessage = messages.value.find(
      msg => msg.type === 'tool-start' && msg.metadata?.toolCallId === data.commandId
    );

    if (existingToolStartMessage) {
      console.log(`🔄 [AI-CHAT] 更新工具开始消息为完成状态: ${data.commandId}`);
      // 更新现有的工具开始消息为完成状态
      existingToolStartMessage.type = 'tool-complete';
      existingToolStartMessage.content = ''; // 清空内容，让CommandExecution组件处理显示
      existingToolStartMessage.metadata = {
        toolCallId: data.commandId,
        command: actualCommand, // 使用实际命令
        result: data.result,
        executionTime
      };
      return;
    }

    console.log(`✅ [AI-CHAT] 创建新的工具完成消息: ${data.commandId}`);

    // 如果没有找到工具开始消息，则创建一个新的工具完成消息
    addSystemMessage(
      '', // 空内容，让CommandExecution组件处理显示
      'tool-complete',
      {
        toolCallId: data.commandId,
        command: actualCommand, // 使用实际命令
        result: data.result,
        executionTime
      }
    );
  };

  const handleCommandError = (data: CommandErrorEventData): void => {
    console.error(`❌ [AI-CHAT] 收到命令错误事件:`, {
      commandId: data.commandId,
      command: data.command,
      error: data.error
    });

    // 从工具调用历史中获取命令信息（如果data.command为undefined）
    const toolCall = toolCallHistory.value.find(tc => tc.id === data.commandId);
    const actualCommand = data.command || toolCall?.command;

    console.log(`🔧 [AI-CHAT] 错误处理 - 实际命令: ${actualCommand}, 来自历史: ${toolCall?.command}`);

    // 更新工具调用历史
    if (toolCall) {
      toolCall.status = 'error';
      toolCall.endTime = Date.now();
      toolCall.error = data.error;
    }

    // 更新活跃工具调用
    if (activeToolCall.value?.id === data.commandId) {
      activeToolCall.value = null;
    }

    // 清理实时输出
    clearRealtimeOutput(data.commandId);

    // 检查是否已经存在相同的工具开始消息
    const existingToolStartMessage = messages.value.find(
      msg => msg.type === 'tool-start' && msg.metadata?.toolCallId === data.commandId
    );

    if (existingToolStartMessage) {
      console.log(`🔄 [AI-CHAT] 更新工具开始消息为错误状态: ${data.commandId}`);
      // 更新现有的工具开始消息为错误状态
      existingToolStartMessage.type = 'tool-error';
      existingToolStartMessage.content = ''; // 清空内容，让CommandExecution组件处理显示
      existingToolStartMessage.metadata = {
        toolCallId: data.commandId,
        command: actualCommand, // 使用实际命令
        error: data.error
      };
      return;
    }

    console.log(`✅ [AI-CHAT] 创建新的工具错误消息: ${data.commandId}`);

    // 如果没有找到工具开始消息，则创建一个新的工具错误消息
    addSystemMessage(
      '', // 空内容，让CommandExecution组件处理显示
      'tool-error',
      {
        toolCallId: data.commandId,
        command: actualCommand, // 使用实际命令
        error: data.error
      }
    );
  };

  const handleConfigRequired = (data: ConfigRequiredEventData): void => {
    emit('show-settings');
    emit('show-notification', data.message || '请先配置AI服务设置', 'error');
  };

  const handleTerminalOutput = (data: TerminalOutputEventData): void => {
    // 这个处理逻辑已经移到了simpleCommandExecutor中
    // 这里可以处理UI相关的实时输出更新
    if (data.commandId) {
      const output = realtimeOutputs.value.get(data.commandId) || '';
      realtimeOutputs.value.set(data.commandId, output + data.output);
    }
  };

  /**
   * 清理事件监听器
   */
  const cleanupEventListeners = (): void => {
    eventCleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('清理事件监听器时出错:', error);
      }
    });

    eventCleanupFunctions.length = 0;
  };

  // 生命周期钩子
  onUnmounted(() => {
    cleanupEventListeners();
  });

  // 初始化事件监听器
  if (props.connection) {
    initializeEventListeners();
  }

  return {
    // 状态
    messages,
    userInput,
    isProcessing,
    isConnected,
    pendingToolCalls,
    toolCallHistory,
    activeToolCall,
    realtimeOutputs,

    // 方法
    sendMessage,
    executeAction,
    clearChat,
    addUserInput,
    addMessage,
    addSystemMessage,
    getToolCallStats,
    retryToolCall,
    clearToolCallHistory,
    getRealtimeOutput,
    clearRealtimeOutput,
    initializeEventListeners,
    cleanupEventListeners
  };
}

export default useAIChat;
