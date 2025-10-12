import { ref, nextTick } from 'vue'
import { callAIAPI } from '@/utils/aiService'

export function useAIChat(props, emit) {
  // 状态管理
  const messages = ref([])
  const userInput = ref('')
  const isProcessing = ref(false)
  const isConnected = ref(true)
  const messageIdCounter = ref(0)
  const lastMessageId = ref(null) // 防止重复发送

  // 发送消息
  const sendMessage = async () => {
    const message = userInput.value.trim()
    if (!message || isProcessing.value) return

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
      // 调用AI API
      const response = await callAIAPI(message, messages.value, props.connection)
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
    // 防止添加系统消息到历史记录中
    if (role === 'system') {
      console.warn('系统消息不应该添加到历史记录中')
      return
    }
    
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
    emit('show-notification', '对话已清空', 'success')
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

  return {
    // 状态
    messages,
    userInput,
    isProcessing,
    isConnected,
    
    // 方法
    sendMessage,
    executeAction,
    clearChat,
    addUserInput
  }
}
