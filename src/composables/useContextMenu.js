import { reactive } from 'vue';
import { useAIStore } from '../modules/ai-assistant/stores/ai.js';
import { emitEvent, EventTypes } from '../utils/eventSystem.js';

export function useContextMenu(activeConnections, emit) {
  // 右键菜单状态
  const contextMenu = reactive({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    connectionId: null
  });

  // 显示终端右键菜单
  const showTerminalMenu = (event, connectionId) => {
    // 保留作为备用
    console.log('Terminal context menu requested for:', connectionId);
  };

  // 处理终端右键菜单
  const handleTerminalContextMenu = (event, connectionId) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText || event.target.closest('.terminal-output')) {
      contextMenu.visible = true;
      contextMenu.x = event.clientX;
      contextMenu.y = event.clientY;
      contextMenu.selectedText = selectedText;
      contextMenu.connectionId = connectionId;
    }
  };

  // 处理终端鼠标释放事件
  const handleTerminalMouseUp = (event, connectionId) => {
    // 延迟检查选择状态，确保选择完成
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && event.button === 0) {
        // 左键释放且有选中内容
        // 可以在这里添加选中后的其他处理逻辑
      }
    }, 10);
  };

  // 处理终端选择开始
  const handleTerminalSelectStart = event => {
    // 可以在这里添加选择开始时的处理逻辑
  };

  // 隐藏右键菜单
  const hideContextMenu = () => {
    contextMenu.visible = false;
    contextMenu.selectedText = '';
    contextMenu.connectionId = null;
  };

  // 更新右键菜单位置
  const updateContextMenuPosition = ({ x, y }) => {
    contextMenu.x = x;
    contextMenu.y = y;
  };

  // 处理右键菜单复制
  const handleContextMenuCopy = async () => {
    if (contextMenu.selectedText) {
      try {
        await navigator.clipboard.writeText(contextMenu.selectedText);
        emit('show-notification', '已复制到剪贴板', 'success');
      } catch (error) {
        // 降级到传统复制方法
        const textArea = document.createElement('textarea');
        textArea.value = contextMenu.selectedText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();

        try {
          document.execCommand('copy');
          emit('show-notification', '已复制到剪贴板', 'success');
        } catch (err) {
          emit('show-notification', '复制失败', 'error');
        }

        document.body.removeChild(textArea);
      }
      hideContextMenu();
    }
  };

  // 处理右键菜单添加到AI助手
  const handleContextMenuAddToAI = () => {
    if (contextMenu.selectedText && contextMenu.connectionId) {
      const connection = activeConnections.value.find(c => c.id === contextMenu.connectionId);
      if (connection) {
        // 使用Pinia store设置终端输入
        const aiStore = useAIStore();
        aiStore.setTerminalInput(contextMenu.selectedText, contextMenu.connectionId);

        // 发送终端输入事件
        emitEvent(EventTypes.TERMINAL_INPUT, {
          text: contextMenu.selectedText,
          connectionId: contextMenu.connectionId,
          source: 'context-menu',
          timestamp: Date.now()
        });

        emit('show-notification', '已添加到AI助手', 'success');
      }
    }
    hideContextMenu();
  };

  // 处理右键菜单全选
  const handleContextMenuSelectAll = connectionId => {
    const targetConnectionId = connectionId || contextMenu.connectionId;
    if (targetConnectionId) {
      const terminalElement = document.querySelector(`[ref="terminal-${targetConnectionId}"]`);
      if (terminalElement) {
        const range = document.createRange();
        range.selectNodeContents(terminalElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // 更新选中的文本
        contextMenu.selectedText = selection.toString().trim();
      }
    }
    hideContextMenu();
  };

  return {
    // 状态
    contextMenu,

    // 方法
    showTerminalMenu,
    handleTerminalContextMenu,
    handleTerminalMouseUp,
    handleTerminalSelectStart,
    hideContextMenu,
    updateContextMenuPosition,
    handleContextMenuCopy,
    handleContextMenuAddToAI,
    handleContextMenuSelectAll
  };
}
