import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { StatusDot } from '../primitives/StatusDot';

/**
 * TerminalActions组件 - 终端操作按钮组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {boolean} props.showClear - 是否显示清屏按钮
 * @param {boolean} props.showReconnect - 是否显示重连按钮
 * @param {boolean} props.showDetach - 是否显示分离按钮
 * @param {boolean} props.showCopy - 是否显示复制按钮
 * @param {boolean} props.showPaste - 是否显示粘贴按钮
 * @param {boolean} props.showSearch - 是否显示搜索按钮
 * @param {boolean} props.showSettings - 是否显示设置按钮
 * @param {boolean} props.showFullscreen - 是否显示全屏按钮
 * @param {boolean} props.showUpload - 是否显示上传按钮
 * @param {boolean} props.showDownload - 是否显示下载按钮
 * @param {boolean} props.showSave - 是否显示保存按钮
 * @param {boolean} props.compact - 是否紧凑模式
 * @param {string} props.variant - 变体：solid|outline|ghost
 * @param {string} props.size - 尺寸：xs|sm|md|lg
 * @param {boolean} props.vertical - 是否垂直排列
 * @param {string} props.position - 位置：top-left|top-right|bottom-left|bottom-right
 * @param {boolean} props.floating - 是否浮动样式
 * @param {boolean} props.disabled - 是否禁用所有按钮
 * @param {Object} props.status - 终端状态信息
 * @param {Function} props.onClear - 清屏回调
 * @param {Function} props.onReconnect - 重连回调
 * @param {Function} props.onDetach - 分离回调
 * @param {Function} props.onCopy - 复制回调
 * @param {Function} props.onPaste - 粘贴回调
 * @param {Function} props.onSearch - 搜索回调
 * @param {Function} props.onSettings - 设置回调
 * @param {Function} props.onFullscreen - 全屏回调
 * @param {Function} props.onUpload - 上传回调
 * @param {Function} props.onDownload - 下载回调
 * @param {Function} props.onSave - 保存回调
 * @param {Array} props.customActions - 自定义操作按钮
 */
