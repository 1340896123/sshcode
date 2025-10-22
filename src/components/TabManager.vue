<template>
  <div class="tab-manager">
    <!-- 连接标签栏 -->
    <div class="connection-tab-bar">
      <div class="connection-tabs">
        <div
          v-for="connection in connections"
          :key="connection.id"
          :class="['connection-tab', { 'active': activeConnectionId === connection.id }]"
          @click="switchConnection(connection.id)"
          @contextmenu.prevent="showConnectionContextMenu($event, connection)"
        >
          <!-- 连接状态指示器 -->
          <div class="connection-status">
            <div v-if="connection.status === 'connecting'" class="status-indicator connecting">
              <div class="spinner"></div>
            </div>
            <div v-else-if="connection.status === 'connected'" class="status-indicator connected"></div>
            <div v-else-if="connection.status === 'failed'" class="status-indicator failed"></div>
            <div v-else class="status-indicator idle"></div>
          </div>

          <!-- 连接名称 -->
          <div class="connection-name" :title="connection.config.name">
            {{ connection.config.name }}
          </div>

          <!-- 关闭按钮 -->
          <button
            class="close-btn"
            @click.stop="closeConnection(connection.id)"
            title="关闭连接"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 新建连接按钮 -->
      <div class="connection-actions">
        <button
          class="new-connection-btn"
          @click="$emit('open-connection-modal')"
          title="新建连接"
        >
          <span class="icon">+</span>
        </button>
      </div>
    </div>

    <!-- 标签内容区域 -->
    <div class="tab-content-area">
      <!-- 无连接时的欢迎页面 -->
      <WelcomeScreen
        v-if="connections.length === 0"
        @open-connection-modal="$emit('open-connection-modal')"
      />

      <!-- 有连接时的内容 -->
      <div v-else class="connection-content">
        <div
          v-for="connection in connections"
          :key="connection.id"
          v-show="activeConnectionId === connection.id"
          class="connection-panel"
        >
          <!-- 连接中状态 -->
          <ConnectingState
            v-if="connection.status === 'connecting'"
            :connection="connection"
            @cancel-connection="cancelConnection(connection.id)"
          />

          <!-- 连接失败状态 -->
          <ConnectionFailedState
            v-else-if="connection.status === 'failed'"
            :connection="connection"
            @reconnect="reconnectConnection(connection.id)"
            @edit="$emit('open-connection-modal')"
          />

          <!-- 已断开连接状态 -->
          <DisconnectedState
            v-else-if="connection.status === 'disconnected'"
            :connection="connection"
            @reconnect="reconnectConnection(connection.id)"
          />

          <!-- 连接成功时显示会话 -->
          <div v-else-if="connection.status === 'connected'" class="sessions-container">
            <!-- 会话标签栏 -->
            <SessionTabBar
              :sessions="getConnectionSessions(connection.id)"
              :connection="connection"
              @session-selected="handleSessionSelected"
              @session-created="handleSessionCreated"
              @session-closed="handleSessionClosed"
              @session-renamed="handleSessionRenamed"
              @session-duplicated="handleSessionDuplicated"
            />

            <!-- 会话内容 -->
            <div class="session-content-area">
              <template v-if="getActiveSession(connection.id)">
                <SessionContent
                  :connection="connection"
                  :session="getActiveSession(connection.id)"
                  :panel-widths="panelWidths"
                  :is-resizing="isResizing"
                  @execute-command="executeCommand"
                  @clear-terminal="clearTerminal"
                  @copy-terminal-content="copyTerminalContent"
                  @show-notification="$emit('show-notification', $event)"
                  @start-resize="startResize"
                  @show-settings="$emit('show-settings')"
                  @session-ready="handleSessionReady"
                  @session-data="handleSessionData"
                  @shell-connected="handleShellConnected"
                  @shell-disconnected="handleShellDisconnected"
                  @shell-error="handleShellError"
                />
              </template>

              <!-- 无会话时的提示 -->
              <div v-else class="no-sessions">
                <div class="no-sessions-content">
                  <div class="no-sessions-icon">📋</div>
                  <h3>暂无会话</h3>
                  <p>点击"新建会话"按钮开始使用</p>
                  <button
                    class="create-first-session-btn"
                    @click="createFirstSession(connection.id)"
                  >
                    新建会话
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空闲连接状态 -->
          <div v-else class="idle-connection">
            <div class="idle-content">
              <div class="idle-icon">🔌</div>
              <h3>连接已就绪</h3>
              <p>点击"新建会话"开始连接</p>
              <button
                class="create-first-session-btn"
                @click="createFirstSession(connection.id)"
              >
                新建会话
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 连接右键菜单 -->
    <div
      v-if="connectionContextMenu.visible"
      class="context-menu"
      :style="{ left: connectionContextMenu.x + 'px', top: connectionContextMenu.y + 'px' }"
      @click="hideConnectionContextMenu"
    >
      <div class="context-menu-item" @click="editConnection">
        <span class="icon">✏️</span>
        编辑连接
      </div>
      <div class="context-menu-item" @click="reconnectFromMenu">
        <span class="icon">🔄</span>
        重新连接
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" @click="closeConnectionFromMenu">
        <span class="icon">✕</span>
        关闭连接
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import Convert from 'ansi-to-html';
import WelcomeScreen from './tabs/WelcomeScreen.vue';
import ConnectingState from './connection/ConnectingState.vue';
import ConnectionFailedState from './connection/ConnectionFailedState.vue';
import DisconnectedState from './connection/DisconnectedState.vue';
import SessionTabBar from './tabs/SessionTabBar.vue';
import SessionContent from './tabs/SessionContent.vue';
import { useConnectionManager } from '../composables/useConnectionManager';
import { useSessionManager } from '../composables/useNewSessionManager';
import { useTerminalManager } from '../modules/terminal/composables/useTerminalManager.js';
import { usePanelManager } from '../composables/usePanelManager';
import { useContextMenu } from '../composables/useContextMenu';

