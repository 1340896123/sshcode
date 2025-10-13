import { ref, nextTick, onUnmounted } from 'vue'
import { callAIAPI } from '@/utils/aiService'

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

  // 发送消息
  const sendMessage = async () => {
    const message = userInput.value.trim()
    if (!message || isProcessing.value) return

    console.log("添加消息:", message)

    // 生成消息ID并检查是否重复
    const currentMessageId = `${message}-${Date.now()}`
    if (lastMessageId.value === currentMessageId) {
      console.warn('检测到重复消息，忽略发送')
      return
    }
    lastMessageId.value = currentMessageId

    // 添加用户消息
    addMessage('user', message)

    // 清空输入框并设置处理状态
    userInput.value = ''
    isProcessing.value = true

    try {
      // 过滤掉系统消息，只发送用户和AI消息给API
      const filteredMessages = messages.value.filter(msg => msg.role !== 'system')
      
      // 调用AI API
      const response = await callAIAPI(message, filteredMessages, props.connection)
      addMessage('assistant', response.content, response.actions)

    } catch (error) {
      console.error('AI API调用失败:', error)

      // 检查是否是配置未设置的错误
      if (error.message === 'AI_CONFIG_NOT_SET') {
        addMessage('assistant', '⚠️ **AI服务未配置**\n\n请先设置AI服务配置才能使用AI助手功能。\n\n点击右上角设置按钮进行配置。')
        emit('show-notification', '请先配置AI服务设置', 'error')
        // 触发设置面板显示
        emit('show-settings')
      } else {
        // 其他错误处理，不再使用本地响应
        addMessage('assistant', `❌ **AI服务错误**\n\n${error.message}\n\n请检查网络连接和AI服务配置，或稍后重试。`)
        emit('show-notification', 'AI服务调用失败', 'error')
      }
    } finally {
      isProcessing.value = false
      lastMessageId.value = null // 重置消息ID
    }
  }

  // 添加消息
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
  }

  // 执行操作
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

  // 清空聊天
  const clearChat = () => {
    messages.value = []
    toolCallHistory.value = []
    activeToolCall.value = null
    pendingToolCalls.value.clear()
    emit('show-notification', '对话已清空', 'success')
  }

  // 获取工具调用统计
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

  // 重试工具调用
  const retryToolCall = (toolCallId) => {
    const toolCall = toolCallHistory.value.find(tc => tc.id === toolCallId)
    if (toolCall && toolCall.command) {
      emit('execute-command', toolCall.command)
      addMessage('assistant', `🔄 重试执行命令: \`${toolCall.command}\``)
    }
  }

  // 清理工具调用历史
  const clearToolCallHistory = () => {
    toolCallHistory.value = []
    emit('show-notification', '工具调用历史已清空', 'success')
  }

  // 添加外部文本输入
  const addUserInput = (text) => {
    if (text && text.trim()) {
      userInput.value = text.trim()
      nextTick(() => {
        // 聚焦输入框由父组件处理
      })
    }
  }

  // 添加系统消息（工具调用提示）
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
  }

  // 处理工具调用开始事件
  const handleToolCallStart = (event) => {
    const { command, toolCallId } = event.detail
    console.log(`🔧 [AI-CHAT] 工具调用开始:`, { command, toolCallId, timestamp: new Date().toISOString() })

    const toolCall = {
      id: toolCallId,
      command,
      startTime: Date.now(),
      status: 'executing',
      type: 'tool-start'
    }

    // 设置当前活跃的工具调用
    activeToolCall.value = toolCall

    // 添加工具调用开始提示
    addSystemMessage(
      `🤖 AI想要执行命令: \`${command}\``,
      'tool-start',
      { command, toolCallId, status: 'executing' }
    )

    // 存储待处理的工具调用
    pendingToolCalls.value.set(toolCallId, toolCall)

    console.log(`📊 [AI-CHAT] 当前待处理工具调用:`, pendingToolCalls.value.size)
  }

  // 处理工具调用完成事件
  const handleToolCallComplete = (event) => {
    const { command, result, toolCallId } = event.detail
    console.log(`✅ [AI-CHAT] 工具调用完成:`, { command, toolCallId, resultLength: result.length, timestamp: new Date().toISOString() })

    const toolCall = pendingToolCalls.value.get(toolCallId)
    if (toolCall) {
      const executionTime = Date.now() - toolCall.startTime
      console.log(`📊 [AI-CHAT] 工具调用统计:`, {
        toolCallId,
        executionTime: `${executionTime}ms`,
        resultLength: result.length
      })

      // 更新工具调用状态
      toolCall.status = 'completed'
      toolCall.result = result
      toolCall.executionTime = executionTime
      toolCall.endTime = Date.now()
      toolCall.type = 'tool-result'

      // 添加到历史记录
      toolCallHistory.value.push({ ...toolCall })

      // 清除当前活跃的工具调用
      if (activeToolCall.value?.id === toolCallId) {
        console.log(`🔄 [AI-CHAT] 清除活跃工具调用:`, toolCallId)
        activeToolCall.value = null
      }

      // 更新或添加工具调用结果消息
      addSystemMessage(
        `✅ 命令执行完成: \`${command}\``,
        'tool-result',
        {
          command,
          result,
          toolCallId,
          status: 'completed',
          executionTime
        }
      )

      pendingToolCalls.value.delete(toolCallId)
      console.log(`📊 [AI-CHAT] 剩余待处理工具调用:`, pendingToolCalls.value.size)
    } else {
      console.warn(`⚠️ [AI-CHAT] 收到未知的工具调用完成事件:`, { toolCallId, command })
    }
  }

  // 处理工具调用错误事件
  const handleToolCallError = (event) => {
    const { command, error, toolCallId } = event.detail
    console.log(`❌ [AI-CHAT] 工具调用失败:`, command, error)

    const toolCall = pendingToolCalls.value.get(toolCallId)
    if (toolCall) {
      const executionTime = Date.now() - toolCall.startTime

      // 更新工具调用状态
      toolCall.status = 'error'
      toolCall.error = error
      toolCall.executionTime = executionTime
      toolCall.endTime = Date.now()
      toolCall.type = 'tool-result'

      // 添加到历史记录
      toolCallHistory.value.push({ ...toolCall })

      // 清除当前活跃的工具调用
      if (activeToolCall.value?.id === toolCallId) {
        activeToolCall.value = null
      }

      // 添加工具调用错误消息
      addSystemMessage(
        `❌ 命令执行失败: \`${command}\``,
        'tool-result',
        {
          command,
          error,
          toolCallId,
          status: 'error',
          executionTime
        }
      )

      pendingToolCalls.value.delete(toolCallId)
    }
  }

  // 设置事件监听器
  const setupEventListeners = () => {
    window.addEventListener('ai-tool-call-start', handleToolCallStart)
    window.addEventListener('ai-tool-call-complete', handleToolCallComplete)
    window.addEventListener('ai-tool-call-error', handleToolCallError)
  }

  // 清理事件监听器
  const cleanupEventListeners = () => {
    window.removeEventListener('ai-tool-call-start', handleToolCallStart)
    window.removeEventListener('ai-tool-call-complete', handleToolCallComplete)
    window.removeEventListener('ai-tool-call-error', handleToolCallError)
  }

  // 生命周期钩子
  onUnmounted(() => {
    cleanupEventListeners()
  })

  // 初始化事件监听器
  setupEventListeners()

  return {
    // 状态
    messages,
    userInput,
    isProcessing,
    isConnected,
    pendingToolCalls,
    toolCallHistory,
    activeToolCall,

    // 方法
    sendMessage,
    executeAction,
    clearChat,
    addUserInput,
    addSystemMessage,
    getToolCallStats,
    retryToolCall,
    clearToolCallHistory
  }
}
