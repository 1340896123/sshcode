<template>
  <div class="connection-content">
    <div
      v-for="connection in connections"
      :key="connection.id"
      v-show="activeTabId === connection.id"
      class="tab-panel"
    >
      <!-- 会话标签页 (只在连接成功时显示) -->
      <SessionTabs
        v-if="connection.status === 'connected'"
        :connection="connection"
        :sessions="getConnectionSessions(connection.id)"
        :active-session-id="connection.activeSessionId"
        @session-selected="$emit('session-selected', $event)"
        @session-created="$emit('session-created', $event)"
        @session-closed="$emit('session-closed', $event)"
        @session-renamed="$emit('session-renamed', $event)"
        @session-duplicated="$emit('session-duplicated', $event)"
      />

      <!-- 会话终端内容 -->
      <div class="session-content">
        <template v-if="connection.status === 'connected'">
          <div
            v-for="session in getConnectionSessions(connection.id)"
            :key="session.id"
            v-show="session.id === connection.activeSessionId"
            class="session-panel"
          >
            <!-- 三部分布局容器 -->
            <ThreePanelLayout
              v-if="session"
              :connection="connection"
              :session="session"
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
              @session-ready="$emit('session-ready', $event)"
              @session-data="$emit('session-data', $event)"
              @shell-connected="$emit('shell-connected', $event)"
              @shell-disconnected="$emit('shell-disconnected', $event)"
              @shell-error="$emit('shell-error', $event)"
            />
          </div>

          <!-- 无会话时的提示 -->
          <div v-if="getConnectionSessions(connection.id).length === 0" class="no-sessions">
            <div class="no-sessions-content">
              <div class="no-sessions-icon">📋</div>
              <h3>暂无会话</h3>
              <p>当前连接没有活动的终端会话</p>
            </div>
          </div>
        </template>
      </div>

      <!-- 连接状态栏 -->
      <ConnectionStatusBar v-if="connection.status === 'connected'" :connection="connection" />

      <!-- 连接中状态 -->
      <ConnectingState
        v-else-if="connection.status === 'connecting'"
        :connection="connection"
        @cancel-connection="$emit('cancel-connection', $event)"
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
import ThreePanelLayout from '../layout/ThreePanelLayout.vue';
import ConnectionStatusBar from '../connection/ConnectionStatusBar.vue';
import ConnectingState from '../connection/ConnectingState.vue';
import ConnectionFailedState from '../connection/ConnectionFailedState.vue';
import DisconnectedState from '../connection/DisconnectedState.vue';
import SessionTabs from '../../modules/terminal/components/SessionTabs.vue';
import SessionTerminal from '../../modules/terminal/components/SessionTerminal.vue';

export default {
  name: 'ConnectionContent',
  components: {
    ThreePanelLayout,
    ConnectionStatusBar,
    ConnectingState,
    ConnectionFailedState,
    DisconnectedState,
    SessionTabs,
    SessionTerminal
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
    },
    // Add session manager function prop
    getConnectionSessions: {
      type: Function,
      default: () => () => []
    },
    getActiveSession: {
      type: Function,
      default: () => () => null
    }
  },
  emits: [
    'switch-tab',
    'session-selected',
    'session-created',
    'session-closed',
    'session-renamed',
    'session-duplicated',
    'session-ready',
    'session-data',
    'shell-connected',
    'shell-disconnected',
    'shell-error',
    'execute-command',
    'clear-terminal',
    'copy-terminal-content',
    'reconnect-connection',
    'disconnect-connection',
    'cancel-connection',
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
};
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

.session-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.session-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.no-sessions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;
}

.no-sessions-content {
  text-align: center;
  max-width: 400px;
  padding: 40px 20px;
}

.no-sessions-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-sessions h3 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.no-sessions p {
  margin: 0;
  color: #868e96;
  font-size: 14px;
  line-height: 1.5;
}
</style>
