<template>
  <div class="session-tab-bar">
    <!-- 会话标签 -->
    <div class="session-tabs">
      <div
        v-for="session in sessions"
        :key="session.id"
        :class="['session-tab', { 'active': session.isActive, 'connecting': session.status === 'connecting', 'failed': session.status === 'failed' }]"
        @click="selectSession(session.id)"
        @contextmenu.prevent="showContextMenu($event, session)"
      >
        <!-- 会话状态指示器 -->
        <div class="session-status">
          <div v-if="session.status === 'connecting'" class="status-indicator connecting">
            <div class="spinner"></div>
          </div>
          <div v-else-if="session.status === 'connected'" class="status-indicator connected"></div>
          <div v-else-if="session.status === 'failed'" class="status-indicator failed"></div>
          <div v-else class="status-indicator disconnected"></div>
        </div>

        <!-- 会话名称 -->
        <div class="session-name" :title="session.name">
          {{ session.name }}
        </div>

        <!-- 关闭按钮 -->
        <button
          class="close-btn"
          @click.stop="closeSession(session.id)"
          title="关闭会话"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 新建会话按钮 -->
    <div class="session-actions">
      <button
        class="new-session-btn"
        @click="createNewSession"
        title="新建会话"
        :disabled="!canCreateSession"
      >
        <span class="icon">+</span>
        <span class="text">新建会话</span>
      </button>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click="hideContextMenu"
    >
      <div class="context-menu-item" @click="renameSession">
        <span class="icon">✏️</span>
        重命名会话
      </div>
      <div class="context-menu-item" @click="duplicateSession">
        <span class="icon">📋</span>
        复制会话
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" @click="closeSessionFromMenu">
        <span class="icon">✕</span>
        关闭会话
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SessionTabBar',
  props: {
    sessions: {
      type: Array,
      default: () => []
    },
    connection: {
      type: Object,
      required: true
    }
  },
  emits: [
    'session-selected',
    'session-created',
    'session-closed',
    'session-renamed',
    'session-duplicated'
  ],
  data() {
    return {
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        session: null
      }
    };
  },
  computed: {
    canCreateSession() {
      return this.connection && (this.connection.status === 'connected' || this.connection.status === 'idle');
    }
  },
  mounted() {
    // 点击其他地方隐藏右键菜单
    document.addEventListener('click', this.hideContextMenu);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.hideContextMenu);
  },
  methods: {
    selectSession(sessionId) {
      this.$emit('session-selected', sessionId);
    },

    closeSession(sessionId) {
      this.$emit('session-closed', sessionId);
    },

    createNewSession() {
      if (!this.canCreateSession) return;

      this.$emit('session-created', {
        connectionId: this.connection.id,
        initialPanel: 'terminal'
      });
    },

    showContextMenu(event, session) {
      this.contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        session
      };
    },

    hideContextMenu() {
      this.contextMenu.visible = false;
      this.contextMenu.session = null;
    },

    renameSession() {
      if (this.contextMenu.session) {
        const newName = prompt('请输入新的会话名称:', this.contextMenu.session.name);
        if (newName && newName.trim()) {
          this.$emit('session-renamed', {
            sessionId: this.contextMenu.session.id,
            name: newName.trim()
          });
        }
      }
      this.hideContextMenu();
    },

    duplicateSession() {
      if (this.contextMenu.session) {
        this.$emit('session-duplicated', {
          sourceSessionId: this.contextMenu.session.id,
          connectionId: this.connection.id,
          name: `${this.contextMenu.session.name} (副本)`
        });
      }
      this.hideContextMenu();
    },

    closeSessionFromMenu() {
      if (this.contextMenu.session) {
        this.closeSession(this.contextMenu.session.id);
      }
      this.hideContextMenu();
    }
  }
};
</script>

<style lang="scss" scoped>
.session-tab-bar {
  display: flex;
  align-items: center;
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  padding: 0 spacing(sm);
  gap: spacing(sm);
  min-height: 40px;
}

.session-tabs {
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

.session-tab {
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
  position: relative;

  &:hover {
    background: color(bg-hover);
  }

  &.active {
    background: color(surface);
    border-bottom-color: color(surface);
    z-index: 1;
  }

  &.connecting {
    .session-name {
      opacity: 0.7;
    }
  }

  &.failed {
    background: rgba(255, 107, 107, 0.1);
    border-color: rgba(255, 107, 107, 0.3);

    .session-name {
      color: #ff6b6b;
    }
  }
}

.session-status {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.connected {
    background: color(success);
    box-shadow: 0 0 4px rgba(81, 207, 102, 0.5);
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

  &.failed {
    background: color(error);
  }

  &.disconnected {
    background: color(text-disabled);
  }
}

.session-name {
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

.session-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.new-session-btn {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  background: color(primary);
  color: color(white);
  border: none;
  border-radius: border-radius(sm);
  cursor: pointer;
  font-size: font-size(sm);
  transition: all transition(fast) ease;

  &:hover:not(:disabled) {
    background: color(primary-light);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    font-size: 14px;
    font-weight: bold;
  }

  .text {
    font-size: font-size(xs);
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

@media (max-width: 768px) {
  .session-tab-bar {
    padding: 0 spacing(xs);
  }

  .new-session-btn .text {
    display: none;
  }

  .session-tab {
    min-width: 100px;
  }
}
</style>