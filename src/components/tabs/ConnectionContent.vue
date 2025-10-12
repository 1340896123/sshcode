<template>
  <div class="connection-content">
    <div
      v-for="connection in connections"
      :key="connection.id"
      v-show="activeTabId === connection.id"
      class="tab-panel"
    >
      <!-- 三部分布局容器 -->
      <ThreePanelLayout
        v-if="connection.status === 'connected'"
        :connection="connection"
        :panel-widths="panelWidths"
        :is-resizing="isResizing"
        @execute-command="$emit('execute-command', $event)"
        @clear-terminal="$emit('clear-terminal', $event)"
        @copy-terminal-content="$emit('copy-terminal-content', $event)"
        @show-notification="$emit('show-notification', $event)"
        @handle-terminal-context-menu="$emit('handle-terminal-context-menu', $event)"
        @handle-terminal-mouse-up="$emit('handle-terminal-mouse-up', $event)"
        @handle-terminal-select-start="$emit('handle-terminal-select-start')"
        @handle-terminal-keydown="$emit('handle-terminal-keydown', $event)"
        @handle-terminal-input="$emit('handle-terminal-input', $event)"
        @handle-terminal-focus="$emit('handle-terminal-focus', $event)"
        @handle-terminal-blur="$emit('handle-terminal-blur', $event)"
        @handle-autocomplete-select="$emit('handle-autocomplete-select', $event)"
        @handle-autocomplete-hide="$emit('handle-autocomplete-hide', $event)"
        @set-autocomplete-ref="$emit('set-autocomplete-ref', $event)"
        @execute-command-from-ai="$emit('execute-command-from-ai', $event)"
        @start-resize="$emit('start-resize', $event)"
        @show-settings="$emit('show-settings')"
      />

      <!-- 连接状态栏 -->
      <ConnectionStatusBar
        v-if="connection.status === 'connected'"
        :connection="connection"
      />

      <!-- 连接中状态 -->
      <ConnectingState
        v-else-if="connection.status === 'connecting'"
        :connection="connection"
      />

      <!-- 连接失败状态 -->
      <ConnectionFailedState
        v-else-if="connection.status === 'failed'"
        :connection="connection"
        @reconnect="$emit('reconnect-connection', connection)"
        @edit="$emit('open-session-modal')"
      />

      <!-- 已断开连接状态 -->
      <DisconnectedState
        v-else-if="connection.status === 'disconnected'"
        :connection="connection"
        @reconnect="$emit('reconnect-connection', connection)"
      />
    </div>
  </div>
</template>

<script>
import ThreePanelLayout from '../layout/ThreePanelLayout.vue'
import ConnectionStatusBar from '../connection/ConnectionStatusBar.vue'
import ConnectingState from '../connection/ConnectingState.vue'
import ConnectionFailedState from '../connection/ConnectionFailedState.vue'
import DisconnectedState from '../connection/DisconnectedState.vue'

export default {
  name: 'ConnectionContent',
  components: {
    ThreePanelLayout,
    ConnectionStatusBar,
    ConnectingState,
    ConnectionFailedState,
    DisconnectedState
  },
  props: {
    connections: {
      type: Array,
      default: () => []
    },
    activeTabId: {
      type: String,
      default: null
    },
    panelWidths: {
      type: Object,
      default: () => ({ files: 30, terminal: 40, ai: 30 })
    },
    isResizing: {
      type: Boolean,
      default: false
    },
    contextMenu: {
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'switch-tab',
    'execute-command',
    'clear-terminal',
    'copy-terminal-content',
    'reconnect-connection',
    'disconnect-connection',
    'show-notification',
    'open-session-modal',
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
    'hide-context-menu',
    'update-context-menu-position',
    'handle-context-menu-copy',
    'handle-context-menu-add-to-ai',
    'handle-context-menu-select-all',
    'execute-command-from-ai',
    'start-resize',
    'show-settings'
  ]
}
</script>

<style lang="scss" scoped>
.connection-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
