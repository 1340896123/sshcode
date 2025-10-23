<template>
  <div class="session-terminal" v-if="session">
    <!-- Terminal Display -->
    <div class="terminal-wrapper">
      <XTerminal
        ref="terminalRef"
        :connection-id="connection.id"
        :connection="connection"
        :enabled="session.status === 'connected'"
        :height="height"
        :font-size="fontSize"
        :font-family="fontFamily"
        @show-notification="handleNotification"
      />
    </div>

    <!-- Terminal Input -->
    <TerminalInput
      :connection-id="connection.id"
      :session-id="session.id"
      :is-visible="session.status === 'connected'"
      @execute-command="handleCommand"
      @show-notification="handleNotification"
    />
  </div>

  <!-- Loading State -->
  <div v-else-if="loading" class="terminal-loading">
    <div class="loading-spinner"></div>
    <div class="loading-text">正在初始化终端...</div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="terminal-error">
    <div class="error-icon">❌</div>
    <div class="error-text">{{ error }}</div>
    <button class="retry-btn" @click="$emit('retry-session')">重试</button>
  </div>

  <!-- No Session State -->
  <div v-else class="terminal-empty">
    <div class="empty-icon">🖥️</div>
    <div class="empty-text">选择或创建一个会话以开始使用终端</div>
    <button class="create-btn" @click="$emit('create-session')">创建会话</button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue';
import XTerminal from './XTerminal.vue';
import TerminalInput from './TerminalInput.vue';
import { Connection } from '@/types/ssh';
import { TerminalSession } from '@/types/terminal';

const props = defineProps({
  connection: {
    type: Object,
    required: true
  },
  session: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: '400px'
  },
  fontSize: {
    type: Number,
    default: 14
  },
  fontFamily: {
    type: String,
    default: 'Consolas, Monaco, "Courier New", monospace'
  }
});

const emit = defineEmits([
  'retry-session',
  'create-session',
  'show-notification',
  'session-ready',
  'session-data',
  'shell-connected',
  'shell-disconnected',
  'shell-error'
]);

// Refs
const terminalRef = ref(null);
const shellConnected = ref(false);
const reconnectAttempts = ref(0);
const maxReconnectAttempts = ref(3);

// Computed properties
const sessionReady = computed(() => {
  return props.session && props.session.status !== 'connecting';
});

// Methods
const handleNotification = (notification) => {
  if (typeof notification === 'string') {
    emit('show-notification', {
      type: 'info',
      message: notification
    });
  } else {
    emit('show-notification', notification);
  }
};

const handleCommand = async (command) => {
  if (!props.session || !sessionReady.value) {
    handleNotification('会话未就绪，无法执行命令');
    return;
  }

  try {
    console.log(`📝 [SESSION-TERMINAL] 执行命令: "${command}"`);

    // Add command to session history
    if (props.session) {
      // This will be handled by the parent component through the session manager
      emit('session-data', {
        sessionId: props.session.id,
        data: {
          output: command,
          type: 'input',
          timestamp: Date.now()
        }
      });
    }

    // Execute command via SSH shell
    if (window.electronAPI?.sshShellWrite) {
      await window.electronAPI.sshShellWrite(props.connection.id, command);
    } else {
      throw new Error('SSH shell 不可用');
    }

    reconnectAttempts.value = 0; // Reset on successful command execution

  } catch (error) {
    console.error('❌ [SESSION-TERMINAL] 命令执行失败:', error);
    handleNotification(`命令执行失败: ${error.message}`);
    emit('shell-error', {
      sessionId: props.session.id,
      error: error.message
    });
  }
};

