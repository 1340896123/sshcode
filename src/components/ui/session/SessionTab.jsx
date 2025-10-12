import React, { forwardRef, useState } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Badge } from '../primitives/Badge';
import { Tooltip } from '../primitives/Tooltip';

const sessionTabVariants = cva(
  'group relative flex items-center space-x-2 px-3 py-2 rounded-t-lg border border-transparent cursor-pointer transition-all duration-200 min-w-0 max-w-60',
  {
    variants: {
      active: {
        true: 'bg-slate-800 border-slate-600 border-b-transparent text-white',
        false: 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300',
      },
      size: {
        default: 'px-3 py-2',
        compact: 'px-2 py-1',
      },
      dirty: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        active: false,
        dirty: true,
        class: 'font-medium',
      },
      {
        active: true,
        dirty: true,
        class: 'font-semibold text-blue-400',
      },
    ],
    defaultVariants: {
      active: false,
      size: 'default',
      dirty: false,
    },
  }
);

export const SessionTab = forwardRef((
  {
    className,
    active,
    size,
    dirty,
    session,
    onClose,
    onActivate,
    onContextMenu,
    showUnreadCount = true,
    showConnectionStatus = true,
    ...props
  },
  ref
) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = (e) => {
    e.stopPropagation();
    setIsClosing(true);
    onClose?.(session.id, e);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    onContextMenu?.(session, e);
  };

  const handleActivate = () => {
    onActivate?.(session.id);
  };

  const getConnectionStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'reconnecting': return 'bg-orange-500';
      default: return 'bg-slate-500';
    }
  };

  const getDirtyIndicator = () => {
    if (!dirty) return null;
    return (
      <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
    );
  };

  const getCloseButton = () => {
    if (!isHovered && !active) return null;
    
    return (
      <button
        type="button"
        onClick={handleClose}
        className={clsx(
          'flex items-center justify-center w-4 h-4 rounded transition-colors',
          'hover:bg-slate-600 hover:text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
          isClosing && 'animate-spin'
        )}
        aria-label={`关闭会话 ${session.name}`}
      >
        <Icon name="X" className="w-3 h-3" />
      </button>
    );
  };

  return (
    <div
      ref={ref}
      className={clsx(sessionTabVariants({ active, size, dirty, className }))}
      onClick={handleActivate}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="tab"
      aria-selected={active}
      aria-controls={`session-panel-${session.id}`}
      {...props}
    >
      {/* 连接状态指示器 */}
      {showConnectionStatus && (
        <div className={clsx(
          'w-2 h-2 rounded-full flex-shrink-0',
          getConnectionStatusColor(session.connectionStatus)
        )} />
      )}

      {/* 会话名称 */}
      <div className="flex-1 min-w-0">
        <Tooltip content={session.name}>
          <span className="block truncate text-sm font-medium">
            {session.name}
          </span>
        </Tooltip>
        
        {/* 会话详情 */}
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className="truncate">
            {session.user}@{session.host}
          </span>
          {session.currentPath && (
            <span className="truncate">
              {session.currentPath}
            </span>
          )}
        </div>
      </div>

      {/* 未读消息计数 */}
      {showUnreadCount && session.unreadCount > 0 && (
        <Badge
          variant="primary"
          size="sm"
          className="flex-shrink-0"
        >
          {session.unreadCount > 99 ? '99+' : session.unreadCount}
        </Badge>
      )}

      {/* 关闭按钮 */}
      <div className="flex-shrink-0 ml-1">
        {getCloseButton()}
      </div>

      {/* 脏状态指示器 */}
      {getDirtyIndicator()}
    </div>
  );
});

SessionTab.displayName = 'SessionTab';

// 紧凑版本的 SessionTab
export const SessionTabCompact = forwardRef((props, ref) => {
  return (
    <SessionTab
      {...props}
      size="compact"
      showUnreadCount={false}
      showConnectionStatus={true}
      ref={ref}
    />
  );
});

SessionTabCompact.displayName = 'SessionTabCompact';

// 最小化版本的 SessionTab
export const SessionTabMinimal = forwardRef((props, ref) => {
  return (
    <SessionTab
      {...props}
      size="compact"
      showUnreadCount={false}
      showConnectionStatus={false}
      ref={ref}
    />
  );
});

SessionTabMinimal.displayName = 'SessionTabMinimal';
