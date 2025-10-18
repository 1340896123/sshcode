<template>
  <div class="tab-content" :class="{ 'tab-content--active': isActive }">
    <!-- Connection Status Bar -->
    <div class="tab-content__status" v-if="connection">
      <div class="status-indicator" :class="`status--${connection.status}`">
        <div class="status-dot"></div>
        <span class="status-text">{{ getStatusText(connection.status) }}</span>
      </div>
      <div class="connection-info">
        <span class="connection-host">{{ connection.name }}</span>
        <span class="connection-details">{{ connection.username }}@{{ connection.host }}:{{ connection.port }}</span>
      </div>
      <div class="connection-actions" v-if="connection.status === 'connected'">
        <button @click="reconnect" class="action-btn action-btn--reconnect" title="Reconnect">
          <i class="icon-refresh"></i>
        </button>
        <button @click="disconnect" class="action-btn action-btn--disconnect" title="Disconnect">
          <i class="icon-power"></i>
        </button>
      </div>
    </div>

    <!-- Main Content Area with Split Panes -->
    <div class="tab-content__main" ref="mainContentRef">
      <div
        class="tab-content__split-container"
        :style="{ gridTemplateColumns: splitColumns }"
      >
        <!-- Terminal Panel -->
        <div class="tab-content__panel tab-content__panel--terminal">
          <div class="panel-header">
            <h3 class="panel-title">Terminal</h3>
            <div class="panel-actions">
              <button @click="clearTerminal" class="panel-action-btn" title="Clear Terminal">
                <i class="icon-clear"></i>
              </button>
              <button @click="copyTerminalContent" class="panel-action-btn" title="Copy Content">
                <i class="icon-copy"></i>
              </button>
            </div>
          </div>
          <div class="panel-content" ref="terminalContainerRef">
            <XTerminal
              v-if="terminal && isActive"
              :terminal="terminal.terminal"
              :connection-id="connectionId"
              @command-executed="handleCommandExecuted"
              @terminal-resized="handleTerminalResized"
              @terminal-focus="handleTerminalFocus"
              @terminal-blur="handleTerminalBlur"
            />
            <div v-else-if="!terminal" class="terminal-placeholder">
              <div class="placeholder-icon">🖥️</div>
              <p class="placeholder-text">Initializing terminal...</p>
            </div>
          </div>
        </div>

        <!-- File Manager Panel -->
        <div class="tab-content__panel tab-content__panel--file-manager">
          <div class="panel-header">
            <h3 class="panel-title">File Manager</h3>
            <div class="panel-actions">
              <button @click="refreshFileManager" class="panel-action-btn" title="Refresh">
                <i class="icon-refresh"></i>
              </button>
              <button @click="toggleFileManagerHidden" class="panel-action-btn" title="Toggle Hidden Files">
                <i class="icon-eye"></i>
              </button>
            </div>
          </div>
          <div class="panel-content">
            <FileManager
              v-if="connection && connection.status === 'connected'"
              :connection-id="connectionId"
              :initial-directory="fileManagerState?.currentDirectory"
              @file-selected="handleFileSelected"
              @directory-changed="handleDirectoryChanged"
              @file-operation="handleFileOperation"
            />
            <div v-else class="file-manager-placeholder">
              <div class="placeholder-icon">📁</div>
              <p class="placeholder-text">Connect to view files</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Assistant Panel (Collapsible) -->
    <div
      class="tab-content__ai-panel"
      :class="{ 'tab-content__ai-panel--collapsed': !aiPanelOpen }"
      v-if="connection"
    >
      <div class="ai-panel-header" @click="toggleAIPanel">
        <h3 class="panel-title">AI Assistant</h3>
        <button class="panel-toggle-btn">
          <i :class="aiPanelOpen ? 'icon-chevron-down' : 'icon-chevron-up'"></i>
        </button>
      </div>
      <div class="ai-panel-content" v-show="aiPanelOpen">
        <AIAssistant
          :connection-id="connectionId"
          :initial-context="aiAssistantState?.currentContext"
          @command-executed="handleAICommandExecuted"
          @message-sent="handleAIMessageSent"
        />
      </div>
    </div>

    <!-- Resize Handle -->
    <div
      class="resize-handle resize-handle--vertical"
      @mousedown="startResize"
      v-show="connection && connection.status === 'connected'"
    ></div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useTabManager } from '../composables/useTabManager';
