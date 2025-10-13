<template>
  <div class="system-monitor">
    <div class="monitor-header">
      <h3>系统监控</h3>
      <div class="connection-status" :class="connectionStatusClass">
        {{ connectionStatusText }}
      </div>
    </div>
    
    <div class="monitor-grid" v-if="systemInfo">
      <!-- CPU使用率 -->
      <div class="monitor-item">
        <div class="monitor-label">CPU</div>
        <div class="monitor-value">{{ systemInfo.cpu }}%</div>
        <div class="monitor-bar">
          <div 
            class="monitor-fill cpu-fill" 
            :style="{ width: systemInfo.cpu + '%' }"
          ></div>
        </div>
      </div>

      <!-- 内存使用率 -->
      <div class="monitor-item">
        <div class="monitor-label">内存</div>
        <div class="monitor-value">{{ systemInfo.memory }}%</div>
        <div class="monitor-bar">
          <div 
            class="monitor-fill memory-fill" 
            :style="{ width: systemInfo.memory + '%' }"
          ></div>
        </div>
      </div>

      <!-- 磁盘使用率 -->
      <div class="monitor-item">
        <div class="monitor-label">磁盘</div>
        <div class="monitor-value">{{ systemInfo.disk }}%</div>
        <div class="monitor-bar">
          <div 
            class="monitor-fill disk-fill" 
            :style="{ width: systemInfo.disk + '%' }"
          ></div>
        </div>
      </div>

      <!-- 网络速率 -->
      <div class="monitor-item">
        <div class="monitor-label">网络</div>
        <div class="monitor-value network-value">
          <div class="network-down">
            ↓ {{ formatBytes(systemInfo.networkDown) }}/s
          </div>
          <div class="network-up">
            ↑ {{ formatBytes(systemInfo.networkUp) }}/s
          </div>
        </div>
      </div>

      <!-- 系统负载 -->
      <div class="monitor-item" v-if="systemInfo.loadAverage">
        <div class="monitor-label">负载</div>
        <div class="monitor-value load-value">
          <div>{{ systemInfo.loadAverage.load1?.toFixed(2) || '0.00' }}</div>
          <div>{{ systemInfo.loadAverage.load5?.toFixed(2) || '0.00' }}</div>
          <div>{{ systemInfo.loadAverage.load15?.toFixed(2) || '0.00' }}</div>
        </div>
        <div class="monitor-sublabel">1m 5m 15m</div>
      </div>

      <!-- 进程数 -->
      <div class="monitor-item" v-if="systemInfo.processCount">
        <div class="monitor-label">进程</div>
        <div class="monitor-value">{{ systemInfo.processCount }}</div>
      </div>
    </div>

    <!-- 连接池状态 -->
    <div class="pool-status" v-if="poolStatus">
      <div class="pool-header">
        <h4>连接池状态</h4>
        <div class="pool-indicator" :class="poolStatus.status">
          {{ poolStatus.status === 'connected' ? '已连接' : '未连接' }}
        </div>
      </div>
      <div class="pool-details">
        <div class="pool-detail-item">
          <span>错误次数:</span>
          <span>{{ poolStatus.errorCount || 0 }}</span>
        </div>
        <div class="pool-detail-item">
          <span>最后使用:</span>
          <span>{{ formatTime(poolStatus.lastUsed) }}</span>
        </div>
        <div class="pool-detail-item" v-if="poolStatus.lastError">
          <span>最后错误:</span>
          <span class="error-text">{{ poolStatus.lastError }}</span>
        </div>
      </div>
    </div>

    <!-- 更新时间 -->
    <div class="update-time" v-if="systemInfo?.lastUpdate">
      最后更新: {{ formatTime(systemInfo.lastUpdate) }}
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'SystemMonitor',
  props: {
    connection: {
      type: Object,
      required: true
    },
    poolStatus: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const systemInfo = computed(() => props.connection?.systemInfo)
    
    const connectionStatusClass = computed(() => {
      const status = props.connection?.status
      return {
        'status-connected': status === 'connected',
        'status-connecting': status === 'connecting',
        'status-disconnected': status === 'disconnected',
        'status-failed': status === 'failed'
      }
    })

    const connectionStatusText = computed(() => {
      const status = props.connection?.status
      const statusMap = {
        'connected': '已连接',
        'connecting': '连接中',
        'disconnected': '已断开',
        'failed': '连接失败',
        'cancelled': '已取消'
      }
      return statusMap[status] || '未知状态'
    })

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return '从未'
      const date = new Date(timestamp)
      return date.toLocaleTimeString()
    }

    return {
      systemInfo,
      connectionStatusClass,
      connectionStatusText,
      formatBytes,
      formatTime
    }
  }
}
</script>

<style scoped>
.system-monitor {
  padding: 16px;
  background: var(--surface-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.monitor-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.connection-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-connected {
  background: var(--success-color);
  color: white;
}

.status-connecting {
  background: var(--warning-color);
  color: white;
}

.status-disconnected, .status-failed {
  background: var(--error-color);
  color: white;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.monitor-item {
  padding: 12px;
  background: var(--background-color);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.monitor-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 500;
}

.monitor-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.network-value {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}

.network-down {
  color: var(--success-color);
}

.network-up {
  color: var(--info-color);
}

.load-value {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.monitor-bar {
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.monitor-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.cpu-fill {
  background: linear-gradient(90deg, var(--info-color), var(--warning-color));
}

.memory-fill {
  background: linear-gradient(90deg, var(--success-color), var(--warning-color));
}

.disk-fill {
  background: linear-gradient(90deg, var(--primary-color), var(--error-color));
}

.monitor-sublabel {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.pool-status {
  padding: 12px;
  background: var(--background-color);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.pool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pool-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.pool-indicator {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.pool-indicator.connected {
  background: var(--success-color);
  color: white;
}

.pool-indicator:not(.connected) {
  background: var(--error-color);
  color: white;
}

.pool-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pool-detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.pool-detail-item span:first-child {
  color: var(--text-secondary);
}

.pool-detail-item span:last-child {
  color: var(--text-color);
  font-weight: 500;
}

.error-text {
  color: var(--error-color) !important;
}

.update-time {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
}
</style>
