import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { StatusDot } from '../primitives/StatusDot';

/**
 * AIActionControls组件 - AI操作控制组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {boolean} props.isRunning - 是否正在运行
 * @param {boolean} props.canStop - 是否可以停止
 * @param {boolean} props.canPause - 是否可以暂停
 * @param {boolean} props.canResume - 是否可以恢复
 * @param {boolean} props.canUndo - 是否可以撤销
 * @param {boolean} props.canRedo - 是否可以重做
 * @param {boolean} props.canRetry - 是否可以重试
 * @param {boolean} props.canRollback - 是否可以回滚
 * @param {Object} props.status - 状态信息
 * @param {Function} props.onStop - 停止回调
 * @param {Function} props.onPause - 暂停回调
 * @param {Function} props.onResume - 恢复回调
 * @param {Function} props.onUndo - 撤销回调
 * @param {Function} props.onRedo - 重做回调
 * @param {Function} props.onRetry - 重试回调
 * @param {Function} props.onRollback - 回滚回调
 * @param {Function} props.onSettings - 设置回调
 * @param {string} props.variant - 变体：default|compact|minimal
 * @param {boolean} props.showLabels - 是否显示标签
 * @param {boolean} props.showStatus - 是否显示状态
 * @param {boolean} props.vertical - 是否垂直布局
 * @param {boolean} props.floating - 是否浮动样式
 * @param {string} props.position - 位置：top-left|top-right|bottom-left|bottom-right
 */
