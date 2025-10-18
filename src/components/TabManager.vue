<template>
  <div class="tab-manager">
    <!-- Tab栏 -->
    <TabBar
      :connections="activeConnections"
      :active-tab-id="activeTabId"
      @switch-tab="switchTab"
      @close-connection="closeConnection"
      @open-session-modal="$emit('open-session-modal')"
      @rename-connection="handleRenameConnection"
      @duplicate-connection="handleDuplicateConnection"
      @reorder-tabs="handleReorderTabs"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :warning="confirmDialog.warning"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :type="confirmDialog.type"
      :options="confirmDialog.options"
      @confirm="handleConfirmDialog"
      @cancel="closeConfirmDialog"
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
        @cancel-connection="cancelConnection"
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
        @show-settings="$emit('show-settings')"
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
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import Convert from 'ansi-to-html';
import TabBar from './tabs/TabBar.vue';
import WelcomeScreen from './tabs/WelcomeScreen.vue';
import ConnectionContent from './tabs/ConnectionContent.vue';
import ContextMenu from './ContextMenu.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { useConnectionManager } from '../composables/useConnectionManager';
import { useTerminalManager } from '../modules/terminal/composables/useTerminalManager.js';
import { usePanelManager } from '../composables/usePanelManager';
import { useContextMenu } from '../composables/useContextMenu';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { memoryManager, registerMemoryCleanupCallback } from '../utils/memoryManagement';
import { useTerminalStore } from '../modules/terminal/stores/terminal.js';

