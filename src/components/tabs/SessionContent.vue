<template>
  <div class="session-content">
    <!-- 三部分布局容器 -->
    <ThreePanelLayout
      v-if="session && session.status === 'connected'"
      :connection="connection"
      :session="session"
      :panel-widths="panelWidths"
      :is-resizing="isResizing"
      @execute-command="$emit('execute-command', $event)"
      @clear-terminal="$emit('clear-terminal', $event)"
      @copy-terminal-content="$emit('copy-terminal-content', $event)"
      @show-notification="$emit('show-notification', $event)"
      @start-resize="$emit('start-resize', $event)"
      @show-settings="$emit('show-settings')"
    />

    <!-- 会话连接中状态 -->
    <div v-else-if="session && session.status === 'connecting'" class="session-state connecting">
      <div class="state-content">
        <div class="state-icon">
          <div class="spinner"></div>
        </div>
        <h3>正在连接会话</h3>
        <p>{{ session.name }}</p>
        <div class="progress-info">
          <span>正在建立SSH连接...</span>
        </div>
      </div>
    </div>

    <!-- 会话连接失败状态 -->
    <div v-else-if="session && session.status === 'failed'" class="session-state failed">
      <div class="state-content">
        <div class="state-icon">❌</div>
        <h3>会话连接失败</h3>
        <p>{{ session.name }}</p>
        <div v-if="session.errorMessage" class="error-message">
          {{ session.errorMessage }}
        </div>
        <div class="state-actions">
          <button class="retry-btn" @click="retrySession">
            重试连接
          </button>
          <button class="close-btn" @click="$emit('session-closed', session.id)">
            关闭会话
          </button>
        </div>
      </div>
    </div>

    <!-- 会话已断开状态 -->
    <div v-else-if="session && session.status === 'disconnected'" class="session-state disconnected">
      <div class="state-content">
        <div class="state-icon">🔌</div>
        <h3>会话已断开</h3>
        <p>{{ session.name }}</p>
        <div class="state-actions">
          <button class="reconnect-btn" @click="reconnectSession">
            重新连接
          </button>
          <button class="close-btn" @click="$emit('session-closed', session.id)">
            关闭会话
          </button>
        </div>
      </div>
    </div>

    <!-- 无会话状态 -->
    <div v-else class="session-state empty">
      <div class="state-content">
        <div class="state-icon">🚫</div>
        <h3>无效会话</h3>
        <p>会话数据不存在</p>
      </div>
    </div>
  </div>
</template>

<script>
import ThreePanelLayout from '../layout/ThreePanelLayout.vue';

export default {
  name: 'SessionContent',
  components: {
    ThreePanelLayout
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
  emits: [
    'execute-command',
    'clear-terminal',
    'copy-terminal-content',
    'show-notification',
    'start-resize',
    'show-settings',
    'session-closed',
    'session-ready',
    'session-data',
    'shell-connected',
    'shell-disconnected',
    'shell-error'
  ],
  methods: {
    retrySession() {
      if (!this.session) return;

      // 更新会话状态为连接中
      this.$emit('session-ready', {
        sessionId: this.session.id,
        status: 'connecting'
      });

      // 尝试重新建立SSH连接
      this.setupSessionConnection();
    },

    reconnectSession() {
      this.retrySession();
    },

    async setupSessionConnection() {
      if (!this.session) return;

      try {
        // 这里应该建立实际的SSH连接
        // 模拟连接过程
        setTimeout(() => {
          // 模拟连接成功
          this.$emit('session-ready', {
            sessionId: this.session.id,
            status: 'connected'
          });

          this.$emit('shell-connected', {
            sessionId: this.session.id
          });

          this.$emit('show-notification', `会话 "${this.session.name}" 已连接`, 'success');
        }, 2000);

        // 模拟连接过程中的数据
        setTimeout(() => {
          this.$emit('session-data', {
            sessionId: this.session.id,
            data: {
              output: '正在连接到服务器...\r\n',
              type: 'output'
            }
          });
        }, 500);

        setTimeout(() => {
          this.$emit('session-data', {
            sessionId: this.session.id,
            data: {
              output: '认证成功，正在建立终端会话...\r\n',
              type: 'output'
            }
          });
        }, 1000);

        setTimeout(() => {
          this.$emit('session-data', {
            sessionId: this.session.id,
            data: {
              output: '会话建立完成！\r\n',
              type: 'output'
            }
          });
        }, 1500);

      } catch (error) {
        console.error('建立会话连接失败:', error);
        this.$emit('session-ready', {
          sessionId: this.session.id,
          status: 'failed',
          error: error.message
        });

        this.$emit('shell-error', {
          sessionId: this.session.id,
          error: error.message
        });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.session-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.session-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;

  &.connecting {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  }

  &.failed {
    background: linear-gradient(135deg, #2c1810 0%, #8b4513 100%);
  }

  &.disconnected {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  &.empty {
    background: #1e1e1e;
  }
}

.state-content {
  text-align: center;
  max-width: 400px;
}

.state-icon {
  font-size: 64px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  .spinner {
    width: 64px;
    height: 64px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

.session-state h3 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 24px;
  font-weight: 600;
}

.session-state p {
  margin: 0 0 24px 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  line-height: 1.5;
}

.progress-info {
  margin: 16px 0;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: border-radius(sm);
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.error-message {
  margin: 16px 0;
  padding: 12px 20px;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: border-radius(sm);
  color: #ff6b6b;
  font-size: 14px;
  line-height: 1.4;
}

.state-actions {
  display: flex;
  gap: spacing(sm);
  justify-content: center;
  flex-wrap: wrap;
}

.retry-btn,
.reconnect-btn {
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

.close-btn {
  padding: spacing(sm) spacing(md);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: border-radius(sm);
  font-size: font-size(sm);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .session-state {
    padding: 20px 16px;
  }

  .state-icon {
    font-size: 48px;
    margin-bottom: 16px;

    .spinner {
      width: 48px;
      height: 48px;
      border-width: 3px;
    }
  }

  .session-state h3 {
    font-size: 20px;
  }

  .session-state p {
    font-size: 14px;
  }

  .state-actions {
    flex-direction: column;
    align-items: center;
  }

  .retry-btn,
  .reconnect-btn,
  .close-btn {
    width: 100%;
    max-width: 200px;
  }
}
</style>