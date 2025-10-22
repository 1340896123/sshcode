<template>
  <div class="three-panel-layout" :class="{ resizing: isResizing }">
    <!-- 文件管理面板 (可调整宽度) -->
    <div class="panel-section files-panel" :style="{ width: panelWidths.files + '%' }">
      <div class="panel-header">
        <h3><span class="panel-icon">📁</span> 文件管理</h3>
      </div>
      <div class="panel-body">
        <FileManager
          :connection-id="connection.id"
          :connection="connection"
          :session="session"
          @show-notification="$emit('show-notification', $event)"
          @execute-command="$emit('execute-command', $event)"
        />
      </div>
    </div>

    <!-- 第一个拖拽分隔符 -->
    <div
      class="resize-handle resize-handle-vertical"
      @mousedown="$emit('start-resize', $event, 'files-terminal')"
    ></div>

    <!-- 终端面板 (可调整宽度) -->
    <div class="panel-section terminal-panel" :style="{ width: panelWidths.terminal + '%' }">
      <div class="panel-header">
        <h3><span class="panel-icon">💻</span> SSH Terminal - {{ connection.host }}</h3>
        <div class="panel-controls">
          <button
            class="control-btn"
            @click="showTerminalInput"
            title="显示浮动输入框 (Ctrl+Shift+T)"
          >
            ✏️
          </button>
          <button class="control-btn" @click="$emit('clear-terminal', connection.id)" title="清空">
            🗑️
          </button>
          <button
            class="control-btn"
            @click="$emit('copy-terminal-content', connection.id)"
            title="复制"
          >
            📋
          </button>
        </div>
      </div>
      <div class="panel-body">
        <div class="terminal-content">
          <!-- SessionTerminal组件 (包含会话上下文) -->
          <SessionTerminal
            v-if="session && session.status === 'connected'"
            :connection="connection"
            :session="session"
            :height="'400px'"
            :font-size="14"
            @execute-command="handleTerminalInputCommand"
            @show-notification="$emit('show-notification', $event)"
            @session-ready="$emit('session-ready', $event)"
            @session-data="$emit('session-data', $event)"
            @shell-connected="$emit('shell-connected', $event)"
            @shell-disconnected="$emit('shell-disconnected', $event)"
            @shell-error="$emit('shell-error', $event)"
          />

          <!-- 无会话时的提示 -->
          <div v-else class="no-session-terminal">
            <div class="no-session-content">
              <div class="no-session-icon">💻</div>
              <h3>无活动会话</h3>
              <p>请选择或创建一个终端会话以开始使用</p>
            </div>
          </div>

          <!-- 浮动输入框组件 -->
          <TerminalInput
            :is-visible="showTerminalInput"
            :connection-id="connection.id"
            :session-id="session?.id"
            :prompt="'$'"
            @execute-command="handleTerminalInputCommand"
            @hide-input="hideTerminalInput"
            @show-notification="$emit('show-notification', $event)"
          />
        </div>
      </div>
    </div>

    <!-- 第二个拖拽分隔符 -->
    <div
      class="resize-handle resize-handle-vertical"
      @mousedown="$emit('start-resize', $event, 'terminal-ai')"
    ></div>

    <!-- AI助手面板 (可调整宽度) -->
    <div class="panel-section ai-panel" :style="{ width: panelWidths.ai + '%' }">
      <div class="panel-header">
        <h3><span class="panel-icon">🤖</span> AI助手</h3>
      </div>
      <div class="panel-body">
        <AIAssistant
          :connection-id="connection.id"
          :connection="connection"
          :session="session"
          @show-notification="$emit('show-notification', $event)"
          @execute-command="$emit('execute-command-from-ai', $event)"
          @show-settings="$emit('show-settings')"
        />
      </div>
    </div>
  </div>
</template>

