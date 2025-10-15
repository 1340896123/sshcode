<template>
  <div class="tab-bar" :class="{ 'empty-tabs': connections.length === 0 }">
    <div class="tab-list" :class="{ 'has-tabs': connections.length > 0 }">
      <div
        v-for="connection in connections"
        :key="connection.id"
        class="tab-item"
        :class="{ active: activeTabId === connection.id }"
        @click="$emit('switch-tab', connection.id)"
      >
        <div class="tab-content">
          <span class="tab-icon">{{ getConnectionIcon(connection) }}</span>
          <span class="tab-title">{{ connection.name }}</span>
          <span class="tab-status" :class="connection.status"></span>
        </div>
        <button
          class="tab-close"
          @click.stop="$emit('close-connection', connection.id)"
          title="关闭连接"
        >
          ×
        </button>
      </div>

      <!-- 当没有连接时显示提示信息 -->
      <div v-if="connections.length === 0" class="empty-tabs-hint">
        <span class="hint-text">暂无连接</span>
      </div>
    </div>
    <button class="new-tab-btn" @click="$emit('open-session-modal')" title="新建连接">
      <span class="btn-text">{{ connections.length === 0 ? '创建第一个连接' : '+' }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'TabBar',
  props: {
    connections: {
      type: Array,
      default: () => []
    },
    activeTabId: {
      type: String,
      default: null
    }
  },
  emits: ['switch-tab', 'close-connection', 'open-session-modal'],
  methods: {
    getConnectionIcon(connection) {
      const icons = {
        connecting: '⏳',
        connected: '🟢',
        failed: '❌',
        disconnected: '🔌'
      }
      return icons[connection.status] || '🔌'
    }
  }
}
</script>

<style lang="scss" scoped>
.tab-bar {
  display: flex;
  align-items: center;
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  padding: 0 spacing(sm);
  min-height: 48px;

  &.empty-tabs {
    justify-content: center;
  }
}

.tab-list {
  display: flex;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &.has-tabs {
    // 有标签页时的样式
  }

  &:not(.has-tabs) {
    justify-content: center;
    align-items: center;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  padding: spacing(xs) spacing(sm);
  background: color(bg-tertiary);
  border: 1px solid color(border);
  border-bottom: none;
  border-radius: border-radius(md) border-radius(md) 0 0;
  cursor: pointer;
  transition: all transition(fast) ease;
  min-width: 150px;
  max-width: 250px;
  position: relative;

  &:hover {
    background: color(surface);
    border-color: color(primary);
  }

  &.active {
    background: color(surface);
    border-color: color(primary);
    border-bottom: 1px solid color(surface);
    margin-bottom: -1px;
    z-index: 1;

    .tab-status {
      &.connected {
        background: color(success);
      }
    }
  }
}

.tab-content {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  flex: 1;
  min-width: 0;
}

.tab-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tab-title {
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.tab-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.connecting {
    background: color(warning);
    animation: pulse 1.5s infinite;
  }

  &.connected {
    background: color(success);
  }

  &.failed {
    background: color(error);
  }

  &.disconnected {
    background: color(text-muted);
  }
}

.tab-close {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: color(text-muted);
  font-size: 16px;
  cursor: pointer;
  border-radius: border-radius(full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.new-tab-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid color(border);
  background: color(bg-tertiary);
  color: color(text-secondary);
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }

  .btn-text {
    white-space: nowrap;
  }
}

.empty-tabs-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;

  .hint-text {
    color: color(text-muted);
    font-size: font-size(sm);
    font-style: italic;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .tab-bar {
    padding: 0 spacing(xs);
  }

  .tab-item {
    min-width: 120px;
    max-width: 180px;
  }
}
</style>
