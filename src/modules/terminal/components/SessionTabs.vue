<template>
  <div class="session-tabs" v-if="sessions.length > 0">
    <!-- Connection Header -->
    <div class="connection-header">
      <div class="connection-info">
        <span class="connection-name">{{ connection.name }}</span>
        <span class="connection-status" :class="connection.status">
          {{ getStatusText(connection.status) }}
        </span>
      </div>
      <div class="connection-actions">
        <button
          class="action-btn"
          @click="createNewSession"
          :disabled="connection.status !== 'connected'"
          title="创建新会话"
        >
          <span class="icon">+</span>
          <span class="tooltip">新会话</span>
        </button>
      </div>
    </div>

    <!-- Session Tabs -->
    <div class="tabs-container">
      <div class="tabs-wrapper" ref="tabsWrapper">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-tab"
          :class="getSessionTabClass(session)"
          @click="selectSession(session.id)"
          @contextmenu.prevent="showSessionContextMenu($event, session)"
        >
          <div class="tab-content">
            <span class="tab-icon" :title="getSessionStatusText(session.status)">
              {{ getSessionIcon(session.status) }}
            </span>
            <span class="tab-name">{{ session.name }}</span>
            <button
              v-if="sessions.length > 1"
              class="tab-close"
              @click.stop="closeSession(session.id)"
              title="关闭会话"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Scroll Buttons -->
      <button
        v-if="showScrollButtons"
        class="scroll-btn scroll-left"
        @click="scrollTabs('left')"
        :disabled="!canScrollLeft"
      >
        ‹
      </button>
      <button
        v-if="showScrollButtons"
        class="scroll-btn scroll-right"
        @click="scrollTabs('right')"
        :disabled="!canScrollRight"
      >
        ›
      </button>
    </div>

    <!-- Session Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div
        class="menu-item"
        @click="renameSession(contextMenu.session)"
      >
        <span class="menu-icon">✏️</span>
        重命名会话
      </div>
      <div
        class="menu-item"
        @click="duplicateSession(contextMenu.session)"
      >
        <span class="menu-icon">📋</span>
        复制会话
      </div>
      <div
        class="menu-item danger"
        @click="closeSession(contextMenu.session.id)"
        v-if="sessions.length > 1"
      >
        <span class="menu-icon">🗑️</span>
        关闭会话
      </div>
      <div class="menu-divider"></div>
      <div
        class="menu-item"
        @click="hideContextMenu"
      >
        <span class="menu-icon">❌</span>
        取消
      </div>
    </div>

    <!-- Create Session Modal -->
    <div
      v-if="showCreateModal"
      class="modal-overlay"
      @click="hideCreateModal"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>创建新会话</h3>
          <button class="modal-close" @click="hideCreateModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="session-name">会话名称:</label>
            <input
              id="session-name"
              v-model="newSessionName"
              type="text"
              class="form-input"
              placeholder="输入会话名称..."
              @keydown.enter="confirmCreateSession"
            />
          </div>
          <div class="form-group">
            <label for="working-dir">工作目录 (可选):</label>
            <input
              id="working-dir"
              v-model="newWorkingDir"
              type="text"
              class="form-input"
              placeholder="例如: /home/user/project"
              @keydown.enter="confirmCreateSession"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="hideCreateModal">取消</button>
          <button class="btn btn-primary" @click="confirmCreateSession" :disabled="!newSessionName.trim()">
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- Rename Session Modal -->
    <div
      v-if="showRenameModal"
      class="modal-overlay"
      @click="hideRenameModal"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>重命名会话</h3>
          <button class="modal-close" @click="hideRenameModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="rename-input">新名称:</label>
            <input
              id="rename-input"
              ref="renameInput"
              v-model="renameSessionName"
              type="text"
              class="form-input"
              @keydown.enter="confirmRename"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="hideRenameModal">取消</button>
          <button class="btn btn-primary" @click="confirmRename" :disabled="!renameSessionName.trim()">
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Connection } from '@/types/ssh';
import { TerminalSession } from '@/types/terminal';

const props = defineProps({
  connection: {
    type: Object,
    required: true
  },
  sessions: {
    type: Array,
    default: () => []
  },
  activeSessionId: {
    type: String,
    default: null
  }
});

const emit = defineEmits([
  'session-selected',
  'session-created',
  'session-closed',
  'session-renamed',
  'session-duplicated'
]);

// Reactive state
const tabsWrapper = ref(null);
const showScrollButtons = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  session: null
});

