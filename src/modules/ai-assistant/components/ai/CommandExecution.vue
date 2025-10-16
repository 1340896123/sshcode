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

  <!-- AI工具调用 - 根据状态显示不同界面 -->
  <div v-else-if="message.type === 'tool-start'" class="tool-call-simple">
    <!-- 正在执行状态 -->
    <div v-if="status === 'executing'" class="tool-executing">
      <div class="executing-prompt">
        <LoaderIcon class="spinner" />
        <span>🤖 AI正在执行 <code>{{ command }}</code> 命令</span>
      </div>

      <!-- 执行中的折叠面板 -->
      <div class="tool-call-panel executing-panel" :class="{ 'is-collapsed': isCollapsed }">
        <div class="panel-header" @click="toggleCollapse">
          <span class="panel-title">执行详情</span>
          <div class="panel-actions">
            <span class="panel-time">{{ formatTime(message.timestamp) }}</span>
            <!-- 折叠状态下的执行动画 -->
            <div v-if="isCollapsed && status === 'executing'" class="collapsed-execution-indicator">
              <div class="execution-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>
            <ChevronDownIcon v-if="!isCollapsed" class="toggle-icon" />
            <ChevronRightIcon v-else class="toggle-icon is-collapsed" />
          </div>
        </div>

        <div v-if="!isCollapsed" class="panel-content">
          <div class="executing-indicator">
            <div class="executing-info">
              <div class="info-row">
                <span class="info-label">状态:</span>
                <span class="info-value executing">执行中</span>
              </div>
              <div class="info-row">
                <span class="info-label">命令:</span>
                <code class="info-command">{{ command }}</code>
              </div>
              <div class="info-row">
                <span class="info-label">执行时间:</span>
                <span class="info-value">{{ formattedExecutionTime }}</span>
              </div>
              <div v-if="executionTime > 30000" class="info-row">
                <span class="info-label warning">提示:</span>
                <span class="info-value warning-text">执行时间较长，请耐心等待</span>
              </div>
            </div>
          </div>

          <!-- 实时输出显示 -->
          <div v-if="showRealtimeOutput && realtimeOutput" class="realtime-output">
            <div class="realtime-header">
              <span class="realtime-label">📡 实时输出</span>
              <span class="realtime-indicator"></span>
            </div>
            <div class="realtime-content">
              <pre class="realtime-text">{{ realtimeOutput }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具完成状态 -->
  <div v-else-if="message.type === 'tool-complete'" class="tool-completed">

      <!-- 完成后的折叠面板 -->
      <div class="tool-call-panel completed-panel" :class="{ 'is-collapsed': isCollapsed }">
        <div class="panel-header" @click="toggleCollapse">
          <span class="panel-title">执行结果</span>
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
            <ChevronDownIcon v-if="!isCollapsed" class="toggle-icon" />
            <ChevronRightIcon v-else class="toggle-icon is-collapsed" />
          </div>
        </div>

        <div v-if="!isCollapsed" class="panel-content">
          <div v-if="result" class="result-display">
            <pre class="result-output">{{ result }}</pre>
            <div class="result-footer">
              <span class="output-stats">{{ result.length }} 字符</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 执行失败状态 -->
    <div v-else-if="status === 'failed' || status === 'error'" class="tool-failed">
      <div class="failed-prompt">
        <XIcon class="error-icon" />
        <span>❌ 命令执行失败: <code>{{ command }}</code></span>
      </div>

      <!-- 失败后的折叠面板 -->
      <div class="tool-call-panel failed-panel" :class="{ 'is-collapsed': isCollapsed }">
        <div class="panel-header" @click="toggleCollapse">
          <span class="panel-title">错误信息</span>
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

  <!-- 工具调用结果 -->
  <div v-else-if="message.type === 'tool-result'" class="tool-call-result">
    <!-- 简单状态提示 -->
    <div class="result-prompt" :class="resultStatusClass">
      <span v-if="message.metadata?.status === 'error'">❌ 命令执行失败: <code>{{ command }}</code></span>
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
import { computed, ref, watch, inject, onMounted, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
import ChevronDownIcon from '../../../file-manager/components/icons/ChevronDownIcon.vue'
import ChevronRightIcon from '../../../file-manager/components/icons/ChevronRightIcon.vue'
import CopyIcon from '../../../file-manager/components/icons/CopyIcon.vue'
import XIcon from '../../../file-manager/components/icons/XIcon.vue'
import LoaderIcon from '../../../file-manager/components/icons/LoaderIcon.vue'
import InfoIcon from '../../../file-manager/components/icons/InfoIcon.vue'

export default {
  name: 'CommandExecution',
  components: {
    ChevronDownIcon,
    ChevronRightIcon,
    CopyIcon,
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
      default: true
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

    // 获取AI聊天上下文（如果可用）
    const aiChatContext = inject('aiChatContext', null)
    const activeToolCall = aiChatContext?.activeToolCall || ref(null)
    const pendingToolCalls = aiChatContext?.pendingToolCalls || ref(new Map())

    // 从消息中提取状态信息
    const status = computed(() => {
      // 根据消息类型直接确定状态
      switch (props.message.type) {
        case 'tool-start':
          // 检查是否仍然活跃
          if (props.message.metadata?.toolCallId) {
            const toolCallId = props.message.metadata.toolCallId

            // 检查活跃工具调用
            if (activeToolCall.value?.id === toolCallId) {
              return 'executing'
            }

            // 检查待处理工具调用
            if (pendingToolCalls.value.has(toolCallId)) {
              return 'executing'
            }
          }
          return 'executing'

        case 'tool-complete':
        case 'tool-result':
          return 'completed'

        case 'tool-error':
          return 'failed'

        default:
          return 'message'
      }
    })

    const command = computed(() => {
      const cmd = props.message.metadata?.command
      console.log(`🔧 [COMMAND-EXECUTION] Command: ${cmd}, message.type: ${props.message.type}, toolCallId: ${props.message.metadata?.toolCallId}`)
      return cmd
    })

    const result = computed(() => {
      // 优先从 metadata.result 获取
      if (props.message.metadata?.result) {
        console.log(`✅ [COMMAND-EXECUTION] Found result in metadata: ${props.message.metadata.result.substring(0, 50)}...`)
        return props.message.metadata.result
      }

      // 如果没有，尝试从其他地方获取
      // 比如从 AI 聊天上下文中查找对应的工具调用结果
      if (props.message.metadata?.toolCallId && aiChatContext?.toolCallHistory?.value) {
        const toolCallId = props.message.metadata.toolCallId
        const completedCall = aiChatContext.toolCallHistory.value.find(tc => tc.id === toolCallId)
        if (completedCall?.result) {
          console.log(`✅ [COMMAND-EXECUTION] Found result in history: ${completedCall.result.substring(0, 50)}...`)
          return completedCall.result
        }
      }

      console.log(`❌ [COMMAND-EXECUTION] No result found for toolCallId: ${props.message.metadata?.toolCallId}`)
      return null
    })

    const error = computed(() => {
      const err = props.message.metadata?.error
      console.log(`🔧 [COMMAND-EXECUTION] Error: ${err}`)
      return err
    })

    // 计算执行时间（对于正在执行的命令，显示实时时间）
    const executionTime = computed(() => {
      if (props.message.metadata?.executionTime) {
        return props.message.metadata.executionTime
      }

      // 对于正在执行的命令，计算已经过的时间
      if (status.value === 'executing' && props.message.metadata?.toolCallId) {
        const toolCallId = props.message.metadata.toolCallId
        const toolCall = pendingToolCalls.value.get(toolCallId) || activeToolCall.value

        if (toolCall?.startTime) {
          return Date.now() - toolCall.startTime
        }
      }

      return 0
    })

    // 实时执行时间格式化
    const formattedExecutionTime = computed(() => {
      const time = executionTime.value
      if (time < 1000) {
        return `${time}ms`
      } else if (time < 60000) {
        return `${(time / 1000).toFixed(1)}s`
      } else {
        const minutes = Math.floor(time / 60000)
        const seconds = Math.floor((time % 60000) / 1000)
        return `${minutes}m ${seconds}s`
      }
    })

    // 计算属性
    const resultStatusClass = computed(() => {
      if (props.message.metadata?.status === 'completed') {
        return 'success'
      } else if (props.message.metadata?.status === 'error') {
        return 'error'
      }
      return ''
    })

    const isCollapsible = computed(() => {
      return props.message.isCollapsible ||
             status.value === 'completed' ||
             status.value === 'failed' ||
             status.value === 'executing'
    })

    const canCopy = computed(() => {
      return (
        (status.value === 'completed' && result.value && result.value.trim()) ||
        (status.value === 'failed' && error.value && error.value.trim())
      )
    })

    const canRetry = computed(() => {
      return status.value === 'failed' && command.value
    })

    const contentToCopy = computed(() => {
      if (status.value === 'completed' && result.value && result.value.trim()) {
        return result.value.trim()
      } else if (status.value === 'failed' && error.value && error.value.trim()) {
        return error.value.trim()
      }
      return ''
    })

    const messageText = computed(() => {
      if (props.message.role === 'user') {
        return '用户消息'
      } else if (props.message.role === 'assistant') {
        return 'AI回复'
      }
      return '系统消息'
    })

    // 创建 MarkdownIt 实例
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    })

    const formattedContent = computed(() => {
      if (!props.message.content) return ''
      try {
        return md.render(props.message.content)
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

    const getStatusText = (status) => {
      switch (status) {
        case 'executing':
          return '执行中'
        case 'completed':
          return '已完成'
        case 'error':
        case 'failed':
          return '执行失败'
        default:
          return '未知状态'
      }
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
      executionTime,
      formattedExecutionTime,
      resultStatusClass,
      isCollapsible,
      canCopy,
      canRetry,
      contentToCopy,
      messageText,
      formattedContent,
      summary,
      suggestion,

      // 方法
      toggleCollapse,
      copyContent,
      retryCommand,
      formatTime,
      getStatusText
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

// 用户消息 - 简单气泡
.user-message {
  margin: 8px 0;
  display: flex;
  justify-content: flex-end;
}

.user-bubble {
  background: var(--color-primary, #8b5cf6);
  color: white;
  padding: 12px 16px;
  border-radius: 18px;
  border-bottom-right-radius: 4px;
  max-width: 80%;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  animation: fadeIn 0.3s ease;
}

// AI回复
.assistant-message {
  margin: 8px 0;
  display: flex;
  justify-content: flex-start;
}

.assistant-content {
  background: var(--bg-surface, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
  padding: 12px 16px;
  border-radius: 12px;
  border-top-left-radius: 4px;
  max-width: 85%;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid var(--border-color, #3a3a3a);
  animation: fadeIn 0.3s ease;

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

// AI工具调用 - 根据状态显示不同样式
.tool-call-simple {
  margin: 12px 0;
  animation: slideIn 0.3s ease;
}

// 正在执行状态
.tool-executing {
  .executing-prompt {
    background: rgba(59, 130, 246, 0.1);
    color: var(--color-info, #93c5fd);
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 8px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    animation: fadeIn 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;

    .spinner {
      width: 14px;
      height: 14px;
      animation: spin 1s linear infinite;
    }

    code {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      padding: 2px 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      color: var(--color-warning, #fbbf24);
      border: 1px solid rgba(245, 158, 11, 0.5);
    }
  }

  .executing-panel {
    border-color: rgba(59, 130, 246, 0.3);

    .panel-header {
      border-bottom-color: rgba(59, 130, 246, 0.2);
    }
  }
}

// 执行完成状态
.tool-completed {
  .completed-panel {
    border-color: rgba(74, 222, 128, 0.3);

    .panel-header {
      border-bottom-color: rgba(74, 222, 128, 0.2);
    }
  }
}

// 执行失败状态
.tool-failed {
  .failed-prompt {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error, #fca5a5);
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 8px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    animation: fadeIn 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;

    .error-icon {
      width: 16px;
      height: 16px;
      color: var(--color-error, #f87171);
    }

    code {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      padding: 2px 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      color: var(--color-warning, #fbbf24);
      border: 1px solid rgba(245, 158, 11, 0.5);
    }
  }

  .failed-panel {
    border-color: rgba(239, 68, 68, 0.3);

    .panel-header {
      border-bottom-color: rgba(239, 68, 68, 0.2);
    }
  }
}

// 工具调用结果
.tool-call-result {
  margin: 12px 0;
  animation: slideIn 0.3s ease;
}

.result-prompt {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: fadeIn 0.3s ease;

  &.error {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error, #fca5a5);
    border-color: rgba(239, 68, 68, 0.3);
  }

  code {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'monospace', 'Monaco', 'Menlo', 'Ubuntu Mono';
    font-size: 12px;
  }
}

// 折叠面板
.tool-call-panel {
  background: var(--bg-surface, #2a2a2a);
  border: 1px solid var(--border-color, #3a3a3a);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;

  &.is-collapsed {
    .panel-content {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
    }

    .toggle-icon {
      transform: rotate(-90deg);
    }
  }

  &.success {
    border-color: rgba(74, 222, 128, 0.3);
  }

  &.error {
    border-color: rgba(239, 68, 68, 0.3);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--border-color, #3a3a3a);

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
}

.panel-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-time {
  font-size: 11px;
  color: var(--text-tertiary, #888);
}

.panel-copy,
.panel-retry {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
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
}

.panel-retry:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: var(--color-info, #3b82f6);
}

.toggle-icon {
  width: 16px;
  height: 16px;
  color: var(--text-secondary, #b0b0b0);
  transition: transform 0.2s ease;
}

.panel-content {
  padding: 16px;
  transition: all 0.3s ease;
  max-height: 400px;
  overflow-y: auto;
}

.tool-info {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
}

.info-label {
  color: var(--text-tertiary, #888);
  font-weight: 500;
  min-width: 40px;
}

.info-value {
  color: var(--text-primary, #e0e0e0);
}

.info-value.executing {
  color: var(--color-info, #3b82f6);
}

.info-value.completed {
  color: var(--color-success, #4ade80);
}

.info-value.error,
.info-value.failed {
  color: var(--color-error, #f87171);
}

.info-command {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  color: var(--color-warning, #f59e0b);
}

.executing-indicator {
  padding: 16px;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.executing-info {
  .info-label.warning {
    color: var(--color-warning, #f59e0b);
    font-weight: 500;
  }

  .info-value.warning-text {
    color: var(--color-warning, #fbbf24);
    font-style: italic;
  }
}

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

// 折叠状态下的执行动画
.collapsed-execution-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.execution-dots {
  display: flex;
  gap: 2px;
  align-items: center;
  
  .dot {
    width: 4px;
    height: 4px;
    background: var(--color-info, #3b82f6);
    border-radius: 50%;
    animation: executionDotPulse 1.4s infinite ease-in-out both;
    
    &:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    &:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    &:nth-child(3) {
      animation-delay: 0s;
    }
  }
}

@keyframes executionDotPulse {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

// 实时输出样式
.realtime-output {
  margin-top: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.05);
  overflow: hidden;
}

.realtime-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.realtime-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-info, #93c5fd);
  display: flex;
  align-items: center;
  gap: 6px;
}

.realtime-indicator {
  width: 8px;
  height: 8px;
  background: var(--color-info, #3b82f6);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.realtime-content {
  max-height: 200px;
  overflow-y: auto;
}

.realtime-text {
  margin: 0;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-primary, #e0e0e0);
  white-space: pre-wrap;
  word-wrap: break-word;
  background: transparent;
  border: none;
  overflow-x: auto;

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

.result-display,
.error-display {
  margin-bottom: 0;
}

.result-output,
.error-output {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 12px;
  font-family: 'Monaco', 'error-output', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-primary, #e0e0e0);
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  border: 1px solid var(--border-color, #4a4a4a);

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

.result-footer {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-tertiary, #888);
}

.error-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--color-warning, #fbbf24);
}

.suggestion-icon {
  width: 14px;
  height: 14px;
  color: var(--color-info, #3b82f6);
}

// 系统消息
.system-message {
  margin: 12px 0;
  animation: slideIn 0.3s ease;
}

.system-content {
  background: rgba(107, 114, 128, 0.05);
  border: 1px solid rgba(107, 114, 128, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.system-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(107, 114, 128, 0.1);
  border-bottom: 1px solid rgba(107, 114, 128, 0.2);
}

.system-icon {
  width: 16px;
  height: 16px;
  color: var(--color-secondary, #6b7280);
}

.system-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
}

.system-body {
  padding: 0 16px 16px 16px;
}

.system-text {
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .user-bubble,
  .assistant-content {
    max-width: 90%;
  }

  .panel-header {
    padding: 10px 12px;
  }

  .panel-actions {
    gap: 8px;
  }

  .panel-time {
    font-size: 10px;
  }

  .panel-copy,
  .panel-retry {
    width: 20px;
    height: 20px;
  }

  .toggle-icon {
    width: 14px;
    height: 14px;
  }

  .panel-content {
    padding: 12px;
  }

  .info-row {
    margin-bottom: 6px;
    font-size: 11px;
  }

  .executing-indicator {
    padding: 12px;
    font-size: 11px;
  }

  .result-output,
  .error-output {
    font-size: 11px;
    padding: 10px;
  }
}
</style>
