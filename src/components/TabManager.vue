<template>
  <div class="tab-manager">
    <!-- Tab栏 -->
    <TabBar
      :connections="activeConnections"
      :active-tab-id="activeTabId"
      @switch-tab="switchTab"
      @close-connection="closeConnection"
      @open-session-modal="$emit('open-session-modal')"
    />

    <!-- Tab内容区域 -->
    <div class="tab-content-area">
      <!-- 无连接时的欢迎页面 -->
      <WelcomeScreen
        v-if="activeConnections.length === 0"
        @open-session-modal="$emit('open-session-modal')"
      />

      <!-- 有连接时的标签页内容 -->
      <ConnectionContent
        v-else
        :connections="activeConnections"
        :active-tab-id="activeTabId"
        :panel-widths="panelWidths"
        :is-resizing="isResizing"
        :context-menu="contextMenu"
        @switch-tab="switchTab"
        @execute-command="executeCommand"
        @clear-terminal="clearTerminal"
        @copy-terminal-content="copyTerminalContent"
        @reconnect-connection="reconnectConnection"
        @disconnect-connection="disconnectConnection"
        @start-resize="startResize"
        @show-notification="handleShowNotification"
        @handle-terminal-context-menu="handleTerminalContextMenu"
        @handle-terminal-mouse-up="handleTerminalMouseUp"
        @handle-terminal-select-start="handleTerminalSelectStart"
        @handle-terminal-keydown="handleTerminalKeydown"
        @handle-terminal-input="handleTerminalInput"
        @handle-terminal-focus="handleTerminalFocus"
        @handle-terminal-blur="handleTerminalBlur"
        @handle-autocomplete-select="handleAutocompleteSelect"
        @handle-autocomplete-hide="handleAutocompleteHide"
        @set-autocomplete-ref="setAutocompleteRef"
        @hide-context-menu="hideContextMenu"
        @update-context-menu-position="updateContextMenuPosition"
        @handle-context-menu-copy="handleContextMenuCopy"
        @handle-context-menu-add-to-ai="handleContextMenuAddToAI"
        @handle-context-menu-select-all="handleContextMenuSelectAll"
        @execute-command-from-ai="handleExecuteCommand"
      />
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
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import Convert from 'ansi-to-html'
import TabBar from './tabs/TabBar.vue'
import WelcomeScreen from './tabs/WelcomeScreen.vue'
import ConnectionContent from './tabs/ConnectionContent.vue'
import ContextMenu from './ContextMenu.vue'
import { useConnectionManager } from '../composables/useConnectionManager'
import { useTerminalManager } from '../composables/useTerminalManager'
import { usePanelManager } from '../composables/usePanelManager'
import { useContextMenu } from '../composables/useContextMenu'