// Modal states
const showCreateModal = ref(false);
const showRenameModal = ref(false);
const newSessionName = ref('');
const newWorkingDir = ref('');
const renameSessionId = ref('');
const renameSessionName = ref('');

// Computed properties
const activeSession = computed(() => {
  return props.sessions.find(s => s.id === props.activeSessionId);
});

// Methods
const getStatusText = (status) => {
  const statusMap = {
    connecting: '连接中',
    connected: '已连接',
    failed: '连接失败',
    disconnected: '已断开',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
};

const getSessionIcon = (status) => {
  const iconMap = {
    connecting: '⏳',
    connected: '✅',
    disconnected: '⚫',
    error: '❌'
  };
  return iconMap[status] || '⚫';
};

const getSessionStatusText = (status) => {
  const statusMap = {
    connecting: '连接中',
    connected: '已连接',
    disconnected: '已断开',
    error: '错误'
  };
  return statusMap[status] || status;
};

const getSessionTabClass = (session) => {
  return {
    'active': session.id === props.activeSessionId,
    'disconnected': session.status === 'disconnected',
    'error': session.status === 'error',
    'connecting': session.status === 'connecting',
    'dirty': session.isDirty
  };
};

const selectSession = (sessionId) => {
  emit('session-selected', sessionId);
};

const createNewSession = () => {
  newSessionName.value = `${props.connection.name} - 会话 ${props.sessions.length + 1}`;
  newWorkingDir.value = '';
  showCreateModal.value = true;
  nextTick(() => {
    // Focus input field
    const nameInput = document.getElementById('session-name');
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  });
};

const confirmCreateSession = () => {
  const name = newSessionName.value.trim();
  if (!name) return;

  const options = {
    name,
    workingDirectory: newWorkingDir.value.trim() || undefined
  };

  emit('session-created', options);
  hideCreateModal();
};

const hideCreateModal = () => {
  showCreateModal.value = false;
  newSessionName.value = '';
  newWorkingDir.value = '';
};

const closeSession = (sessionId) => {
  emit('session-closed', sessionId);
};

const renameSession = (session) => {
  renameSessionId.value = session.id;
  renameSessionName.value = session.name;
  showRenameModal.value = true;
  nextTick(() => {
    const renameInput = document.getElementById('rename-input');
    if (renameInput) {
      renameInput.focus();
      renameInput.select();
    }
  });
};

const confirmRename = () => {
  const name = renameSessionName.value.trim();
  if (!name) return;

  emit('session-renamed', {
    sessionId: renameSessionId.value,
    name
  });

  hideRenameModal();
};

const hideRenameModal = () => {
  showRenameModal.value = false;
  renameSessionId.value = '';
  renameSessionName.value = '';
};

const duplicateSession = (session) => {
  emit('session-duplicated', {
    sourceSessionId: session.id,
    name: `${session.name} - 副本`,
    workingDirectory: session.currentWorkingDirectory,
    envVars: { ...session.envVars }
  });
};

// Context menu methods
const showSessionContextMenu = (event, session) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    session
  };
};

const hideContextMenu = () => {
  contextMenu.value.visible = false;
};

// Tab scrolling methods
const scrollTabs = (direction) => {
  if (!tabsWrapper.value) return;

  const scrollAmount = 200;
  if (direction === 'left') {
    tabsWrapper.value.scrollLeft -= scrollAmount;
  } else {
    tabsWrapper.value.scrollLeft += scrollAmount;
  }
};

const checkScrollButtons = () => {
  if (!tabsWrapper.value) {
    showScrollButtons.value = false;
    return;
  }

  const wrapper = tabsWrapper.value;
  showScrollButtons.value = wrapper.scrollWidth > wrapper.clientWidth;
  canScrollLeft.value = wrapper.scrollLeft > 0;
  canScrollRight.value = wrapper.scrollLeft < wrapper.scrollWidth - wrapper.clientWidth;
};

// Event handlers
const handleScroll = () => {
  checkScrollButtons();
};

const handleResize = () => {
  checkScrollButtons();
};

const handleClickOutside = (event) => {
  if (!event.target.closest('.context-menu')) {
    hideContextMenu();
  }
};

