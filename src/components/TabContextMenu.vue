<template>
  <div
    v-if="visible"
    class="tab-context-menu-overlay"
    @click="$emit('close')"
  >
    <div
      class="tab-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <div class="context-menu-header" v-if="tab">
        <div class="tab-info">
          <span class="tab-icon">{{ getConnectionIcon(tab.connection) }}</span>
          <span class="tab-name">{{ tab.name }}</span>
          <span class="connection-status" :class="tab.connection.status">
            {{ getStatusText(tab.connection.status) }}
          </span>
        </div>
      </div>

      <div class="context-menu-separator" v-if="tab"></div>

      <!-- 标签页管理 -->
      <div class="menu-section">
        <div class="section-title">标签页管理</div>
        <div class="context-menu-item" @click="$emit('rename')">
          <span class="menu-icon">✏️</span>
          <span class="menu-text">重命名标签页</span>
          <span class="menu-shortcut">F2</span>
        </div>
        <div class="context-menu-item" @click="$emit('duplicate')">
          <span class="menu-icon">📋</span>
          <span class="menu-text">复制连接</span>
          <span class="menu-shortcut">Ctrl+D</span>
        </div>
      </div>

      <!-- 位置管理 -->
      <div class="menu-section">
        <div class="section-title">位置管理</div>
        <div
          class="context-menu-item"
          @click="$emit('move-left')"
          :disabled="!canMoveLeft"
        >
          <span class="menu-icon">⬅️</span>
          <span class="menu-text">向左移动</span>
          <span class="menu-shortcut">Ctrl+←</span>
        </div>
        <div
          class="context-menu-item"
          @click="$emit('move-right')"
          :disabled="!canMoveRight"
        >
          <span class="menu-icon">➡️</span>
          <span class="menu-text">向右移动</span>
          <span class="menu-shortcut">Ctrl+→</span>
        </div>
        <div
          class="context-menu-item"
          @click="$emit('move-to-start')"
          :disabled="!canMoveLeft"
        >
          <span class="menu-icon">⏮️</span>
          <span class="menu-text">移动到开头</span>
        </div>
        <div
          class="context-menu-item"
          @click="$emit('move-to-end')"
          :disabled="!canMoveRight"
        >
          <span class="menu-icon">⏭️</span>
          <span class="menu-text">移动到末尾</span>
        </div>
      </div>

      <div class="context-menu-separator"></div>

      <!-- 连接操作 -->
      <div class="menu-section">
        <div class="section-title">连接操作</div>
        <div
          class="context-menu-item"
          @click="$emit('reconnect')"
          v-if="tab && tab.connection.status !== 'connected'"
        >
          <span class="menu-icon">🔄</span>
          <span class="menu-text">重新连接</span>
        </div>
        <div
          class="context-menu-item"
          @click="$emit('disconnect')"
          v-if="tab && tab.connection.status === 'connected'"
        >
          <span class="menu-icon">🔌</span>
          <span class="menu-text">断开连接</span>
        </div>
        <div
          class="context-menu-item danger"
          @click="$emit('close')"
        >
          <span class="menu-icon">❌</span>
          <span class="menu-text">关闭连接</span>
          <span class="menu-shortcut">Ctrl+W</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'TabContextMenu',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    },
    tab: {
      type: Object,
      default: null
    },
    tabIndex: {
      type: Number,
      default: -1
    },
    totalTabs: {
      type: Number,
      default: 0
    }
  },
  emits: ['close', 'rename', 'duplicate', 'move-left', 'move-right', 'move-to-start', 'move-to-end', 'reconnect', 'disconnect', 'close'],
  setup(props, { emit }) {
    const canMoveLeft = computed(() => props.tabIndex > 0);
    const canMoveRight = computed(() => props.tabIndex < props.totalTabs - 1);

    const getConnectionIcon = (connection) => {
      const icons = {
        connecting: '⏳',
        connected: '🟢',
        failed: '❌',
        disconnected: '🔌'
      };
      return icons[connection.status] || '🔌';
    };

    const getStatusText = (status) => {
      const statusTexts = {
        connecting: '连接中',
        connected: '已连接',
        failed: '连接失败',
        disconnected: '已断开',
        reconnecting: '重连中'
      };
      return statusTexts[status] || '未知状态';
    };

    return {
      canMoveLeft,
      canMoveRight,
      getConnectionIcon,
      getStatusText
    };
  }
};
</script>

<style lang="scss" scoped>
.tab-context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: transparent;
}

.tab-context-menu {
  position: fixed;
  background: color(surface);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  min-width: 240px;
  max-width: 300px;
  padding: 0;
  overflow: hidden;
}

.context-menu-header {
  padding: spacing(sm);
  background: color(bg-tertiary);
  border-bottom: 1px solid color(border);
}

.tab-info {
  display: flex;
  align-items: center;
  gap: spacing(xs);
}

.tab-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tab-name {
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-status {
  font-size: font-size(xs);
  padding: 2px 6px;
  border-radius: border-radius(full);
  font-weight: font-weight(medium);

  &.connecting {
    background: color(warning);
    color: color(white);
  }

  &.connected {
    background: color(success);
    color: color(white);
  }

  &.failed {
    background: color(error);
    color: color(white);
  }

  &.disconnected {
    background: color(text-muted);
    color: color(white);
  }
}

.context-menu-separator {
  height: 1px;
  background: color(border);
  margin: 0;
}

.menu-section {
  padding: spacing(xs) 0;
}

.section-title {
  padding: spacing(xs) spacing(sm);
  font-size: font-size(xs);
  font-weight: font-weight(medium);
  color: color(text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  cursor: pointer;
  transition: all transition(fast) ease;
  font-size: font-size(sm);
  color: color(text-primary);

  &:hover:not([disabled]) {
    background: color(bg-tertiary);
  }

  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    color: color(text-muted);
  }

  &.danger {
    color: color(error);

    &:hover:not([disabled]) {
      background: rgba(color(error), 0.1);
    }
  }
}

.menu-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.menu-text {
  flex: 1;
  min-width: 0;
}

.menu-shortcut {
  font-size: font-size(xs);
  color: color(text-muted);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: color(bg-secondary);
  padding: 2px 4px;
  border-radius: border-radius(sm);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .tab-context-menu {
    min-width: 200px;
    max-width: 260px;
  }

  .menu-shortcut {
    display: none;
  }
}
</style>