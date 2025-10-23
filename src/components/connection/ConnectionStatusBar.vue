<template>
  <div class="connection-status-bar">
    <div class="status-left">
      <div class="status-indicator" :class="connection.status">
        <span class="status-dot"></span>
        <span class="status-text">{{ getStatusText(connection.status) }}</span>
      </div>
      <div class="connection-time" v-if="connection.connectedAt">
        连接时间: {{ formatConnectionTime(connection.connectedAt) }}
      </div>
    </div>

    <!-- 系统监控信息 -->
    <div class="system-monitor" v-if="connection.systemInfo">
      <div class="monitor-item cpu-monitor">
        <span class="monitor-icon">🖥️</span>
        <span class="monitor-label">CPU</span>
        <span class="monitor-value" :class="{ 'high-usage': connection.systemInfo.cpu > 80 }">
          {{ connection.systemInfo.cpu }}%
        </span>
      </div>

      <div class="monitor-item memory-monitor">
        <span class="monitor-icon">💾</span>
        <span class="monitor-label">内存</span>
        <span class="monitor-value" :class="{ 'high-usage': connection.systemInfo.memory > 80 }">
          {{ connection.systemInfo.memory }}%
        </span>
      </div>

      <div class="monitor-item disk-monitor">
        <span class="monitor-icon">💿</span>
        <span class="monitor-label">磁盘</span>
        <span class="monitor-value" :class="{ 'high-usage': connection.systemInfo.disk > 80 }">
          {{ connection.systemInfo.disk }}%
        </span>
      </div>

      <div class="monitor-item network-monitor">
        <span class="monitor-icon">🌐</span>
        <span class="monitor-label">网络</span>
        <span class="monitor-value">
          ↓{{ formatBytes(connection.systemInfo.networkDown) }}/s ↑{{
            formatBytes(connection.systemInfo.networkUp)
          }}/s
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { formatBytes as formatBytesUtil, formatDuration } from '@/utils/formatters';

export default {
  name: 'ConnectionStatusBar',
  props: {
    connection: {
      type: Object,
      required: true
    }
  },
  methods: {
    getStatusText(status) {
      const texts = {
        connecting: '连接中...',
        connected: '已连接',
        failed: '连接失败',
        disconnected: '已断开'
      };
      return texts[status] || '未知状态';
    },

    formatConnectionTime(connectedAt) {
      const now = new Date();
      const diff = now - connectedAt;
      const seconds = Math.floor(diff / 1000);
      return formatDuration(seconds);
    },

    formatBytes(bytes) {
      return formatBytesUtil(bytes);
    }
  }
};
</script>

<style lang="scss" scoped>
.connection-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(lg);
  background: color(surface);
  border-top: 1px solid color(border);
  flex-shrink: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: spacing(xs);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  .connecting & {
    background: color(warning);
    animation: pulse 1.5s infinite;
  }

  .connected & {
    background: color(success);
  }

  .failed & {
    background: color(error);
  }

  .disconnected & {
    background: color(text-muted);
  }
}

.status-text {
  font-size: font-size(sm);
  font-weight: font-weight(medium);
}

.connection-time {
  font-size: font-size(xs);
  color: color(text-muted);
  min-width: 140px;
  width: 140px;
  text-align: left;
}

// 系统监控样式
.status-left {
  display: flex;
  align-items: center;
  gap: spacing(md);
}

.system-monitor {
  display: flex;
  align-items: center;
  gap: spacing(md);
  flex-wrap: wrap;

  .monitor-item {
    display: flex;
    align-items: center;
    gap: spacing(xs);
    padding: spacing(xs) spacing(sm);
    background: color(bg-tertiary);
    border: 1px solid color(border);
    border-radius: border-radius(sm);
    font-size: font-size(xs);
    transition: all transition(fast) ease;
    min-width: 120px;
    width: 120px;
    justify-content: flex-start;

    &:hover {
      background: color(bg-secondary);
      transform: translateY(-1px);
    }

    .monitor-icon {
      font-size: 14px;
      flex-shrink: 0;
      width: 16px;
      text-align: center;
    }

    .monitor-label {
      color: color(text-secondary);
      font-weight: font-weight(medium);
      flex-shrink: 0;
      width: 32px;
    }

    .monitor-value {
      color: color(text-primary);
      font-weight: font-weight(semibold);
      font-family: font-family(mono);
      flex: 1;
      text-align: right;
      min-width: 45px;

      &.high-usage {
        color: color(error);
        animation: pulse 2s infinite;
      }
    }
  }

  // 不同类型监控项的特殊样式
  .cpu-monitor {
    border-left: 3px solid color(info);
  }

  .memory-monitor {
    border-left: 3px solid color(primary);
  }

  .disk-monitor {
    border-left: 3px solid color(warning);
  }

  .network-monitor {
    border-left: 3px solid color(success);
    min-width: 200px;
    width: 200px;

    .monitor-value {
      min-width: 125px;
    }
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
  .connection-status-bar {
    flex-direction: column;
    gap: spacing(sm);
    align-items: flex-start;
  }

  .system-monitor {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
