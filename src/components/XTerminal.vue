<template>
  <div class="xterm-terminal">
    <div
      ref="terminalContainer"
      class="terminal-container"
      :style="{ height: containerHeight }"
      @contextmenu.prevent="handleContextMenu"
    ></div>

    <!-- 终端状态指示器 -->
    <div class="terminal-status" v-if="showStatus">
      <span class="status-indicator" :class="statusClass"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>

    <!-- 超时警告指示器 -->
    <div class="timeout-warning" v-if="showTimeoutWarning">
      <div class="timeout-warning-content">
        <span class="timeout-icon">⏰</span>
        <span class="timeout-message">{{ timeoutWarning }}</span>
        <button class="timeout-keep-alive" @click="resetTimeout">
          保持连接
        </button>
      </div>
      <div class="timeout-progress" :style="{ width: `${((timeoutStatus?.remainingTime || 0) / (timeoutStatus?.warningTime || 30)) * 100}%` }"></div>
    </div>
  </div>
</template>

<script>
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { handleAITerminalData, completeAllAICommands } from '../utils/aiCommandExecutor.js'
import {
  initTerminalTimeout,
  updateTerminalActivity,
  pauseTerminalTimeout,
  resumeTerminalTimeout,
  clearTerminalTimeout,
  getTerminalTimeoutStatus
} from '../utils/terminalTimeoutManager.js'

