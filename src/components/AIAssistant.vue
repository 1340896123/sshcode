<template>
  <div class="ai-assistant">
    <!-- AI助手界面 -->
    <div class="ai-interface">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="ai-info">
          <div class="ai-avatar">🤖</div>
          <div class="ai-details">
            <h3>AI助手</h3>
            <span class="ai-status" :class="{ connected: isConnected }">
              {{ isConnected ? '在线' : '离线' }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="clearChat" title="清空对话">
            🗑️
          </button>
          <button class="action-btn" @click="exportChat" title="导出对话">
            📥
          </button>
        </div>
      </div>

      <!-- 聊天消息区域 -->
      <div class="chat-messages" ref="messagesContainer">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="welcome-section">
          <div class="welcome-content">
            <h4>👋 您好！我是您的SSH远程管理助手</h4>
            <p>我已连接到 <strong>{{ connection.host }}</strong> ({{ connection.username }}@{{ connection.host }})</p>
            <p>我可以帮助您：</p>
            <ul class="capabilities-list">
              <li>🖥️ 实时系统监控和性能分析</li>
              <li>📁 远程文件管理和操作</li>
              <li>🔍 进程管理和服务状态检查</li>
              <li>📊 系统日志分析和故障排查</li>
              <li>🌐 网络配置和连接诊断</li>
              <li>⚡ 安全的命令执行和自动化</li>
            </ul>
            <p class="welcome-tip">💡 所有命令都通过真实的SSH连接执行，我会根据实际系统状态提供专业建议！</p>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="messages-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div class="message-avatar">
              <span v-if="message.role === 'user'">👤</span>
              <span v-else>🤖</span>
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(message.content)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              
              <!-- AI消息的操作按钮 -->
              <div v-if="message.role === 'assistant' && message.actions" class="message-actions">
                <button
                  v-for="action in message.actions"
                  :key="action.id"
                  class="action-button"
                  :class="action.type"
                  @click="executeAction(action)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 正在输入指示器 -->
        <div v-if="isProcessing" class="typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>AI正在思考...</span>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input">
        <div class="input-container">
          <textarea
            ref="messageInput"
            v-model="userInput"
            @keydown="handleKeyDown"
            @input="adjustTextareaHeight"
            placeholder="输入您的问题或命令..."
            class="message-textarea"
            rows="1"
            :disabled="isProcessing"
          ></textarea>
          <button
            class="send-button"
            @click="sendMessage"
            :disabled="!canSendMessage"
          >
            <span v-if="isProcessing">⏳</span>
            <span v-else>📤</span>
          </button>
        </div>
        
        <!-- 快捷操作 -->
        <div class="quick-actions">
          <button
            v-for="quickAction in quickActions"
            :key="quickAction.id"
            class="quick-btn"
            @click="insertQuickCommand(quickAction.command)"
            :title="quickAction.title"
          >
            {{ quickAction.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAIChat } from '@/composables/useAIChat'
import { useMessageFormatter } from '@/composables/useMessageFormatter'
import { useChatExport } from '@/composables/useChatExport'
import { QUICK_ACTIONS } from '@/constants/aiConstants'

export default {
  name: 'AIAssistant',
  props: {
    connectionId: {
      type: String,
      required: true
    },
    connection: {
      type: Object,
      required: true
    }
  },
  emits: ['show-notification', 'execute-command', 'show-settings'],
  setup(props, { emit }) {
    // 引用
    const messagesContainer = ref(null)
    const messageInput = ref(null)

    // 使用组合式函数
    const {
      messages,
      userInput,
      isProcessing,
      isConnected,
      sendMessage: sendAIMessage,
      executeAction,
      clearChat,
      addUserInput
    } = useAIChat(props, emit)

    const { formatMessage, formatTime } = useMessageFormatter()
    const { exportChat } = useChatExport(messages, emit)

    // 计算属性
    const canSendMessage = computed(() => {
      return userInput.value.trim() && !isProcessing.value
    })

    // 快捷操作
    const quickActions = computed(() => QUICK_ACTIONS)

    // 发送消息
    const sendMessage = async () => {
      await sendAIMessage()
      await nextTick()
      scrollToBottom()
    }

    // 快捷命令插入
    const insertQuickCommand = (command) => {
      userInput.value = command
      messageInput.value?.focus()
    }

    // 键盘事件处理
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage()
      }
    }

    // 自动调整文本框高度
    const adjustTextareaHeight = () => {
      const textarea = messageInput.value
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      }
    }

    // 滚动到底部
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    // 处理外部文本输入
    const handleExternalText = (event) => {
      if (event.detail?.text && event.detail.connectionId === props.connectionId) {
        addUserInput(event.detail.text)
      }
    }

    // 处理AI配置需求事件
    const handleAIConfigRequired = (event) => {
      emit('show-settings')
      emit('show-notification', event.detail?.message || '请先配置AI服务设置', 'error')
    }

    // 生命周期
    onMounted(() => {
      nextTick(() => {
        messageInput.value?.focus()
      })
      window.addEventListener('add-to-ai-assistant', handleExternalText)
      window.addEventListener('ai-config-required', handleAIConfigRequired)
    })

    onUnmounted(() => {
      window.removeEventListener('add-to-ai-assistant', handleExternalText)
      window.removeEventListener('ai-config-required', handleAIConfigRequired)
    })

    // 监听连接变化
    watch(() => props.connectionId, clearChat)

    return {
      // 状态
      messages,
      userInput,
      isProcessing,
      isConnected,
      canSendMessage,
      quickActions,
      
      // 引用
      messagesContainer,
      messageInput,
      
      // 方法
      sendMessage,
      executeAction,
      clearChat,
      exportChat,
      insertQuickCommand,
      handleKeyDown,
      adjustTextareaHeight,
      formatMessage,
      formatTime,
      addUserInput
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/components/AIAssistant.scss';
</style>