export default {
  name: 'TabManager',
  components: {
    WelcomeScreen,
    ConnectingState,
    ConnectionFailedState,
    DisconnectedState,
    SessionTabBar,
    SessionContent
  },
  emits: [
    'show-notification',
    'open-connection-modal',
    'show-settings'
  ],
  setup(props, { emit }) {
    // ANSI转换器实例
    const ansiConvert = new Convert({
      fg: '#f0f0f0',
      bg: '#1e1e1e',
      newline: false,
      escapeXML: true,
      stream: false
    });

    // 活动连接ID
    const activeConnectionId = ref(null);

    // 连接右键菜单
    const connectionContextMenu = reactive({
      visible: false,
      x: 0,
      y: 0,
      connection: null
    });

    // 使用组合式函数管理各个功能模块
    const {
      connections,
      addConnection,
      removeConnection,
      disconnectConnection,
      reconnectConnection,
      cancelConnection,
      establishPersistentConnection
    } = useConnectionManager(emit);

    const {
      sessions,
      activeSessionId,
      createSession,
      activateSession,
      closeSession,
      findSessionById,
      getConnectionSessions,
      getActiveSession,
      updateSessionStatus,
      setSessionSSHConnection,
      updateSessionActivePanel
    } = useSessionManager(emit);

    const {
      executeCommand,
      clearTerminal,
      copyTerminalContent,
      handleTerminalKeydown,
      handleTerminalInput,
      handleTerminalFocus,
      handleTerminalBlur,
      handleAutocompleteSelect,
      handleAutocompleteHide,
      setAutocompleteRef,
      addTerminalOutput,
      scrollToBottom
    } = useTerminalManager([], activeSessionId, emit, ansiConvert);

    const {
      panelWidths,
      isResizing,
      startResize,
      handleMouseMove,
      handleMouseUp,
      resetPanelWidths
    } = usePanelManager();

    // 连接管理方法
    const switchConnection = (connectionId) => {
      activeConnectionId.value = connectionId;
      const connection = connections.value.find(c => c.id === connectionId);
      if (connection) {
        connection.lastActivity = new Date();
      }
    };

    const closeConnection = async (connectionId) => {
      // 关闭该连接的所有会话
      const connectionSessions = getConnectionSessions(connectionId);
      for (const session of connectionSessions) {
        await closeSession(session.id);
      }

      // 断开连接
      await disconnectConnection(connectionId);

      // 移除连接
      await removeConnection(connectionId);

      // 如果关闭的是当前活动连接，切换到其他连接
      if (activeConnectionId.value === connectionId) {
        const remainingConnections = connections.value.filter(c => c.id !== connectionId);
        if (remainingConnections.length > 0) {
          activeConnectionId.value = remainingConnections[0].id;
        } else {
          activeConnectionId.value = null;
        }
      }
    };

    // 会话管理方法
    const handleSessionSelected = (sessionId) => {
      activateSession(sessionId);
    };

    const handleSessionCreated = async (options) => {
      const connection = connections.value.find(c => c.id === options.connectionId);
      if (!connection) return;

      // 建立持久连接
      const connected = await establishPersistentConnection(options.connectionId);
      if (!connected) {
        emit('show-notification', '无法建立连接，请检查网络设置', 'error');
        return;
      }

      // 创建会话
      const session = await createSession(options.connectionId, connection.config, options);
      if (session) {
        // 设置SSH连接资源
        // 这里需要建立实际的SSH连接并设置到会话中
        await setupSessionSSHConnection(session);
      }
    };

    const handleSessionClosed = async (sessionId) => {
      await closeSession(sessionId);
    };

    const handleSessionRenamed = ({ sessionId, name }) => {
      const session = findSessionById(sessionId);
      if (session) {
        session.name = name;
        session.lastActivity = new Date();
      }
    };

    const handleSessionDuplicated = (options) => {
      const sourceSession = findSessionById(options.sourceSessionId);
      if (sourceSession) {
        createSession(options.connectionId, sourceSession.connection, options);
      }
    };

    const createFirstSession = async (connectionId) => {
      await handleSessionCreated({
        connectionId,
        initialPanel: 'terminal'
      });
    };

    // 设置会话SSH连接
    const setupSessionSSHConnection = async (session) => {
      try {
        // 这里需要建立实际的SSH连接
        // 暂时更新会话状态为已连接
        updateSessionStatus(session.id, 'connected');

        // TODO: 实际的SSH连接逻辑
        console.log(`🔗 [TAB-MANAGER] 设置会话SSH连接: ${session.id}`);
      } catch (error) {
        console.error('设置SSH连接失败:', error);
        updateSessionStatus(session.id, 'failed', error.message);
      }
    };

    // 会话事件处理
    const handleSessionReady = ({ sessionId, status, error }) => {
      updateSessionStatus(sessionId, status, error);
    };

    const handleSessionData = ({ sessionId, data }) => {
      const session = findSessionById(sessionId);
      if (session) {
        // TODO: 处理会话数据
        console.log(`📊 [TAB-MANAGER] 收到会话数据: ${sessionId}`, data);
      }
    };

    const handleShellConnected = ({ sessionId }) => {
      updateSessionStatus(sessionId, 'connected');
    };

    const handleShellDisconnected = ({ sessionId }) => {
      updateSessionStatus(sessionId, 'disconnected');
    };

    const handleShellError = ({ sessionId, error }) => {
      updateSessionStatus(sessionId, 'failed', error);
    };

    // 连接右键菜单
    const showConnectionContextMenu = (event, connection) => {
      connectionContextMenu.visible = true;
      connectionContextMenu.x = event.clientX;
      connectionContextMenu.y = event.clientY;
      connectionContextMenu.connection = connection;
    };

    const hideConnectionContextMenu = () => {
      connectionContextMenu.visible = false;
      connectionContextMenu.connection = null;
    };

    const editConnection = () => {
      if (connectionContextMenu.connection) {
        emit('open-connection-modal');
      }
      hideConnectionContextMenu();
    };

    const reconnectFromMenu = () => {
      if (connectionContextMenu.connection) {
        reconnectConnection(connectionContextMenu.connection.id);
      }
      hideConnectionContextMenu();
    };

    const closeConnectionFromMenu = () => {
      if (connectionContextMenu.connection) {
        closeConnection(connectionContextMenu.connection.id);
      }
      hideConnectionContextMenu();
    };

    // 组件挂载
    onMounted(() => {
      document.addEventListener('click', hideConnectionContextMenu);
    });

    onUnmounted(() => {
      document.removeEventListener('click', hideConnectionContextMenu);
    });

    return {
      // 状态
      connections,
      activeConnectionId,
      activeSessionId,
      panelWidths,
      isResizing,
      connectionContextMenu,

      // 连接管理
      switchConnection,
      closeConnection,
      reconnectConnection,
      cancelConnection,

      // 会话管理
      getConnectionSessions,
      getActiveSession,
      handleSessionSelected,
      handleSessionCreated,
      handleSessionClosed,
      handleSessionRenamed,
      handleSessionDuplicated,
      createFirstSession,

      // 会话事件
      handleSessionReady,
      handleSessionData,
      handleShellConnected,
      handleShellDisconnected,
      handleShellError,

      // 终端管理
      executeCommand,
      clearTerminal,
      copyTerminalContent,

      // 面板管理
      startResize,

      // 连接右键菜单
      showConnectionContextMenu,
      hideConnectionContextMenu,
      editConnection,
      reconnectFromMenu,
      closeConnectionFromMenu
    };
  }
};
</script>