import { getDefaultTerminalPool } from '../composables/useTerminalPool';
import { getStatePersistenceService } from '../services/statePersistenceService';
import { getTerminalStateService } from '../services/terminalStateService';
import { getFileManagerStateService } from '../services/fileManagerStateService';
import { getAIAssistantStateService } from '../services/aiAssistantStateService';
import XTerminal from './XTerminal.vue';
import FileManager from './file-manager/FileManager.vue';
import AIAssistant from './ai-assistant/AIAssistant.vue';
import {
  Connection,
  TerminalState,
  FileManagerState,
  AIAssistantState,
  PooledTerminal
} from '../types/tab';

export default {
  name: 'TabContent',
  components: {
    XTerminal,
    FileManager,
    AIAssistant
  },
  props: {
    tabId: {
      type: String,
      required: true
    },
    connectionId: {
      type: String,
      required: true
    },
    connection: {
      type: Object,
      default: null
    },
    isActive: {
      type: Boolean,
      default: false
    },
    windowState: {
      type: Object,
      default: () => ({
        width: 1200,
        height: 800,
        splitSizes: [50, 50]
      })
    }
  },
  emits: [
    'connection-status-changed',
    'command-executed',
    'file-selected',
    'directory-changed',
    'ai-message-sent',
    'tab-focused',
    'tab-blurred'
  ],
  setup(props, { emit }) {
    // Refs
    const mainContentRef = ref(null);
    const terminalContainerRef = ref(null);
    const aiPanelOpen = ref(true);
    const isResizing = ref(false);

    // Composables and services
    const tabManager = useTabManager();
    const terminalPool = getDefaultTerminalPool();
    const statePersistence = getStatePersistenceService();
    const terminalStateService = getTerminalStateService();
    const fileManagerStateService = getFileManagerStateService();
    const aiAssistantStateService = getAIAssistantStateService();

    // Terminal state
    const terminal = ref<PooledTerminal | null>(null);
    const terminalState = ref<TerminalState | null>(null);

    // Component states
    const fileManagerState = ref<FileManagerState | null>(null);
    const aiAssistantState = ref<AIAssistantState | null>(null);

    // State management
    const isStateDirty = ref(false);
    const autoSaveTimer = ref<NodeJS.Timeout | null>(null);
    const lastSaveTime = ref<number>(0);

    // Computed
    const splitColumns = computed(() => {
      const splitRatio = props.windowState?.splitSizes || [50, 50];
      return `${splitRatio[0]}% ${splitRatio[1]}%`;
    });

    // Initialize terminal when tab becomes active
    const initializeTerminal = async () => {
      if (!props.isActive || terminal.value) return;

      try {
        // Acquire terminal from pool
        terminal.value = terminalPool.acquireTerminal(props.connectionId);

        // Fit terminal to container
        if (terminal.value.fitAddon && terminalContainerRef.value) {
          await nextTick();
          terminalContainerRef.value.appendChild(terminal.value.terminal.element);
          terminal.value.fitAddon.fit();
        }

        console.debug(`Terminal initialized for tab ${props.tabId}`);
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
      }
    };

    // Cleanup terminal when tab becomes inactive
    const cleanupTerminal = () => {
      if (terminal.value) {
        terminalPool.releaseTerminal(terminal.value.id);
        terminal.value = null;
      }
    };

    // Connection management
    const reconnect = async () => {
      if (!props.connectionId) return;

      try {
        emit('connection-status-changed', {
          connectionId: props.connectionId,
          status: 'reconnecting'
        });

        // This would integrate with the connection manager
        // await connectionManager.reconnectConnection(props.connectionId);
      } catch (error) {
        console.error('Failed to reconnect:', error);
      }
    };

    const disconnect = async () => {
      if (!props.connectionId) return;

      try {
        // This would integrate with the connection manager
        // await connectionManager.disconnectConnection(props.connectionId);
      } catch (error) {
        console.error('Failed to disconnect:', error);
      }
    };

    // Terminal actions
    const clearTerminal = () => {
      if (terminal.value) {
        terminal.value.terminal.clear();
      }
    };

    const copyTerminalContent = () => {
      if (terminal.value) {
        const selection = terminal.value.terminal.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      }
    };

    // File manager actions
    const refreshFileManager = () => {
      // Trigger file manager refresh
      console.log('Refreshing file manager');
    };

    const toggleFileManagerHidden = () => {
      if (fileManagerState.value) {
        fileManagerState.value.showHiddenFiles = !fileManagerState.value.showHiddenFiles;
      }
    };

    // AI panel management
    const toggleAIPanel = async () => {
      aiPanelOpen.value = !aiPanelOpen.value;
      try {
        await aiAssistantStateService.updateVisibility(props.tabId, aiPanelOpen.value);
      } catch (error) {
        console.error('Failed to update AI panel visibility:', error);
      }
    };

    // Panel resizing
    const startResize = (event) => {
      isResizing.value = true;
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      event.preventDefault();
    };

    const handleResize = (event) => {
      if (!isResizing.value || !mainContentRef.value) return;

      const rect = mainContentRef.value.getBoundingClientRect();
      const percentage = ((event.clientX - rect.left) / rect.width) * 100;

      // Constrain to reasonable limits (20% - 80%)
      const constrainedPercentage = Math.max(20, Math.min(80, percentage));

      // Update split sizes
      const newSplitSizes = [constrainedPercentage, 100 - constrainedPercentage];

      // Update window state and mark as dirty
      if (props.windowState) {
        props.windowState.splitSizes = newSplitSizes;
        markStateDirty();
      }

      console.log('New split sizes:', newSplitSizes);
    };

    const stopResize = () => {
      isResizing.value = false;
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    };

    // Event handlers
    const handleCommandExecuted = async (command, result) => {
      try {
        // Record command execution in terminal state service
        await terminalStateService.executeCommand(props.tabId, command);

        // Complete command recording
        await terminalStateService.completeCommand(props.tabId, command, result.exitCode || 0, result.output || '');

        // Add command to AI context recent commands
        await aiAssistantStateService.addRecentCommand(props.tabId, command);

        emit('command-executed', {
          tabId: props.tabId,
          command,
          result
        });
      } catch (error) {
        console.error('Failed to handle command execution:', error);
      }
    };

    const handleTerminalResized = (cols, rows) => {
      console.log(`Terminal resized: ${cols}x${rows}`);
    };

    const handleTerminalFocus = () => {
      emit('tab-focused', props.tabId);
    };

    const handleTerminalBlur = () => {
      emit('tab-blurred', props.tabId);
    };

    const handleFileSelected = (file) => {
      emit('file-selected', {
        tabId: props.tabId,
        file
      });
    };

    const handleDirectoryChanged = async (directory) => {
      try {
        // Use file manager state service to handle navigation
        await fileManagerStateService.navigateToDirectory(props.tabId, directory);

        // Update local state
        const currentState = fileManagerStateService.getFileManagerState(props.tabId);
        if (currentState) {
          fileManagerState.value = currentState;
        }

        // Update AI context with new working directory
        await aiAssistantStateService.updateWorkingDirectory(props.tabId, directory);

        emit('directory-changed', {
          tabId: props.tabId,
          directory
        });
      } catch (error) {
        console.error('Failed to handle directory change:', error);
      }
    };

    const handleFileOperation = (operation, details) => {
      console.log(`File operation: ${operation}`, details);
    };

    const handleAICommandExecuted = async (command, result) => {
      try {
        // Get current AI context
        const aiContext = aiAssistantStateService.getContext(props.tabId);

        if (aiContext) {
          // Create tool call context
          const toolCallContext = {
            workingDirectory: aiContext.workingDirectory,
            environment: aiContext.environment
          };

          // Execute tool call
          const toolCall = await aiAssistantStateService.executeToolCall(props.tabId, command, toolCallContext);

          if (toolCall) {
            // Complete tool call with result
            const status = result.exitCode === 0 ? 'completed' : 'error';
            const errorMessage = result.exitCode !== 0 ? result.error : undefined;
            await aiAssistantStateService.completeToolCall(toolCall.id, status, result.output, errorMessage);
          }
        }

        emit('command-executed', {
          tabId: props.tabId,
          command,
          result,
          source: 'ai'
        });
      } catch (error) {
        console.error('Failed to handle AI command execution:', error);
      }
    };

    const handleAIMessageSent = async (message) => {
      try {
        // Add message to AI assistant state
        await aiAssistantStateService.addMessage(props.tabId, 'user', message);

        // Update local state
        const currentState = aiAssistantStateService.getAIAssistantState(props.tabId);
        if (currentState) {
          aiAssistantState.value = currentState;
        }

        emit('ai-message-sent', {
          tabId: props.tabId,
          message
        });
      } catch (error) {
        console.error('Failed to handle AI message sent:', error);
      }
    };

    // State persistence methods
    const restoreStates = async () => {
      try {
        // Initialize all state services for this tab
        terminalStateService.initializeTerminalState(props.tabId);
        fileManagerStateService.initializeFileManagerState(props.tabId);
        aiAssistantStateService.initializeAIAssistantState(props.tabId);

        // Restore states using individual services
        const terminalStateData = await terminalStateService.restoreTerminalState(props.tabId);
        if (terminalStateData) {
          terminalState.value = {
            tabId: props.tabId,
            cursorPosition: terminalStateData.cursorPosition,
            scrollOffset: terminalStateData.scrollOffset,
            bufferSize: terminalStateData.bufferContent.length,
            history: terminalStateData.history,
            options: {
              fontSize: 14,
              fontFamily: 'Consolas, Monaco, monospace',
              theme: 'default',
              scrollback: 1000
            }
          };
        }

        const fileManagerStateData = fileManagerStateService.getFileManagerState(props.tabId);
        if (fileManagerStateData) {
          fileManagerState.value = fileManagerStateData;
        }

        const aiAssistantStateData = await aiAssistantStateService.restoreState(props.tabId);
        if (aiAssistantStateData) {
          aiAssistantState.value = aiAssistantStateData;
          aiPanelOpen.value = aiAssistantStateData.isVisible;
        }

        console.debug(`States restored for tab ${props.tabId}`);
      } catch (error) {
        console.error(`Failed to restore states for tab ${props.tabId}:`, error);
      }
    };

    const saveStates = async (immediate = false) => {
      if (!isStateDirty.value && !immediate) return;

      try {
        const savePromises = [];

        // Save terminal state using terminal service
        if (terminal.value && terminalState.value) {
          savePromises.push(terminalStateService.saveTerminalState(props.tabId));
        }

        // Save file manager state using file manager service
        if (fileManagerState.value) {
          savePromises.push(fileManagerStateService.saveState(props.tabId));
        }

        // Save AI assistant state using AI service
        if (aiAssistantState.value) {
          savePromises.push(aiAssistantStateService.updateVisibility(props.tabId, aiPanelOpen.value));
          savePromises.push(aiAssistantStateService.updateScrollPosition(props.tabId, aiAssistantState.value.scrollPosition));
          savePromises.push(aiAssistantStateService.updateInputHeight(props.tabId, aiAssistantState.value.inputHeight));
        }

        if (savePromises.length > 0) {
          await Promise.all(savePromises);
          lastSaveTime.value = Date.now();
          isStateDirty.value = false;
          console.debug(`States saved for tab ${props.tabId}`);
        }
      } catch (error) {
        console.error(`Failed to save states for tab ${props.tabId}:`, error);
      }
    };

    const markStateDirty = () => {
      isStateDirty.value = true;
      scheduleAutoSave();
    };

    const scheduleAutoSave = () => {
      // Clear existing timer
      if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
      }

      // Schedule auto-save with debouncing
      autoSaveTimer.value = setTimeout(() => {
        saveStates();
      }, 2000); // 2 second debounce
    };

    const saveTerminalState = async () => {
      if (terminal.value && terminalState.value) {
        try {
          const currentBuffer = terminal.value.terminal.buffer.active;
          terminalState.value.cursorPosition = {
            x: currentBuffer.cursorX,
            y: currentBuffer.cursorY
          };
          terminalState.value.scrollOffset = terminal.value.terminal.buffer.active.viewportY || 0;

          await statePersistence.saveTerminalState(props.tabId, {
            cursorPosition: terminalState.value.cursorPosition,
            scrollOffset: terminalState.value.scrollOffset
          });
        } catch (error) {
          console.error('Failed to save terminal state:', error);
        }
      }
    };

    const saveFileManagerState = async () => {
      if (fileManagerState.value) {
        try {
          await statePersistence.saveFileManagerState(props.tabId, fileManagerState.value);
        } catch (error) {
          console.error('Failed to save file manager state:', error);
        }
      }
    };

    const saveAIAssistantState = async () => {
      if (aiAssistantState.value) {
        try {
          await statePersistence.saveAIAssistantState(props.tabId, {
            isVisible: aiPanelOpen.value,
            inputHeight: aiAssistantState.value.inputHeight,
            scrollPosition: aiAssistantState.value.scrollPosition
          });
        } catch (error) {
          console.error('Failed to save AI assistant state:', error);
        }
      }
    };

    // Utility functions
    const getStatusText = (status) => {
      const statusMap = {
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        connected: 'Connected',
        failed: 'Connection Failed',
        reconnecting: 'Reconnecting...'
      };
      return statusMap[status] || status;
    };

    // Watch for active state changes
    watch(() => props.isActive, (isActive) => {
      if (isActive) {
        initializeTerminal();
      } else {
        cleanupTerminal();
      }
    }, { immediate: true });

    // Watch for window state changes
    watch(() => props.windowState, () => {
      if (terminal.value?.fitAddon) {
        nextTick(() => {
          terminal.value.fitAddon.fit();
        });
      }
      markStateDirty();
    });

    // Watch for tab activation changes to save/load states
    watch(() => props.isActive, async (isActive, wasActive) => {
      if (wasActive && !isActive) {
        // Tab is being deactivated - save current states
        await saveStates(true);
      } else if (isActive && !wasActive) {
        // Tab is being activated - restore saved states
        await restoreStates();
      }
    });

    // Watch for terminal state changes
    watch(terminalState, () => {
      if (terminalState.value) {
        markStateDirty();
      }
    }, { deep: true });

    // Watch for file manager state changes
    watch(fileManagerState, () => {
      if (fileManagerState.value) {
        markStateDirty();
      }
    }, { deep: true });

    // Watch for AI assistant state changes
    watch(aiAssistantState, () => {
      if (aiAssistantState.value) {
        markStateDirty();
      }
    }, { deep: true });

    // Initialize on mount
    onMounted(async () => {
      if (props.isActive) {
        await initializeTerminal();
        await restoreStates();
      }
    });

    // Cleanup on unmount
    onUnmounted(async () => {
      cleanupTerminal();
      stopResize();

      // Clear auto-save timer
      if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
      }

      // Save final state
      await saveStates(true);

      // Clean up state services
      terminalStateService.cleanupTerminalState(props.tabId);
      fileManagerStateService.cleanupFileManagerState(props.tabId);
      aiAssistantStateService.cleanupAIAssistantState(props.tabId);
    });

    return {
      // Refs
      mainContentRef,
      terminalContainerRef,
      aiPanelOpen,
      isResizing,

      // State
      terminal,
      terminalState,
      fileManagerState,
      aiAssistantState,

      // State management
      isStateDirty,
      lastSaveTime,

      // Computed
      splitColumns,

      // Methods
      reconnect,
      disconnect,
      clearTerminal,
      copyTerminalContent,
      refreshFileManager,
      toggleFileManagerHidden,
      toggleAIPanel,
      startResize,
      handleResize,
      stopResize,

      // State persistence methods
      restoreStates,
      saveStates,
      saveTerminalState,
      saveFileManagerState,
      saveAIAssistantState,

      // Event handlers
      handleCommandExecuted,
      handleTerminalResized,
      handleTerminalFocus,
      handleTerminalBlur,
      handleFileSelected,
      handleDirectoryChanged,
      handleFileOperation,
      handleAICommandExecuted,
      handleAIMessageSent,
      getStatusText
    };
  }
};
</script>

