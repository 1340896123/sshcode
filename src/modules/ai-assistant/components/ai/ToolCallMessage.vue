<template>
  <div class="tool-call-message" :class="[`tool-${message.type}`, { 'is-collapsed': isCollapsed }]">
    <!-- 工具调用头部 -->
    <div class="tool-call-header" @click="toggleCollapse">
      <div class="tool-call-info">
        <div class="tool-icon" :class="iconClass">
          <component :is="iconComponent" />
        </div>
        <div class="tool-details">
          <div class="tool-title">{{ title }}</div>
          <div class="tool-description">{{ description }}</div>
          <div class="tool-meta">
            <span class="tool-time">{{ formatTime(message.timestamp) }}</span>
            <span v-if="message.metadata?.executionTime" class="execution-time">
              ⏱ {{ (message.metadata.executionTime / 1000).toFixed(2) }}s
            </span>
            <span v-if="command" class="tool-command">
              <code>{{ command }}</code>
            </span>
          </div>
        </div>
      </div>
      <div class="tool-actions">
        <button
          v-if="isCollapsible"
          class="collapse-toggle"
          :class="{ 'is-collapsed': isCollapsed }"
        >
          <ChevronDownIcon v-if="!isCollapsed" />
          <ChevronRightIcon v-else />
        </button>
        <button v-if="hasContent" class="copy-button" @click.stop="copyContent" title="复制内容">
          <CopyIcon />
        </button>
      </div>
    </div>

    <!-- 工具调用内容 -->
    <div v-if="!isCollapsed && hasContent" class="tool-call-content">
      <!-- 成功结果 -->
      <div
        v-if="message.type === 'tool-result' && message.metadata?.status === 'completed'"
        class="result-content"
      >
        <div class="result-header">
          <CheckIcon class="status-icon success" />
          <span>命令执行成功</span>
        </div>
        <div class="result-body">
          <pre class="result-output">{{ message.metadata.result }}</pre>
        </div>
      </div>

      <!-- 错误结果 -->
      <div
        v-else-if="message.type === 'tool-result' && message.metadata?.status === 'error'"
        class="error-content"
      >
        <div class="error-header">
          <XIcon class="status-icon error" />
          <span>命令执行失败</span>
        </div>
        <div class="error-body">
          <pre class="error-output">{{ message.metadata.error }}</pre>
        </div>
      </div>

      <!-- 执行中状态 -->
      <div v-else-if="message.type === 'tool-start'" class="executing-content">
        <div class="executing-header">
          <LoaderIcon class="status-icon executing" />
          <span>正在执行命令...</span>
        </div>
        <div class="executing-body">
          <div class="executing-progress">
            <div class="progress-bar"></div>
          </div>
          <p class="executing-hint">请稍候，AI正在处理您的请求</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';