<style lang="scss" scoped>
.tab-manager {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: color(bg-primary);
}

.connection-tab-bar {
  display: flex;
  align-items: center;
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  padding: 0 spacing(sm);
  gap: spacing(sm);
  min-height: 36px;
}

.connection-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.connection-tab {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  background: color(bg-tertiary);
  border: 1px solid color(border);
  border-radius: border-radius(sm) border-radius(sm) 0 0;
  cursor: pointer;
  min-width: 120px;
  max-width: 200px;
  transition: all transition(fast) ease;

  &:hover {
    background: color(bg-hover);
  }

  &.active {
    background: color(surface);
    border-bottom-color: color(surface);
    z-index: 1;
  }
}

.connection-status {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.idle {
    background: color(text-disabled);
  }

  &.connecting {
    background: color(warning);

    .spinner {
      width: 8px;
      height: 8px;
      border: 1px solid color(warning);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  &.connected {
    background: color(success);
    box-shadow: 0 0 4px rgba(81, 207, 102, 0.5);
  }

  &.failed {
    background: color(error);
  }
}

.connection-name {
  flex: 1;
  font-size: font-size(sm);
  color: color(text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: color(text-secondary);
  border-radius: border-radius(xs);
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  opacity: 0.7;
  transition: all transition(fast) ease;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.connection-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.new-connection-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  background: color(primary);
  color: color(white);
  border: none;
  border-radius: border-radius(sm);
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary-light);
  }
}

.tab-content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.connection-content {
  height: 100%;
}

.connection-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sessions-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.session-content-area {
  flex: 1;
  overflow: hidden;
}

.no-sessions,
.idle-connection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;
}

.no-sessions-content,
.idle-content {
  text-align: center;
  max-width: 400px;
  padding: 40px 20px;
}

.no-sessions-icon,
.idle-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-sessions h3,
.idle-connection h3 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.no-sessions p,
.idle-connection p {
  margin: 0 0 24px 0;
  color: #868e96;
  font-size: 14px;
  line-height: 1.5;
}

.create-first-session-btn {
  padding: spacing(sm) spacing(md);
  background: color(primary);
  color: color(white);
  border: none;
  border-radius: border-radius(sm);
  font-size: font-size(sm);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary-light);
  }
}

.context-menu {
  position: fixed;
  background: color(surface);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
  padding: spacing(xs) 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  cursor: pointer;
  font-size: font-size(sm);
  color: color(text-primary);
  transition: background-color transition(fast) ease;

  &:hover {
    background: color(bg-hover);
  }

  &.danger {
    color: color(error);

    &:hover {
      background: rgba(255, 107, 107, 0.1);
    }
  }

  .icon {
    font-size: 12px;
    width: 16px;
    text-align: center;
  }
}

.context-menu-separator {
  height: 1px;
  background: color(border);
  margin: spacing(xs) 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>