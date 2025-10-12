<template>
  <div class="tab-manager">
    <!-- Tab栏 -->
    <div class="tab-bar" v-if="activeConnections.length > 0">
      <div class="tab-list">
        <div
          v-for="connection in activeConnections"
          :key="connection.id"
          class="tab-item"
          :class="{ active: activeTabId === connection.id }"
          @click="switchTab(connection.id)"
        >
          <div class="tab-content">
            <span class="tab-icon">{{ getConnectionIcon(connection) }}</span>
            <span class="tab-title">{{ connection.name }}</span>
            <span class="tab-status" :class="connection.status"></span>
          </div>
          <button
            class="tab-close"
            @click.stop="closeConnection(connection.id)"
            title="关闭连接"
          >
            ×
          </button>
        </div>
      </div>
      <button class="new-tab-btn" @click="$emit('open-session-modal')" title="新建连接">
        +
      </button>
    </div>

    <!-- Tab内容区域 -->
    <div class="tab-content-area">
      <!-- 无连接时的欢迎页面 -->
      <div v-if="activeConnections.length === 0" class="welcome-screen">
        <div class="welcome-content">
          <div class="welcome-icon">🖥️</div>
          <h1>SSH Remote</h1>
          <p class="welcome-subtitle">安全的SSH远程连接管理工具</p>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">🔐</span>
              <span>支持密码和密钥认证</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">⚡</span>
              <span>快速连接测试</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📁</span>
              <span>文件传输管理</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">💾</span>
              <span>连接配置保存</span>
            </div>
          </div>
          <div class="action-buttons">
            <button class="primary-btn" @click="$emit('open-session-modal')">
              <span class="btn-icon">🔗</span>
              创建连接
            </button>
            <button class="secondary-btn" @click="$emit('open-session-modal')">
              <span class="btn-icon">📚</span>
              查看帮助
            </button>
          </div>
        </div>
      </div>

      <!-- 有连接时的标签页内容 -->
      <div v-else class="connection-content">
        <div
          v-for="connection in activeConnections"
          :key="connection.id"
          v-show="activeTabId === connection.id"
          class="tab-panel"
        >
          <!-- 连接状态头部 -->
          <div class="connection-header">
            <div class="connection-info">
              <h3>{{ connection.name }}</h3>
              <p class="connection-details">
                {{ connection.username }}@{{ connection.host }}:{{ connection.port || 22 }}
              </p>
            </div>
            <div class="connection-actions">
              <button
                class="action-btn"
                @click="reconnectConnection(connection)"
                :disabled="connection.status === 'connecting'"
                title="重新连接"
              >
                🔄
              </button>
              <button
                class="action-btn"
                @click="disconnectConnection(connection.id)"
                :disabled="connection.status === 'disconnected'"
                title="断开连接"
              >
                🔌
              </button>
              <button
                class="action-btn"
                @click="$emit('open-session-modal')"
                title="管理连接"
              >
                ⚙️
              </button>
            </div>
          </div>

          <!-- 连接状态显示 -->
          <div class="connection-status-bar">
            <div class="status-indicator" :class="connection.status">
              <span class="status-dot"></span>
              <span class="status-text">{{ getStatusText(connection.status) }}</span>
            </div>
            <div class="connection-time" v-if="connection.connectedAt">
              连接时间: {{ formatConnectionTime(connection.connectedAt) }}
            </div>
          </div>

          <!-- SSH终端区域 -->
          <div class="terminal-container" v-if="connection.status === 'connected'">
            <div class="terminal-header">
              <span class="terminal-title">SSH Terminal - {{ connection.host }}</span>
              <div class="terminal-controls">
                <button class="terminal-control-btn" @click="clearTerminal(connection.id)">
                  🗑️ 清空
                </button>
                <button class="terminal-control-btn" @click="copyTerminalContent(connection.id)">
                  📋 复制
                </button>
              </div>
            </div>
            <div
              class="terminal-output"
              :ref="`terminal-${connection.id}`"
              @contextmenu.prevent="showTerminalMenu($event, connection.id)"
            >
              <div
                v-for="(line, index) in connection.terminalOutput"
                :key="index"
                class="terminal-line"
                :class="{ 'error-line': line.type === 'error', 'success-line': line.type === 'success' }"
              >
                <span class="line-timestamp" v-if="line.timestamp">
                  {{ formatTimestamp(line.timestamp) }}
                </span>
                <span class="line-content">{{ line.content }}</span>
              </div>
              <div v-if="connection.terminalOutput.length === 0" class="terminal-welcome">
                欢迎使用SSH终端，输入命令开始操作...
              </div>
            </div>
            <div class="terminal-input-container">
              <div class="terminal-prompt">{{ connection.username }}@{{ connection.host }}:~$</div>
              <input
                type="text"
                class="terminal-input"
                :ref="`input-${connection.id}`"
                v-model="connection.currentCommand"
                @keydown.enter="executeCommand(connection)"
                @keydown.tab.prevent="handleTabCompletion(connection)"
                placeholder="输入SSH命令..."
                :disabled="connection.status !== 'connected'"
              />
              <button
                class="execute-btn"
                @click="executeCommand(connection)"
                :disabled="!connection.currentCommand.trim() || connection.status !== 'connected'"
              >
                执行
              </button>
            </div>
          </div>

          <!-- 连接中状态 -->
          <div class="connecting-container" v-else-if="connection.status === 'connecting'">
            <div class="connecting-animation">
              <div class="loading-spinner"></div>
              <p>正在连接到 {{ connection.host }}...</p>
              <div class="connecting-steps">
                <div class="step" :class="{ completed: connection.connectStep >= 1 }">
                  <span class="step-icon">🔍</span>
                  <span class="step-text">解析主机地址</span>
                </div>
                <div class="step" :class="{ completed: connection.connectStep >= 2 }">
                  <span class="step-icon">🔐</span>
                  <span class="step-text">身份验证</span>
                </div>
                <div class="step" :class="{ completed: connection.connectStep >= 3 }">
                  <span class="step-icon">🔗</span>
                  <span class="step-text">建立SSH连接</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 连接失败状态 -->
          <div class="connection-failed-container" v-else-if="connection.status === 'failed'">
            <div class="failed-content">
              <div class="failed-icon">❌</div>
              <h3>连接失败</h3>
              <p class="failed-message">{{ connection.errorMessage || '未知错误' }}</p>
              <div class="failed-actions">
                <button class="retry-btn" @click="reconnectConnection(connection)">
                  🔄 重试连接
                </button>
                <button class="edit-btn" @click="$emit('open-session-modal')">
                  ✏️ 编辑配置
                </button>
              </div>
            </div>
          </div>

          <!-- 已断开连接状态 -->
          <div class="disconnected-container" v-else-if="connection.status === 'disconnected'">
            <div class="disconnected-content">
              <div class="disconnected-icon">🔌</div>
              <h3>连接已断开</h3>
              <p>SSH连接已安全断开</p>
              <button class="reconnect-btn" @click="reconnectConnection(connection)">
                🔗 重新连接
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