<style lang="scss" scoped>
.tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: color(bg-primary);
  border: 1px solid color(border-primary);
  border-radius: 8px;
  overflow: hidden;

  &--active {
    border-color: color(accent-primary);
    box-shadow: 0 0 0 1px color(accent-primary);
  }
}

.tab-content__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: color(bg-secondary);
  border-bottom: 1px solid color(border-primary);
  font-size: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: color(text-muted);
  }

  &.status--connected .status-dot {
    background: color(success);
  }

  &.status--connecting .status-dot,
  &.status--reconnecting .status-dot {
    background: color(warning);
    animation: pulse 1.5s infinite;
  }

  &.status--failed .status-dot {
    background: color(error);
  }

  .status-text {
    color: color(text-secondary);
    font-weight: 500;
  }
}

.connection-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin: 0 16px;

  .connection-host {
    font-weight: 600;
    color: color(text-primary);
  }

  .connection-details {
    font-size: 11px;
    color: color(text-muted);
  }
}

.connection-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: color(text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: color(bg-hover);
    color: color(text-primary);
  }

  &--reconnect:hover {
    color: color(warning);
  }

  &--disconnect:hover {
    color: color(error);
  }
}

.tab-content__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-content__split-container {
  display: grid;
  flex: 1;
  overflow: hidden;
}

