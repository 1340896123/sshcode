import React, { useEffect, useRef, useState } from 'react';
import { clsx } from '../utils/clsx';

/**
 * KeyboardNavigation组件 - 键盘导航增强组件
 */
export function KeyboardNavigation({
  children,
  enabled = true,
  shortcuts = {},
  onShortcut,
  className = '',
  ...props
}) {
  const containerRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [focusableElements, setFocusableElements] = useState([]);

  // 默认快捷键
  const defaultShortcuts = {
    'Escape': () => {
      // 取消当前操作或关闭模态
      const activeModal = document.querySelector('[role="dialog"]');
      if (activeModal) {
        const closeButton = activeModal.querySelector('button[aria-label*="关闭"], button[aria-label*="Close"]');
        closeButton?.click();
      }
    },
    'Enter': () => {
      // 激活当前焦点元素
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== document.body) {
        activeElement.click();
      }
    },
    ' ': () => {
      // 空格键切换复选框或按钮
      const activeElement = document.activeElement;
      if (activeElement?.type === 'checkbox' || activeElement?.role === 'switch') {
        activeElement.click();
      }
    },
    'ArrowUp': () => {
      navigateFocus(-1);
    },
    'ArrowDown': () => {
      navigateFocus(1);
    },
    'ArrowLeft': () => {
      navigateFocus(-1);
    },
    'ArrowRight': () => {
      navigateFocus(1);
    },
    'Home': () => {
      setFocusIndex(0);
    },
    'End': () => {
      setFocusIndex(focusableElements.length - 1);
    },
    'Tab': (e) => {
      // 增强Tab导航
      handleTabNavigation(e);
    },
    ...shortcuts
  };

  // 获取可聚焦元素
  const getFocusableElements = () => {
    if (!containerRef.current) return [];
    
    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]'
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(selector));
  };

  // 更新可聚焦元素列表
  useEffect(() => {
    if (enabled) {
      const elements = getFocusableElements();
      setFocusableElements(elements);
    }
  }, [children, enabled]);

  // 导航焦点
  const navigateFocus = (direction) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let newIndex = focusedIndex;
    
    if (focusedIndex === -1) {
      newIndex = direction > 0 ? 0 : elements.length - 1;
    } else {
      newIndex = focusedIndex + direction;
      
      if (newIndex < 0) newIndex = elements.length - 1;
      if (newIndex >= elements.length) newIndex = 0;
    }

    setFocusIndex(newIndex);
  };

  // 设置焦点索引
  const setFocusIndex = (index) => {
    const elements = getFocusableElements();
    if (elements[index]) {
      elements[index].focus();
      setFocusedIndex(index);
    }
  };

  // 处理Tab导航
  const handleTabNavigation = (e) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const currentIndex = elements.indexOf(document.activeElement);
    
    if (e.shiftKey) {
      // Shift+Tab
      if (currentIndex <= 0) {
        e.preventDefault();
        elements[elements.length - 1].focus();
      }
    } else {
      // Tab
      if (currentIndex >= elements.length - 1 || currentIndex === -1) {
        e.preventDefault();
        elements[0].focus();
      }
    }
  };

  // 键盘事件处理
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      const key = event.key;
      const modifiers = [];
      
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.altKey) modifiers.push('alt');
      if (event.shiftKey) modifiers.push('shift');
      if (event.metaKey) modifiers.push('meta');

      const keyCombo = modifiers.length > 0 
        ? `${modifiers.join('+')}-${key}`
        : key;

      // 查找匹配的快捷键
      const shortcutHandler = defaultShortcuts[keyCombo] || defaultShortcuts[key];
      
      if (shortcutHandler) {
        event.preventDefault();
        shortcutHandler(event);
      }

      // 调用外部快捷键处理
      if (onShortcut) {
        onShortcut(keyCombo, event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, defaultShortcuts, onShortcut, focusedIndex, focusableElements]);

  // 焦点变化监听
  useEffect(() => {
    if (!enabled) return;

    const handleFocusIn = (event) => {
      const elements = getFocusableElements();
      const index = elements.indexOf(event.target);
      if (index !== -1) {
        setFocusedIndex(index);
      }
    };

    const container = containerRef.current;
    container?.addEventListener('focusin', handleFocusIn);
    
    return () => {
      container?.removeEventListener('focusin', handleFocusIn);
    };
  }, [enabled]);

  return (
    <div
      ref={containerRef}
      className={clsx('keyboard-navigation', enabled && 'keyboard-navigation-enabled', className)}
      role={enabled ? 'application' : undefined}
      {...props}
    >
      {children}
      
      {/* 快捷键提示 */}
      {enabled && (
        <div className="sr-only" aria-label="键盘导航已启用">
          使用方向键导航，Enter激活，Escape取消
        </div>
      )}
    </div>
  );
}

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts = {}, dependencies = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key;
      const modifiers = [];
      
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.altKey) modifiers.push('alt');
      if (event.shiftKey) modifiers.push('shift');
      if (event.metaKey) modifiers.push('meta');

      const keyCombo = modifiers.length > 0 
        ? `${modifiers.join('+')}-${key}`
        : key;

      const handler = shortcuts[keyCombo] || shortcuts[key];
      
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
};

// 预设组件
export const MenuKeyboardNavigation = ({ children, ...props }) => (
  <KeyboardNavigation
    role="menu"
    shortcuts={{
      'ArrowUp': (e) => {
        e.preventDefault();
        navigateMenu(-1);
      },
      'ArrowDown': (e) => {
        e.preventDefault();
        navigateMenu(1);
      },
      'Escape': () => {
        // 关闭菜单
        document.querySelector('[role="menu"]')?.setAttribute('aria-hidden', 'true');
      }
    }}
    {...props}
  >
    {children}
  </KeyboardNavigation>
);

export const DialogKeyboardNavigation = ({ children, ...props }) => (
  <KeyboardNavigation
    role="dialog"
    shortcuts={{
      'Escape': () => {
        // 关闭对话框
        const closeButton = document.querySelector('[role="dialog"] button[aria-label*="关闭"]');
        closeButton?.click();
      }
    }}
    {...props}
  >
    {children}
  </KeyboardNavigation>
);

export const TableKeyboardNavigation = ({ children, ...props }) => (
  <KeyboardNavigation
    role="grid"
    shortcuts={{
      'ArrowUp': (e) => {
        e.preventDefault();
        navigateTable(-1, 0);
      },
      'ArrowDown': (e) => {
        e.preventDefault();
        navigateTable(1, 0);
      },
      'ArrowLeft': (e) => {
        e.preventDefault();
        navigateTable(0, -1);
      },
      'ArrowRight': (e) => {
        e.preventDefault();
        navigateTable(0, 1);
      },
      'Enter': () => {
        // 激活单元格
        document.activeElement?.click();
      }
    }}
    {...props}
  >
    {children}
  </KeyboardNavigation>
);

export default KeyboardNavigation;