export default {
  name: 'XTerminal',
  props: {
    connectionId: {
      type: String,
      required: true
    },
    connection: {
      type: Object,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
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
  },
  emits: ['data', 'resize', 'focus', 'blur', 'contextmenu', 'timeout-warning', 'timeout'],
  setup(props, { emit }) {
    const terminalContainer = ref(null)
    let terminal = null
    let fitAddon = null
    let webLinksAddon = null
    const isConnected = ref(false)
    const showStatus = ref(false)
    const statusText = ref('')
    const containerHeight = ref(props.height)

    // 超时相关状态
    const timeoutStatus = ref(null)
    const showTimeoutWarning = ref(false)
    const timeoutWarning = ref('')

    // 初始化终端
    const initTerminal = async () => {
      if (!terminalContainer.value) return

      // 创建终端实例
      terminal = new Terminal({
        cols: 80,
        rows: 24,
        fontSize: props.fontSize,
        fontFamily: props.fontFamily,
        theme: {
          background: '#1e1e1e',
          foreground: '#f0f0f0',
          cursor: '#74c0fc',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#404040',
          black: '#000000',
          red: '#ff6b6b',
          green: '#51cf66',
          yellow: '#ffd43b',
          blue: '#74c0fc',
          magenta: '#f06595',
          cyan: '#22b8cf',
          white: '#ffffff',
          brightBlack: '#495057',
          brightRed: '#ff8787',
          brightGreen: '#69db7c',
          brightYellow: '#ffe066',
          brightBlue: '#91a7ff',
          brightMagenta: '#f77fad',
          brightCyan: '#66d9e8',
          brightWhite: '#ffffff'
        },
        allowTransparency: false,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        tabStopWidth: 4,
        fastScrollModifier: 'alt',
        rightClickSelectsWord: true,
        rendererType: 'dom'
      })

      // 添加插件
      fitAddon = new FitAddon()
      webLinksAddon = new WebLinksAddon()

      terminal.loadAddon(fitAddon)
      terminal.loadAddon(webLinksAddon)

      // 绑定事件
      terminal.onData(handleTerminalData)
      terminal.onResize(handleTerminalResize)
      terminal.onTitleChange(handleTitleChange)

      // 挂载终端到DOM
      terminal.open(terminalContainer.value)

      // 在终端打开后绑定focus和blur事件
      setTimeout(() => {
        if (terminal.textarea) {
          terminal.textarea.addEventListener('focus', () => {
            emit('focus')
            showStatus.value = false
          })

          terminal.textarea.addEventListener('blur', () => {
            emit('blur')
          })
        }
      }, 100)

      // 自适应大小
      await nextTick()
      fitAddon.fit()

      console.log('XTerminal initialized for connection:', props.connectionId)
    }

    // 处理终端输入
    const handleTerminalData = (data) => {
      if (!isConnected.value || !props.enabled) return

      // 更新活动状态，重置超时计时器
      updateTerminalActivity(props.connectionId)

      // 如果有超时警告，清除它
      if (showTimeoutWarning.value) {
        showTimeoutWarning.value = false
        timeoutWarning.value = ''
      }

      // 发送数据到SSH Shell
      if (window.electronAPI?.sshShellWrite) {
        window.electronAPI.sshShellWrite(props.connectionId, data)
      }

      emit('data', data)
    }

    // 处理终端大小变化
    const handleTerminalResize = ({ cols, rows }) => {
      emit('resize', { cols, rows })

      // 调整SSH Shell终端大小
      if (isConnected.value && window.electronAPI?.sshShellResize) {
        window.electronAPI.sshShellResize(props.connectionId, rows, cols)
      }
    }

    // 处理标题变化
    const handleTitleChange = (title) => {
      console.log('Terminal title changed:', title)
    }

  
    // 写入数据到终端
    const write = (data) => {
      if (terminal) {
        terminal.write(data)
      }
    }

    // 写入数据到终端并捕获输出（用于AI工具调用）
    const writeAndCapture = (data) => {
      if (terminal) {
        terminal.write(data)
        // 存储最近的输出用于AI工具调用
        lastOutput.value = data
      }
    }

    // 用于AI工具调用的输出捕获
    const lastOutput = ref('')

    // 写入UTF8数据到终端
    const writeUtf8 = (data) => {
      if (terminal) {
        terminal.writeUtf8(data)
      }
    }

    // 清空终端
    const clear = () => {
      if (terminal) {
        terminal.clear()
      }
    }

    // 重置终端
    const reset = () => {
      if (terminal) {
        terminal.reset()
      }
    }

    // 聚焦终端
    const focus = () => {
      if (terminal) {
        terminal.focus()
      }
    }

    // 设置连接状态
    const setConnected = (connected) => {
      isConnected.value = connected
      showStatus.value = !connected

      if (connected) {
        statusText.value = '已连接'
        write('\r\n\x1b[32m✓ SSH Shell连接成功\x1b[0m\r\n')
        // 初始化超时监控
        initTimeoutMonitoring()
      } else {
        statusText.value = '未连接'
        write('\r\n\x1b[31m✗ SSH Shell连接已断开\x1b[0m\r\n')
        // 清理超时监控
        clearTerminalTimeout(props.connectionId)
        showTimeoutWarning.value = false
        timeoutWarning.value = ''
      }
    }

    // 初始化超时监控
    const initTimeoutMonitoring = async () => {
      try {
        // 获取终端配置
        const config = window.electronAPI?.getConfig ? await window.electronAPI.getConfig() : {}
        const terminalConfig = config.terminal || {}

        const timeoutConfig = {
          idleTimeout: (terminalConfig.idleTimeout || 600) * 1000, // 转换为毫秒
          timeoutWarning: (terminalConfig.timeoutWarning || 30) * 1000
        }

        console.log(`⏰ [XTerminal] 初始化超时监控:`, {
          connectionId: props.connectionId,
          config: timeoutConfig
        })

        // 初始化超时管理
        initTerminalTimeout(
          props.connectionId,
          timeoutConfig,
          handleTimeoutWarning,
          handleTimeout
        )

        // 更新活动状态
        updateTerminalActivity(props.connectionId)

      } catch (error) {
        console.error('超时监控初始化失败:', error)
      }
    }

    // 处理超时警告
    const handleTimeoutWarning = (connectionId, warning) => {
      if (connectionId !== props.connectionId) return

      console.log(`⚠️ [XTerminal] 收到超时警告:`, warning)

      showTimeoutWarning.value = true
      timeoutWarning.value = warning.message
      timeoutStatus.value = getTerminalTimeoutStatus(props.connectionId)

      // 在终端中显示警告
      write(`\r\n\x1b[33m⚠️ ${warning.message}\x1b[0m\r\n`)
      write('\x1b[33m输入任意字符可保持连接活跃\x1b[0m\r\n')

      // 发送通知给父组件
      emit('timeout-warning', warning)
    }

    // 处理超时断开
    const handleTimeout = (connectionId, timeoutInfo) => {
      if (connectionId !== props.connectionId) return

      console.log(`⏰ [XTerminal] 连接超时断开:`, timeoutInfo)

      showTimeoutWarning.value = false
      timeoutWarning.value = ''

      // 在终端中显示超时信息
      write(`\r\n\x1b[31m🔌 ${timeoutInfo.message}\x1b[0m\r\n`)

      // 断开SSH连接
      disconnectShell()

      // 发送超时事件给父组件
      emit('timeout', timeoutInfo)
    }

    // 手动重置超时计时器
    const resetTimeout = () => {
      if (isConnected.value) {
        updateTerminalActivity(props.connectionId)
        showTimeoutWarning.value = false
        timeoutWarning.value = ''
      }
    }

    // 处理右键菜单
    const handleContextMenu = (event) => {
      emit('contextmenu', event)
    }

    // 计算状态样式
    const statusClass = computed(() => ({
      'connected': isConnected.value,
      'disconnected': !isConnected.value
    }))

    // 监听高度变化
    watch(() => props.height, (newHeight) => {
      containerHeight.value = newHeight
      nextTick(() => {
        if (fitAddon) {
          fitAddon.fit()
        }
      })
    })

    // 监听字体大小变化
    watch(() => props.fontSize, (newSize) => {
      if (terminal) {
        terminal.options.fontSize = newSize
      }
    })

    // 监听字体族变化
    watch(() => props.fontFamily, (newFamily) => {
      if (terminal) {
        terminal.options.fontFamily = newFamily
      }
    })

    // 组件挂载
    onMounted(async () => {
      await initTerminal()

      // 监听终端数据事件
      if (window.electronAPI?.onTerminalData) {
        window.electronAPI.onTerminalData((event, data) => {
          console.log(`📥 [XTerminal] 收到终端数据:`, {
            connectionId: props.connectionId,
            dataConnectionId: data.connectionId,
            dataLength: data.data.length,
            dataPreview: data.data.toString().substring(0, 100),
            isMatch: data.connectionId === props.connectionId
          });

          if (data.connectionId === props.connectionId) {
            write(data.data)
            // 通知AI命令执行器有新的终端输出
            console.log(`🔄 [XTerminal] 转发数据到AI命令执行器:`, {
              connectionId: props.connectionId,
              dataLength: data.data.length
            });
            handleAITerminalData(props.connectionId, data.data)
          } else {
            console.log(`⚠️ [XTerminal] 连接ID不匹配，忽略数据:`, {
              expected: props.connectionId,
              received: data.connectionId
            });
          }
        })

        window.electronAPI.onTerminalClose((event, data) => {
          if (data.connectionId === props.connectionId) {
            setConnected(false)
            write(`\r\n\x1b[33mShell会话已关闭 (code: ${data.code})\x1b[0m\r\n`)
            // 完成所有待执行的AI命令
            completeAllAICommands(props.connectionId)
          }
        })

        window.electronAPI.onTerminalError((event, data) => {
          if (data.connectionId === props.connectionId) {
            write(`\r\n\x1b[31m错误: ${data.error}\x1b[0m\r\n`)
            setConnected(false)
          }
        })
      }

      // 自动连接SSH Shell
      if (props.connection.status === 'connected') {
        connectShell()
      }
    })

    // 组件卸载
    onUnmounted(() => {
      if (isConnected.value) {
        disconnectShell()
      }
      // 完成所有待执行的AI命令
      completeAllAICommands(props.connectionId)
      // 清理超时监控
      clearTerminalTimeout(props.connectionId)

      if (terminal) {
        terminal.dispose()
      }
    })

    // 连接SSH Shell
    const connectShell = async () => {
      try {
        if (!window.electronAPI?.sshCreateShell) {
          console.error('sshCreateShell not available')
          return
        }

        const result = await window.electronAPI.sshCreateShell(props.connectionId, {
          rows: terminal?.rows || 24,
          cols: terminal?.cols || 80,
          term: 'xterm-256color'
        })

        if (result.success) {
          setConnected(true)
          console.log('SSH Shell connected successfully')
        } else {
          write(`\r\n\x1b[31m连接失败: ${result.error}\x1b[0m\r\n`)
        }
      } catch (error) {
        console.error('Failed to connect SSH Shell:', error)
        write(`\r\n\x1b[31m连接异常: ${error.message}\x1b[0m\r\n`)
      }
    }

    // 断开SSH Shell
    const disconnectShell = async () => {
      try {
        if (window.electronAPI?.sshShellClose) {
          await window.electronAPI.sshShellClose(props.connectionId)
        }
        setConnected(false)
        // 完成所有待执行的AI命令
        completeAllAICommands(props.connectionId)
      } catch (error) {
        console.error('Failed to disconnect SSH Shell:', error)
      }
    }

    // 监听连接状态
    watch(() => props.connection.status, (newStatus) => {
      if (newStatus === 'connected' && !isConnected.value) {
        connectShell()
      } else if (newStatus !== 'connected' && isConnected.value) {
        disconnectShell()
      }
    })

    return {
      terminalContainer,
      isConnected,
      showStatus,
      statusText,
      statusClass,
      containerHeight,

      // 超时相关状态
      timeoutStatus,
      showTimeoutWarning,
      timeoutWarning,

      // 方法
      write,
      writeUtf8,
      clear,
      reset,
      focus,
      setConnected,
      connectShell,
      disconnectShell,
      handleContextMenu,
      resetTimeout
    }
  }
}
</script>

<style lang="scss" scoped>
.xterm-terminal {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.terminal-container {
  flex: 1;
  width: 100%;
  background: #1e1e1e;
  overflow: hidden;

  :deep(.xterm) {
    height: 100% !important;
    padding: 8px;
  }

  :deep(.xterm-viewport) {
    scrollbar-width: thin;
    scrollbar-color: #555 #1e1e1e;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar {
    width: 8px;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }

  :deep(.xterm-viewport)::-webkit-scrollbar-thumb:hover {
    background: #777;
  }
}

.terminal-status {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  font-size: 12px;
  color: #f0f0f0;
  backdrop-filter: blur(4px);
  z-index: 10;

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.connected {
      background: #51cf66;
      box-shadow: 0 0 6px #51cf66;
    }

    &.disconnected {
      background: #ff6b6b;
      box-shadow: 0 0 6px #ff6b6b;
    }
  }

  .status-text {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  }
}

// 超时警告样式
.timeout-warning {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #ff9800;
  border-radius: 8px;
  padding: 16px;
  min-width: 300px;
  max-width: 400px;
  backdrop-filter: blur(8px);
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;

  .timeout-warning-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #fff;
  }

  .timeout-icon {
    font-size: 24px;
    animation: pulse 2s infinite;
  }

  .timeout-message {
    text-align: center;
    font-size: 14px;
    line-height: 1.4;
  }

  .timeout-keep-alive {
    background: #ff9800;
    color: #000;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: #f57c00;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .timeout-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: #ff5722;
    border-radius: 0 0 8px 8px;
    transition: width 1s linear;
  }
}

// 动画
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .terminal-container {
    :deep(.xterm) {
      padding: 4px;
      font-size: 12px;
    }
  }

  .terminal-status {
    top: 4px;
    right: 4px;
    padding: 2px 6px;
    font-size: 11px;
  }

  .timeout-warning {
    min-width: 250px;
    padding: 12px;
    margin: 0 16px;

    .timeout-message {
      font-size: 13px;
    }

    .timeout-keep-alive {
      padding: 6px 12px;
      font-size: 11px;
    }
  }
}
</style>