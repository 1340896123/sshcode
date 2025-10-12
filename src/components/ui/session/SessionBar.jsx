import React, { forwardRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

const sessionBarVariants = cva(
  'flex items-center justify-between bg-slate-900 border-b border-slate-700 px-4 py-2',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 border-slate-700',
        compact: 'bg-slate-800 border-slate-600 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const SessionBar = forwardRef((
  { 
    className,
    variant,
    children,
    onNewSession,
    onSessionSettings,
    sessionCount = 0,
    activeSessionId,
    ...props 
  }, 
  ref
) => {
  return (
    <div
      ref={ref}
      className={clsx(sessionBarVariants({ variant, className }))}
      role="toolbar"
      aria-label="会话管理栏"
      {...props}
    >
      {/* 左侧：会话标签区域 */}
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        {children}
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center space-x-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewSession}
          aria-label="新建会话"
        >
          <Icon name="Plus" className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onSessionSettings}
          aria-label="会话设置"
        >
          <Icon name="Settings" className="w-4 h-4" />
        </Button>
      </div>

      {/* 会话计数指示器 */}
      {sessionCount > 0 && (
        <div className="ml-4 text-xs text-slate-400">
          {sessionCount} 个会话
        </div>
      )}
    </div>
  );
});

SessionBar.displayName = 'SessionBar';

/**
 * SessionBarCompact组件 - 紧凑版会话栏
 */
export const SessionBarCompact = forwardRef((
  { 
    className,
    children,
    onNewSession,
    onSessionSettings,
    sessionCount = 0,
    ...props 
  }, 
  ref
) => {
  return (
    <div
      ref={ref}
      className={clsx(
        'flex items-center justify-between bg-slate-800 border-b border-slate-600 px-3 py-1',
        className
      )}
      role="toolbar"
      aria-label="紧凑会话管理栏"
      {...props}
    >
      {/* 左侧：会话标签区域 */}
      <div className="flex items-center space-x-1 flex-1 min-w-0">
        {children}
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center space-x-1 ml-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={onNewSession}
          aria-label="新建会话"
        >
          <Icon name="Plus" className="w-3 h-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="xs"
          onClick={onSessionSettings}
          aria-label="会话设置"
        >
          <Icon name="Settings" className="w-3 h-3" />
        </Button>
      </div>

      {/* 会话计数指示器 */}
      {sessionCount > 0 && (
        <div className="ml-2 text-xs text-slate-400">
          {sessionCount}
        </div>
      )}
    </div>
  );
});

SessionBarCompact.displayName = 'SessionBarCompact';

/**
 * SessionBarMinimal组件 - 最小版会话栏
 */
export const SessionBarMinimal = forwardRef((
  { 
    className,
    children,
    onNewSession,
    ...props 
  }, 
  ref
) => {
  return (
    <div
      ref={ref}
      className={clsx(
        'flex items-center bg-slate-900 border-b border-slate-700 px-2 py-1',
        className
      )}
      role="toolbar"
      aria-label="最小会话管理栏"
      {...props}
    >
      {/* 左侧：会话标签区域 */}
      <div className="flex items-center space-x-1 flex-1 min-w-0">
        {children}
      </div>

      {/* 右侧：新建按钮 */}
      <Button
        variant="ghost"
        size="xs"
        onClick={onNewSession}
        aria-label="新建会话"
      >
        <Icon name="Plus" className="w-3 h-3" />
      </Button>
    </div>
  );
});

SessionBarMinimal.displayName = 'SessionBarMinimal';
