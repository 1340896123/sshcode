<template>
  <!-- eslint-disable vue/no- -->
  <div class="ai-assistant">
    <!-- 背景装饰 -->
    <div class="ai-background">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- 主界面 -->
    <div class="ai-interface">
      <!-- 顶部栏 -->
      <div class="modern-header">
        <div class="header-left">
          <div class="ai-avatar-modern">
            <div class="avatar-gradient"></div>
            <div class="avatar-icon">🤖</div>
            <div class="status-indicator" :class="{ active: isConnected }"></div>
          </div>
          <div class="ai-info-modern">
            <h1 class="ai-title">AI 助手</h1>
            <div class="connection-info">
              <span class="connection-status" :class="{ connected: isConnected }">
                {{ isConnected ? '已连接' : '离线' }}
              </span>
              <span class="connection-details"
                >{{ connection.username }}@{{ connection.host }}</span
              >
            </div>
          </div>
        </div>

        <div class="header-right">
          <!-- 清除按钮 - 在标题同一排最右边 -->
          <button class="header-clear-btn" @click="clearChatLocal" title="清空聊天记录">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
              />
            </svg>
            <span class="clear-text">清空</span>
          </button>
        </div>
      </div>

      <!-- 聊天区域 -->
      <div class="chat-area" ref="chatArea">
        <!-- 欢迎界面 -->
        <div v-if="messages.length === 0" class="welcome-screen">
          <div class="welcome-illustration">
            <div class="floating-icons">
              <div class="float-icon">💻</div>
              <div class="float-icon">🔧</div>
              <div class="float-icon">📊</div>
              <div class="float-icon">🌐</div>
            </div>
          </div>

          <div class="welcome-content-modern">
            <h2 class="welcome-title">👋 您好！我是您的智能助手</h2>
            <p class="welcome-subtitle">
              已连接到 <strong>{{ connection.host }}</strong>
              <span class="connection-badge">SSH连接</span>
            </p>

            <div class="capabilities-grid">
              <div class="capability-card">
                <div class="capability-icon">🖥️</div>
                <h3>系统监控</h3>
                <p>实时系统状态和性能分析</p>
              </div>
              <div class="capability-card">
                <div class="capability-icon">📁</div>
                <h3>文件管理</h3>
                <p>远程文件操作和管理</p>
              </div>
              <div class="capability-card">
                <div class="capability-icon">🔍</div>
                <h3>故障诊断</h3>
                <p>系统日志分析和问题排查</p>
              </div>
              <div class="capability-card">
                <div class="capability-icon">⚡</div>
                <h3>智能执行</h3>
                <p>安全自动化命令执行</p>
              </div>
            </div>

            <div class="starter-prompts">
              <h3>开始对话</h3>
              <div class="prompt-suggestions">
                <button
                  v-for="prompt in starterPrompts"
                  :key="prompt.id"
                  class="prompt-chip"
                  @click="insertQuickCommand(prompt.text)"
                >
                  {{ prompt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="messages-container">
          <!-- 渲染所有消息，但根据消息类型选择渲染方式 -->
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-wrapper"
            :class="[message.role, message.type]"
          >
            <!-- 用户消息 -->
            <div v-if="message.role === 'user'" class="user-message">
              <div class="message-content user-content">
                <div class="message-text">{{ message.content }}</div>
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              </div>
              <div class="message-avatar user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path
                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                  />
                </svg>
              </div>
            </div>

            <!-- AI助手消息 -->
            <div v-else-if="message.role === 'assistant'" class="assistant-message">
              <div class="message-avatar assistant-avatar">
                <div class="avatar-gradient-small"></div>
                <span>🤖</span>
              </div>
              <div class="message-content assistant-content">
                <!-- eslint-disable-next-line vue/no- -->
                <div class="message-text" ="renderMarkdown(message.content)"></div>
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>

                <!-- AI消息的操作按钮 -->
                <div v-if="message.actions" class="message-actions-modern">
                  <button
                    v-for="action in message.actions"
                    :key="action.id"
                    class="action-chip"
                    :class="action.type"
                    @click="executeAction(action)"
                  >
                    <span class="action-icon">{{ action.type === 'command' ? '⚡' : '💬' }}</span>
                    {{ action.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 工具调用消息（直接渲染CommandExecution组件） -->
            <CommandExecution
              v-else-if="isToolMessage(message)"
              :message="message"
              :collapsed-by-default="message.defaultCollapsed"
              :realtime-output="getRealtimeOutput(message)"
              :show-realtime-output="shouldShowRealtimeOutput(message)"
              @copy-to-clipboard="handleCopyNotification"
              @retry-command="handleRetryCommand"
            />

            <!-- 其他系统消息（如果有内容才显示） -->
            <div
              v-else-if="message.role === 'system' && message.content && message.content.trim()"
              class="system-message"
            >
              <div class="system-content">
                <!-- eslint-disable-next-line vue/no- -->
                <div class="system-text" ="renderMarkdown(message.content)"></div>
                <div class="system-time">{{ formatTime(message.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI思考指示器 -->
        <div v-if="isProcessing" class="thinking-indicator">
          <div class="thinking-avatar">
            <div class="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="thinking-content">
            <div class="thinking-text">AI正在思考</div>
            <div class="thinking-subtitle">分析您的需求并准备响应...</div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-container-modern">
          <div class="input-wrapper">
            <textarea
              ref="messageInput"
              v-model="userInput"
              @keydown="handleKeyDown"
              @input="handleInput"
              placeholder="输入您的问题，我会帮您执行相应的命令..."
              class="modern-textarea"
              rows="1"
              :disabled="isProcessing"
            ></textarea>
            <button
              class="send-btn-modern"
              @click="sendMessage"
              :disabled="!canSendMessage"
              :class="{ active: canSendMessage }"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 快捷操作栏 -->
        <div class="quick-actions-modern">
          <button
            v-for="quickAction in quickActions"
            :key="quickAction.id"
            class="quick-action-btn"
            @click="insertQuickCommand(quickAction.command)"
            :title="quickAction.title"
          >
            <span class="action-emoji">{{ quickAction.icon }}</span>
            {{ quickAction.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, provide } from 'vue';
import { useAIChat } from '../composables/useAIChat';
import { useMessageFormatter } from '@/composables/useMessageFormatter';
import { useChatExport } from '@/composables/useChatExport';
import { QUICK_ACTIONS } from '../constants/aiConstants';
import MarkdownIt from 'markdown-it';
import CommandExecution from './ai/CommandExecution.vue';
import { useAIStore } from '../stores/ai.js';

export default {
  name: 'AIAssistant',
  components: {
    CommandExecution
  },
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
  setup(props, { emit: emitEvent }) {
    // 获取完整的AI聊天状态以提供给子组件
    const aiChatState = useAIChat(props, emitEvent);

    // 提供AI聊天上下文给子组件
    provide('aiChatContext', aiChatState);

    // 引用
    const chatArea = ref(null);
    const messageInput = ref(null);

    // 折叠状态管理
    const collapsedMessages = ref(new Set());

    // 工具消息缓存，防止重复检测和渲染
    const renderedToolMessages = ref(new Set());

    // Markdown 渲染器
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
      highlight: (code, lang) => {
        if (lang) {
          return `<div class="code-block-wrapper">
            <div class="code-header">
              <span class="code-language">${lang}</span>
              <button class="copy-code-btn" onclick="this.parentElement.nextElementSibling.textContent.select(); document.execCommand('copy'); this.textContent='已复制!'; setTimeout(() => this.textContent='复制', 1000)">复制</button>
            </div>
            <pre class="code-block language-${lang}"><code class="language-${lang}">${code}</code></pre>
          </div>`;
        }
        return `<pre class="code-block"><code>${code}</code></pre>`;
      }
    });

    // 渲染Markdown内容
    const renderMarkdown = content => {
      try {
        if (!content || typeof content !== 'string') {
          return content || '';
        }

        // 基本的安全清理
        const cleanContent = content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');

        return md.render(cleanContent);
      } catch (error) {
        console.error('Markdown渲染错误:', error);
        // 降级到简单的文本处理
        return content
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
      }
    };

    // 初始化工具调用的默认折叠状态
    const initializeCollapsedMessages = () => {
      messages.value.forEach(message => {
        if (message.defaultCollapsed) {
          collapsedMessages.value.add(message.id);
        }
      });
    };

    // 使用组合式函数 - aiChatState已包含所有需要的状态
    const {
      messages,
      userInput,
      isProcessing,
      isConnected,
      activeToolCall,
      sendMessage: sendAIMessage,
      executeAction,
      clearChat,
      addUserInput
    } = aiChatState;

    const { formatMessage, formatTime } = useMessageFormatter();
    const { exportChat } = useChatExport(messages, emitEvent);

    // 计算属性
    const canSendMessage = computed(() => {
      return userInput.value.trim() && !isProcessing.value;
    });

    // 快捷操作
    const quickActions = computed(() => QUICK_ACTIONS);

    // 新增：入门提示语
    const starterPrompts = computed(() => [
      {
        id: 'sys-info',
        label: '查看系统信息',
        text: '请帮我查看当前系统的基本信息，包括操作系统版本、内存使用情况和磁盘空间'
      },
      {
        id: 'process-check',
        label: '检查运行进程',
        text: '显示当前正在运行的进程，按CPU或内存使用率排序'
      },
      {
        id: 'disk-usage',
        label: '分析磁盘使用',
        text: '分析当前目录的磁盘使用情况，找出占用空间最大的文件和目录'
      },
      {
        id: 'network-status',
        label: '检查网络状态',
        text: '检查网络连接状态，包括网络接口信息和开放的端口'
      }
    ]);

    // 发送消息
    const sendMessage = async () => {
      await sendAIMessage();
      await nextTick();
      scrollToBottom();
    };

    // 快捷命令插入
    const insertQuickCommand = command => {
      userInput.value = command;
      messageInput.value?.focus();
    };

    // 键盘事件处理
    const handleKeyDown = event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    };

    // 处理输入
    const handleInput = () => {
      adjustTextareaHeight();
    };

    // 自动调整文本框高度
    const adjustTextareaHeight = () => {
      const textarea = messageInput.value;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }
    };

    // 滚动到底部
    const scrollToBottom = () => {
      const chatElement = chatArea.value;
      if (chatElement) {
        chatElement.scrollTop = chatElement.scrollHeight;
      }
    };

    // 处理外部文本输入
    const handleExternalText = event => {
      if (event.detail?.text && event.detail.connectionId === props.connectionId) {
        addUserInput(event.detail.text);
      }
    };

    // 处理AI配置需求事件
    const handleAIConfigRequired = event => {
      emitEvent('show-settings');
      emitEvent('show-notification', event.detail?.message || '请先配置AI服务设置', 'error');
    };

    // 折叠/展开消息
    const toggleCollapse = messageId => {
      if (collapsedMessages.value.has(messageId)) {
        collapsedMessages.value.delete(messageId);
      } else {
        collapsedMessages.value.add(messageId);
      }
    };

    // 复制到剪贴板
    const copyToClipboard = async text => {
      try {
        await navigator.clipboard.writeText(text);
        emitEvent('show-notification', '已复制到剪贴板', 'success');
      } catch (error) {
        console.error('复制失败:', error);
        emitEvent('show-notification', '复制失败', 'error');
      }
    };

    // 处理复制通知（来自CommandExecution组件）
    const handleCopyNotification = (message, type = 'success') => {
      emitEvent('show-notification', message, type);
    };

    // 处理重试命令
    const handleRetryCommand = command => {
      emitEvent('execute-command', command);
      addMessage('assistant', `🔄 重试执行命令: \`${command}\``);
    };

    // 获取实时输出
    const getRealtimeOutput = message => {
      // 对于正在执行的工具调用，从状态管理中获取实时输出
      if (message.type === 'tool-start' && message.metadata?.toolCallId) {
        return aiChatState.getRealtimeOutput(message.metadata.toolCallId);
      }
      return '';
    };

    // 判断是否应该显示实时输出
    const shouldShowRealtimeOutput = message => {
      return (
        message.type === 'tool-start' &&
        activeToolCall.value?.id === message.metadata?.toolCallId &&
        aiChatState.getRealtimeOutput(message.metadata.toolCallId).length > 0
      );
    };

    // 判断消息是否为工具类型（完全独立于role）
    const isToolMessage = message => {
      // 首先检查是否为工具调用相关的消息类型
      const isTool =
        message.type &&
        (message.type === 'tool-start' ||
          message.type === 'tool-end' ||
          message.type === 'tool-output' ||
          message.type === 'tool-complete' ||
          message.type === 'tool-error' ||
          message.type === 'tool-result' ||
          message.type.startsWith('tool-'));

      if (isTool) {
        return true;
      }

      // 明确排除非工具消息
      if (message.role === 'user' || message.role === 'assistant') {
        return false;
      }

      // 对于其他role为system的消息，检查是否包含工具调用相关内容
      if (message.role === 'system' && message.content) {
        const hasToolContent =
          message.content.includes('正在执行命令') ||
          message.content.includes('命令执行完成') ||
          message.content.includes('命令执行失败') ||
          message.metadata?.toolCallId;

        return hasToolContent;
      }

      return false;
    };

    // 生命周期
    onMounted(() => {
      nextTick(() => {
        messageInput.value?.focus();
      });

      // 初始化工具调用的默认折叠状态
      initializeCollapsedMessages();
    });

    // 本地清空聊天函数
    const clearChatLocal = () => {
      // 如果有消息，显示确认对话框
      if (messages.value.length > 0) {
        if (confirm('确定要清空所有聊天记录吗？此操作不可撤销。')) {
          // 调用原始的clearChat函数
          clearChat();
          // 清理工具消息缓存
          renderedToolMessages.value.clear();
          emitEvent('show-notification', '聊天记录已清空', 'success');
        }
      } else {
        // 如果没有消息，直接清空缓存
        renderedToolMessages.value.clear();
        emitEvent('show-notification', '聊天记录已经是空的', 'info');
      }
    };

    // 手动清理工具消息缓存（用于调试）
    const clearToolMessageCache = () => {
      renderedToolMessages.value.clear();
    };

    // 监听连接变化
    watch(() => props.connectionId, clearChatLocal);

    return {
      // 状态
      messages,
      userInput,
      isProcessing,
      isConnected,
      canSendMessage,
      quickActions,
      starterPrompts,
      collapsedMessages,
      activeToolCall,
      renderedToolMessages,

      // 引用
      chatArea,
      messageInput,

      // 方法
      sendMessage,
      executeAction,
      clearChat,
      clearChatLocal,
      clearToolMessageCache,
      exportChat,
      insertQuickCommand,
      handleKeyDown,
      handleInput,
      adjustTextareaHeight,
      formatMessage,
      formatTime,
      addUserInput,
      toggleCollapse,
      copyToClipboard,
      handleCopyNotification,
      handleRetryCommand,
      getRealtimeOutput,
      shouldShowRealtimeOutput,
      isToolMessage,
      initializeCollapsedMessages,
      renderMarkdown
    };
  }
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '../styles/AIAssistant.scss';

// 系统消息样式
.system-message {
  margin: 8px 0;
  display: flex;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.system-content {
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.2);
  border-radius: 12px;
  padding: 8px 12px;
  max-width: 80%;
  text-align: center;
}

.system-text {
  font-size: 12px;
  color: var(--text-secondary, #b0b0b0);
  line-height: 1.4;

  :deep(code) {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    padding: 1px 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: var(--color-warning, #f59e0b);
  }
}

.system-time {
  font-size: 10px;
  color: var(--text-tertiary, #888);
  margin-top: 4px;
}
</style>
