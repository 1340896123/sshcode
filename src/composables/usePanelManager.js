import { ref, reactive } from 'vue';

export function usePanelManager() {
  // 面板宽度状态 (初始3:4:3比例)
  const panelWidths = reactive({
    files: 30,
    terminal: 40,
    ai: 30
  });

  // 拖拽调整状态
  const isResizing = ref(false);
  const resizingHandle = ref(null);
  const startMouseX = ref(0);
  const startWidths = reactive({ files: 30, terminal: 40, ai: 30 });

  // 开始调整面板大小
  const startResize = (event, handleType) => {
    event.preventDefault();
    isResizing.value = true;
    resizingHandle.value = handleType;
    startMouseX.value = event.clientX;

    // 保存初始宽度
    startWidths.files = panelWidths.files;
    startWidths.terminal = panelWidths.terminal;
    startWidths.ai = panelWidths.ai;

    // 添加全局鼠标事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 设置光标样式
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 处理鼠标移动
  const handleMouseMove = event => {
    if (!isResizing.value) return;

    const deltaX = event.clientX - startMouseX.value;
    const containerWidth = document.querySelector('.three-panel-layout')?.offsetWidth || 1000;
    const deltaPercent = (deltaX / containerWidth) * 100;

    if (resizingHandle.value === 'files-terminal') {
      // 调整文件面板和终端面板之间的分隔符
      const newFilesWidth = Math.max(10, Math.min(60, startWidths.files + deltaPercent));
      const newTerminalWidth = Math.max(10, Math.min(60, startWidths.terminal - deltaPercent));

      panelWidths.files = newFilesWidth;
      panelWidths.terminal = newTerminalWidth;

      // 调整AI面板宽度以保持总和为100%
      panelWidths.ai = 100 - panelWidths.files - panelWidths.terminal;
    } else if (resizingHandle.value === 'terminal-ai') {
      // 调整终端面板和AI面板之间的分隔符
      const newTerminalWidth = Math.max(10, Math.min(60, startWidths.terminal + deltaPercent));
      const newAiWidth = Math.max(10, Math.min(60, startWidths.ai - deltaPercent));

      panelWidths.terminal = newTerminalWidth;
      panelWidths.ai = newAiWidth;

      // 调整文件面板宽度以保持总和为100%
      panelWidths.files = 100 - panelWidths.terminal - panelWidths.ai;
    }
  };

  // 处理鼠标释放
  const handleMouseUp = () => {
    if (!isResizing.value) return;

    isResizing.value = false;
    resizingHandle.value = null;

    // 移除全局鼠标事件监听器
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // 恢复光标样式
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    console.log('🎯 [PANEL-MANAGER] 面板宽度已调整:', {
      files: panelWidths.files.toFixed(1) + '%',
      terminal: panelWidths.terminal.toFixed(1) + '%',
      ai: panelWidths.ai.toFixed(1) + '%'
    });
  };

  // 重置面板宽度到默认比例 (3:4:3)
  const resetPanelWidths = () => {
    panelWidths.files = 30;
    panelWidths.terminal = 40;
    panelWidths.ai = 30;
  };

  // 面板切换
  const switchPanel = (connection, panelId) => {
    connection.activePanel = panelId;
    connection.lastActivity = new Date();
  };

  return {
    // 状态
    panelWidths,
    isResizing,
    resizingHandle,

    // 方法
    startResize,
    handleMouseMove,
    handleMouseUp,
    resetPanelWidths,
    switchPanel
  };
}
