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
          <button class="control-btn" @click="$emit('clear-terminal', connection.id)" title="清空">
            🗑️
          </button>
          <button class="control-btn" @click="$emit('copy-terminal-content', connection.id)" title="复制">
            📋
          </button>
        </div>
      </div>
      <div class="panel-body">
        <div class="terminal-content">
          <div
            class="terminal-output"
            :ref="`terminal-${connection.id}`"
            @contextmenu.prevent="$emit('handle-terminal-context-menu', $event, connection.id)"
            @mouseup="$emit('handle-terminal-mouse-up', $event, connection.id)"
            @selectstart="$emit('handle-terminal-select-start')"
          >
            <div
              v-for="(line, index) in connection.terminalOutput"
              :key="index"
              class="terminal-line"
              :class="{ 'error-line': line.type === 'error', 'success-line': line.type === 'success' }"
            >
              <span class="line-timestamp" v-if="line.timestamp">
                {{ formatTimestamp(line.timestamp) }}
              </span>
              <span class="line-content" v-if="line.isHtml" v-html="line.content"></span>
              <span class="line-content" v-else>{{ line.content }}</span>
            </div>
            <div v-if="connection.terminalOutput.length === 0" class="terminal-welcome">
              欢迎使用SSH终端，输入命令开始操作...
            </div>
          </div>
          <div class="terminal-input-container">
            <div class="terminal-prompt">{{ connection.username }}@{{ connection.host }}:~$</div>
            <div class="terminal-input-wrapper">
              <input
                type="text"
                class="terminal-input"
                :ref="`input-${connection.id}`"
                v-model="connection.currentCommand"
                @keydown="$emit('handle-terminal-keydown', $event, connection)"
                @input="$emit('handle-terminal-input', connection)"
                @focus="$emit('handle-terminal-focus', connection)"
                @blur="$emit('handle-terminal-blur', connection)"
                placeholder="输入SSH命令..."
                :disabled="connection.status !== 'connected'"
              />
              <TerminalAutocomplete
                :ref="el => $emit('set-autocomplete-ref', connection.id, el)"
                :current-input="connection.currentCommand"
                :is-visible="connection.showAutocomplete"
                @select="$emit('handle-autocomplete-select', $event)"
                @hide="$emit('handle-autocomplete-hide')"
              />
            </div>
            <button
              class="execute-btn"
              @click="$emit('execute-command', connection)"
              :disabled="!connection.currentCommand.trim() || connection.status !== 'connected'"
            >
              执行
            </button>
          </div>
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
          @show-notification="$emit('show-notification', $event)"
          @execute-command="$emit('execute-command-from-ai', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import FileManager from '../FileManager.vue'
import AIAssistant from '../AIAssistant.vue'
import TerminalAutocomplete from '../TerminalAutocomplete.vue'

export default {
  name: 'ThreePanelLayout',
  components: {
    FileManager,
    AIAssistant,
    TerminalAutocomplete
  },
  props: {
    connection: {
      type: Object,
      required: true
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
    'start-resize'
  ],
  methods: {
    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleTimeString()
    }
  }
}
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
}

// 终端样式 (在新的三面板布局中)
.terminal-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: color(surface);
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
