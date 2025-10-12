import React from 'react';
import { clsx } from '../utils/clsx';
import { StatusDot } from '../primitives/StatusDot';
import { Icon } from '../primitives/Icon';

/**
 * TerminalStatusBar组件 - 终端状态栏组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {string} props.currentPath - 当前路径
 * @param {string} props.user - 用户名
 * @param {string} props.host - 主机名
 * @param {boolean} props.connected - 是否已连接
 * @param {boolean} props.connecting - 是否连接中
 * @param {string} props.error - 错误信息
 * @param {number} props.latency - 延迟（毫秒）
 * @param {string} props.encoding - 编码格式
 * @param {string} props.shell - 当前Shell
 * @param {boolean} props.readOnly - 是否只读模式
 * @param {number} props.processCount - 进程数量
 * @param {Object} props.theme - 主题配置
 * @param {Function} props.onReconnect - 重新连接回调
 * @param {Function} props.onDisconnect - 断开连接回调
 * @param {Function} props.onSettings - 设置回调
 * @param {Array} props.actions - 自定义操作按钮
 */
export function TerminalStatusBar({
  className = '',
  currentPath = '',
  user = '',
  host = '',
  connected = false,
  connecting = false,
  error = '',
  latency = 0,
  encoding = 'UTF-8',
  shell = 'bash',
  readOnly = false,
  processCount = 0,
  theme = 'dark',
  onReconnect,
  onDisconnect,
  onSettings,
  actions = [],
  ...props
}) {
  const getLatencyColor = (latency) => {
    if (latency < 50) return 'text-green-500';
    if (latency < 150) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLatencyText = (latency) => {
    if (latency === 0) return '--';
    return `${latency}ms`;
  };

  const formatPath = (path) => {
    if (!path) return '~';
    if (path.length > 40) {
      const parts = path.split('/');
      if (parts.length > 3) {
        return `.../${parts.slice(-2).join('/')}`;
      }
    }
    return path;
  };

  const getConnectionStatus = () => {
    if (error) return 'error';
    if (connecting) return 'connecting';
    if (connected) return 'online';
    return 'offline';
  };

  const statusClasses = clsx(
    'flex items-center justify-between px-3 py-1 text-xs font-mono',
    'border-t border-gray-700',
    {
      'bg-gray-800 text-gray-300': theme === 'dark',
      'bg-gray-100 text-gray-700 border-gray-300': theme === 'light',
      'bg-blue-900 text-blue-100 border-blue-700': theme === 'blue',
    },
    className
  );

  const leftSectionClasses = 'flex items-center gap-3';
  const centerSectionClasses = 'flex items-center gap-4';
  const rightSectionClasses = 'flex items-center gap-3';

  return (
    <div className={statusClasses} {...props}>
      {/* 左侧：连接状态和路径信息 */}
      <div className={leftSectionClasses}>
        {/* 连接状态指示器 */}
        <div className="flex items-center gap-2">
          <StatusDot
            status={getConnectionStatus()}
            size="sm"
            showLabel={false}
          />
          <span className="text-gray-400">
            {connecting ? '连接中' : connected ? '已连接' : '未连接'}
          </span>
        </div>

        {/* 用户@主机信息 */}
        {user && host && (
          <span className="text-gray-400">
            {user}@{host}
          </span>
        )}

        {/* 当前路径 */}
        {currentPath && (
          <div className="flex items-center gap-1">
            <Icon name="Folder" size="xs" color="muted" />
            <span className="text-gray-300" title={currentPath}>
              {formatPath(currentPath)}
            </span>
          </div>
        )}

        {/* 只读模式指示器 */}
        {readOnly && (
          <span className="text-yellow-500 bg-yellow-500/20 px-2 py-0.5 rounded">
            只读
          </span>
        )}
      </div>

      {/* 中间：系统信息 */}
      <div className={centerSectionClasses}>
        {/* Shell信息 */}
        {shell && (
          <span className="text-gray-400">
            Shell: {shell}
          </span>
        )}

        {/* 编码信息 */}
        {encoding && (
          <span className="text-gray-400">
            {encoding}
          </span>
        )}

        {/* 进程数量 */}
        {processCount > 0 && (
          <div className="flex items-center gap-1">
            <Icon name="Cpu" size="xs" color="muted" />
            <span className="text-gray-400">
              {processCount}
            </span>
          </div>
        )}

        {/* 延迟信息 */}
        {connected && (
          <div className="flex items-center gap-1">
            <Icon name="Zap" size="xs" color="muted" />
            <span className={getLatencyColor(latency)}>
              {getLatencyText(latency)}
            </span>
          </div>
        )}
      </div>

      {/* 右侧：操作按钮 */}
      <div className={rightSectionClasses}>
        {/* 错误信息 */}
        {error && (
          <span className="text-red-500 text-xs truncate max-w-32" title={error}>
            {error}
          </span>
        )}

        {/* 自定义操作按钮 */}
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={clsx(
              'p-1 rounded hover:bg-gray-700/50 transition-colors',
              'text-gray-400 hover:text-gray-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={action.title}
            disabled={action.disabled}
          >
            <Icon name={action.icon} size="sm" color={action.color || 'muted'} />
          </button>
        ))}

        {/* 重新连接按钮 */}
        {onReconnect && (error || !connected) && (
          <button
            onClick={onReconnect}
            className={clsx(
              'p-1 rounded hover:bg-gray-700/50 transition-colors',
              'text-gray-400 hover:text-gray-200'
            )}
            title="重新连接"
          >
            <Icon name="RefreshCw" size="sm" color="muted" />
          </button>
        )}

        {/* 断开连接按钮 */}
        {onDisconnect && connected && (
          <button
            onClick={onDisconnect}
            className={clsx(
              'p-1 rounded hover:bg-gray-700/50 transition-colors',
              'text-gray-400 hover:text-red-400'
            )}
            title="断开连接"
          >
            <Icon name="X" size="sm" color="muted" />
          </button>
        )}

        {/* 设置按钮 */}
        {onSettings && (
          <button
            onClick={onSettings}
            className={clsx(
              'p-1 rounded hover:bg-gray-700/50 transition-colors',
              'text-gray-400 hover:text-gray-200'
            )}
            title="终端设置"
          >
            <Icon name="Settings" size="sm" color="muted" />
          </button>
        )}
      </div>
    </div>
  );
}