export default {
  name: 'TabManager',
  emits: ['session-connected', 'session-disconnected', 'show-notification', 'open-session-modal'],
  setup(props, { emit }) {
    // 状态管理
    const activeConnections = ref([])
    const activeTabId = ref(null)
    const connectionTimers = ref(new Map())

    // 添加新的SSH连接
    const addConnection = async (sessionData) => {
      const connection = {
        id: sessionData.id,
        name: sessionData.name,
        host: sessionData.host,
        port: sessionData.port || 22,
        username: sessionData.username,
        authType: sessionData.authType,
        password: sessionData.password,
        keyPath: sessionData.keyPath,
        keyContent: sessionData.keyContent,
        status: 'connecting', // connecting, connected, failed, disconnected
        connectStep: 0,
        errorMessage: null,
        connectedAt: null,
        terminalOutput: [],
        currentCommand: '',
        lastActivity: new Date()
      }

      activeConnections.value.push(connection)
      activeTabId.value = connection.id

      // 开始连接过程
      await establishConnection(connection)
    }

    // 建立SSH连接
    const establishConnection = async (connection) => {
      try {
        connection.status = 'connecting'
        connection.connectStep = 1
        connection.errorMessage = null

        emit('show-notification', `正在连接到 ${connection.host}...`, 'info')

        // 模拟连接步骤
        await simulateConnectionStep(connection, 2, 1000) // 身份验证
        await simulateConnectionStep(connection, 3, 1500) // 建立连接

        // 实际SSH连接
        if (window.electronAPI) {
          const result = await window.electronAPI.sshConnect({
            id: connection.id,
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            privateKey: connection.keyContent
          })

          if (result.success) {
            connection.status = 'connected'
            connection.connectedAt = new Date()
            connection.errorMessage = null

            // 添加欢迎消息
            addTerminalOutput(connection, {
              type: 'success',
              content: `成功连接到 ${connection.host}`,
              timestamp: new Date()
            })

            addTerminalOutput(connection, {
              type: 'info',
              content: `欢迎 ${connection.username}@${connection.host}`,
              timestamp: new Date()
            })

            emit('show-notification', `已连接到 ${connection.name}`, 'success')
            emit('session-connected', connection)

            // 启动连接监控
            startConnectionMonitoring(connection)

          } else {
            connection.status = 'failed'
            connection.errorMessage = result.error

            addTerminalOutput(connection, {
              type: 'error',
              content: `连接失败: ${result.error}`,
              timestamp: new Date()
            })

            emit('show-notification', `连接失败: ${result.error}`, 'error')
          }
        } else {
          // 开发模式模拟连接成功
          setTimeout(() => {
            connection.status = 'connected'
            connection.connectedAt = new Date()

            addTerminalOutput(connection, {
              type: 'success',
              content: `成功连接到 ${connection.host} (开发模式)`,
              timestamp: new Date()
            })

            emit('show-notification', `已连接到 ${connection.name}`, 'success')
            emit('session-connected', connection)
            startConnectionMonitoring(connection)
          }, 2000)
        }
      } catch (error) {
        connection.status = 'failed'
        connection.errorMessage = error.message

        addTerminalOutput(connection, {
          type: 'error',
          content: `连接异常: ${error.message}`,
          timestamp: new Date()
        })

        emit('show-notification', `连接异常: ${error.message}`, 'error')
      }
    }

    // 模拟连接步骤
    const simulateConnectionStep = (connection, step, delay) => {
      return new Promise(resolve => {
        setTimeout(() => {
          connection.connectStep = step
          resolve()
        }, delay)
      })
    }

    // 执行SSH命令
    const executeCommand = async (connection) => {
      const command = connection.currentCommand.trim()
      if (!command) return

      const commandLine = `${connection.username}@${connection.host}:~$ ${command}`

      // 添加命令到输出
      addTerminalOutput(connection, {
        type: 'command',
        content: commandLine,
        timestamp: new Date()
      })

      connection.currentCommand = ''
      connection.lastActivity = new Date()

      try {
        if (window.electronAPI && connection.status === 'connected') {
          const result = await window.electronAPI.sshExecute(connection.id, command)

          if (result.success) {
            addTerminalOutput(connection, {
              type: 'output',
              content: result.output,
              timestamp: new Date()
            })
          } else {
            addTerminalOutput(connection, {
              type: 'error',
              content: `命令执行失败: ${result.error}`,
              timestamp: new Date()
            })
          }
        } else {
          // 开发模式模拟命令执行
          setTimeout(() => {
            const output = simulateCommandOutput(command)
            addTerminalOutput(connection, {
              type: 'output',
              content: output,
              timestamp: new Date()
            })
          }, 500)
        }
      } catch (error) {
        addTerminalOutput(connection, {
          type: 'error',
          content: `命令执行异常: ${error.message}`,
          timestamp: new Date()
        })
      }

      // 滚动到底部
      await nextTick()
      scrollToBottom(connection.id)
    }

    // 模拟命令输出
    const simulateCommandOutput = (command) => {
      const outputs = {
        'ls': 'Desktop  Documents  Downloads  Music  Pictures  Public  Templates  Videos',
        'pwd': '/home/user',
        'whoami': 'user',
        'date': new Date().toString(),
        'uname -a': 'Linux hostname 5.15.0-generic #1 SMP Ubuntu 5.15.0-52-generic x86_64 GNU/Linux',
        'df -h': `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   15G   33G  32% /
tmpfs           3.9G     0  3.9G   0% /dev/shm
tmpfs           1.6G  1.2M  1.6G   1% /run
/dev/sdb1       100G   20G   75G  21% /data`,
        'free -h': `              total        used        free      shared  buff/cache   available
Mem:          7.8Gi       2.1Gi       4.2Gi       1.0MiB       1.5Gi       5.3Gi
Swap:         2.0Gi          0B       2.0Gi`
      }

      return outputs[command] || `${command}: command executed successfully (development mode)`
    }

    // 添加终端输出
    const addTerminalOutput = (connection, line) => {
      connection.terminalOutput.push(line)

      // 限制输出历史记录
      if (connection.terminalOutput.length > 1000) {
        connection.terminalOutput = connection.terminalOutput.slice(-500)
      }
    }

    // 滚动到底部
    const scrollToBottom = (connectionId) => {
      nextTick(() => {
        const terminal = document.querySelector(`[ref="terminal-${connectionId}"]`)
        if (terminal) {
          terminal.scrollTop = terminal.scrollHeight
        }
      })
    }

    // 断开连接
    const disconnectConnection = async (connectionId) => {
      const connection = activeConnections.value.find(c => c.id === connectionId)
      if (!connection) return

      try {
        connection.status = 'disconnected'

        if (window.electronAPI) {
          await window.electronAPI.sshDisconnect(connectionId)
        }

        addTerminalOutput(connection, {
          type: 'info',
          content: '连接已断开',
          timestamp: new Date()
        })

        emit('show-notification', `已断开 ${connection.name} 的连接`, 'info')
        emit('session-disconnected', connection)

        // 停止连接监控
        stopConnectionMonitoring(connectionId)

      } catch (error) {
        emit('show-notification', `断开连接失败: ${error.message}`, 'error')
      }
    }

    // 重新连接
    const reconnectConnection = async (connection) => {
      await establishConnection(connection)
    }

    // 关闭连接
    const closeConnection = async (connectionId) => {
      const connection = activeConnections.value.find(c => c.id === connectionId)
      if (!connection) return

      // 先断开连接
      if (connection.status === 'connected') {
        await disconnectConnection(connectionId)
      }

      // 移除连接
      const index = activeConnections.value.findIndex(c => c.id === connectionId)
      if (index > -1) {
        activeConnections.value.splice(index, 1)
      }

      // 如果关闭的是当前活动标签，切换到其他标签
      if (activeTabId.value === connectionId) {
        activeTabId.value = activeConnections.value.length > 0
          ? activeConnections.value[activeConnections.value.length - 1].id
          : null
      }

      emit('show-notification', `已关闭 ${connection.name}`, 'info')
    }

    // 切换标签
    const switchTab = (connectionId) => {
      activeTabId.value = connectionId
      const connection = activeConnections.value.find(c => c.id === connectionId)
      if (connection) {
        connection.lastActivity = new Date()
      }
    }

    // 连接监控
    const startConnectionMonitoring = (connection) => {
      const timer = setInterval(() => {
        if (connection.status === 'connected') {
          // 检查连接状态
          checkConnectionHealth(connection)
        }
      }, 30000) // 每30秒检查一次

      connectionTimers.value.set(connection.id, timer)
    }

    const stopConnectionMonitoring = (connectionId) => {
      const timer = connectionTimers.value.get(connectionId)
      if (timer) {
        clearInterval(timer)
        connectionTimers.value.delete(connectionId)
      }
    }

    const checkConnectionHealth = async (connection) => {
      try {
        if (window.electronAPI) {
          // 发送心跳命令检查连接状态
          await window.electronAPI.sshExecute(connection.id, 'echo "heartbeat"')
        }
      } catch (error) {
        connection.status = 'disconnected'
        addTerminalOutput(connection, {
          type: 'warning',
          content: '连接已丢失',
          timestamp: new Date()
        })
        emit('show-notification', `${connection.name} 连接已丢失`, 'warning')
      }
    }

    // 清空终端
    const clearTerminal = (connectionId) => {
      const connection = activeConnections.value.find(c => c.id === connectionId)
      if (connection) {
        connection.terminalOutput = []
        addTerminalOutput(connection, {
          type: 'info',
          content: '终端已清空',
          timestamp: new Date()
        })
      }
    }

    // 复制终端内容
    const copyTerminalContent = async (connectionId) => {
      const connection = activeConnections.value.find(c => c.id === connectionId)
      if (connection) {
        const content = connection.terminalOutput
          .map(line => line.content)
          .join('\n')

        try {
          await navigator.clipboard.writeText(content)
          emit('show-notification', '终端内容已复制到剪贴板', 'success')
        } catch (error) {
          emit('show-notification', '复制失败', 'error')
        }
      }
    }

    // Tab补全
    const handleTabCompletion = (connection) => {
      // 简单的Tab补全实现
      const command = connection.currentCommand
      const commonCommands = ['ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'ssh', 'scp', 'mv', 'cp', 'rm']

      const match = commonCommands.find(cmd => cmd.startsWith(command))
      if (match && match !== command) {
        connection.currentCommand = match
      }
    }

    // 获取连接图标
    const getConnectionIcon = (connection) => {
      const icons = {
        connecting: '⏳',
        connected: '🟢',
        failed: '❌',
        disconnected: '🔌'
      }
      return icons[connection.status] || '🔌'
    }

    // 获取状态文本
    const getStatusText = (status) => {
      const texts = {
        connecting: '连接中...',
        connected: '已连接',
        failed: '连接失败',
        disconnected: '已断开'
      }
      return texts[status] || '未知状态'
    }

    // 格式化连接时间
    const formatConnectionTime = (connectedAt) => {
      const now = new Date()
      const diff = now - connectedAt
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        return `${hours}小时${minutes % 60}分钟`
      } else {
        return `${minutes}分钟`
      }
    }

    // 格式化时间戳
    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    // 显示终端右键菜单
    const showTerminalMenu = (event, connectionId) => {
      // 可以在这里实现右键菜单功能
      console.log('Terminal context menu requested for:', connectionId)
    }

    // 处理外部连接请求
    const handleSessionConnected = (sessionData) => {
      addConnection(sessionData)
    }

    // 组件卸载时清理
    onUnmounted(() => {
      connectionTimers.value.forEach(timer => clearInterval(timer))
      connectionTimers.value.clear()
    })

    return {
      activeConnections,
      activeTabId,
      addConnection,
      handleSessionConnected,
      switchTab,
      closeConnection,
      disconnectConnection,
      reconnectConnection,
      executeCommand,
      clearTerminal,
      copyTerminalContent,
      handleTabCompletion,
      showTerminalMenu,
      getConnectionIcon,
      getStatusText,
      formatConnectionTime,
      formatTimestamp
    }
  }
}
</script>