export default {
  name: 'TabManager',
  components: {
    TabBar,
    WelcomeScreen,
    ConnectionContent,
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

    // 使用组合式函数管理各个功能模块
    const {
      activeConnections,
      activeTabId,
      addConnection,
      switchTab,
      closeConnection,
      disconnectConnection,
      reconnectConnection,
      handleSessionConnected,
      startConnectionMonitoring,
      stopConnectionMonitoring,
      startSystemMonitoring,
      stopSystemMonitoring
    } = useConnectionManager(emit)

    const {
      executeCommand,
      clearTerminal,
      copyTerminalContent,
      handleTerminalKeydown,
      handleTerminalInput,
      handleTerminalFocus,
      handleTerminalBlur,
      handleAutocompleteSelect,
      handleAutocompleteHide,
      setAutocompleteRef,
      addTerminalOutput,
      scrollToBottom
    } = useTerminalManager(activeConnections, activeTabId, emit, ansiConvert)

    const {
      panelWidths,
      isResizing,
      startResize,
      handleMouseMove,
      handleMouseUp,
      resetPanelWidths
    } = usePanelManager()

    const {
      contextMenu,
      handleTerminalContextMenu,
      handleTerminalMouseUp,
      handleTerminalSelectStart,
      hideContextMenu,
      updateContextMenuPosition,
      handleContextMenuCopy,
      handleContextMenuAddToAI,
      handleContextMenuSelectAll
    } = useContextMenu(activeConnections, emit)

    // 处理子组件事件
    const handleShowNotification = (message, type = 'info') => {
      emit('show-notification', message, type)
    }

    const handleExecuteCommand = (command) => {
      const connection = activeConnections.value.find(c => c.id === activeTabId.value)
      if (connection && connection.status === 'connected') {
        executeCommand(connection)
      }
    }

    // 处理AI命令执行请求
    const handleExecuteTerminalCommand = async (event) => {
      const { commandId, command, connectionId } = event.detail
      
      const connection = activeConnections.value.find(c => c.id === connectionId)
      if (!connection) {
        window.dispatchEvent(new CustomEvent('terminal-command-result', {
          detail: { commandId, success: false, error: '连接不存在' }
        }))
        return
      }

      if (connection.status !== 'connected') {
        window.dispatchEvent(new CustomEvent('terminal-command-result', {
          detail: { commandId, success: false, error: '连接未建立' }
        }))
        return
      }

      try {
        const commandLine = `${connection.username}@${connection.host}:~$ ${command}`
        addTerminalOutput(connection, {
          type: 'command',
          content: commandLine,
          timestamp: new Date()
        })

        if (window.electronAPI) {
          const result = await window.electronAPI.sshExecute(connection.id, command)
          
          if (result.success) {
            addTerminalOutput(connection, {
              type: 'output',
              content: result.output,
              timestamp: new Date()
            })

            window.dispatchEvent(new CustomEvent('terminal-command-result', {
              detail: { commandId, success: true, output: result.output }
            }))
          } else {
            addTerminalOutput(connection, {
              type: 'error',
              content: `命令执行失败: ${result.error}`,
              timestamp: new Date()
            })

            window.dispatchEvent(new CustomEvent('terminal-command-result', {
              detail: { commandId, success: false, error: result.error }
            }))
          }
        } else {
          // 开发模式模拟
          setTimeout(() => {
            const output = `模拟命令输出: ${command}`
            addTerminalOutput(connection, {
              type: 'output',
              content: output,
              timestamp: new Date()
            })

            window.dispatchEvent(new CustomEvent('terminal-command-result', {
              detail: { commandId, success: true, output }
            }))
          }, 500)
        }

        await nextTick()
        scrollToBottom(connectionId)

      } catch (error) {
        addTerminalOutput(connection, {
          type: 'error',
          content: `命令执行异常: ${error.message}`,
          timestamp: new Date()
        })

        window.dispatchEvent(new CustomEvent('terminal-command-result', {
          detail: { commandId, success: false, error: error.message }
        }))
      }
    }

    // 初始化
    onMounted(() => {
      window.addEventListener('execute-terminal-command', handleExecuteTerminalCommand)
    })

    // 组件卸载时清理
    onUnmounted(() => {
      activeConnections.value.forEach(connection => {
        stopConnectionMonitoring(connection.id)
        stopSystemMonitoring(connection.id)
      })

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('execute-terminal-command', handleExecuteTerminalCommand)
    })

    return {
      // 状态
      activeConnections,
      activeTabId,
      panelWidths,
      isResizing,
      contextMenu,

      // 连接管理
      addConnection,
      handleSessionConnected,
      switchTab,
      closeConnection,
      disconnectConnection,
      reconnectConnection,

      // 终端管理
      executeCommand,
      clearTerminal,
      copyTerminalContent,
      handleTerminalKeydown,
      handleTerminalInput,
      handleTerminalFocus,
      handleTerminalBlur,
      handleAutocompleteSelect,
      handleAutocompleteHide,
      setAutocompleteRef,

      // 面板管理
      startResize,
      handleMouseMove,
      handleMouseUp,
      resetPanelWidths,

      // 右键菜单
      handleTerminalContextMenu,
      handleTerminalMouseUp,
      handleTerminalSelectStart,
      hideContextMenu,
      updateContextMenuPosition,
      handleContextMenuCopy,
      handleContextMenuAddToAI,
      handleContextMenuSelectAll,

      // 事件处理
      handleShowNotification,
      handleExecuteCommand
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

.tab-content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