const connectShell = async () => {
  if (!props.session || !terminalRef.value) return;

  try {
    console.log(`🔌 [SESSION-TERMINAL] 连接SSH Shell: ${props.session.id}`);

    // Update session status
    emit('session-ready', {
      sessionId: props.session.id,
      status: 'connecting'
    });

    // Get terminal dimensions
    const terminal = terminalRef.value.terminal;
    const rows = terminal?.rows || 24;
    const cols = terminal?.cols || 80;

    // Create SSH shell
    if (window.electronAPI?.sshCreateShell) {
      const result = await window.electronAPI.sshCreateShell(props.connection.id, {
        rows,
        cols,
        term: 'xterm-256color'
      });

      if (result.success) {
        shellConnected.value = true;
        reconnectAttempts.value = 0;

        console.log(`✅ [SESSION-TERMINAL] SSH Shell连接成功: ${props.session.id}`);

        emit('shell-connected', {
          sessionId: props.session.id,
          rows,
          cols
        });

        emit('session-ready', {
          sessionId: props.session.id,
          status: 'connected'
        });

      } else {
        throw new Error(result.error || 'SSH Shell连接失败');
      }
    } else {
      throw new Error('SSH shell API 不可用');
    }

  } catch (error) {
    console.error('❌ [SESSION-TERMINAL] SSH Shell连接失败:', error);

    shellConnected.value = false;

    emit('session-ready', {
      sessionId: props.session.id,
      status: 'error',
      error: error.message
    });

    emit('shell-error', {
      sessionId: props.session.id,
      error: error.message
    });

    // Auto-reconnect logic
    if (reconnectAttempts.value < maxReconnectAttempts.value) {
      reconnectAttempts.value++;
      console.log(`🔄 [SESSION-TERMINAL] 尝试重连 (${reconnectAttempts.value}/${maxReconnectAttempts.value})`);

      setTimeout(() => {
        connectShell();
      }, 2000 * reconnectAttempts.value); // Exponential backoff
    }
  }
};

const disconnectShell = async () => {
  if (!shellConnected.value || !props.session) return;

  try {
    console.log(`🔌 [SESSION-TERMINAL] 断开SSH Shell: ${props.session.id}`);

    if (window.electronAPI?.sshShellClose) {
      await window.electronAPI.sshShellClose(props.connection.id);
    }

    shellConnected.value = false;

    emit('shell-disconnected', {
      sessionId: props.session.id
    });

    emit('session-ready', {
      sessionId: props.session.id,
      status: 'disconnected'
    });

  } catch (error) {
    console.error('❌ [SESSION-TERMINAL] SSH Shell断开失败:', error);
  }
};

const focusTerminal = async () => {
  await nextTick();
  if (terminalRef.value && terminalRef.value.focus) {
    terminalRef.value.focus();
  }
};

// Event handlers for terminal data
const handleTerminalData = (event, data) => {
  if (data.connectionId === props.connection.id && props.session) {
    console.log(`📥 [SESSION-TERMINAL] 收到终端数据:`, {
      sessionId: props.session.id,
      dataLength: data.data.length
    });

    emit('session-data', {
      sessionId: props.session.id,
      data: {
        output: data.data,
        type: 'output',
        timestamp: Date.now()
      }
    });
  }
};

const handleTerminalClose = (event, data) => {
  if (data.connectionId === props.connection.id && props.session) {
    console.log(`🔌 [SESSION-TERMINAL] 终端关闭:`, {
      sessionId: props.session.id,
      code: data.code,
      signal: data.signal
    });

    shellConnected.value = false;

    emit('shell-disconnected', {
      sessionId: props.session.id,
      code: data.code,
      signal: data.signal
    });

    emit('session-ready', {
      sessionId: props.session.id,
      status: 'disconnected'
    });
  }
};

const handleTerminalError = (event, data) => {
  if (data.connectionId === props.connection.id && props.session) {
    console.error(`❌ [SESSION-TERMINAL] 终端错误:`, {
      sessionId: props.session.id,
      error: data.error
    });

    shellConnected.value = false;

    emit('shell-error', {
      sessionId: props.session.id,
      error: data.error
    });

    emit('session-ready', {
      sessionId: props.session.id,
      status: 'error',
      error: data.error
    });
  }
};