// 预设的状态栏变体
export const MinimalTerminalStatusBar = (props) => (
  <TerminalStatusBar
    {...props}
    className="px-2 py-0.5"
    actions={[]}
  />
);

export const FullTerminalStatusBar = (props) => (
  <TerminalStatusBar
    {...props}
    className="px-4 py-1.5"
  />
);

// 连接状态专用的状态栏
export const ConnectionStatusBar = ({
  connected,
  connecting,
  error,
  host,
  onReconnect,
  onDisconnect,
  ...props
}) => (
  <TerminalStatusBar
    connected={connected}
    connecting={connecting}
    error={error}
    host={host}
    onReconnect={onReconnect}
    onDisconnect={onDisconnect}
    currentPath=""
    user=""
    {...props}
  />
);

// 文件传输状态栏
export const TransferStatusBar = ({
  transfers = [],
  activeTransfers = 0,
  totalTransfers = 0,
  ...props
}) => {
  const activeCount = transfers.filter(t => t.status === 'active').length;
  const completedCount = transfers.filter(t => t.status === 'completed').length;
  const failedCount = transfers.filter(t => t.status === 'failed').length;

  return (
    <TerminalStatusBar
      {...props}
      actions={[
        {
          icon: 'Download',
          title: `传输: ${activeCount} 进行中, ${completedCount} 完成, ${failedCount} 失败`,
          color: activeCount > 0 ? 'warning' : 'muted',
          onClick: () => {}, // 这里可以打开传输队列
        }
      ]}
    />
  );
};

export default TerminalStatusBar;