export default {
  name: 'ToolCallMessage',
  props: {
    message: {
      type: Object,
      required: true
    },
    collapsedByDefault: {
      type: Boolean,
      default: true
    }
  },
  emits: ['copy-to-clipboard'],
  setup(props, { emit }) {
    const isCollapsed = ref(props.collapsedByDefault);

    // 计算属性
    const command = computed(() => props.message.metadata?.command);

    const title = computed(() => {
      switch (props.message.type) {
        case 'tool-start':
          return '🤖 AI工具调用';
        case 'tool-result':
          return props.message.metadata?.status === 'completed' ? '✅ 命令完成' : '❌ 命令失败';
        default:
          return '🔧 系统消息';
      }
    });

    const description = computed(() => {
      if (props.message.type === 'tool-start' && command.value) {
        return `执行命令: ${command.value}`;
      } else if (props.message.type === 'tool-result') {
        if (props.message.metadata?.status === 'completed') {
          return '命令已成功执行';
        } else if (props.message.metadata?.status === 'error') {
          return '命令执行时发生错误';
        }
      }
      return props.message.content || '系统消息';
    });

    const iconClass = computed(() => {
      switch (props.message.type) {
        case 'tool-start':
          return 'icon-executing';
        case 'tool-result':
          return props.message.metadata?.status === 'completed' ? 'icon-success' : 'icon-error';
        default:
          return 'icon-info';
      }
    });

    const iconComponent = computed(() => {
      switch (props.message.type) {
        case 'tool-start':
          return 'LoaderIcon';
        case 'tool-result':
          return props.message.metadata?.status === 'completed' ? 'CheckIcon' : 'XIcon';
        default:
          return 'InfoIcon';
      }
    });

    const isCollapsible = computed(() => {
      return props.message.isCollapsible || props.message.type === 'tool-result';
    });

    const hasContent = computed(() => {
      return (
        (props.message.type === 'tool-result' &&
          (props.message.metadata?.result || props.message.metadata?.error)) ||
        props.message.content
      );
    });

    const contentToCopy = computed(() => {
      if (props.message.type === 'tool-result') {
        return props.message.metadata?.result || props.message.metadata?.error || '';
      }
      return props.message.content || '';
    });

    // 方法
    const toggleCollapse = () => {
      if (isCollapsible.value) {
        isCollapsed.value = !isCollapsed.value;
      }
    };

    const copyContent = async () => {
      try {
        await navigator.clipboard.writeText(contentToCopy.value);
        emit('copy-to-clipboard', '已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        emit('copy-to-clipboard', '复制失败', 'error');
      }
    };

    const formatTime = timestamp => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    return {
      // 状态
      isCollapsed,

      // 计算属性
      command,
      title,
      description,
      iconClass,
      iconComponent,
      isCollapsible,
      hasContent,
      contentToCopy,

      // 方法
      toggleCollapse,
      copyContent,
      formatTime
    };
  }
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.tool-call-message {
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
    .tool-call-content {
      max-height: 0;
      opacity: 0;
    }
  }

  // 执行中状态
  &.tool-start {
    border-color: var(--color-info, #3b82f6);
    background: rgba(59, 130, 246, 0.05);
  }

  // 成功状态
  &.tool-result {
    border-color: var(--color-success, #4ade80);
    background: rgba(74, 222, 128, 0.05);
  }
}

.tool-call-header {
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

.tool-call-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.tool-icon {
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

  &.icon-info {
    background: var(--color-info, #6366f1);
    color: white;
  }
}

.tool-details {
  flex: 1;
  min-width: 0;
}

.tool-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin-bottom: 4px;
}

.tool-description {
  font-size: 13px;
  color: var(--text-secondary, #b0b0b0);
  margin-bottom: 6px;
  line-height: 1.4;
}

.tool-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tool-time {
  font-size: 11px;
  color: var(--text-tertiary, #888);
}

.execution-time {
  font-size: 11px;
  color: var(--color-info, #3b82f6);
  font-weight: 500;
}

.tool-command {
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

.tool-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.collapse-toggle {
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

  &.is-collapsed {
    transform: rotate(-90deg);
  }
}

.copy-button {
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
}

.tool-call-content {
  max-height: 400px;
  opacity: 1;
  transition: all 0.3s ease;
  border-top: 1px solid var(--border-color, #3a3a3a);
}

.result-content,
.error-content,
.executing-content {
  padding: 16px;
}

.result-header,
.error-header,
.executing-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
}

.result-header {
  color: var(--color-success, #4ade80);
}

.error-header {
  color: var(--color-error, #ef4444);
}

.executing-header {
  color: var(--color-info, #3b82f6);
}

.status-icon {
  width: 16px;
  height: 16px;

  &.success {
    color: var(--color-success, #4ade80);
  }

  &.error {
    color: var(--color-error, #ef4444);
  }

  &.executing {
    color: var(--color-info, #3b82f6);
    animation: spin 1s linear infinite;
  }
}

.result-body,
.error-body {
  margin: 0;
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

  // 滚动条样式
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

.executing-body {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  .tool-call-header {
    padding: 12px;
  }

  .tool-call-info {
    gap: 8px;
  }

  .tool-icon {
    width: 20px;
    height: 20px;
  }

  .tool-title {
    font-size: 13px;
  }

  .tool-description {
    font-size: 12px;
  }

  .tool-meta {
    gap: 8px;
  }

  .collapse-toggle,
  .copy-button {
    width: 24px;
    height: 24px;
  }

  .result-content,
  .error-content,
  .executing-content {
    padding: 12px;
  }

  .result-output,
  .error-output {
    font-size: 11px;
    padding: 10px;
  }
}
</style>
