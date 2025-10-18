import { ref, onMounted, onUnmounted } from 'vue';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  handler: () => void;
}

export function useKeyboardShortcuts() {
  const shortcuts = ref<Shortcut[]>([]);
  const isEnabled = ref(true);

  // 添加快捷键
  const addShortcut = (shortcut: Shortcut) => {
    shortcuts.value.push(shortcut);
  };

  // 移除快捷键
  const removeShortcut = (key: string, ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean) => {
    shortcuts.value = shortcuts.value.filter(
      shortcut => !(shortcut.key === key &&
                   shortcut.ctrlKey === ctrlKey &&
                   shortcut.altKey === altKey &&
                   shortcut.shiftKey === shiftKey)
    );
  };

  // 启用/禁用快捷键
  const setEnabled = (enabled: boolean) => {
    isEnabled.value = enabled;
  };

  // 处理键盘事件
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value) return;

    const pressedKey = event.key.toLowerCase();
    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasAlt = event.altKey;
    const hasShift = event.shiftKey;

    const matchingShortcut = shortcuts.value.find(shortcut => {
      return shortcut.key.toLowerCase() === pressedKey &&
             shortcut.ctrlKey === hasCtrl &&
             shortcut.altKey === hasAlt &&
             shortcut.shiftKey === hasShift;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.handler();
    }
  };

  // 常用快捷键预设
  const createTabShortcuts = (handlers: {
    switchToNextTab?: () => void;
    switchToPreviousTab?: () => void;
    switchToTabByNumber?: (index: number) => void;
    closeCurrentTab?: () => void;
    createNewTab?: () => void;
    renameCurrentTab?: () => void;
    duplicateCurrentTab?: () => void;
  }) => {
    // Ctrl+Tab - 下一个标签页
    if (handlers.switchToNextTab) {
      addShortcut({
        key: 'Tab',
        ctrlKey: true,
        description: '切换到下一个标签页',
        handler: handlers.switchToNextTab
      });
    }

    // Ctrl+Shift+Tab - 上一个标签页
    if (handlers.switchToPreviousTab) {
      addShortcut({
        key: 'Tab',
        ctrlKey: true,
        shiftKey: true,
        description: '切换到上一个标签页',
        handler: handlers.switchToPreviousTab
      });
    }

    // Ctrl+1-9 - 切换到指定标签页
    if (handlers.switchToTabByNumber) {
      for (let i = 1; i <= 9; i++) {
        addShortcut({
          key: i.toString(),
          ctrlKey: true,
          description: `切换到第${i}个标签页`,
          handler: () => {
        handlers.switchToTabByNumber?.(i - 1);
      }
        });
      }
    }

    // Ctrl+W - 关闭当前标签页
    if (handlers.closeCurrentTab) {
      addShortcut({
        key: 'w',
        ctrlKey: true,
        description: '关闭当前标签页',
        handler: handlers.closeCurrentTab
      });
    }

    // Ctrl+T - 新建标签页
    if (handlers.createNewTab) {
      addShortcut({
        key: 't',
        ctrlKey: true,
        description: '新建标签页',
        handler: handlers.createNewTab
      });
    }

    // F2 - 重命名当前标签页
    if (handlers.renameCurrentTab) {
      addShortcut({
        key: 'F2',
        description: '重命名当前标签页',
        handler: handlers.renameCurrentTab
      });
    }

    // Ctrl+D - 复制当前标签页
    if (handlers.duplicateCurrentTab) {
      addShortcut({
        key: 'd',
        ctrlKey: true,
        description: '复制当前标签页',
        handler: handlers.duplicateCurrentTab
      });
    }
  };

  // 获取所有快捷键的描述
  const getShortcutDescriptions = () => {
    return shortcuts.value.map(shortcut => {
      const parts = [];
      if (shortcut.ctrlKey) parts.push('Ctrl');
      if (shortcut.altKey) parts.push('Alt');
      if (shortcut.shiftKey) parts.push('Shift');
      parts.push(shortcut.key);

      return {
        keys: parts.join('+'),
        description: shortcut.description
      };
    });
  };

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown, true);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown, true);
  });

  return {
    shortcuts,
    isEnabled,
    addShortcut,
    removeShortcut,
    setEnabled,
    createTabShortcuts,
    getShortcutDescriptions
  };
}