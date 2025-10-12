import { ref, nextTick } from 'vue'
import { callAIAPI } from '@/utils/aiService'

export function useAIChat(props, emit) {
  // 状态管理
  const messages = ref([])
  const userInput = ref('')
  const isProcessing = ref(false)
  const isConnected = ref(true)
  const messageIdCounter = ref(0)

  // 发送消息
  const sendMessage = async () => {
    const message = userInput.value.trim()
    if (!message || isProcessing.value) return

    // 添加用户消息
    addMessage('user', message)

    // 清空输入框
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
    }
  }

  // 添加消息
  const addMessage = (role, content, actions = null) => {
    const message = {
      id: ++messageIdCounter.value,
      role,
      content,
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
