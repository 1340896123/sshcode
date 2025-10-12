import React, { forwardRef, useEffect, useRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Separator } from '../primitives/Separator';

const contextMenuVariants = cva(
  'absolute z-50 min-w-48 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg',
  {
    variants: {
      position: {
        'top-right': 'origin-top-right',
        'top-left': 'origin-top-left',
        'bottom-right': 'origin-bottom-right',
        'bottom-left': 'origin-bottom-left',
      },
    },
    defaultVariants: {
      position: 'top-right',
    },
  }
);

const menuItemVariants = cva(
  'flex items-center space-x-2 px-3 py-2 text-sm text-slate-300 cursor-pointer transition-colors',
  {
    variants: {
      variant: {
        default: 'hover:bg-slate-700',
        danger: 'hover:bg-red-600 hover:text-white',
        disabled: 'opacity-50 cursor-not-allowed',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const SessionContextMenu = forwardRef((
  {
    className,
    position,
    session,
    visible,
    onClose,
    onAction,
    actions = [],
    ...props
  },
  ref
) => {
  const menuRef = useRef(null);
  const containerRef = useRef(null);

  const defaultActions = [
    {
      id: 'rename',
      label: '重命名',
      icon: 'Edit3',
      variant: 'default',
      separator: false,
    },
    {
      id: 'duplicate',
      label: '复制会话',
      icon: 'Copy',
      variant: 'default',
      separator: false,
    },
    {
      id: 'pin',
      label: session?.pinned ? '取消固定' : '固定会话',
      icon: session?.pinned ? 'PinOff' : 'Pin',
      variant: 'default',
      separator: false,
    },
    {
      id: 'separator1',
      label: '',
      variant: 'separator',
      separator: true,
    },
    {
      id: 'close',
      label: '关闭',
      icon: 'X',
      variant: 'default',
      separator: false,
    },
    {
      id: 'close-others',
      label: '关闭其他',
      icon: 'XCircle',
      variant: 'default',
      separator: false,
    },
    {
      id: 'close-right',
      label: '关闭右侧',
      icon: 'ArrowRightToLine',
      variant: 'default',
      separator: false,
    },
    {
      id: 'separator2',
      label: '',
      variant: 'separator',
      separator: true,
    },
    {
      id: 'disconnect',
      label: '断开连接',
      icon: 'Unlink',
      variant: 'default',
      separator: false,
    },
    {
      id: 'reconnect',
      label: '重新连接',
      icon: 'RefreshCw',
      variant: 'default',
      separator: false,
    },
    {
      id: 'separator3',
      label: '',
      variant: 'separator',
      separator: true,
    },
    {
      id: 'delete',
      label: '删除会话',
      icon: 'Trash2',
      variant: 'danger',
      separator: false,
    },
  ];

  const menuActions = actions.length > 0 ? actions : defaultActions;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  const handleAction = (action) => {
    if (action.variant === 'disabled') return;
    
    onAction?.(action.id, session);
    onClose?.();
  };

  const handleKeyDown = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAction(action);
    }
  };

  const renderMenuItem = (action, index) => {
    if (action.separator) {
      return <Separator key={`separator-${index}`} className="my-1" />;
    }

    const isDisabled = action.variant === 'disabled';
    
    return (
      <div
        key={action.id}
        className={clsx(menuItemVariants({ variant: action.variant }))}
        onClick={() => handleAction(action)}
        onKeyDown={(e) => handleKeyDown(e, action)}
        role="menuitem"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
      >
        {action.icon && (
          <Icon 
            name={action.icon} 
            className={clsx(
              'w-4 h-4',
              action.variant === 'danger' && 'text-red-400'
            )} 
          />
        )}
        <span className="flex-1">{action.label}</span>
        
        {/* 快捷键提示 */}
        {action.shortcut && (
          <span className="text-xs text-slate-500">
            {action.shortcut}
          </span>
        )}
      </div>
    );
  };

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-40"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={menuRef}
        className={clsx(contextMenuVariants({ position, className }))}
        role="menu"
        aria-label="会话上下文菜单"
        {...props}
      >
        {menuActions.map((action, index) => renderMenuItem(action, index))}
      </div>
    </div>
  );
});

SessionContextMenu.displayName = 'SessionContextMenu';