export function AIActionControls({
  className = '',
  isRunning = false,
  canStop = true,
  canPause = true,
  canResume = false,
  canUndo = false,
  canRedo = false,
  canRetry = false,
  canRollback = false,
  status = {},
  onStop,
  onPause,
  onResume,
  onUndo,
  onRedo,
  onRetry,
  onRollback,
  onSettings,
  variant = 'default',
  showLabels = true,
  showStatus = true,
  vertical = false,
  floating = false,
  position = 'bottom-right',
  ...props
}) {
  const [expanded, setExpanded] = useState(false);

  // 处理停止操作
  const handleStop = () => {
    if (window.confirm('确定要停止当前AI操作吗？')) {
      onStop?.();
    }
  };

  // 处理回滚操作
  const handleRollback = () => {
    if (window.confirm('确定要回滚到上一个状态吗？此操作不可撤销。')) {
      onRollback?.();
    }
  };

  // 获取操作按钮配置
  const getActionButtons = () => {
    const buttons = [];

    if (isRunning) {
      if (canPause && !canResume) {
        buttons.push({
          id: 'pause',
          icon: 'Pause',
          label: '暂停',
          color: 'warning',
          onClick: onPause,
          tooltip: '暂停当前操作',
        });
      }

      if (canResume) {
        buttons.push({
          id: 'resume',
          icon: 'Play',
          label: '恢复',
          color: 'success',
          onClick: onResume,
          tooltip: '恢复操作',
        });
      }

      if (canStop) {
        buttons.push({
          id: 'stop',
          icon: 'Square',
          label: '停止',
          color: 'error',
          onClick: handleStop,
          tooltip: '停止当前操作',
        });
      }
    } else {
      if (canRetry) {
        buttons.push({
          id: 'retry',
          icon: 'RefreshCw',
          label: '重试',
          color: 'primary',
          onClick: onRetry,
          tooltip: '重新执行操作',
        });
      }

      if (canUndo) {
        buttons.push({
          id: 'undo',
          icon: 'RotateCcw',
          label: '撤销',
          color: 'muted',
          onClick: onUndo,
          tooltip: '撤销上一步操作',
        });
      }

      if (canRedo) {
        buttons.push({
          id: 'redo',
          icon: 'RotateCw',
          label: '重做',
          color: 'muted',
          onClick: onRedo,
          tooltip: '重做上一步操作',
        });
      }

      if (canRollback) {
        buttons.push({
          id: 'rollback',
          icon: 'History',
          label: '回滚',
          color: 'warning',
          onClick: handleRollback,
          tooltip: '回滚到上一个状态',
        });
      }
    }

    // 设置按钮
    if (onSettings) {
      buttons.push({
        id: 'settings',
        icon: 'Settings',
        label: '设置',
        color: 'muted',
        onClick: onSettings,
        tooltip: 'AI设置',
      });
    }

    return buttons;
  };

  // 渲染单个操作按钮
  const renderActionButton = (button) => {
    const shouldShowLabel = showLabels && variant !== 'minimal';
    const buttonSize = variant === 'minimal' ? 'xs' : 'sm';

    return (
      <Button
        key={button.id}
        size={buttonSize}
        variant={floating ? 'solid' : 'outline'}
        onClick={button.onClick}
        disabled={button.disabled}
        title={button.tooltip}
        className={clsx(
          'transition-all duration-200',
          button.disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon name={button.icon} size="sm" color={button.color} />
        {shouldShowLabel && (
          <span className="ml-2 text-xs">{button.label}</span>
        )}
      </Button>
    );
  };

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    if (!showStatus || !status.message) return null;

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded border border-gray-700">
        <StatusDot
          status={status.type || 'info'}
          size="xs"
          pulse={isRunning}
        />
        <span className="text-xs text-gray-300">{status.message}</span>
        {status.progress !== undefined && (
          <span className="text-xs text-gray-500">
            ({Math.round(status.progress * 100)}%)
          </span>
        )}
      </div>
    );
  };

  // 获取容器样式
  const containerClasses = clsx(
    'flex items-center gap-2',
    {
      'flex-col': vertical,
      'flex-row': !vertical,
      'p-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg': floating,
      'p-1': !floating,
      'gap-1': variant === 'minimal',
      'gap-2': variant !== 'minimal',
    },
    className
  );

  // 获取位置样式
  const getPositionClasses = () => {
    if (!floating) return '';

    const positionMap = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
    };

    return positionMap[position] || positionMap['bottom-right'];
  };

  const actionButtons = getActionButtons();

  return (
    <div 
      className={clsx(containerClasses, getPositionClasses())}
      {...props}
    >
      {/* 状态指示器 */}
      {renderStatusIndicator()}

      {/* 操作按钮 */}
      <div className={clsx(
        'flex items-center gap-2',
        {
          'flex-col': vertical,
          'flex-row': !vertical,
        }
      )}>
        {actionButtons.map(renderActionButton)}

        {/* 展开按钮（当按钮过多时） */}
        {variant === 'compact' && actionButtons.length > 3 && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="relative"
          >
            <Icon name="MoreHorizontal" size="sm" color="muted" />
            {showLabels && (
              <span className="ml-2 text-xs">更多</span>
            )}
            
            {/* 展开的菜单 */}
            {expanded && (
              <div className="absolute bottom-full mb-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 min-w-40 z-50">
                {actionButtons.slice(3).map(renderActionButton)}
              </div>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// 预设组件
export const MinimalAIControls = (props) => (
  <AIActionControls
    variant="minimal"
    showLabels={false}
    showStatus={false}
    {...props}
  />
);

export const CompactAIControls = (props) => (
  <AIActionControls
    variant="compact"
    showLabels={true}
    showStatus={true}
    {...props}
  />
);

export const FullAIControls = (props) => (
  <AIActionControls
    variant="default"
    showLabels={true}
    showStatus={true}
    {...props}
  />
);

export const FloatingAIControls = (props) => (
  <AIActionControls
    floating={true}
    variant="compact"
    showLabels={false}
    position="bottom-right"
    {...props}
  />
);

export const VerticalAIControls = (props) => (
  <AIActionControls
    vertical={true}
    variant="compact"
    showLabels={true}
    {...props}
  />
);

// 专用控制组件
export const RunningAIControls = (props) => (
  <AIActionControls
    isRunning={true}
    canStop={true}
    canPause={true}
    canResume={false}
    showStatus={true}
    {...props}
  />
);

export const PausedAIControls = (props) => (
  <AIActionControls
    isRunning={true}
    canStop={true}
    canPause={false}
    canResume={true}
    showStatus={true}
    {...props}
  />
);

export const CompletedAIControls = (props) => (
  <AIActionControls
    isRunning={false}
    canRetry={true}
    canUndo={true}
    canRedo={false}
    showStatus={false}
    {...props}
  />
);

export const ErrorAIControls = (props) => (
  <AIActionControls
    isRunning={false}
    canRetry={true}
    canRollback={true}
    showStatus={true}
    {...props}
  />
);

export default AIActionControls;
