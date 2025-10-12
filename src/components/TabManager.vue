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
  
          <!-- 三部分布局容器 -->
          <div class="three-panel-layout" :class="{ resizing: isResizing }" v-if="connection.status === 'connected'">
            <!-- 文件管理面板 (可调整宽度) -->
            <div class="panel-section files-panel" :style="{ width: panelWidths.files + '%' }">
              <div class="panel-header">
                <h3><span class="panel-icon">📁</span> 文件管理</h3>
              </div>
              <div class="panel-body">
                <FileManager
                  :connection-id="connection.id"
                  :connection="connection"
                  @show-notification="handleShowNotification"
                  @execute-command="handleExecuteCommand"
                />
              </div>
            </div>

            <!-- 第一个拖拽分隔符 -->
            <div
              class="resize-handle resize-handle-vertical"
              @mousedown="startResize($event, 'files-terminal')"
            ></div>

            <!-- 终端面板 (可调整宽度) -->
            <div class="panel-section terminal-panel" :style="{ width: panelWidths.terminal + '%' }">
              <div class="panel-header">
                <h3><span class="panel-icon">💻</span> SSH Terminal - {{ connection.host }}</h3>
                <div class="panel-controls">
                  <button class="control-btn" @click="clearTerminal(connection.id)" title="清空">
                    🗑️
                  </button>
                  <button class="control-btn" @click="copyTerminalContent(connection.id)" title="复制">
                    📋
                  </button>
                </div>
              </div>
              <div class="panel-body">
                <div class="terminal-content">
                  <div
                    class="terminal-output"
                    :ref="`terminal-${connection.id}`"
                    @contextmenu.prevent="handleTerminalContextMenu($event, connection.id)"
                    @mouseup="handleTerminalMouseUp($event, connection.id)"
                    @selectstart="handleTerminalSelectStart"
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
                      <span class="line-content" v-if="line.isHtml" v-html="line.content"></span>
                      <span class="line-content" v-else>{{ line.content }}</span>
                    </div>
                    <div v-if="connection.terminalOutput.length === 0" class="terminal-welcome">
                      欢迎使用SSH终端，输入命令开始操作...
                    </div>
                  </div>
                  <div class="terminal-input-container">
                    <div class="terminal-prompt">{{ connection.username }}@{{ connection.host }}:~$</div>
                    <div class="terminal-input-wrapper">
                      <input
                        type="text"
                        class="terminal-input"
                        :ref="`input-${connection.id}`"
                        v-model="connection.currentCommand"
                        @keydown="handleTerminalKeydown($event, connection)"
                        @input="handleTerminalInput(connection)"
                        @focus="handleTerminalFocus(connection)"
                        @blur="handleTerminalBlur(connection)"
                        placeholder="输入SSH命令..."
                        :disabled="connection.status !== 'connected'"
                      />
                      <TerminalAutocomplete
                        :ref="el => setAutocompleteRef(connection.id, el)"
                        :current-input="connection.currentCommand"
                        :is-visible="connection.showAutocomplete"
                        @select="handleAutocompleteSelect"
                        @hide="handleAutocompleteHide"
                      />
                    </div>
                    <button
                      class="execute-btn"
                      @click="executeCommand(connection)"
                      :disabled="!connection.currentCommand.trim() || connection.status !== 'connected'"
                    >
                      执行
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 第二个拖拽分隔符 -->
            <div
              class="resize-handle resize-handle-vertical"
              @mousedown="startResize($event, 'terminal-ai')"
            ></div>

            <!-- AI助手面板 (可调整宽度) -->
            <div class="panel-section ai-panel" :style="{ width: panelWidths.ai + '%' }">
              <div class="panel-header">
                <h3><span class="panel-icon">🤖</span> AI助手</h3>
              </div>
              <div class="panel-body">
                <AIAssistant
                  :connection-id="connection.id"
                  :connection="connection"
                  @show-notification="handleShowNotification"
                  @execute-command="handleExecuteCommand"
                />
              </div>
            </div>
          </div>

          <!-- 连接状态显示 (移动到底部) -->
          <div class="connection-status-bar" v-if="connection.status === 'connected'">
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
                  ↓{{ formatBytes(connection.systemInfo.networkDown) }}/s ↑{{ formatBytes(connection.systemInfo.networkUp) }}/s
                </span>
              </div>
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

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :selected-text="contextMenu.selectedText"
      @copy="handleContextMenuCopy"
      @add-to-ai="handleContextMenuAddToAI"
      @select-all="handleContextMenuSelectAll"
      @close="hideContextMenu"
      @update:position="updateContextMenuPosition"
    />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import Convert from 'ansi-to-html'
