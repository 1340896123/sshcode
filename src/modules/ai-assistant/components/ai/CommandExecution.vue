<template>
  <div class="command-execution" :class="statusClass">
    <!-- 工具调用开始状态 -->
    <div v-if="isToolStart" class="tool-execution">
      <div class="execution-header">
        <div class="execution-status">
          <LoaderIcon v-if="currentStatus === 'executing'" class="status-icon executing" />
          <CheckIcon v-else-if="currentStatus === 'completed'" class="status-icon success" />
          <XIcon v-else-if="currentStatus === 'error'" class="status-icon error" />
          <span class="status-text">{{ statusText }}</span>
        </div>
        <div class="execution-info">
          <code class="command-text">{{ command }}</code>
          <span v-if="executionTime > 0" class="execution-time">
            ⏱ {{ formattedExecutionTime }}
          </span>
        </div>
      </div>

      <!-- 可折叠的详情面板 -->
      <div class="execution-panel" :class="{ 'is-collapsed': isCollapsed }">
        <div class="panel-header" @click="toggleCollapse">
          <span class="panel-title">执行详情</span>
          <div class="panel-actions">
            <!-- 执行中的动画指示器 -->
            <div v-if="isCollapsed && currentStatus === 'executing'" class="collapsed-indicator">
              <div class="execution-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>

            <!-- 复制按钮 -->
            <button
              v-if="hasContentToCopy"
              class="panel-copy"
              @click.stop="copyContent"
              title="复制内容"
            >
              <CopyIcon />
            </button>

            <!-- 重试按钮（仅在失败时显示） -->
            <button
              v-if="currentStatus === 'error' && command"
              class="panel-retry"
              @click.stop="retryCommand"
              title="重试命令"
            >
              <LoaderIcon />
            </button>

            <!-- 折叠按钮 -->
            <ChevronDownIcon v-if="!isCollapsed" class="toggle-icon" />
            <ChevronRightIcon v-else class="toggle-icon" />
          </div>
        </div>

        <div v-if="!isCollapsed" class="panel-content">
          <!-- 基本信息 -->
          <div class="execution-details">
            <div class="detail-row">
              <span class="detail-label">状态:</span>
              <span class="detail-value" :class="currentStatus">{{ statusText }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">命令:</span>
              <code class="detail-command">{{ command }}</code>
            </div>
            <div class="detail-row">
              <span class="detail-label">开始时间:</span>
              <span class="detail-value">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div v-if="executionTime > 0" class="detail-row">
              <span class="detail-label">执行时间:</span>
              <span class="detail-value">{{ formattedExecutionTime }}</span>
            </div>
            <div
              v-if="currentStatus === 'executing' && executionTime > 30000"
              class="detail-row warning"
            >
              <span class="detail-label">提示:</span>
              <span class="detail-value warning-text">执行时间较长，请耐心等待</span>
            </div>
          </div>

          <!-- 实时输出（仅在执行中且有输出时显示） -->
          <div
            v-if="currentStatus === 'executing' && realtimeOutput && realtimeOutput.trim()"
            class="realtime-output"
          >
            <div class="realtime-header">
              <span class="realtime-label">📡 实时输出</span>
              <div class="realtime-indicator"></div>
            </div>
            <div class="realtime-content">
              <pre class="realtime-text">{{ realtimeOutput }}</pre>
            </div>
          </div>

          <!-- 执行结果 -->
          <div v-if="currentStatus === 'completed' && result" class="result-content">
            <div class="result-header">
              <CheckIcon class="result-icon success" />
              <span>执行结果</span>
            </div>
            <pre class="result-output">{{ result }}</pre>
            <div class="result-footer">
              <span class="output-stats">{{ result.length }} 字符</span>
              <span class="completion-time">完成于 {{ formatTime(completionTimestamp) }}</span>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-else-if="currentStatus === 'error' && error" class="error-content">
            <div class="error-header">
              <XIcon class="error-icon" />
              <span>错误信息</span>
            </div>
            <pre class="error-output">{{ error }}</pre>
            <div v-if="suggestion" class="error-suggestion">
              <InfoIcon class="suggestion-icon" />
              <div class="suggestion-content">
                <span class="suggestion-label">建议:</span>
                <span class="suggestion-text">{{ suggestion }}</span>
              </div>
            </div>
          </div>

          <!-- 无内容提示 -->
          <div v-else-if="currentStatus !== 'executing'" class="no-content">
            <span class="no-content-text">
              {{
                currentStatus === 'completed'
                  ? '命令执行完成，无输出内容'
                  : '命令执行失败，无详细错误信息'
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 其他类型的消息（兜底处理） -->
    <div v-else class="system-message">
      <div class="system-header">
        <InfoIcon class="system-icon" />
        <span class="system-title">系统消息</span>
        <span class="system-time">{{ formatTime(message.timestamp) }}</span>
      </div>
      <div v-if="message.content" class="system-content">
        <div class="system-text" v-html="formattedContent"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted, inject } from 'vue';
import ChevronDownIcon from '../../../file-manager/components/icons/ChevronDownIcon.vue';
import ChevronRightIcon from '../../../file-manager/components/icons/ChevronRightIcon.vue';
import CopyIcon from '../../../file-manager/components/icons/CopyIcon.vue';
import XIcon from '../../../file-manager/components/icons/XIcon.vue';
import LoaderIcon from '../../../file-manager/components/icons/LoaderIcon.vue';
import InfoIcon from '../../../file-manager/components/icons/InfoIcon.vue';
import CheckIcon from '../../../file-manager/components/icons/CheckIcon.vue';
import MarkdownIt from 'markdown-it';
import { onEvent, offEvent, EventTypes } from '@/utils/eventSystem.js';

export default {
  name: 'CommandExecution',
  components: {
    ChevronDownIcon,
    ChevronRightIcon,
    CopyIcon,
    XIcon,
    LoaderIcon,
    InfoIcon,
    CheckIcon
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
    const isCollapsed = ref(props.collapsedByDefault);

    // 状态管理
    const currentStatus = ref('executing'); // executing, completed, error
    const result = ref('');
    const error = ref('');
    const executionTime = ref(0);
    const completionTimestamp = ref(null);
    const startTime = ref(Date.now());

    // 获取AI聊天上下文
    const aiChatContext = inject('aiChatContext', null);

    // 组件ID用于事件监听 - 使用消息ID确保唯一性和稳定性
    const componentId = `CommandExecution-${props.message.id}`;

    // 判断是否为工具相关消息（tool-start, tool-complete, tool-error）
    const isToolStart = computed(() => {
      return (props.message.type === 'tool-start' ||
             props.message.type === 'tool-complete' ||
             props.message.type === 'tool-error') &&
             props.message.metadata?.toolCallId;
    });

    // 获取工具调用ID
    const toolCallId = computed(() => {
      return props.message.metadata?.toolCallId;
    });

    // 获取命令
    const command = computed(() => {
      return props.message.metadata?.command || '';
    });

    // 格式化执行时间
    const formattedExecutionTime = computed(() => {
      const time = executionTime.value;
      if (time < 1000) {
        return `${time}ms`;
      } else if (time < 60000) {
        return `${(time / 1000).toFixed(1)}s`;
      } else {
        const minutes = Math.floor(time / 60000);
        const seconds = Math.floor((time % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
      }
    });

    // 状态文本
    const statusText = computed(() => {
      switch (currentStatus.value) {
        case 'executing':
          return '正在执行';
        case 'completed':
          return '执行成功';
        case 'error':
          return '执行失败';
        default:
          return '未知状态';
      }
    });

    // 状态样式类
    const statusClass = computed(() => {
      return `status-${currentStatus.value}`;
    });

    // 是否有内容可复制
    const hasContentToCopy = computed(() => {
      return !!(result.value || error.value);
    });

    // 错误建议
    const suggestion = computed(() => {
      const errorMsg = error.value;
      if (!errorMsg) return null;

      if (errorMsg.includes('command not found')) {
        return '请检查命令拼写是否正确，或确保命令已安装';
      } else if (errorMsg.includes('permission denied')) {
        return '权限不足，请检查用户权限或使用sudo命令';
      } else if (errorMsg.includes('No such file or directory')) {
        return '文件或目录不存在，请检查路径是否正确';
      } else if (errorMsg.includes('Connection refused')) {
        return '连接被拒绝，请检查服务是否运行或网络连接';
      }
      return null;
    });

    // Markdown渲染
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    });

    const formattedContent = computed(() => {
      if (!props.message.content) return '';
      try {
        return md.render(props.message.content);
      } catch (error) {
        console.error('Markdown渲染失败:', error);
        return props.message.content.replace(/\n/g, '<br>');
      }
    });

    // 更新执行时间
    const updateExecutionTime = () => {
      if (currentStatus.value === 'executing') {
        executionTime.value = Date.now() - startTime.value;
      }
    };

    // 事件监听器
    let updateTimer = null;

    // 监听命令完成事件
    const handleCommandComplete = data => {
      if (data.commandId === toolCallId.value) {
        currentStatus.value = 'completed';
        result.value = data.result || '';
        error.value = '';
        completionTimestamp.value = Date.now();
        executionTime.value = data.executionTime || Date.now() - startTime.value;

        // 清理定时器
        if (updateTimer) {
          clearInterval(updateTimer);
          updateTimer = null;
        }
      }
    };

    // 监听命令错误事件
    const handleCommandError = data => {
      if (data.commandId === toolCallId.value) {
        currentStatus.value = 'error';
        result.value = '';
        error.value = data.error || '';
        completionTimestamp.value = Date.now();
        executionTime.value = data.executionTime || Date.now() - startTime.value;

        // 清理定时器
        if (updateTimer) {
          clearInterval(updateTimer);
          updateTimer = null;
        }
      }
    };

    // 方法
    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value;
    };

    const copyContent = async () => {
      const content = result.value || error.value;
      try {
        await navigator.clipboard.writeText(content);
        emit('copy-to-clipboard', '内容已复制到剪贴板', 'success');
      } catch (error) {
        console.error('复制失败:', error);
        emit('copy-to-clipboard', '复制失败', 'error');
      }
    };

    const retryCommand = () => {
      if (command.value) {
        emit('retry-command', command.value);
      }
    };

    const formatTime = timestamp => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    // 生命周期
    onMounted(() => {
      if (isToolStart.value) {
        // 根据消息类型设置初始状态
        if (props.message.type === 'tool-complete') {
          currentStatus.value = 'completed';
          result.value = props.message.metadata?.result || '';
          completionTimestamp.value = props.message.timestamp;
          executionTime.value = props.message.metadata?.executionTime || 0;
        } else if (props.message.type === 'tool-error') {
          currentStatus.value = 'error';
          error.value = props.message.metadata?.error || '';
          completionTimestamp.value = props.message.timestamp;
          executionTime.value = props.message.metadata?.executionTime || 0;
        } else {
          // tool-start 类型，开始执行
          currentStatus.value = 'executing';
          // 开始执行时间更新定时器
          updateTimer = setInterval(updateExecutionTime, 100);

          // 注册事件监听器
          onEvent(EventTypes.AI_COMMAND_COMPLETE, handleCommandComplete, componentId);
          onEvent(EventTypes.AI_COMMAND_ERROR, handleCommandError, componentId);

          // 检查是否已经存在结果（在消息创建时就已经完成的情况）
          if (props.message.metadata?.result) {
            currentStatus.value = 'completed';
            result.value = props.message.metadata.result;
            completionTimestamp.value = props.message.timestamp;
            executionTime.value = props.message.metadata.executionTime || 0;

            if (updateTimer) {
              clearInterval(updateTimer);
              updateTimer = null;
            }
          } else if (props.message.metadata?.error) {
            currentStatus.value = 'error';
            error.value = props.message.metadata.error;
            completionTimestamp.value = props.message.timestamp;
            executionTime.value = props.message.metadata.executionTime || 0;

            if (updateTimer) {
              clearInterval(updateTimer);
              updateTimer = null;
            }
          }
        }
      }
    });

    onUnmounted(() => {
      // 清理定时器
      if (updateTimer) {
        clearInterval(updateTimer);
      }

      // 清理事件监听器
      offEvent(EventTypes.AI_COMMAND_COMPLETE, handleCommandComplete);
      offEvent(EventTypes.AI_COMMAND_ERROR, handleCommandError);
    });

    // 监听实时输出变化，自动展开面板
    watch(
      () => props.realtimeOutput,
      newOutput => {
        if (
          newOutput &&
          newOutput.trim() &&
          currentStatus.value === 'executing' &&
          isCollapsed.value &&
          props.showRealtimeOutput
        ) {
          isCollapsed.value = false;
        }
      }
    );

    return {
      // 状态
      isCollapsed,
      currentStatus,
      result,
      error,
      executionTime,
      completionTimestamp,

      // 计算属性
      isToolStart,
      toolCallId,
      command,
      formattedExecutionTime,
      statusText,
      statusClass,
      hasContentToCopy,
      suggestion,
      formattedContent,

      // 方法
      toggleCollapse,
      copyContent,
      retryCommand,
      formatTime
    };
  }
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.command-execution {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  animation: slideIn 0.3s ease;

  &.status-executing {
    .execution-header {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
  }

  &.status-completed {
    .execution-header {
      background: rgba(74, 222, 128, 0.1);
      border: 1px solid rgba(74, 222, 128, 0.3);
    }
  }

  &.status-error {
    .execution-header {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
  }
}

// 工具执行容器
.tool-execution {
  .execution-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .execution-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-icon {
    width: 16px;
    height: 16px;

    &.executing {
      color: var(--color-info, #3b82f6);
      animation: spin 1s linear infinite;
    }

    &.success {
      color: var(--color-success, #4ade80);
    }

    &.error {
      color: var(--color-error, #ef4444);
    }
  }

  .status-text {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary, #ffffff);
  }

  .execution-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .command-text {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: var(--color-warning, #f59e0b);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .execution-time {
    font-size: 11px;
    color: var(--text-tertiary, #888);
  }
}

// 执行面板
.execution-panel {
  background: var(--bg-surface, #2a2a2a);
  border: 1px solid var(--border-color, #3a3a3a);
  border-radius: 6px;
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
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--border-color, #3a3a3a);

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
}

.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapsed-indicator {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.execution-dots {
  display: flex;
  gap: 2px;

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

.toggle-icon {
  width: 14px;
  height: 14px;
  color: var(--text-secondary, #b0b0b0);
  transition: transform 0.2s ease;
}

.panel-copy,
.panel-retry {
  width: 20px;
  height: 20px;
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
}

.panel-retry:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: var(--color-info, #3b82f6);
}

.panel-content {
  padding: 14px;
  transition: all 0.3s ease;
  max-height: 400px;
  overflow-y: auto;
}

// 详细信息
.execution-details {
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 11px;

  &.warning {
    .detail-label {
      color: var(--color-warning, #f59e0b);
    }

    .detail-value.warning-text {
      color: var(--color-warning, #fbbf24);
      font-style: italic;
    }
  }
}

.detail-label {
  color: var(--text-tertiary, #888);
  font-weight: 500;
  min-width: 35px;
}

.detail-value {
  color: var(--text-primary, #e0e0e0);

  &.executing {
    color: var(--color-info, #3b82f6);
  }

  &.completed {
    color: var(--color-success, #4ade80);
  }

  &.error {
    color: var(--color-error, #f87171);
  }
}

.detail-command {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 10px;
  color: var(--color-warning, #f59e0b);
}

// 实时输出
.realtime-output {
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.05);
  overflow: hidden;
  margin-bottom: 16px;
}

.realtime-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(59, 130, 246, 0.1);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.realtime-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-info, #93c5fd);
}

.realtime-indicator {
  width: 6px;
  height: 6px;
  background: var(--color-info, #3b82f6);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.realtime-content {
  max-height: 150px;
  overflow-y: auto;
}

.realtime-text {
  margin: 0;
  padding: 8px 10px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-primary, #e0e0e0);
  white-space: pre-wrap;
  word-wrap: break-word;
  background: transparent;
}

// 结果内容
.result-content,
.error-content {
  margin-bottom: 0;
}

.result-header,
.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 500;
}

.result-header {
  color: var(--color-success, #4ade80);
}

.error-header {
  color: var(--color-error, #fca5a5);
}

.result-icon,
.error-icon {
  width: 16px;
  height: 16px;
}

.result-output,
.error-output {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 10px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-primary, #e0e0e0);
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 250px;
  overflow-y: auto;
  margin: 0;
  border: 1px solid var(--border-color, #4a4a4a);

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color, #4a4a4a);
    border-radius: 2px;
  }
}

.result-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 10px;
  color: var(--text-tertiary, #888);
}

.completion-time {
  color: var(--color-success, #4ade80);
}

// 错误建议
.error-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 8px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.suggestion-icon {
  width: 12px;
  height: 12px;
  color: var(--color-info, #3b82f6);
  margin-top: 1px;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
}

.suggestion-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-warning, #f59e0b);
  margin-right: 4px;
}

.suggestion-text {
  font-size: 11px;
  color: var(--color-warning, #fbbf24);
  line-height: 1.4;
}

// 无内容
.no-content {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary, #888);
  font-style: italic;
}

.no-content-text {
  font-size: 12px;
}

// 系统消息
.system-message {
  background: rgba(107, 114, 128, 0.05);
  border: 1px solid rgba(107, 114, 128, 0.2);
  border-radius: 6px;
  overflow: hidden;
}

.system-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(107, 114, 128, 0.1);
  border-bottom: 1px solid rgba(107, 114, 128, 0.2);
}

.system-icon {
  width: 14px;
  height: 14px;
  color: var(--color-secondary, #6b7280);
}

.system-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
  flex: 1;
}

.system-time {
  font-size: 10px;
  color: var(--text-tertiary, #888);
}

.system-content {
  padding: 12px 14px;
}

.system-text {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-primary, #e0e0e0);

  :deep(code) {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    padding: 1px 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: var(--color-warning, #f59e0b);
  }
}

// 动画
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
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

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes executionDotPulse {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .execution-header {
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .execution-info {
    width: 100%;
    justify-content: space-between;
  }

  .panel-header {
    padding: 8px 12px;
  }

  .panel-content {
    padding: 12px;
  }

  .detail-row {
    font-size: 10px;
  }

  .result-output,
  .error-output {
    font-size: 10px;
    padding: 8px;
  }
}
</style>