<script>
import FileManager from '../../modules/file-manager/components/FileManager.vue';
import AIAssistant from '../../modules/ai-assistant/components/AIAssistant.vue';
import TerminalAutocomplete from '../../modules/terminal/components/TerminalAutocomplete.vue';
import TerminalInput from '../../modules/terminal/components/TerminalInput.vue';
import XTerminal from '../../modules/terminal/components/XTerminal.vue';
import SessionTerminal from '../../modules/terminal/components/SessionTerminal.vue';
import { useAIStore } from '../../modules/ai-assistant/stores/ai.js';

export default {
  name: 'ThreePanelLayout',
  components: {
    FileManager,
    AIAssistant,
    TerminalAutocomplete,
    TerminalInput,
    XTerminal,
    SessionTerminal
  },
  props: {
    connection: {
      type: Object,
      required: true
    },
    session: {
      type: Object,
      default: null
    },
    panelWidths: {
      type: Object,
      default: () => ({ files: 30, terminal: 40, ai: 30 })
    },
    isResizing: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showTerminalInput: false
    };
  },
  emits: [
    'execute-command',
    'clear-terminal',
    'copy-terminal-content',
    'show-notification',
    'handle-terminal-context-menu',
    'handle-terminal-mouse-up',
    'handle-terminal-select-start',
    'handle-terminal-keydown',
    'handle-terminal-input',
    'handle-terminal-focus',
    'handle-terminal-blur',
    'handle-autocomplete-select',
    'handle-autocomplete-hide',
    'set-autocomplete-ref',
    'execute-command-from-ai',
    'start-resize',
    'show-settings'
  ],
  mounted() {
    // 监听键盘快捷键来显示/隐藏浮动输入框
    document.addEventListener('keydown', this.handleGlobalKeydown);

    // 初始化AI store
    this.aiStore = useAIStore();

    // 监听AI store的终端输入状态
    this.watchAITerminalInput();
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleGlobalKeydown);
  },
  methods: {
    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleTimeString();
    },

    // 新的终端事件处理方法
    handleTerminalData(data) {
      // 可以在这里处理终端数据
      console.log('Terminal data:', data);
    },

    handleTerminalResize({ cols, rows }) {
      console.log('Terminal resized:', { cols, rows });
    },

    handleTerminalFocus() {
      console.log('Terminal focused');
    },

    handleTerminalBlur() {
      console.log('Terminal blurred');
    },

    handleTerminalContextMenu(event) {
      this.$emit('handle-terminal-context-menu', event, this.connection.id);
    },

    // TerminalInput 相关方法
    handleTerminalInputCommand(command) {
      console.log('🎯 [ThreePanelLayout] 收到TerminalInput命令:', command);
      // 将命令转发给父组件执行
      this.$emit('execute-command', command);
      // 执行后隐藏输入框
      this.hideTerminalInput();
    },

    hideTerminalInput() {
      this.showTerminalInput = false;
    },

    showTerminalInput() {
      this.showTerminalInput = true;
    },

    // 全局键盘事件处理
    handleGlobalKeydown(event) {
      // Ctrl+Shift+T 显示浮动输入框
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        this.showTerminalInput = !this.showTerminalInput;
        console.log('🔧 [ThreePanelLayout] 切换TerminalInput显示状态:', this.showTerminalInput);
      }

      // Escape 隐藏浮动输入框
      if (event.key === 'Escape' && this.showTerminalInput) {
        event.preventDefault();
        this.hideTerminalInput();
      }
    },

    // 处理显示输入框的事件
    handleShowTerminalInput(event) {
      this.showTerminalInput = true;
    },

    // 监听AI store的终端输入状态变化
    watchAITerminalInput() {
      if (this.aiStore) {
        // 监听store中的终端输入状态
        this.$watch(
          () => this.aiStore.terminalInput.isVisible,
          isVisible => {
            if (isVisible) {
              this.showTerminalInput = true;
              // 如果有文本内容，也设置到本地状态
              if (this.aiStore.terminalInput.text) {
                // 可以在这里处理文本内容
              }
            } else {
              this.showTerminalInput = false;
            }
          }
        );
      }
    }
  }
};
</script>

