<template>
  <!-- 用户消息 - 简单气泡 -->
  <div v-if="message.role === 'user'" class="user-message">
    <div class="user-bubble">
      {{ message.content }}
    </div>
  </div>

  <!-- AI回复 - 正常显示 -->
  <div v-else-if="message.role === 'assistant'" class="assistant-message">
    <div class="assistant-content" v-html="formattedContent"></div>
  </div>

  <!-- AI工具调用 - 简洁提示 + 折叠面板 -->
  <div v-else-if="message.type === 'tool-start'" class="tool-call-simple">
    <!-- 简单提示 -->
    <div class="tool-prompt">
      🤖 AI想要执行 <code>{{ command }}</code> 命令
    </div>

    <!-- 折叠面板 -->
    <div class="tool-call-panel" :class="{ 'is-collapsed': isCollapsed }">
      <div class="panel-header" @click="toggleCollapse">
        <span class="panel-title">工具调用详情</span>
        <div class="panel-actions">
          <span class="panel-time">{{ formatTime(message.timestamp) }}</span>
          <ChevronDownIcon v-if="!isCollapsed" class="toggle-icon" />
          <ChevronRightIcon v-else class="toggle-icon is-collapsed" />
        </div>
      </div>

      <div v-if="!isCollapsed" class="panel-content">
        <div class="tool-info">
          <div class="info-row">
            <span class="info-label">状态:</span>
            <span class="info-value executing">执行中</span>
          </div>
          <div class="info-row">
            <span class="info-label">命令:</span>
            <code class="info-command">{{ command }}</code>
          </div>
          <div class="info-row">
            <span class="info-label">类型:</span>
            <span class="info-value">AI工具调用</span>
          </div>
        </div>

        <div class="executing-indicator">
          <LoaderIcon class="spinner" />
          <span>正在执行命令，请稍候...</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 工具调用结果 -->
  <div v-else-if="message.type === 'tool-result'" class="tool-call-result">
    <!-- 简单状态提示 -->
    <div class="result-prompt" :class="resultStatusClass">
      <span v-if="message.metadata?.status === 'completed'">✅ 命令执行完成: <code>{{ command }}</code></span>
      <span v-else-if="message.metadata?.status === 'error'">❌ 命令执行失败: <code>{{ command }}</code></span>
    </div>

    <!-- 折叠面板 -->
    <div class="tool-call-panel" :class="[{ 'is-collapsed': isCollapsed }, resultStatusClass]">
      <div class="panel-header" @click="toggleCollapse">
        <span class="panel-title">
          {{ message.metadata?.status === 'completed' ? '执行结果' : '错误信息' }}
        </span>
        <div class="panel-actions">
          <span v-if="executionTime" class="panel-time">
            ⏱ {{ (executionTime / 1000).toFixed(2) }}s
          </span>
          <button
            v-if="canCopy"
            class="panel-copy"
            @click.stop="copyContent"
            title="复制内容"
          >
            <CopyIcon />
          </button>
          <button
            v-if="canRetry"
            class="panel-retry"
            @click.stop="retryCommand"
            title="重试命令"
          >
            <LoaderIcon />
          </button>
          <ChevronDownIcon v-if="!isCollapsed" class="toggle-icon" />
          <ChevronRightIcon v-else class="toggle-icon is-collapsed" />
        </div>
      </div>

      <div v-if="!isCollapsed" class="panel-content">
        <!-- 成功结果 -->
        <div v-if="message.metadata?.status === 'completed'">
          <div v-if="result" class="result-display">
            <pre class="result-output">{{ result }}</pre>
            <div class="result-footer">
              <span class="output-stats">{{ result.length }} 字符</span>
            </div>
          </div>
        </div>

        <!-- 错误结果 -->
        <div v-else-if="message.metadata?.status === 'error'">
          <div v-if="error" class="error-display">
            <pre class="error-output">{{ error }}</pre>
            <div v-if="suggestion" class="error-suggestion">
              <InfoIcon class="suggestion-icon" />
              <span>建议: {{ suggestion }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 其他系统消息 -->
  <div v-else class="system-message">
    <div class="system-content">
      <div class="system-header">
        <InfoIcon class="system-icon" />
        <span class="system-title">{{ messageText }}</span>
      </div>
      <div v-if="message.content" class="system-body">
        <div class="system-text" v-html="formattedContent"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { marked } from 'marked'
import ChevronDownIcon from '../icons/ChevronDownIcon.vue'
import ChevronRightIcon from '../icons/ChevronRightIcon.vue'
import CopyIcon from '../icons/CopyIcon.vue'
import CheckIcon from '../icons/CheckIcon.vue'
import XIcon from '../icons/XIcon.vue'
import LoaderIcon from '../icons/LoaderIcon.vue'
import InfoIcon from '../icons/InfoIcon.vue'

export default {
  name: 'CommandExecution',
  components: {
    ChevronDownIcon,
    ChevronRightIcon,
    CopyIcon,
    CheckIcon,
    XIcon,
    LoaderIcon,
    InfoIcon
  },
  props: {
    message: {
      type: Object,
      required: true
    },
    collapsedByDefault: {
      type: Boolean,
      default: false
    },
    realtimeOutput: {
      type: String,
      default: ''
    },
    showRealtimeOutput: {
      type: Boolean,
      default: false
    }
  },
  emits: ['copy-to-clipboard', 'retry-command'],
  setup(props, { emit }) {
    const isCollapsed = ref(props.collapsedByDefault)

    // 从消息中提取状态信息
    const status = computed(() => {
      if (props.message.metadata?.status) {
        return props.message.metadata.status
      }

      // 根据消息类型推断状态
      switch (props.message.type) {
        case 'tool-start':
          return 'executing'
        case 'tool-result':
          return props.message.metadata?.status === 'completed' ? 'completed' : 'failed'
        default:
          return 'message'
      }
    })

    const command = computed(() => props.message.metadata?.command)
    const result = computed(() => props.message.metadata?.result)
    const error = computed(() => props.message.metadata?.error)
    const user = computed(() => props.message.role)
    const executionTime = computed(() => props.message.metadata?.executionTime)

    // 计算属性
    const executionClass = computed(() => `execution-${status.value}`)

    const title = computed(() => {
      switch (status.value) {
        case 'executing':
          return '🚀 命令执行中'
        case 'completed':
          return '✅ 命令执行成功'
        case 'failed':
          return '❌ 命令执行失败'
        default:
          if (props.message.role === 'user') {
            return '👤 用户输入'
          } else if (props.message.role === 'assistant') {
            return '🤖 AI回复'
          }
          return '📝 系统消息'
      }
    })

    const description = computed(() => {
      if (status.value === 'executing' && command.value) {
        return `正在执行: ${command.value}`
      } else if (status.value === 'completed') {
        return '命令已成功执行完成'
      } else if (status.value === 'failed') {
        return '命令执行时发生错误'
      } else if (props.message.content) {
        return props.message.content.substring(0, 100) + (props.message.content.length > 100 ? '...' : '')
      }
      return '系统消息'
    })

    const iconClass = computed(() => {
      switch (status.value) {
        case 'executing':
          return 'icon-executing'
        case 'completed':
          return 'icon-success'
        case 'failed':
          return 'icon-error'
        default:
          return props.message.role === 'user' ? 'icon-user' : 'icon-info'
      }
    })

    const iconComponent = computed(() => {
      switch (status.value) {
        case 'executing':
          return 'LoaderIcon'
        case 'completed':
          return 'CheckIcon'
        case 'failed':
          return 'XIcon'
        default:
          return 'InfoIcon'
      }
    })

    const isCollapsible = computed(() => {
      return props.message.isCollapsible ||
             status.value === 'completed' ||
             status.value === 'failed' ||
             (props.message.content && props.message.content.length > 200)
    })

    const hasContent = computed(() => {
      return (
        (status.value === 'completed' && result.value) ||
        (status.value === 'failed' && error.value) ||
        props.message.content ||
        (props.showRealtimeOutput && props.realtimeOutput)
      )
    })

    const canCopy = computed(() => {
      return (
        (status.value === 'completed' && result.value) ||
        (status.value === 'failed' && error.value) ||
        props.message.content
      )
    })

    const canRetry = computed(() => {
      return status.value === 'failed' && command.value
    })

    const contentToCopy = computed(() => {
      if (status.value === 'completed' && result.value) {
        return result.value
      } else if (status.value === 'failed' && error.value) {
        return error.value
      }
      return props.message.content || ''
    })

    // 文本内容
    const executingText = computed(() => {
      if (props.message.type === 'tool-start') {
        return 'AI正在执行命令...'
      }
      return '正在执行命令...'
    })

    const executingHint = computed(() => {
      if (props.message.type === 'tool-start') {
        return 'AI工具调用正在进行中，请稍候'
      }
      return '命令正在执行，请稍候...'
    })

    const successText = computed(() => {
      if (props.message.type === 'tool-result') {
        return 'AI工具调用完成'
      }
      return '命令执行完成'
    })

    const errorText = computed(() => {
      if (props.message.type === 'tool-result') {
        return 'AI工具调用失败'
      }
      return '命令执行失败'
    })

    const messageText = computed(() => {
      if (props.message.role === 'user') {
        return '用户消息'
      } else if (props.message.role === 'assistant') {
        return 'AI回复'
      }
      return '系统消息'
    })

    const formattedContent = computed(() => {
      if (!props.message.content) return ''
      try {
        return marked(props.message.content)
      } catch (error) {
        console.error('Markdown渲染失败:', error)
        return props.message.content.replace(/\n/g, '<br>')
      }
    })

    const summary = computed(() => {
      // 可以从结果中生成摘要
      if (result.value && result.value.length > 1000) {
        return `命令输出较长，共 ${result.value.length} 个字符。建议使用折叠功能查看详细内容。`
      }
      return null
    })

    const suggestion = computed(() => {
      if (error.value) {
        if (error.value.includes('command not found')) {
          return '请检查命令拼写是否正确，或确保命令已安装'
        } else if (error.value.includes('permission denied')) {
          return '权限不足，请检查用户权限或使用sudo命令'
        } else if (error.value.includes('No such file or directory')) {
          return '文件或目录不存在，请检查路径是否正确'
        }
      }
      return null
    })

    // 方法
    const toggleCollapse = () => {
      if (isCollapsible.value) {
        isCollapsed.value = !isCollapsed.value
      }
    }

    const copyContent = async () => {
      try {
        await navigator.clipboard.writeText(contentToCopy.value)
        emit('copy-to-clipboard', '已复制到剪贴板', 'success')
      } catch (error) {
        console.error('复制失败:', error)
        emit('copy-to-clipboard', '复制失败', 'error')
      }
    }

    const retryCommand = () => {
      if (command.value) {
        emit('retry-command', command.value)
      }
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    // 监听实时输出变化
    watch(() => props.realtimeOutput, (newOutput) => {
      if (newOutput && status.value === 'executing' && !isCollapsed.value) {
        // 可以在这里添加自动滚动到底部的逻辑
      }
    })

    return {
      // 状态
      isCollapsed,

      // 计算属性
      status,
      command,
      result,
      error,
      user,
      executionTime,
      executionClass,
      title,
      description,
      iconClass,
      iconComponent,
      isCollapsible,
      hasContent,
      canCopy,
      canRetry,
      contentToCopy,
      executingText,
      executingHint,
      successText,
      errorText,
      messageText,
      formattedContent,
      summary,
      suggestion,

      // 方法
      toggleCollapse,
      copyContent,
      retryCommand,
      formatTime
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.command-execution {
  margin: 12px 0;
  border-radius: 12px;
  border: 1px solid var(--border-color, #3a3a3a);
  background: var(--bg-surface, #2a2a2a);
  overflow: hidden;
  animation: slideIn 0.3s ease;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--border-color-hover, #4a4a4a);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.is-collapsed {
    .execution-content {
      max-height: 0;
      opacity: 0;
    }
  }

  // 不同状态的样式
  &.execution-executing {
    border-color: var(--color-info, #3b82f6);
    background: rgba(59, 130, 246, 0.05);
  }

  &.execution-completed {
    border-color: var(--color-success, #4ade80);
    background: rgba(74, 222, 128, 0.05);
  }

  &.execution-failed {
    border-color: var(--color-error, #ef4444);
    background: rgba(239, 68, 68, 0.05);
  }

  &.execution-message {
    border-color: var(--color-secondary, #6b7280);
    background: rgba(107, 114, 128, 0.05);
  }
}

.execution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
}

.execution-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.execution-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;

  &.icon-executing {
    background: var(--color-info, #3b82f6);
    color: white;
  }

  &.icon-success {
    background: var(--color-success, #4ade80);
    color: white;
  }

  &.icon-error {
    background: var(--color-error, #ef4444);
    color: white;
  }

  &.icon-user {
    background: var(--color-primary, #8b5cf6);
    color: white;
  }

  &.icon-info {
    background: var(--color-secondary, #6b7280);
    color: white;
  }
}

.execution-details {
  flex: 1;
  min-width: 0;
}

.execution-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin-bottom: 4px;
}

.execution-description {
  font-size: 13px;
  color: var(--text-secondary, #b0b0b0);
  margin-bottom: 6px;
  line-height: 1.4;
}

.execution-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.execution-time {
  font-size: 11px;
  color: var(--text-tertiary, #888);
}

.execution-duration {
  font-size: 11px;
  color: var(--color-info, #3b82f6);
  font-weight: 500;
}

.execution-command {
  code {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: var(--color-warning, #f59e0b);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
}

.execution-user {
  font-size: 11px;
  color: var(--color-primary, #8b5cf6);
}

.execution-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.collapse-toggle,
.copy-button,
.retry-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--text-secondary, #b0b0b0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: var(--text-primary, #e0e0e0);
  }

  &:active {
    transform: scale(0.95);
  }

  &.is-collapsed {
    transform: rotate(-90deg);
  }
}

.retry-button {
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: var(--color-info, #3b82f6);
  }
}

.execution-content {
  max-height: 600px;
  opacity: 1;
  transition: all 0.3s ease;
  border-top: 1px solid var(--border-color, #3a3a3a);
}

.executing-state,
.completed-state,
.failed-state,
.message-state {
  padding: 16px;
}

.executing-header,
.completed-header,
.failed-header,
.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
}

.executing-header {
  color: var(--color-info, #3b82f6);
}

.completed-header {
  color: var(--color-success, #4ade80);
}

.failed-header {
  color: var(--color-error, #ef4444);
}

.message-header {
  color: var(--color-secondary, #6b7280);
}

.status-icon {
  width: 16px;
  height: 16px;

  &.executing {
    animation: spin 1s linear infinite;
  }

  &.success {
    color: var(--color-success, #4ade80);
  }

  &.error {
    color: var(--color-error, #ef4444);
  }

  &.info {
    color: var(--color-secondary, #6b7280);
  }
}

.executing-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.executing-progress {
  width: 100%;
  height: 4px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  width: 60%;
  background: var(--color-info, #3b82f6);
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}

.executing-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary, #888);
  text-align: center;
}

.realtime-output {
  width: 100%;
}

.output-header {
  font-size: 12px;
  color: var(--text-secondary, #b0b0b0);
  margin-bottom: 8px;
}

.output-content {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 10px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-primary, #e0e0e0);
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
}

.result-content,
.error-content {
  margin-bottom: 16px;
}

.result-header,
.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary, #b0b0b0);
  margin-bottom: 8px;
}

.result-stats {
  display: flex;
  gap: 12px;
}

.output-length,
.execution-time-stat {
  font-size: 11px;
  color: var(--text-tertiary, #888);
}

.result-output,
.error-output {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-primary, #e0e0e0);
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  border: 1px solid var(--border-color, #4a4a4a);
  margin: 0;
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-primary, #1a1a1a);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color, #4a4a4a);
    border-radius: 2px;

    &:hover {
      background: var(--bg-hover, #5a5a5a);
    }
  }
}

.result-summary,
.error-suggestion {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-header,
.suggestion-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #b0b0b0);
  margin-bottom: 8px;
}

.summary-icon,
.suggestion-icon {
  width: 14px;
  height: 14px;
  color: var(--color-info, #3b82f6);
}

.summary-content,
.suggestion-content {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, #b0b0b0);
}

.message-body {
  margin: 0;
}

.message-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary, #e0e0e0);

  :deep(p) {
    margin: 0 0 12px 0;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(code) {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    color: var(--color-warning, #f59e0b);
  }

  :deep(pre) {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 10px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    line-height: 1.4;
    color: var(--text-primary, #e0e0e0);
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-x: auto;
    margin: 12px 0;
    border: 1px solid var(--border-color, #4a4a4a);
  }

  :deep(blockquote) {
    border-left: 4px solid var(--color-primary, #8b5cf6);
    padding-left: 12px;
    margin: 12px 0;
    color: var(--text-secondary, #b0b0b0);
    font-style: italic;
  }

  :deep(ul), :deep(ol) {
    margin: 12px 0;
    padding-left: 20px;
  }

  :deep(li) {
    margin-bottom: 4px;
  }

  :deep(a) {
    color: var(--color-info, #3b82f6);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

// 动画
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .execution-header {
    padding: 12px;
  }

  .execution-info {
    gap: 8px;
  }

  .execution-icon {
    width: 20px;
    height: 20px;
  }

  .execution-title {
    font-size: 13px;
  }

  .execution-description {
    font-size: 12px;
  }

  .execution-meta {
    gap: 8px;
  }

  .collapse-toggle,
  .copy-button,
  .retry-button {
    width: 24px;
    height: 24px;
  }

  .executing-state,
  .completed-state,
  .failed-state,
  .message-state {
    padding: 12px;
  }

  .result-output,
  .error-output {
    font-size: 11px;
    padding: 10px;
  }
}
</style>