.tab-content__panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid color(border-primary);

  &:last-child {
    border-right: none;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: color(bg-secondary);
  border-bottom: 1px solid color(border-primary);

  .panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: color(text-primary);
  }

  .panel-actions {
    display: flex;
    gap: 4px;
  }
}

.panel-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: color(text-muted);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: color(bg-hover);
    color: color(text-primary);
  }
}

.panel-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.terminal-placeholder,
.file-manager-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: color(text-muted);

  .placeholder-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .placeholder-text {
    margin: 0;
    font-size: 14px;
  }
}

.tab-content__ai-panel {
  border-top: 1px solid color(border-primary);
  background: color(bg-secondary);
  transition: all 0.3s ease;

  &--collapsed {
    .ai-panel-content {
      height: 0;
      overflow: hidden;
    }
  }
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: color(bg-hover);
  }

  .panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: color(text-primary);
  }
}

.panel-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: color(text-muted);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: color(text-primary);
  }
}

.resize-handle {
  position: absolute;
  background: transparent;
  cursor: col-resize;
  z-index: 10;

  &--vertical {
    top: 0;
    bottom: 0;
    width: 4px;
    left: 50%;
    transform: translateX(-50%);

    &:hover {
      background: color(accent-primary);
      opacity: 0.5;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// Icon classes (you would replace these with actual icon components or SVG)
.icon-refresh::before { content: "↻"; }
.icon-power::before { content: "⏻"; }
.icon-clear::before { content: "✕"; }
.icon-copy::before { content: "📋"; }
.icon-eye::before { content: "👁"; }
.icon-chevron-up::before { content: "▲"; }
.icon-chevron-down::before { content: "▼"; }
</style>