<style lang="scss" scoped>
// 三部分布局样式 (可调整宽度)
.three-panel-layout {
  flex: 1;
  display: flex;
  gap: 0;
  background: color(border);
  overflow: hidden;
  position: relative;
}

.panel-section {
  display: flex;
  flex-direction: column;
  background: color(surface);
  overflow: hidden;
  position: relative;
  min-width: 10%; // 最小宽度限制
  max-width: 60%; // 最大宽度限制
  transition: width 0.1s ease-out;

  &.files-panel {
    // 宽度由内联样式控制
    flex: none;
  }

  &.terminal-panel {
    // 宽度由内联样式控制
    flex: none;
  }

  &.ai-panel {
    // 宽度由内联样式控制
    flex: none;
  }
}

// 拖拽分隔符样式
.resize-handle {
  background: color(border);
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.2s ease;

  &:hover {
    background: color(primary);
  }

  &.resize-handle-vertical {
    width: 4px;
    cursor: col-resize;
    height: 100%;

    // 添加悬停效果
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 100%;
      background: transparent;
      transition: background-color 0.2s ease;
    }

    &:hover::before {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// 拖拽时的样式
.three-panel-layout.resizing {
  .resize-handle {
    background: color(primary);
  }

  .panel-section {
    pointer-events: none; // 拖拽时禁用面板内容交互
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(md);
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: font-size(sm);
    font-weight: font-weight(medium);
    color: color(text-primary);
    display: flex;
    align-items: center;
    gap: spacing(xs);
  }

  .panel-icon {
    font-size: 14px;
  }
}

.panel-controls {
  display: flex;
  gap: spacing(xs);

  .control-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: color(text-secondary);
    border-radius: border-radius(sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all transition(fast) ease;

    &:hover {
      background: color(bg-tertiary);
      color: color(text-primary);
    }
  }
}

.panel-body {
  flex: 1;
  overflow: hidden;
  position: relative;

  // AI面板特殊处理，允许内容正常滚动
  .ai-panel & {
    overflow: visible;
  }
}

// 终端样式 (在新的三面板布局中)
.terminal-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: color(surface);
}

.no-session-terminal {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;
}

.no-session-content {
  text-align: center;
  max-width: 300px;
  padding: 40px 20px;
}

.no-session-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-session h3 {
  margin: 0 0 12px 0;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.no-session p {
  margin: 0;
  color: #868e96;
  font-size: 14px;
  line-height: 1.4;
}

.terminal-output {
  flex: 1;
  padding: spacing(md);
  background: #1e1e1e;
  color: #f0f0f0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-line {
  margin-bottom: 2px;

  &.error-line {
    color: #ff6b6b;
  }

  &.success-line {
    color: #51cf66;
  }

  &.command {
    color: #74c0fc;
    font-weight: bold;
  }
}

.line-timestamp {
  color: #868e96;
  margin-right: spacing(sm);
  font-size: 11px;
}

.line-content {
  white-space: pre-wrap;
}

.terminal-welcome {
  color: #868e96;
  font-style: italic;
}

.terminal-input-container {
  display: flex;
  align-items: center;
  padding: spacing(md);
  background: color(bg-primary);
  border-top: 1px solid color(border);
  gap: spacing(sm);
}

.terminal-prompt {
  color: #74c0fc;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
}

.terminal-input-wrapper {
  flex: 1;
  position: relative;
}

.terminal-input {
  width: 100%;
  background: transparent;
  border: none;
  color: color(text-primary);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  outline: none;

  &:disabled {
    opacity: 0.5;
  }
}

.execute-btn {
  padding: spacing(xs) spacing(sm);
  background: color(primary);
  color: color(white);
  border: none;
  border-radius: border-radius(sm);
  font-size: font-size(xs);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover:not(:disabled) {
    background: color(primary-light);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@media (max-width: 768px) {
  .terminal-input-container {
    flex-wrap: wrap;
  }
}
</style>