// Watch for session changes
watch(() => props.session, async (newSession, oldSession) => {
  console.log(`👁️ [SESSION-TERMINAL] 会话变化:`, {
    oldSession: oldSession?.id,
    newSession: newSession?.id,
    status: newSession?.status
  });

  // Disconnect old session if it exists and is different
  if (oldSession && oldSession.id !== newSession?.id && shellConnected.value) {
    await disconnectShell();
  }

  // Connect new session
  if (newSession && newSession.status === 'connecting' && !shellConnected.value) {
    // Wait a bit for terminal to be ready
    await nextTick();
    setTimeout(() => {
      connectShell();
    }, 500);
  }
}, { immediate: true });

// Watch for connection status changes
watch(() => props.connection.status, async (newStatus) => {
  console.log(`👁️ [SESSION-TERMINAL] 连接状态变化: ${newStatus}`);

  if (newStatus === 'connected' && props.session && !shellConnected.value) {
    // Connection established, try to connect shell
    await nextTick();
    connectShell();
  } else if (newStatus !== 'connected' && shellConnected.value) {
    // Connection lost, disconnect shell
    await disconnectShell();
  }
});

// Lifecycle hooks
onMounted(async () => {
  console.log(`🚀 [SESSION-TERMINAL] 组件挂载:`, {
    connectionId: props.connection.id,
    sessionId: props.session?.id
  });

  // Set up event listeners
  if (window.electronAPI) {
    if (window.electronAPI.onTerminalData) {
      window.electronAPI.onTerminalData(handleTerminalData);
    }
    if (window.electronAPI.onTerminalClose) {
      window.electronAPI.onTerminalClose(handleTerminalClose);
    }
    if (window.electronAPI.onTerminalError) {
      window.electronAPI.onTerminalError(handleTerminalError);
    }
  }

  // Focus terminal when mounted
  await focusTerminal();
});

onUnmounted(async () => {
  console.log(`🗑️ [SESSION-TERMINAL] 组件卸载:`, {
    connectionId: props.connection.id,
    sessionId: props.session?.id
  });

  // Disconnect shell
  await disconnectShell();

  // Remove event listeners
  if (window.electronAPI) {
    if (window.electronAPI.onTerminalData) {
      window.electronAPI.onTerminalData.removeListener?.(handleTerminalData);
    }
    if (window.electronAPI.onTerminalClose) {
      window.electronAPI.onTerminalClose.removeListener?.(handleTerminalClose);
    }
    if (window.electronAPI.onTerminalError) {
      window.electronAPI.onTerminalError.removeListener?.(handleTerminalError);
    }
  }
});
</script>

<style lang="scss" scoped>
.session-terminal {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.terminal-wrapper {
  flex: 1;
  position: relative;
}

// Loading state
.terminal-loading {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333;
    border-top: 3px solid #74c0fc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .loading-text {
    color: #868e96;
    font-size: 14px;
  }
}

// Error state
.terminal-error {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .error-text {
    color: #ff6b6b;
    font-size: 14px;
    margin-bottom: 16px;
    text-align: center;
    max-width: 80%;
  }

  .retry-btn {
    background: #ff6b6b;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;

    &:hover {
      background: #ff5252;
      transform: translateY(-1px);
    }
  }
}

// Empty state
.terminal-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-text {
    color: #868e96;
    font-size: 16px;
    margin-bottom: 24px;
    text-align: center;
  }

  .create-btn {
    background: #74c0fc;
    color: #1a1a1a;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      background: #91a7ff;
      transform: translateY(-1px);
    }
  }
}

// Animation
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// Responsive design
@media (max-width: 768px) {
  .terminal-loading,
  .terminal-error,
  .terminal-empty {
    .loading-spinner,
    .error-icon,
    .empty-icon {
      width: 32px;
      height: 32px;
      font-size: 32px;
    }

    .loading-text,
    .error-text,
    .empty-text {
      font-size: 12px;
    }

    .retry-btn,
    .create-btn {
      padding: 8px 16px;
      font-size: 12px;
    }
  }
}
</style>