// Lifecycle hooks
onMounted(() => {
  nextTick(() => {
    checkScrollButtons();
  });

  document.addEventListener('click', handleClickOutside);
  document.addEventListener('resize', handleResize);

  if (tabsWrapper.value) {
    tabsWrapper.value.addEventListener('scroll', handleScroll);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('resize', handleResize);

  if (tabsWrapper.value) {
    tabsWrapper.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<style lang="scss" scoped>
.session-tabs {
  background: #2a2a2a;
  border-bottom: 1px solid #444;
  min-height: 80px;
  display: flex;
  flex-direction: column;
}

.connection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #333;
  border-bottom: 1px solid #444;

  .connection-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .connection-name {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
    }

    .connection-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;

      &.connecting {
        background: rgba(116, 192, 252, 0.2);
        color: #74c0fc;
      }

      &.connected {
        background: rgba(81, 207, 102, 0.2);
        color: #51cf66;
      }

      &.failed,
      &.disconnected,
      &.cancelled {
        background: rgba(255, 107, 107, 0.2);
        color: #ff6b6b;
      }
    }
  }

  .connection-actions {
    .action-btn {
      background: rgba(116, 192, 252, 0.2);
      border: 1px solid #74c0fc;
      color: #74c0fc;
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: rgba(116, 192, 252, 0.3);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .icon {
        font-weight: bold;
      }

      .tooltip {
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      &:hover .tooltip {
        opacity: 1;
      }
    }
  }
}

.tabs-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.tabs-wrapper {
  display: flex;
  align-items: flex-end;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0 8px;

  &::-webkit-scrollbar {
    display: none;
  }
}

.session-tab {
  background: #3a3a3a;
  border: 1px solid #555;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  margin: 8px 4px 0 4px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  max-width: 200px;
  position: relative;

  &:hover {
    background: #444;
  }

  &.active {
    background: #1a1a1a;
    border-color: #74c0fc;
    transform: translateY(-2px);
  }

  &.connecting {
    background: #3a4a5a;
    border-color: #74c0fc;
  }

  &.error {
    background: #5a3a3a;
    border-color: #ff6b6b;
  }

  &.disconnected {
    background: #4a4a4a;
    border-color: #868e96;
  }

  &.dirty::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    background: #ffd43b;
    border-radius: 50%;
  }

  .tab-content {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    width: 100%;

    .tab-icon {
      font-size: 12px;
      flex-shrink: 0;
    }

    .tab-name {
      color: #fff;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .tab-close {
      background: transparent;
      border: none;
      color: #868e96;
      cursor: pointer;
      padding: 2px;
      margin-left: 4px;
      border-radius: 3px;
      font-size: 14px;
      line-height: 1;
      opacity: 0;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        background: rgba(255, 107, 107, 0.2);
        color: #ff6b6b;
      }
    }
  }

  &:hover .tab-close {
    opacity: 1;
  }
}

.scroll-btn {
  background: #444;
  border: 1px solid #666;
  color: #fff;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  margin: 0 4px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #555;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Context menu
.context-menu {
  position: fixed;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 10000;
  min-width: 180px;
  padding: 4px 0;

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    cursor: pointer;
    color: #fff;
    font-size: 13px;
    transition: background 0.2s ease;

    &:hover {
      background: #444;
    }

    &.danger {
      color: #ff6b6b;

      &:hover {
        background: rgba(255, 107, 107, 0.1);
      }
    }

    .menu-icon {
      font-size: 14px;
      width: 16px;
      text-align: center;
    }
  }

  .menu-divider {
    height: 1px;
    background: #444;
    margin: 4px 8px;
  }
}

// Modal styles
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #444;

  h3 {
    margin: 0;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
  }

  .modal-close {
    background: transparent;
    border: none;
    color: #868e96;
    cursor: pointer;
    font-size: 20px;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      background: #444;
      color: #fff;
    }
  }
}

.modal-body {
  padding: 20px;

  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      background: #3a3a3a;
      border: 1px solid #555;
      border-radius: 6px;
      padding: 8px 12px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: #74c0fc;
        background: #444;
      }

      &::placeholder {
        color: #868e96;
      }
    }
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #444;

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;

    &.btn-secondary {
      background: #444;
      color: #fff;

      &:hover {
        background: #555;
      }
    }

    &.btn-primary {
      background: #74c0fc;
      color: #1a1a1a;

      &:hover:not(:disabled) {
        background: #91a7ff;
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

// Responsive design
@media (max-width: 768px) {
  .connection-header {
    padding: 6px 12px;

    .connection-info {
      .connection-name {
        font-size: 12px;
      }

      .connection-status {
        font-size: 10px;
        padding: 1px 6px;
      }
    }

    .connection-actions {
      .action-btn {
        padding: 4px 8px;
        font-size: 10px;
      }
    }
  }

  .session-tab {
    min-width: 100px;
    padding: 6px 10px;

    .tab-content {
      .tab-name {
        font-size: 11px;
      }
    }
  }

  .modal-content {
    min-width: 320px;
    margin: 20px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 12px 16px;
  }
}
</style>