import FileManager from './FileManager.vue'
import AIAssistant from './AIAssistant.vue'
import TerminalAutocomplete from './TerminalAutocomplete.vue'
import ContextMenu from './ContextMenu.vue'

export default {
  name: 'TabManager',
  components: {
    FileManager,
    AIAssistant,
    TerminalAutocomplete,
    ContextMenu
  },
  emits: ['session-connected', 'session-disconnected', 'show-notification', 'open-session-modal'],
  setup(props, { emit }) {
    // ANSI转换器实例
    const ansiConvert = new Convert({
      fg: '#f0f0f0',
      bg: '#1e1e1e',
      newline: false,
      escapeXML: true,
      stream: false
    })

    // 状态管理
    const activeConnections = ref([])
    const activeTabId = ref(null)
    const connectionTimers = ref(new Map())
    const systemMonitorTimers = ref(new Map())
    const autocompleteRefs = ref([])

    // 右键菜单状态
    const contextMenu = reactive({
      visible: false,
      x: 0,
      y: 0,
      selectedText: '',
      connectionId: null
    })

    // 面板定义
    const panels = ref([
      { id: 'files', title: '文件管理', icon: '📁' },
      { id: 'terminal', title: '终端', icon: '💻' },
      { id: 'ai', title: 'AI助手', icon: '🤖' }
    ])

    // 面板宽度状态 (初始3:4:3比例)
    const panelWidths = reactive({
      files: 30,
      terminal: 40,
      ai: 30
    })

    // 拖拽调整状态
    const isResizing = ref(false)
    const resizingHandle = ref(null)
    const startMouseX = ref(0)
    const startWidths = reactive({ files: 30, terminal: 40, ai: 30 })

    // 添加新的SSH连接
    const addConnection = async (sessionData) => {
      console.log('➕ [TAB-MANAGER] 添加新连接到activeConnections:', {
        name: sessionData.name,
        id: sessionData.id
      });

      // 使用 reactive 确保连接对象的响应式
      const connection = reactive({
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
        showAutocomplete: false,
        lastActivity: new Date(),
        activePanel: 'terminal', // 默认显示终端面板
        systemInfo: {
          cpu: 0,
          memory: 0,
          disk: 0,
          networkUp: 0,
          networkDown: 0,
          lastUpdate: null
        }
      })

      console.log('📋 [TAB-MANAGER] 连接对象创建完成，当前连接数:', activeConnections.value.length);
      activeConnections.value.push(connection)
      activeTabId.value = connection.id

      console.log('🎯 [TAB-MANAGER] 设置活动标签页为:', connection.id);
      console.log('📊 [TAB-MANAGER] 当前activeConnections:', activeConnections.value.map(c => ({id: c.id, name: c.name, status: c.status})));

      // 开始连接过程
      await establishConnection(connection)
    }

    // 建立SSH连接
    const establishConnection = async (connection) => {
      console.log('🔄 [TAB-MANAGER] 开始建立SSH连接:', {
        id: connection.id,
        name: connection.name,
        host: connection.host,
        username: connection.username,
        authType: connection.authType
      });

      try {
        connection.status = 'connecting'
        connection.connectStep = 1
        connection.errorMessage = null

        console.log('📱 [TAB-MANAGER] 状态更新为connecting，发送通知');

        emit('show-notification', `正在连接到 ${connection.host}...`, 'info')

        // 模拟连接步骤
        console.log('⏳ [TAB-MANAGER] 开始模拟连接步骤');
        await simulateConnectionStep(connection, 2, 1000) // 身份验证
        console.log('✓ [TAB-MANAGER] 身份验证步骤完成');
        await simulateConnectionStep(connection, 3, 1500) // 建立连接
        console.log('✓ [TAB-MANAGER] 建立连接步骤完成');

        // 实际SSH连接
        if (window.electronAPI) {
          console.log('🌐 [TAB-MANAGER] 使用ElectronAPI进行真实SSH连接');

          const connectionParams = {
            id: connection.id,
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password,
            privateKey: connection.keyContent,
            authType: connection.authType
          };

          console.log('📤 [TAB-MANAGER] 发送SSH连接参数:', {
            id: connectionParams.id,
            host: connectionParams.host,
            port: connectionParams.port,
            username: connectionParams.username,
            authType: connectionParams.authType,
            hasPassword: !!connectionParams.password,
            hasPrivateKey: !!connectionParams.privateKey
          });

          const result = await window.electronAPI.sshConnect(connectionParams);

          console.log('📥 [TAB-MANAGER] SSH连接结果:', {
            success: result.success,
            message: result.message,
            error: result.error
          });

          if (result.success) {
            console.log('🎉 [TAB-MANAGER] SSH连接成功，更新状态');
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

            // 启动连接监控
            startConnectionMonitoring(connection)
            console.log('👁️ [TAB-MANAGER] 连接监控已启动');
            
            // 启动系统监控
            startSystemMonitoring(connection)
            console.log('📊 [TAB-MANAGER] 系统监控已启动');

          } else {
            console.error('💥 [TAB-MANAGER] SSH连接失败:', result.error);
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
          console.log('🔧 [TAB-MANAGER] 开发模式：模拟连接成功');
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
            startConnectionMonitoring(connection)
          }, 2000)
        }
      } catch (error) {
        console.error('💥 [TAB-MANAGER] 连接异常:', error);
        connection.status = 'failed'
        connection.errorMessage = error.message

        addTerminalOutput(connection, {
          type: 'error',
          content: `连接异常: ${error.message}`,
          timestamp: new Date()
        })

        emit('show-notification', `连接异常: ${error.message}`, 'error')
      }

      console.log('🏁 [TAB-MANAGER] 连接尝试完成，最终状态:', connection.status);
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
      // 处理ANSI转义序列
      if (line.type === 'output' || line.type === 'error') {
        try {
          // 检查是否包含清屏命令的ANSI序列
          if (line.content.includes('\x1b[2J') || line.content.includes('\x1b[H')) {
            // 清空终端输出
            connection.terminalOutput = []
            // 添加一个简单的清屏标记
            line = {
              type: 'info',
              content: '--- 终端已清空 ---',
              timestamp: new Date()
            }
          } else {
            // 转换ANSI转义序列为HTML
            const processedContent = ansiConvert.toHtml(line.content)
            line = {
              ...line,
              content: processedContent,
              isHtml: true
            }
          }
        } catch (error) {
          // 如果转换失败，保持原始内容
          console.warn('ANSI转换失败:', error)
        }
      }

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
        
        // 停止系统监控
        stopSystemMonitoring(connectionId)

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

    // Tab补全 - 与自动补全组件集成
    const handleTabCompletion = (connection) => {
      // 找到对应的自动补全组件
      const autocompleteRef = autocompleteRefs.value[connection.id]

      if (autocompleteRef && autocompleteRef.filteredSuggestions && autocompleteRef.filteredSuggestions.value.length > 0) {
        // 如果有建议项，选择第一个建议项
        const firstSuggestion = autocompleteRef.filteredSuggestions.value[0]
        handleAutocompleteSelect(firstSuggestion.command)
      } else {
        // 如果没有建议项，隐藏自动补全
        connection.showAutocomplete = false
      }
    }

    // 设置自动补全组件引用
    const setAutocompleteRef = (connectionId, el) => {
      if (el && connectionId) {
        autocompleteRefs.value[connectionId] = el
      }
    }

    // 终端输入框事件处理
    const handleTerminalKeydown = (event, connection) => {
      // 处理Tab键自动补全
      if (event.key === 'Tab') {
        event.preventDefault()
        handleTabCompletion(connection)
        return
      }

      // 如果自动补全组件可见，优先委托给自动补全组件处理上下箭头键和Enter键
      if (connection.showAutocomplete && (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter' || event.key === 'Escape')) {
        // 找到对应的自动补全组件
        const autocompleteRef = autocompleteRefs.value[connection.id]

        if (autocompleteRef && autocompleteRef.handleKeyDown && autocompleteRef.handleKeyDown(event)) {
          // 如果自动补全组件处理了该事件，阻止默认行为并返回
          event.preventDefault()
          event.stopPropagation()
          return
        }

        // 如果补全组件存在但没有处理该事件，仍然阻止默认行为
        if (autocompleteRef) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
      }

      // 处理其他按键事件
      switch (event.key) {
        case 'Enter':
          // 只有在没有显示补全时才执行命令
          if (connection.currentCommand.trim()) {
            executeCommand(connection)
          }
          break
        case 'Escape':
          connection.showAutocomplete = false
          break
      }
    }

    const handleTerminalInput = (connection) => {
      // 显示自动补全建议（如果输入内容不为空）
      connection.showAutocomplete = connection.currentCommand.trim().length > 0
    }

    const handleTerminalFocus = (connection) => {
      // 获得焦点时显示自动补全（如果有输入内容）
      connection.showAutocomplete = connection.currentCommand.trim().length > 0
    }

    const handleTerminalBlur = (connection) => {
      // 延迟隐藏自动补全，以便处理点击事件
      setTimeout(() => {
        connection.showAutocomplete = false
      }, 200)
    }

    // 自动补全选择处理
    const handleAutocompleteSelect = (command) => {
      const connection = activeConnections.value.find(c => c.id === activeTabId.value)
      if (connection) {
        connection.currentCommand = command
        connection.showAutocomplete = false

        // 聚焦回输入框
        nextTick(() => {
          const inputElement = document.querySelector(`[ref="input-${connection.id}"]`)
          if (inputElement) {
            inputElement.focus()
          }
        })
      }
    }

    // 自动补全隐藏处理
    const handleAutocompleteHide = () => {
      const connection = activeConnections.value.find(c => c.id === activeTabId.value)
      if (connection) {
        connection.showAutocomplete = false
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

    // 格式化字节数
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    // 系统监控
    const startSystemMonitoring = (connection) => {
      // 立即获取一次系统信息
      updateSystemInfo(connection)
      
      // 每5秒更新一次系统信息
      const timer = setInterval(() => {
        if (connection.status === 'connected') {
          updateSystemInfo(connection)
        }
      }, 5000)

      systemMonitorTimers.value.set(connection.id, timer)
    }

    const stopSystemMonitoring = (connectionId) => {
      const timer = systemMonitorTimers.value.get(connectionId)
      if (timer) {
        clearInterval(timer)
        systemMonitorTimers.value.delete(connectionId)
      }
    }

    const updateSystemInfo = async (connection) => {
      try {
        if (window.electronAPI && connection.status === 'connected') {
          // 通过SSH命令获取系统信息
          const systemInfo = await fetchSystemInfo(connection)
          connection.systemInfo = {
            ...systemInfo,
            lastUpdate: new Date()
          }
        } else {
          // 开发模式模拟系统信息
          connection.systemInfo = generateMockSystemInfo()
        }
      } catch (error) {
        console.error('获取系统信息失败:', error)
        // 使用模拟数据作为后备
        connection.systemInfo = generateMockSystemInfo()
      }
    }

    const fetchSystemInfo = async (connection) => {
      try {
        // 获取CPU使用率
        const cpuResult = await window.electronAPI.sshExecute(connection.id, "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'")
        const cpu = parseFloat(cpuResult.output.trim()) || 0

        // 获取内存使用率
        const memResult = await window.electronAPI.sshExecute(connection.id, "free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'")
        const memory = parseFloat(memResult.output.trim()) || 0

        // 获取磁盘使用率
        const diskResult = await window.electronAPI.sshExecute(connection.id, "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'")
        const disk = parseFloat(diskResult.output.trim()) || 0

        // 获取网络使用情况（简化版本）
        const networkResult = await window.electronAPI.sshExecute(connection.id, "cat /proc/net/dev | grep eth0 | awk '{print $2, $10}' || cat /proc/net/dev | grep enp | awk '{print $2, $10}' || echo '0 0'")
        const networkData = networkResult.output.trim().split(' ')
        const networkDown = parseInt(networkData[0]) || 0
        const networkUp = parseInt(networkData[1]) || 0

        return {
          cpu: Math.round(cpu),
          memory: Math.round(memory),
          disk: Math.round(disk),
          networkDown: networkDown,
          networkUp: networkUp
        }
      } catch (error) {
        console.error('获取系统信息命令执行失败:', error)
        return generateMockSystemInfo()
      }
    }

    const generateMockSystemInfo = () => {
      return {
        cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
        memory: Math.floor(Math.random() * 40) + 30, // 30-70%
        disk: Math.floor(Math.random() * 20) + 20, // 20-40%
        networkDown: Math.floor(Math.random() * 1024 * 1024), // 0-1MB/s
        networkUp: Math.floor(Math.random() * 512 * 1024), // 0-512KB/s
        lastUpdate: new Date()
      }
    }

    // 显示终端右键菜单
    const showTerminalMenu = (event, connectionId) => {
      // 保留作为备用
      console.log('Terminal context menu requested for:', connectionId)
    }

    // 处理终端右键菜单
    const handleTerminalContextMenu = (event, connectionId) => {
      const selection = window.getSelection()
      const selectedText = selection.toString().trim()

      if (selectedText || event.target.closest('.terminal-output')) {
        contextMenu.visible = true
        contextMenu.x = event.clientX
        contextMenu.y = event.clientY
        contextMenu.selectedText = selectedText
        contextMenu.connectionId = connectionId
      }
    }

    // 处理终端鼠标释放事件
    const handleTerminalMouseUp = (event, connectionId) => {
      // 延迟检查选择状态，确保选择完成
      setTimeout(() => {
        const selection = window.getSelection()
        const selectedText = selection.toString().trim()

        if (selectedText && event.button === 0) { // 左键释放且有选中内容
          // 可以在这里添加选中后的其他处理逻辑
        }
      }, 10)
    }

    // 处理终端选择开始
    const handleTerminalSelectStart = (event) => {
      // 可以在这里添加选择开始时的处理逻辑
    }

    // 隐藏右键菜单
    const hideContextMenu = () => {
      contextMenu.visible = false
      contextMenu.selectedText = ''
      contextMenu.connectionId = null
    }

    // 更新右键菜单位置
    const updateContextMenuPosition = ({ x, y }) => {
      contextMenu.x = x
      contextMenu.y = y
    }

    // 处理右键菜单复制
    const handleContextMenuCopy = async () => {
      if (contextMenu.selectedText) {
        try {
          await navigator.clipboard.writeText(contextMenu.selectedText)
          emit('show-notification', '已复制到剪贴板', 'success')
        } catch (error) {
          // 降级到传统复制方法
          const textArea = document.createElement('textarea')
          textArea.value = contextMenu.selectedText
          textArea.style.position = 'fixed'
          textArea.style.opacity = '0'
          document.body.appendChild(textArea)
          textArea.select()

          try {
            document.execCommand('copy')
            emit('show-notification', '已复制到剪贴板', 'success')
          } catch (err) {
            emit('show-notification', '复制失败', 'error')
          }

          document.body.removeChild(textArea)
        }
        hideContextMenu()
      }
    }

    // 处理右键菜单添加到AI助手
    const handleContextMenuAddToAI = () => {
      if (contextMenu.selectedText && contextMenu.connectionId) {
        const connection = activeConnections.value.find(c => c.id === contextMenu.connectionId)
        if (connection) {
          // 找到AI助手组件并添加内容
          const aiAssistantElement = document.querySelector('.ai-assistant-component')
          if (aiAssistantElement && aiAssistantElement.__vueParentComponent) {
            // 如果AI助手组件有添加内容的方法，调用它
            const aiAssistant = aiAssistantElement.__vueParentComponent.ctx
            if (aiAssistant && aiAssistant.addUserInput) {
              aiAssistant.addUserInput(contextMenu.selectedText)
              emit('show-notification', '已添加到AI助手', 'success')
            } else {
              emit('show-notification', 'AI助手组件未就绪', 'warning')
            }
          } else {
            // 备用方法：通过全局事件或其他方式通知AI助手
            window.dispatchEvent(new CustomEvent('add-to-ai-assistant', {
              detail: {
                text: contextMenu.selectedText,
                connectionId: contextMenu.connectionId
              }
            }))
            emit('show-notification', '已添加到AI助手', 'success')
          }
        }
      }
      hideContextMenu()
    }

    // 处理右键菜单全选
    const handleContextMenuSelectAll = (connectionId) => {
      const targetConnectionId = connectionId || contextMenu.connectionId
      if (targetConnectionId) {
        const terminalElement = document.querySelector(`[ref="terminal-${targetConnectionId}"]`)
        if (terminalElement) {
          const range = document.createRange()
          range.selectNodeContents(terminalElement)
          const selection = window.getSelection()
          selection.removeAllRanges()
          selection.addRange(range)

          // 更新选中的文本
          contextMenu.selectedText = selection.toString().trim()
        }
      }
      hideContextMenu()
    }

    // 面板切换
    const switchPanel = (connection, panelId) => {
      connection.activePanel = panelId
      connection.lastActivity = new Date()
    }

    // 处理子组件事件
    const handleShowNotification = (message, type = 'info') => {
      emit('show-notification', message, type)
    }

    const handleExecuteCommand = (command) => {
      // 找到对应的连接并执行命令
      const connection = activeConnections.value.find(c => c.id === activeTabId.value)
      if (connection && connection.status === 'connected') {
        connection.currentCommand = command
        executeCommand(connection)
      }
    }

    // 开始调整面板大小
    const startResize = (event, handleType) => {
      event.preventDefault()
      isResizing.value = true
      resizingHandle.value = handleType
      startMouseX.value = event.clientX

      // 保存初始宽度
      startWidths.files = panelWidths.files
      startWidths.terminal = panelWidths.terminal
      startWidths.ai = panelWidths.ai

      // 添加全局鼠标事件监听器
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      // 设置光标样式
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    // 处理鼠标移动
    const handleMouseMove = (event) => {
      if (!isResizing.value) return

      const deltaX = event.clientX - startMouseX.value
      const containerWidth = document.querySelector('.three-panel-layout')?.offsetWidth || 1000
      const deltaPercent = (deltaX / containerWidth) * 100

      if (resizingHandle.value === 'files-terminal') {
        // 调整文件面板和终端面板之间的分隔符
        const newFilesWidth = Math.max(10, Math.min(60, startWidths.files + deltaPercent))
        const newTerminalWidth = Math.max(10, Math.min(60, startWidths.terminal - deltaPercent))

        panelWidths.files = newFilesWidth
        panelWidths.terminal = newTerminalWidth

        // 调整AI面板宽度以保持总和为100%
        panelWidths.ai = 100 - panelWidths.files - panelWidths.terminal

      } else if (resizingHandle.value === 'terminal-ai') {
        // 调整终端面板和AI面板之间的分隔符
        const newTerminalWidth = Math.max(10, Math.min(60, startWidths.terminal + deltaPercent))
        const newAiWidth = Math.max(10, Math.min(60, startWidths.ai - deltaPercent))

        panelWidths.terminal = newTerminalWidth
        panelWidths.ai = newAiWidth

        // 调整文件面板宽度以保持总和为100%
        panelWidths.files = 100 - panelWidths.terminal - panelWidths.ai
      }
    }

    // 处理鼠标释放
    const handleMouseUp = () => {
      if (!isResizing.value) return

      isResizing.value = false
      resizingHandle.value = null

      // 移除全局鼠标事件监听器
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // 恢复光标样式
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      console.log('🎯 [TAB-MANAGER] 面板宽度已调整:', {
        files: panelWidths.files.toFixed(1) + '%',
        terminal: panelWidths.terminal.toFixed(1) + '%',
        ai: panelWidths.ai.toFixed(1) + '%'
      })
    }

    // 重置面板宽度到默认比例 (3:4:3)
    const resetPanelWidths = () => {
      panelWidths.files = 30
      panelWidths.terminal = 40
      panelWidths.ai = 30
    }

    // 处理外部连接请求
    const handleSessionConnected = (sessionData) => {
      console.log('📬 [TAB-MANAGER] 收到handleSessionConnected调用:', {
        name: sessionData.name,
        id: sessionData.id,
        host: sessionData.host
      });
      addConnection(sessionData)
    }

    // 处理AI命令执行请求
    const handleExecuteTerminalCommand = async (event) => {
      const { commandId, command, connectionId } = event.detail
      
      console.log('🤖 [TAB-MANAGER] 收到AI命令执行请求:', {
        commandId,
        command,
        connectionId
      })

      // 找到对应的连接
      const connection = activeConnections.value.find(c => c.id === connectionId)
      if (!connection) {
        console.error('❌ [TAB-MANAGER] 连接不存在:', connectionId)
        // 发送失败结果
        window.dispatchEvent(new CustomEvent('terminal-command-result', {
          detail: {
            commandId,
            success: false,
            error: '连接不存在'
          }
        }))
        return
      }

      if (connection.status !== 'connected') {
        console.error('❌ [TAB-MANAGER] 连接未建立:', connection.status)
        // 发送失败结果
        window.dispatchEvent(new CustomEvent('terminal-command-result', {
          detail: {
            commandId,
            success: false,
            error: '连接未建立'
          }
        }))
        return
      }

      try {
        // 添加命令到终端输出
        const commandLine = `${connection.username}@${connection.host}:~$ ${command}`
        addTerminalOutput(connection, {
          type: 'command',
          content: commandLine,
          timestamp: new Date()
        })

        // 执行命令
        if (window.electronAPI) {
          const result = await window.electronAPI.sshExecute(connection.id, command)
          
          if (result.success) {
            addTerminalOutput(connection, {
              type: 'output',
              content: result.output,
              timestamp: new Date()
            })

            // 发送成功结果
            window.dispatchEvent(new CustomEvent('terminal-command-result', {
              detail: {
                commandId,
                success: true,
                output: result.output
              }
            }))
          } else {
            addTerminalOutput(connection, {
              type: 'error',
              content: `命令执行失败: ${result.error}`,
              timestamp: new Date()
            })

            // 发送失败结果
            window.dispatchEvent(new CustomEvent('terminal-command-result', {
              detail: {
                commandId,
                success: false,
                error: result.error
              }
            }))
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

            // 发送成功结果
            window.dispatchEvent(new CustomEvent('terminal-command-result', {
              detail: {
                commandId,
                success: true,
                output: output
              }
            }))
          }, 500)
        }

        // 滚动到底部
        await nextTick()
        scrollToBottom(connectionId)

      } catch (error) {
        console.error('💥 [TAB-MANAGER] AI命令执行异常:', error)
        
        addTerminalOutput(connection, {
          type: 'error',
          content: `命令执行异常: ${error.message}`,
          timestamp: new Date()
        })

        // 发送失败结果
        window.dispatchEvent(new CustomEvent('terminal-command-result', {
          detail: {
            commandId,
            success: false,
            error: error.message
          }
        }))
      }
    }

    // 初始化
    onMounted(() => {
      // 监听AI命令执行请求
      window.addEventListener('execute-terminal-command', handleExecuteTerminalCommand)
    })

    // 组件卸载时清理
    onUnmounted(() => {
      connectionTimers.value.forEach(timer => clearInterval(timer))
      connectionTimers.value.clear()
      
      systemMonitorTimers.value.forEach(timer => clearInterval(timer))
      systemMonitorTimers.value.clear()

      // 清理拖拽事件监听器
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // 清理AI命令执行监听器
      window.removeEventListener('execute-terminal-command', handleExecuteTerminalCommand)
    })

    return {
      activeConnections,
      activeTabId,
      panels,
      panelWidths,
      isResizing,
      contextMenu,
      addConnection,
      handleSessionConnected,
      switchTab,
      switchPanel,
      closeConnection,
      disconnectConnection,
      reconnectConnection,
      executeCommand,
      clearTerminal,
      copyTerminalContent,
      handleTabCompletion,
      handleTerminalKeydown,
      handleTerminalInput,
      handleTerminalFocus,
      handleTerminalBlur,
      handleAutocompleteSelect,
      handleAutocompleteHide,
      setAutocompleteRef,
      showTerminalMenu,
      handleTerminalContextMenu,
      handleTerminalMouseUp,
      handleTerminalSelectStart,
      hideContextMenu,
      updateContextMenuPosition,
      handleContextMenuCopy,
      handleContextMenuAddToAI,
      handleContextMenuSelectAll,
      handleShowNotification,
      handleExecuteCommand,
      startResize,
      handleMouseMove,
      handleMouseUp,
      resetPanelWidths,
      getConnectionIcon,
      getStatusText,
      formatConnectionTime,
      formatTimestamp,
      formatBytes
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

// 三部分布局样式 (可调整宽度)
.three-panel-layout {
  flex: 1;
  display: flex;
  gap: 0;
  background: color(border);
  overflow: hidden;
  position: relative;
}

.panel-section {
  display: flex;
  flex-direction: column;
  background: color(surface);
  overflow: hidden;
  position: relative;
  min-width: 10%; // 最小宽度限制
  max-width: 60%; // 最大宽度限制
  transition: width 0.1s ease-out;

  &.files-panel {
    // 宽度由内联样式控制
    flex: none;
  }

  &.terminal-panel {
    // 宽度由内联样式控制
    flex: none;
  }

  &.ai-panel {
    // 宽度由内联样式控制
    flex: none;
  }
}

// 拖拽分隔符样式
.resize-handle {
  background: color(border);
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.2s ease;

  &:hover {
    background: color(primary);
  }

  &.resize-handle-vertical {
    width: 4px;
    cursor: col-resize;
    height: 100%;

    // 添加悬停效果
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 100%;
      background: transparent;
      transition: background-color 0.2s ease;
    }

    &:hover::before {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// 拖拽时的样式
.three-panel-layout.resizing {
  .resize-handle {
    background: color(primary);
  }

  .panel-section {
    pointer-events: none; // 拖拽时禁用面板内容交互
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(md);
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: font-size(sm);
    font-weight: font-weight(medium);
    color: color(text-primary);
    display: flex;
    align-items: center;
    gap: spacing(xs);
  }

  .panel-icon {
    font-size: 14px;
  }
}

.panel-controls {
  display: flex;
  gap: spacing(xs);

  .control-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: color(text-secondary);
    border-radius: border-radius(sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all transition(fast) ease;

    &:hover {
      background: color(bg-tertiary);
      color: color(text-primary);
    }
  }
}

.panel-body {
  flex: 1;
  overflow: hidden;
  position: relative;
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

    &:hover {
      background: color(bg-secondary);
      transform: translateY(-1px);
    }

    .monitor-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .monitor-label {
      color: color(text-secondary);
      font-weight: font-weight(medium);
      flex-shrink: 0;
    }

    .monitor-value {
      color: color(text-primary);
      font-weight: font-weight(semibold);
      font-family: font-family(mono);

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
  }
}

// 终端样式 (在新的三面板布局中)
.terminal-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: color(surface);
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

.terminal-input-wrapper {
  flex: 1;
  position: relative;
}

.terminal-input {
  width: 100%;
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

  // 面板标签响应式
  .panel-tabs {
    padding: 0 spacing(xs);
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .panel-tab {
    padding: spacing(xs) spacing(sm);
    min-width: 80px;
    flex-shrink: 0;
  }

  .panel-title {
    font-size: font-size(xs);
  }

  .panel-icon {
    font-size: 14px;
  }
}
</style>
