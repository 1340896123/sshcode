import { ref, nextTick, onUnmounted } from 'vue'
import { callAIAPI } from '@/utils/aiService'
import { onEvent, offEvent, EventTypes } from '@/utils/eventSystem.js'
import { useAIStore } from '../stores/ai.js'

export function useAIChat(props, emit) {
  // 状态管理
  const messages = ref([])
  const userInput = ref('')
  const isProcessing = ref(false)
  const isConnected = ref(true)
  const messageIdCounter = ref(0)
  const lastMessageId = ref(null) // 防止重复发送
  const pendingToolCalls = ref(new Map()) // 存储待处理的工具调用
  const toolCallHistory = ref([]) // 工具调用历史记录
  const activeToolCall = ref(null) // 当前活跃的工具调用
  const realtimeOutputs = ref(new Map()) // 存储实时输出数据

  // AI store引用
  const aiStore = useAIStore()

  // 事件监听器清理函数存储
  const eventCleanupFunctions = []

  // 组件ID（用于事件系统）
  const componentId = `AIChat-${props.connectionId || 'default'}`

  /**
   * 初始化事件监听器
   */
  const initializeEventListeners = () => {
    console.log(`🔧 [AI-CHAT] 初始化事件监听器: ${componentId}`)

    // 监听AI响应
    const cleanupAIResponse = onEvent(EventTypes.AI_RESPONSE, (data) => {
      handleAIResponse(data)
    }, componentId)
    eventCleanupFunctions.push(cleanupAIResponse)

    // 监听命令执行事件
    const cleanupCommandStart = onEvent(EventTypes.AI_COMMAND_START, (data) => {
      handleCommandStart(data)
    }, componentId)
    eventCleanupFunctions.push(cleanupCommandStart)

    const cleanupCommandComplete = onEvent(EventTypes.AI_COMMAND_COMPLETE, (data) => {
      handleCommandComplete(data)
    }, componentId)
    eventCleanupFunctions.push(cleanupCommandComplete)

    const cleanupCommandError = onEvent(EventTypes.AI_COMMAND_ERROR, (data) => {
      handleCommandError(data)
    }, componentId)
    eventCleanupFunctions.push(cleanupCommandError)

    // 监听配置需求事件
    const cleanupConfigRequired = onEvent(EventTypes.AI_CONFIG_REQUIRED, (data) => {
      handleConfigRequired(data)
    }, componentId)
    eventCleanupFunctions.push(cleanupConfigRequired)

    // 监听终端输出（用于实时更新）
    const cleanupTerminalOutput = onEvent(EventTypes.TERMINAL_OUTPUT, (data) => {
      handleTerminalOutput(data)
    }, componentId)
    eventCleanupFunctions.push(cleanupTerminalOutput)

    console.log(`✅ [AI-CHAT] 事件监听器已初始化: ${eventCleanupFunctions.length}个监听器`)
  }

  /**
   * 发送消息
   */
  const sendMessage = async () => {
    const message = userInput.value.trim()
    if (!message || isProcessing.value) return

    console.log(`📤 [AI-CHAT] 发送消息: ${message}`)

    // 生成消息ID并检查是否重复
    const currentMessageId = `${message}-${Date.now()}`
    if (lastMessageId.value === currentMessageId) {
      console.warn('检测到重复消息，忽略发送')
      return
    }
    lastMessageId.value = currentMessageId

    // 添加用户消息到UI
    addMessage('user', message)

    // 清空输入框并设置处理状态
    userInput.value = ''
    isProcessing.value = true

    try {
      // 直接调用AI API，不再通过消息队列
      const response = await callAIAPI(message, messages.value.filter(msg => msg.role !== 'system'), props.connection)

      // 处理AI响应
      if (response.content) {
        addMessage('assistant', response.content, response.actions)
      }

      console.log(`✅ [AI-CHAT] AI响应处理完成`)

    } catch (error) {
      console.error('AI消息发送失败:', error)

      // 检查是否是配置未设置的错误
      if (error.message === 'AI_CONFIG_NOT_SET') {
        addMessage('assistant', '⚠️ **AI服务未配置**\n\n请先设置AI服务配置才能使用AI助手功能。\n\n点击右上角设置按钮进行配置。')
        emit('show-notification', '请先配置AI服务设置', 'error')
        emit('show-settings')
      } else {
        addMessage('assistant', `❌ **AI服务错误**\n\n${error.message}\n\n请检查网络连接和AI服务配置，或稍后重试。`)
        emit('show-notification', 'AI服务调用失败', 'error')
      }
    } finally {
      isProcessing.value = false
      lastMessageId.value = null
    }
  }

  /**
   * 添加消息
   */
  const addMessage = (role, content, actions = null) => {
    // 检查消息内容是否为空或只包含空白字符
    if (!content || !content.trim()) {
      console.warn('跳过空消息')
      return
    }

    // 检查是否重复添加相同的消息
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage &&
      lastMessage.role === role &&
      lastMessage.content === content &&
      Math.abs(new Date(lastMessage.timestamp).getTime() - Date.now()) < 1000) {
      console.warn('检测到重复消息，跳过添加')
      return
    }

    const message = {
      id: ++messageIdCounter.value,
      role,
      content: content.trim(), // 确保内容没有前后空白
      timestamp: new Date(),
      actions
    }
    messages.value.push(message)

    console.log(`💬 [AI-CHAT] 添加消息: ${role} - ${content.substring(0, 50)}...`)
  }

  /**
   * 添加系统消息（工具调用提示）
   */
  const addSystemMessage = (content, type = 'info', metadata = null) => {
    const message = {
      id: ++messageIdCounter.value,
      role: 'system',
      content: content.trim(),
      timestamp: new Date(),
      type,
      metadata,
      isCollapsible: type === 'tool-result',
      // 工具调用结果默认为折叠状态
      defaultCollapsed: type === 'tool-result'
    }
    messages.value.push(message)

    console.log(`📋 [AI-CHAT] 添加系统消息: ${type} - ${content.substring(0, 50)}...`)
  }

  /**
   * 执行操作
   */
  const executeAction = (action) => {
    if (action.type === 'command' && action.command) {
      emit('execute-command', action.command)
      addMessage('assistant', `正在执行命令: \`${action.command}\``)

    } else if (action.type === 'prompt' && action.prompt) {
      userInput.value = action.prompt
      nextTick(() => {
        // 聚焦输入框由父组件处理
      })
    }
  }

  /**
   * 清空聊天
   */
  const clearChat = () => {
    messages.value = []
    toolCallHistory.value = []
    activeToolCall.value = null
    pendingToolCalls.value.clear()
    realtimeOutputs.value.clear()

    // 清理AI store中的工具调用历史
    if (aiStore) {
      aiStore.clearToolCalls()
    }

    emit('show-notification', '对话已清空', 'success')
    console.log('🧹 [AI-CHAT] 聊天已清空')
  }

  /**
   * 获取工具调用统计
   */
  const getToolCallStats = () => {
    const total = toolCallHistory.value.length
    const successful = toolCallHistory.value.filter(tc => tc.status === 'completed').length
    const failed = toolCallHistory.value.filter(tc => tc.status === 'error').length
    const avgExecutionTime = total > 0
      ? toolCallHistory.value.reduce((sum, tc) => sum + (tc.executionTime || 0), 0) / total
      : 0

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime)
    }
  }

  /**
   * 重试工具调用
   */
  const retryToolCall = (toolCallId) => {
    const toolCall = toolCallHistory.value.find(tc => tc.id === toolCallId)
    if (toolCall && toolCall.command) {
      emit('execute-command', toolCall.command)
      addMessage('assistant', `🔄 重试执行命令: \`${toolCall.command}\``)
    }
  }

  /**
   * 清理工具调用历史
   */
  const clearToolCallHistory = () => {
    toolCallHistory.value = []
    emit('show-notification', '工具调用历史已清空', 'success')
  }

  /**
   * 添加外部文本输入
   */
  const addUserInput = (text) => {
    if (text && text.trim()) {
      userInput.value = text.trim()
      nextTick(() => {
        // 聚焦输入框由父组件处理
      })
    }
  }

  /**
   * 获取实时输出
   */
  const getRealtimeOutput = (toolCallId) => {
    return realtimeOutputs.value.get(toolCallId) || ''
  }

  /**
   * 清理实时输出
   */
  const clearRealtimeOutput = (toolCallId) => {
    realtimeOutputs.value.delete(toolCallId)
  }

  /**
   * 事件处理器
   */
  const handleAIResponse = (data) => {
    console.log(`🤖 [AI-CHAT] 处理AI响应:`, data)
    // AI响应现在直接在sendMessage中处理，这里可以处理其他情况
  }

  const handleCommandStart = (data) => {
    console.log(`🚀 [AI-CHAT] 命令开始:`, data)

    const toolCall = {
      id: data.commandId,
      command: data.command,
      status: 'executing',
      startTime: Date.now(),
      connectionId: data.connectionId
    }

    toolCallHistory.value.push(toolCall)
    activeToolCall.value = toolCall

    // 检查是否已经存在相同的工具开始消息，避免重复
    const existingToolStartMessage = messages.value.find(msg =>
      msg.type === 'tool-start' &&
      msg.metadata?.toolCallId === data.commandId
    )

    if (existingToolStartMessage) {
      console.log(`⚠️ [AI-CHAT] 发现重复的工具开始消息，跳过添加: toolCallId=${data.commandId}`)
      return
    }

    // 添加工具调用开始消息
    console.log(`📋 [AI-CHAT] 添加工具开始消息: toolCallId=${data.commandId}, command=${data.command}`)
    addSystemMessage(
      `🔧 **正在执行命令:** \`${data.command}\``,
      'tool-start',
      {
        toolCallId: data.commandId,
        command: data.command,
        connectionId: data.connectionId
      }
    )
  }

  const handleCommandComplete = (data) => {
    console.log(`✅ [AI-CHAT] 命令完成:`, data)

    const executionTime = data.executionTime || 0

    // 更新工具调用历史
    const toolCall = toolCallHistory.value.find(tc => tc.id === data.commandId)
    if (toolCall) {
      toolCall.status = 'completed'
      toolCall.endTime = Date.now()
      toolCall.executionTime = executionTime
      toolCall.result = data.result
    }

    // 更新活跃工具调用
    if (activeToolCall.value?.id === data.commandId) {
      activeToolCall.value = null
    }

    // 清理实时输出
    clearRealtimeOutput(data.commandId)

    // 检查是否已经存在相同的工具开始消息
    const existingToolStartMessage = messages.value.find(msg =>
      msg.type === 'tool-start' &&
      msg.metadata?.toolCallId === data.commandId
    )

    if (existingToolStartMessage) {
      // 更新现有的工具开始消息为完成状态
      console.log(`📋 [AI-CHAT] 更新工具消息状态为完成: toolCallId=${data.commandId}, command=${data.command}`)
      existingToolStartMessage.type = 'tool-complete'
      existingToolStartMessage.content = ''  // 清空内容，让CommandExecution组件处理显示
      existingToolStartMessage.metadata = {
        toolCallId: data.commandId,
        command: data.command,
        result: data.result,
        executionTime
      }
      return
    }

    // 如果没有找到工具开始消息，则创建一个新的工具完成消息
    console.log(`📋 [AI-CHAT] 创建新的工具完成消息: toolCallId=${data.commandId}, command=${data.command}`)
    addSystemMessage(
      '',  // 空内容，让CommandExecution组件处理显示
      'tool-complete',
      {
        toolCallId: data.commandId,
        command: data.command,
        result: data.result,
        executionTime
      }
    )
  }

  const handleCommandError = (data) => {
    console.error(`❌ [AI-CHAT] 命令错误:`, data)

    // 更新工具调用历史
    const toolCall = toolCallHistory.value.find(tc => tc.id === data.commandId)
    if (toolCall) {
      toolCall.status = 'error'
      toolCall.endTime = Date.now()
      toolCall.error = data.error
    }

    // 更新活跃工具调用
    if (activeToolCall.value?.id === data.commandId) {
      activeToolCall.value = null
    }

    // 清理实时输出
    clearRealtimeOutput(data.commandId)

    // 检查是否已经存在相同的工具开始消息
    const existingToolStartMessage = messages.value.find(msg =>
      msg.type === 'tool-start' &&
      msg.metadata?.toolCallId === data.commandId
    )

    if (existingToolStartMessage) {
      // 更新现有的工具开始消息为错误状态
      console.log(`📋 [AI-CHAT] 更新工具消息状态为错误: toolCallId=${data.commandId}, command=${data.command}`)
      existingToolStartMessage.type = 'tool-error'
      existingToolStartMessage.content = ''  // 清空内容，让CommandExecution组件处理显示
      existingToolStartMessage.metadata = {
        toolCallId: data.commandId,
        command: data.command,
        error: data.error
      }
      return
    }

    // 如果没有找到工具开始消息，则创建一个新的工具错误消息
    console.log(`📋 [AI-CHAT] 创建新的工具错误消息: toolCallId=${data.commandId}, command=${data.command}`)
    addSystemMessage(
      '',  // 空内容，让CommandExecution组件处理显示
      'tool-error',
      {
        toolCallId: data.commandId,
        command: data.command,
        error: data.error
      }
    )
  }

  const handleConfigRequired = (data) => {
    console.log(`⚙️ [AI-CHAT] 配置需求:`, data)
    emit('show-settings')
    emit('show-notification', data.message || '请先配置AI服务设置', 'error')
  }

  const handleTerminalOutput = (data) => {
    // 这个处理逻辑已经移到了simpleCommandExecutor中
    // 这里可以处理UI相关的实时输出更新
    if (data.commandId) {
      const output = realtimeOutputs.value.get(data.commandId) || ''
      realtimeOutputs.value.set(data.commandId, output + data.output)
    }
  }

  /**
   * 清理事件监听器
   */
  const cleanupEventListeners = () => {
    console.log(`🧹 [AI-CHAT] 清理事件监听器: ${componentId}`)

    eventCleanupFunctions.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        console.warn('清理事件监听器时出错:', error)
      }
    })

    eventCleanupFunctions.length = 0
    console.log('✅ [AI-CHAT] 事件监听器已清理')
  }

  // 生命周期钩子
  onUnmounted(() => {
    cleanupEventListeners()
  })

  // 初始化事件监听器
  if (props.connection) {
    initializeEventListeners()
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
    addSystemMessage,
    getToolCallStats,
    retryToolCall,
    clearToolCallHistory,
    getRealtimeOutput,
    clearRealtimeOutput,
    initializeEventListeners,
    cleanupEventListeners
  }
}