<style lang="scss" scoped>
.tab-manager {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: color(bg-primary);
}

// Tab栏样式
.tab-bar {
  display: flex;
  align-items: center;
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  padding: 0 spacing(sm);
  min-height: 48px;
}

.tab-list {
  display: flex;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
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
  width: 32px;
  height: 32px;
  border: 1px solid color(border);
  background: color(bg-tertiary);
  color: color(text-secondary);
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }
}

// Tab内容区域
.tab-content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

// 欢迎页面样式
.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
}

.welcome-content {
  text-align: center;
  max-width: 600px;
}

.welcome-icon {
  font-size: 120px;
  margin-bottom: spacing(lg);
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.welcome-content h1 {
  font-size: font-size(xxxl);
  font-weight: font-weight(bold);
  color: color(text-primary);
  margin: 0 0 spacing(sm) 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.welcome-subtitle {
  font-size: font-size(lg);
  color: color(text-secondary);
  margin: 0 0 spacing(xl) 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: spacing(md);
  margin: spacing(xl) 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  padding: spacing(md);
  background: color(bg-secondary);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  transition: all transition(normal) ease;

  &:hover {
    background: color(bg-tertiary);
    transform: translateY(-2px);
    box-shadow: shadow(md);
  }
}

.feature-icon {
  font-size: 20px;
}

.action-buttons {
  display: flex;
  gap: spacing(md);
  justify-content: center;
  flex-wrap: wrap;
}

.primary-btn, .secondary-btn {
  @include button-base;
  padding: spacing(md) spacing(xl);
  font-size: font-size(base);
  border-radius: border-radius(lg);
  display: flex;
  align-items: center;
  gap: spacing(sm);
  transition: all transition(normal) ease;

  &:hover {
    transform: translateY(-2px);
  }
}

.primary-btn {
  background: linear-gradient(135deg, color(primary), color(primary-light));
  color: color(white);
  box-shadow: shadow(md);

  &:hover {
    background: linear-gradient(135deg, color(primary-light), color(primary));
    box-shadow: shadow(lg);
  }
}

.secondary-btn {
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

// 连接内容样式
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

.connection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(md) spacing(lg);
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
}

.connection-info h3 {
  margin: 0 0 spacing(xs) 0;
  font-size: font-size(lg);
  font-weight: font-weight(semibold);
  color: color(text-primary);
}

.connection-details {
  margin: 0;
  font-size: font-size(sm);
  color: color(text-secondary);
  font-family: font-family(mono);
}

.connection-actions {
  display: flex;
  gap: spacing(sm);
}

.action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid color(border);
  background: color(bg-tertiary);
  color: color(text-secondary);
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all transition(fast) ease;

  &:hover:not(:disabled) {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.connection-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(lg);
  background: color(surface);
  border-bottom: 1px solid color(border);
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
}

// 终端样式
.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: color(surface);
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(lg);
  background: color(bg-tertiary);
  border-bottom: 1px solid color(border);
}

.terminal-title {
  font-size: font-size(sm);
  font-weight: font-weight(medium);
  color: color(text-primary);
}

.terminal-controls {
  display: flex;
  gap: spacing(sm);
}

.terminal-control-btn {
  padding: spacing(xs) spacing(sm);
  background: color(bg-secondary);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  color: color(text-secondary);
  font-size: font-size(xs);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover {
    background: color(bg-primary);
    color: color(text-primary);
  }
}

.terminal-output {
  flex: 1;
  padding: spacing(md);
  background: #1e1e1e;
  color: #f0f0f0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-line {
  margin-bottom: 2px;

  &.error-line {
    color: #ff6b6b;
  }

  &.success-line {
    color: #51cf66;
  }

  &.command {
    color: #74c0fc;
    font-weight: bold;
  }
}

.line-timestamp {
  color: #868e96;
  margin-right: spacing(sm);
  font-size: 11px;
}

.line-content {
  white-space: pre-wrap;
}

.terminal-welcome {
  color: #868e96;
  font-style: italic;
}

.terminal-input-container {
  display: flex;
  align-items: center;
  padding: spacing(md);
  background: color(bg-primary);
  border-top: 1px solid color(border);
  gap: spacing(sm);
}

.terminal-prompt {
  color: #74c0fc;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  color: color(text-primary);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  outline: none;

  &:disabled {
    opacity: 0.5;
  }
}

.execute-btn {
  padding: spacing(xs) spacing(sm);
  background: color(primary);
  color: color(white);
  border: none;
  border-radius: border-radius(sm);
  font-size: font-size(xs);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover:not(:disabled) {
    background: color(primary-light);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 连接中状态
.connecting-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
}

.connecting-animation {
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid color(border);
  border-top: 4px solid color(primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto spacing(lg);
}

.connecting-steps {
  margin-top: spacing(lg);
  display: flex;
  flex-direction: column;
  gap: spacing(sm);
}

.step {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  padding: spacing(sm);
  border-radius: border-radius(sm);
  transition: all transition(normal) ease;

  &.completed {
    background: rgba(82, 196, 26, 0.1);
    color: color(success);
  }
}

.step-icon {
  font-size: 18px;
}

.step-text {
  font-size: font-size(sm);
  color: color(text-secondary);

  .completed & {
    color: color(success);
  }
}

// 连接失败状态
.connection-failed-container,
.disconnected-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing(xxl);
}

.failed-content,
.disconnected-content {
  text-align: center;
  max-width: 400px;
}

.failed-icon,
.disconnected-icon {
  font-size: 64px;
  margin-bottom: spacing(lg);
}

.failed-content h3,
.disconnected-content h3 {
  font-size: font-size(xl);
  color: color(text-primary);
  margin: 0 0 spacing(md) 0;
}

.failed-message {
  color: color(text-secondary);
  margin: 0 0 spacing(lg) 0;
  line-height: line-height(relaxed);
}

.failed-actions {
  display: flex;
  gap: spacing(md);
  justify-content: center;
}

.retry-btn,
.reconnect-btn,
.edit-btn {
  @include button-base;
  padding: spacing(sm) spacing(lg);
  border-radius: border-radius(md);
}

.retry-btn,
.reconnect-btn {
  background: color(primary);
  color: color(white);

  &:hover {
    background: color(primary-light);
  }
}

.edit-btn {
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

// 动画
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 768px) {
  .tab-bar {
    padding: 0 spacing(xs);
  }

  .tab-item {
    min-width: 120px;
    max-width: 180px;
  }

  .connection-header {
    flex-direction: column;
    gap: spacing(sm);
    align-items: flex-start;
  }

  .connection-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .terminal-input-container {
    flex-wrap: wrap;
  }

  .failed-actions {
    flex-direction: column;
  }
}
</style>