export function TerminalActions({
  className = '',
  showClear = true,
  showReconnect = true,
  showDetach = false,
  showCopy = true,
  showPaste = true,
  showSearch = true,
  showSettings = true,
  showFullscreen = false,
  showUpload = false,
  showDownload = false,
  showSave = false,
  compact = false,
  variant = 'ghost',
  size = 'sm',
  vertical = false,
  position = 'top-right',
  floating = false,
  disabled = false,
  status = {},
  onClear,
  onReconnect,
  onDetach,
  onCopy,
  onPaste,
  onSearch,
  onSettings,
  onFullscreen,
  onUpload,
  onDownload,
  onSave,
  customActions = [],
  ...props
}) {
  const [tooltipVisible, setTooltipVisible] = useState(null);

  // 默认操作按钮配置
  const defaultActions = [
    {
      id: 'clear',
      icon: 'Trash2',
      label: '清屏 (Ctrl+L)',
      shortcut: 'Ctrl+L',
      show: showClear,
      onClick: onClear,
      disabled: false,
      color: 'muted',
    },
    {
      id: 'reconnect',
      icon: 'RefreshCw',
      label: status.connected ? '重新连接' : '连接',
      shortcut: 'F5',
      show: showReconnect,
      onClick: onReconnect,
      disabled: status.connecting,
      color: status.error ? 'error' : 'muted',
      loading: status.connecting,
    },
    {
      id: 'detach',
      icon: 'Unlink',
      label: '分离终端',
      shortcut: 'Ctrl+D',
      show: showDetach,
      onClick: onDetach,
      disabled: !status.connected,
      color: 'warning',
    },
    {
      id: 'copy',
      icon: 'Copy',
      label: '复制 (Ctrl+C)',
      shortcut: 'Ctrl+C',
      show: showCopy,
      onClick: onCopy,
      disabled: !status.hasSelection,
      color: 'muted',
    },
    {
      id: 'paste',
      icon: 'Clipboard',
      label: '粘贴 (Ctrl+V)',
      shortcut: 'Ctrl+V',
      show: showPaste,
      onClick: onPaste,
      disabled: status.readOnly,
      color: 'muted',
    },
    {
      id: 'search',
      icon: 'Search',
      label: '搜索 (Ctrl+F)',
      shortcut: 'Ctrl+F',
      show: showSearch,
      onClick: onSearch,
      disabled: false,
      color: 'muted',
    },
    {
      id: 'upload',
      icon: 'Upload',
      label: '上传文件',
      show: showUpload,
      onClick: onUpload,
      disabled: !status.connected,
      color: 'primary',
    },
    {
      id: 'download',
      icon: 'Download',
      label: '下载文件',
      show: showDownload,
      onClick: onDownload,
      disabled: !status.connected,
      color: 'primary',
    },
    {
      id: 'save',
      icon: 'Save',
      label: '保存会话',
      shortcut: 'Ctrl+S',
      show: showSave,
      onClick: onSave,
      disabled: false,
      color: 'success',
    },
    {
      id: 'fullscreen',
      icon: status.fullscreen ? 'Minimize2' : 'Maximize2',
      label: status.fullscreen ? '退出全屏' : '全屏',
      shortcut: 'F11',
      show: showFullscreen,
      onClick: onFullscreen,
      disabled: false,
      color: 'muted',
    },
    {
      id: 'settings',
      icon: 'Settings',
      label: '设置',
      show: showSettings,
      onClick: onSettings,
      disabled: false,
      color: 'muted',
    },
  ];

  // 合并默认操作和自定义操作
  const allActions = [...defaultActions, ...customActions].filter(action => action.show);

  // 处理按钮点击
  const handleActionClick = (action) => {
    if (disabled || action.disabled) return;
    
    setTooltipVisible(null);
    action.onClick?.();
  };

  // 处理工具提示显示
  const handleTooltipShow = (actionId) => {
    if (!compact) return;
    setTooltipVisible(actionId);
  };

  const handleTooltipHide = () => {
    setTooltipVisible(null);
  };

  // 获取容器样式
  const containerClasses = clsx(
    'flex items-center gap-1',
    {
      'flex-col': vertical,
      'flex-row': !vertical,
      'p-1 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg': floating,
      'p-2': !floating,
      'gap-0.5': compact,
      'gap-1': !compact,
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

    return positionMap[position] || positionMap['top-right'];
  };

  // 获取按钮样式
  const getButtonClasses = (action) => {
    return clsx(
      'relative transition-all duration-200',
      {
        'opacity-50 cursor-not-allowed': disabled || action.disabled,
        'hover:bg-gray-700': !disabled && !action.disabled && variant === 'ghost',
        'hover:bg-gray-600': !disabled && !action.disabled && variant === 'solid',
        'border border-gray-600 hover:border-gray-500': variant === 'outline',
      }
    );
  };

  // 渲染单个操作按钮
  const renderActionButton = (action) => {
    const buttonSize = compact ? 'xs' : size;
    const showTooltip = compact && tooltipVisible === action.id;

    return (
      <div key={action.id} className="relative">
        <Button
          size={buttonSize}
          variant={variant}
          onClick={() => handleActionClick(action)}
          disabled={disabled || action.disabled}
          loading={action.loading}
          className={getButtonClasses(action)}
          onMouseEnter={() => handleTooltipShow(action.id)}
          onMouseLeave={handleTooltipHide}
        >
          <Icon 
            name={action.icon} 
            size={compact ? 'xs' : 'sm'} 
            color={action.color || 'muted'} 
          />
        </Button>

        {/* 工具提示 */}
        {showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-gray-900 text-gray-100 text-xs rounded px-2 py-1 whitespace-nowrap border border-gray-700">
              <div className="font-medium">{action.label}</div>
              {action.shortcut && (
                <div className="text-gray-400 mt-0.5">{action.shortcut}</div>
              )}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    if (!status || Object.keys(status).length === 0) return null;

    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/50 rounded border border-gray-700">
        <StatusDot
          status={status.error ? 'error' : status.connected ? 'online' : 'offline'}
          size="xs"
        />
        <span className="text-xs text-gray-400">
          {status.error ? '错误' : status.connected ? '已连接' : '未连接'}
        </span>
      </div>
    );
  };

  // 渲染分隔符
  const renderSeparator = () => (
    <div className={clsx(
      'bg-gray-700',
      vertical ? 'w-px h-4' : 'h-px w-4'
    )} />
  );

  return (
    <div 
      className={clsx(containerClasses, getPositionClasses())}
      {...props}
    >
      {/* 状态指示器 */}
      {renderStatusIndicator()}

      {/* 分隔符 */}
      {status && Object.keys(status).length > 0 && allActions.length > 0 && renderSeparator()}

      {/* 操作按钮 */}
      {allActions.map((action, index) => (
        <React.Fragment key={action.id}>
          {renderActionButton(action)}
          {/* 在保存按钮前添加分隔符 */}
          {action.id === 'search' && showSave && index < allActions.length - 1 && renderSeparator()}
        </React.Fragment>
      ))}
    </div>
  );
}

// 预设的终端操作组件
export const MinimalTerminalActions = (props) => (
  <TerminalActions
    compact={true}
    variant="ghost"
    showClear={true}
    showCopy={true}
    showPaste={true}
    showSearch={true}
    showSettings={false}
    {...props}
  />
);

export const FullTerminalActions = (props) => (
  <TerminalActions
    compact={false}
    variant="outline"
    showClear={true}
    showReconnect={true}
    showCopy={true}
    showPaste={true}
    showSearch={true}
    showSettings={true}
    showFullscreen={true}
    showUpload={true}
    showDownload={true}
    showSave={true}
    {...props}
  />
);

export const FloatingTerminalActions = (props) => (
  <TerminalActions
    floating={true}
    compact={true}
    variant="solid"
    position="top-right"
    showClear={true}
    showCopy={true}
    showPaste={true}
    showSearch={true}
    showSettings={false}
    {...props}
  />
);

export const VerticalTerminalActions = (props) => (
  <TerminalActions
    vertical={true}
    compact={true}
    variant="ghost"
    showClear={true}
    showReconnect={true}
    showCopy={true}
    showPaste={true}
    showSearch={true}
    showSettings={true}
    {...props}
  />
);

// 专用操作栏组件
export const ConnectionTerminalActions = (props) => (
  <TerminalActions
    compact={false}
    variant="outline"
    showClear={false}
    showReconnect={true}
    showDetach={true}
    showCopy={false}
    showPaste={false}
    showSearch={false}
    showSettings={false}
    showUpload={true}
    showDownload={true}
    {...props}
  />
);

export const EditingTerminalActions = (props) => (
  <TerminalActions
    compact={false}
    variant="ghost"
    showClear={false}
    showReconnect={false}
    showCopy={true}
    showPaste={true}
    showSearch={true}
    showSave={true}
    showSettings={false}
    {...props}
  />
);

export const FileTransferTerminalActions = (props) => (
  <TerminalActions
    compact={false}
    variant="outline"
    showClear={false}
    showReconnect={false}
    showCopy={false}
    showPaste={false}
    showSearch={false}
    showSettings={false}
    showUpload={true}
    showDownload={true}
    {...props}
  />
);

export default TerminalActions;