export default {
  name: 'TabManager',
  components: {
    TabBar,
    WelcomeScreen,
    ConnectionContent,
    ContextMenu,
    ConfirmDialog
  },
  emits: [
    'session-connected',
    'session-disconnected',
    'show-notification',
    'open-session-modal',
    'show-settings'
  ],
  setup(props, { emit }) {
    // ANSI转换器实例
    const ansiConvert = new Convert({
      fg: '#f0f0f0',
      bg: '#1e1e1e',
      newline: false,
      escapeXML: true,
      stream: false
    });

    // 使用组合式函数管理各个功能模块
    const {
      activeConnections,
      activeTabId,
      addConnection,
      switchTab,
      closeConnection,
      disconnectConnection,
      reconnectConnection,
      cancelConnection,
      handleSessionConnected,
      startConnectionMonitoring,
      stopConnectionMonitoring,
      startSystemMonitoring,
      stopSystemMonitoring
    } = useConnectionManager(emit);

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
    } = useTerminalManager(activeConnections, activeTabId, emit, ansiConvert);

    const {
      panelWidths,
      isResizing,
      startResize,
      handleMouseMove,
      handleMouseUp,
      resetPanelWidths
    } = usePanelManager();

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
    } = useContextMenu(activeConnections, emit);

    // 键盘快捷键管理
    const { createTabShortcuts } = useKeyboardShortcuts();

    // 处理子组件事件
    const handleShowNotification = (message, type = 'info') => {
      emit('show-notification', message, type);
    };

    const handleExecuteCommand = command => {
      const connection = activeConnections.value.find(c => c.id === activeTabId.value);
      if (connection && connection.status === 'connected') {
        executeCommand(connection);
      }
    };

    // 处理标签页重命名
    const handleRenameConnection = (connectionId, newName) => {
      const connection = activeConnections.value.find(c => c.id === connectionId);
      if (connection) {
        connection.name = newName;
        // 这里可以添加保存到数据库的逻辑
        handleShowNotification(`标签页已重命名为: ${newName}`, 'success');
      }
    };

    // 处理连接复制
    const handleDuplicateConnection = (connection) => {
      // 创建新的连接配置，基于现有连接
      const newConnection = {
        ...connection,
        id: generateUUID(),
        name: `${connection.name} (副本)`,
        status: 'disconnected'
      };

      // 添加到连接列表
      addConnection(newConnection);
      handleShowNotification('连接已复制', 'success');
    };

    // 处理标签页重新排序
    const handleReorderTabs = ({ fromIndex, toIndex }) => {
      const connections = activeConnections.value;
      const [movedConnection] = connections.splice(fromIndex, 1);
      connections.splice(toIndex, 0, movedConnection);

      // 更新位置属性
      connections.forEach((connection, index) => {
        connection.position = index;
      });

      handleShowNotification('标签页顺序已更新', 'info');
    };

    // 显示确认对话框
    const showConfirmDialog = (options) => {
      confirmDialog.value = {
        ...confirmDialog.value,
        ...options,
        visible: true
      };
    };

    // 关闭确认对话框
    const closeConfirmDialog = () => {
      confirmDialog.value.visible = false;
      confirmDialog.value.onConfirm = null;
      confirmDialog.value.connectionId = null;
    };

    // 处理确认对话框确认
    const handleConfirmDialog = (result) => {
      if (confirmDialog.value.onConfirm) {
        confirmDialog.value.onConfirm(result);
      }
      closeConfirmDialog();
    };

    // 检查连接是否有活动操作
    const hasActiveOperations = (connection) => {
      // 检查是否有正在运行的命令、文件传输等
      return (
        connection.status === 'connected' &&
        // 这里可以添加更多检查逻辑
        false
      );
    };

    // 重写关闭连接方法，添加确认对话框
    const handleCloseConnectionWithConfirmation = (connectionId) => {
      const connection = activeConnections.value.find(c => c.id === connectionId);
      if (!connection) return;

      // 检查是否有活动操作
      if (hasActiveOperations(connection)) {
        showConfirmDialog({
          title: '关闭连接',
          message: `确定要关闭连接 "${connection.name}" 吗？`,
          warning: '此连接当前有活动操作，关闭可能会中断正在进行的任务。',
          confirmText: '关闭连接',
          type: 'danger',
          onConfirm: () => {
            closeConnection(connectionId);
          }
        });
      } else {
        closeConnection(connectionId);
      }
    };

    // 生成UUID的简单方法
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // 设置键盘快捷键
    const setupKeyboardShortcuts = () => {
      createTabShortcuts({
        switchToNextTab: () => {
          const connections = activeConnections.value;
          if (connections.length <= 1) return;

          const currentIndex = connections.findIndex(c => c.id === activeTabId.value);
          const nextIndex = (currentIndex + 1) % connections.length;
          switchTab(connections[nextIndex].id);
        },

        switchToPreviousTab: () => {
          const connections = activeConnections.value;
          if (connections.length <= 1) return;

          const currentIndex = connections.findIndex(c => c.id === activeTabId.value);
          const prevIndex = currentIndex <= 0 ? connections.length - 1 : currentIndex - 1;
          switchTab(connections[prevIndex].id);
        },

        switchToTabByNumber: (index) => {
          const connections = activeConnections.value;
          if (index < connections.length) {
            switchTab(connections[index].id);
          }
        },

        closeCurrentTab: () => {
          if (activeTabId.value) {
            handleCloseConnectionWithConfirmation(activeTabId.value);
          }
        },

        createNewTab: () => {
          // 触发新建连接对话框
          emit('open-session-modal');
        },

        renameCurrentTab: () => {
          if (activeTabId.value) {
            // 这里可以通过事件传递到TabBar组件来触发重命名
            handleShowNotification('请双击标签页进行重命名', 'info');
          }
        },

        duplicateCurrentTab: () => {
          const currentConnection = activeConnections.value.find(c => c.id === activeTabId.value);
          if (currentConnection) {
            handleDuplicateConnection(currentConnection);
          }
        }
      });
    };

    // 恢复会话功能
    const restoreLastSession = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getLastTabSession();

          if (result.success && result.sessionData) {
            console.log('恢复会话状态:', result.sessionData);

            const sessionData = result.sessionData;

            // 恢复连接列表
            if (sessionData.connections && sessionData.connections.length > 0) {
              // 按位置排序连接
              const sortedConnections = sessionData.connections.sort((a, b) => a.position - b.position);

              for (const connection of sortedConnections) {
                // 恢复连接但不自动连接，标记为断开状态
                const restoredConnection = {
                  ...connection,
                  status: 'disconnected', // 启动时不自动连接
                  lastConnected: null,
                  reconnectAttempts: 0
                };

                addConnection(restoredConnection);
              }
            }

            // 恢复活动标签页
            if (sessionData.activeTabId) {
              setTimeout(() => {
                switchTab(sessionData.activeTabId);
              }, 500);
            }

            handleShowNotification('会话已恢复，连接处于断开状态', 'info');
          }
        }
      } catch (error) {
        console.error('恢复会话失败:', error);
      }
    };

    // 保存会话状态
    const saveCurrentSession = async () => {
      try {
        if (window.electronAPI) {
          const sessionState = {
            connections: activeConnections.value.map(connection => ({
              id: connection.id,
              name: connection.name,
              host: connection.host,
              port: connection.port,
              username: connection.username,
              authType: connection.authType,
              status: connection.status,
              position: connection.position || 0,
              lastAccessed: connection.lastAccessed || Date.now()
            })),
            activeTabId: activeTabId.value,
            timestamp: Date.now()
          };

          await window.electronAPI.saveTabSession(sessionState);
          console.log('会话状态已保存');
        }
      } catch (error) {
        console.error('保存会话失败:', error);
      }
    };

    // 监听来自主进程的会话恢复请求
    const handleRestoreSession = (event) => {
      const { sessions } = event.detail;
      console.log('收到主进程会话恢复请求:', sessions);

      if (sessions && sessions.length > 0) {
        // 清除现有连接
        activeConnections.value.forEach(connection => {
          disconnectConnection(connection.id);
        });

        // 恢复会话连接
        sessions.forEach((session, index) => {
          const restoredConnection = {
            ...session,
            status: 'disconnected',
            position: index,
            lastConnected: null
          };

          addConnection(restoredConnection);
        });

        handleShowNotification(`已恢复 ${sessions.length} 个连接`, 'success');
      }
    };

    // 监听会话恢复事件
    window.addEventListener('restore-session', handleRestoreSession);

    // 内存管理设置
    const setupMemoryManagement = () => {
      // 注册内存清理回调
      registerMemoryCleanupCallback('tab-manager-critical', () => {
        console.log('执行标签页管理器内存清理');
        // 清理不活跃的连接
        const inactiveConnections = activeConnections.value.filter(
          connection => connection.status === 'disconnected' || connection.status === 'failed'
        );

        if (inactiveConnections.length > 0) {
          console.log(`清理 ${inactiveConnections.length} 个非活跃连接`);
          inactiveConnections.forEach(connection => {
            closeConnection(connection.id);
          });
        }
      });

      registerMemoryCleanupCallback('tab-manager-emergency', () => {
        console.log('执行紧急内存清理');
        // 关闭所有连接，只保留当前活动标签页
        if (activeConnections.value.length > 1) {
          const currentTab = activeConnections.value.find(c => c.id === activeTabId.value);
          const otherTabs = activeConnections.value.filter(c => c.id !== activeTabId.value);

          otherTabs.forEach(connection => {
            closeConnection(connection.id);
          });

          if (currentTab) {
            handleShowNotification('由于内存使用过高，已关闭其他连接', 'warning');
          }
        }
      });

      // 监听内存警告事件
      const handleMemoryWarning = (event) => {
        const { message, stats } = event.detail;
        handleShowNotification(message, 'warning');
        console.warn('Memory Warning:', message, stats);
      };

      window.addEventListener('memory-warning', handleMemoryWarning);

      // 清理函数
      return () => {
        window.removeEventListener('memory-warning', handleMemoryWarning);
      };
    };

    // 获取终端store实例
    const terminalStore = useTerminalStore();

    // 确认对话框状态
    const confirmDialog = ref({
      visible: false,
      title: '',
      message: '',
      warning: '',
      confirmText: '确认',
      cancelText: '取消',
      type: 'warning',
      options: [],
      onConfirm: null,
      connectionId: null
    });

    // 处理AI命令执行请求
    const handleExecuteTerminalCommand = async event => {
      const { commandId, command, connectionId } = event.detail;

      const connection = activeConnections.value.find(c => c.id === connectionId);
      if (!connection) {
        // 使用store记录命令失败
        terminalStore.errorCommand({
          commandId,
          error: '连接不存在'
        });
        return;
      }

      if (connection.status !== 'connected') {
        // 使用store记录命令失败
        terminalStore.errorCommand({
          commandId,
          error: '连接未建立'
        });
        return;
      }

      // 使用store记录命令开始
      terminalStore.startCommand({
        commandId,
        command,
        connectionId
      });

      try {
        if (window.electronAPI) {
          // 优先使用Shell会话（如果存在且连接）
          let result;

          try {
            // 尝试使用Shell写入
            await window.electronAPI.sshShellWrite(connection.id, command + '\r\n');
            result = { success: true, output: `命令已发送到Shell: ${command}` };
          } catch (shellError) {
            // Shell不可用，回退到单次命令执行
            result = await window.electronAPI.sshExecute(connection.id, command);
          }

          if (result.success) {
            addTerminalOutput(connection, {
              type: 'output',
              content: result.output,
              timestamp: new Date()
            });

            // 使用store记录命令完成
            terminalStore.completeCommand({
              commandId,
              result: result.output
            });
          } else {
            addTerminalOutput(connection, {
              type: 'error',
              content: `命令执行失败: ${result.error}`,
              timestamp: new Date()
            });

            // 使用store记录命令失败
            terminalStore.errorCommand({
              commandId,
              error: result.error
            });
          }
        } else {
          // ElectronAPI不可用时返回错误
          addTerminalOutput(connection, {
            type: 'error',
            content: 'ElectronAPI不可用，无法执行命令',
            timestamp: new Date()
          });

          // 使用store记录命令失败
          terminalStore.errorCommand({
            commandId,
            error: 'ElectronAPI不可用，无法执行命令'
          });
        }

        await nextTick();
        scrollToBottom(connectionId);
      } catch (error) {
        addTerminalOutput(connection, {
          type: 'error',
          content: `命令执行异常: ${error.message}`,
          timestamp: new Date()
        });

        // 使用store记录命令失败
        terminalStore.errorCommand({
          commandId,
          error: error.message
        });
      }
    };

    // 初始化
    onMounted(() => {
      window.addEventListener('execute-terminal-command', handleExecuteTerminalCommand);
      // 设置键盘快捷键
      setupKeyboardShortcuts();
      // 设置内存管理
      setupMemoryManagement();
      // 开始内存监控
      memoryManager.startMonitoring(30000); // 每30秒检查一次
      // 尝试恢复会话
      restoreLastSession();
    });

    // 组件卸载时清理
    onUnmounted(() => {
      activeConnections.value.forEach(connection => {
        stopConnectionMonitoring(connection.id);
        stopSystemMonitoring(connection.id);
      });

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('execute-terminal-command', handleExecuteTerminalCommand);
      window.removeEventListener('restore-session', handleRestoreSession);

      // 停止内存监控
      memoryManager.stopMonitoring();

      // 保存当前会话
      saveCurrentSession();
    });

    return {
      // 状态
      activeConnections,
      activeTabId,
      panelWidths,
      isResizing,
      contextMenu,
      confirmDialog,

      // 连接管理
      addConnection,
      handleSessionConnected,
      switchTab,
      closeConnection,
      disconnectConnection,
      reconnectConnection,
      cancelConnection,

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
      handleExecuteCommand,
      handleRenameConnection,
      handleDuplicateConnection,
      handleReorderTabs,
      showConfirmDialog,
      closeConfirmDialog,
      handleConfirmDialog,
      handleCloseConnectionWithConfirmation,

      // 会话管理
      restoreLastSession,
      saveCurrentSession
    };
  }
};
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
