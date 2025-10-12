import React, { forwardRef, useState } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import MonoText from '../primitives/MonoText';
import Button from '../primitives/Button';
import Tooltip from '../primitives/Tooltip';

/**
 * ConnectionItem组件 - 连接项
 */
const connectionItemVariants = createVariants(
  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
  {
    variant: {
      default: 'hover:bg-gray-800/50',
      selected: 'bg-blue-900/20 border border-blue-800/50',
      compact: 'hover:bg-gray-800/50 p-2',
      detailed: 'hover:bg-gray-800/50 p-4'
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const ConnectionItem = forwardRef(({
  connection,
  selected = false,
  showStatus = true,
  showActions = true,
  showTags = true,
  showLastUsed = false,
  showAuthType = false,
  compact = false,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onClick,
  variant,
  size,
  className,
  ...props
}, ref) => {
  const [showContextMenu, setShowContextMenu] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中';
      case 'disconnected':
        return '已断开';
      case 'error':
        return '连接错误';
      default:
        return '未知';
    }
  };

  const formatLastUsed = (lastUsed) => {
    if (!lastUsed) return '从未使用';
    
    const now = new Date();
    const last = new Date(lastUsed);
    const diff = now - last;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    
    return last.toLocaleDateString();
  };

  const handleAction = (action, event) => {
    event.stopPropagation();
    
    switch (action) {
      case 'connect':
        onConnect?.(connection);
        break;
      case 'disconnect':
        onDisconnect?.(connection);
        break;
      case 'edit':
        onEdit?.(connection);
        break;
      case 'delete':
        onDelete?.(connection);
        break;
      case 'duplicate':
        onDuplicate?.(connection);
        break;
      case 'export':
        onExport?.(connection);
        break;
      default:
        break;
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    setShowContextMenu(true);
  };

  const handleClick = () => {
    onClick?.(connection);
  };

  const itemVariant = selected ? 'selected' : variant;
  const isCompact = compact || variant === 'compact';
  const isDetailed = variant === 'detailed';

  return (
    <div
      ref={ref}
      className={cn(
        connectionItemVariants({ variant: itemVariant, size }),
        'group relative',
        className
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      {...props}
    >
      {/* 状态指示器 */}
      {showStatus && (
        <div className="flex-shrink-0">
          <Tooltip content={getStatusText(connection.status)}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              getStatusColor(connection.status)
            )} />
          </Tooltip>
        </div>
      )}

      {/* 连接图标 */}
      <div className="flex-shrink-0">
        <Icon 
          name={connection.status === 'connected' ? 'Wifi' : 'WifiOff'} 
          size={isCompact ? 16 : 20}
          className={cn(
            connection.status === 'connected' ? 'text-green-500' : 'text-gray-500'
          )}
        />
      </div>

      {/* 连接信息 */}
      <div className="flex-1 min-w-0">
        {/* 主标题行 */}
        <div className="flex items-center gap-2">
          <h4 className={cn(
            'font-medium text-gray-100 truncate',
            isCompact && 'text-sm',
            isDetailed && 'text-base'
          )}>
            {connection.name}
          </h4>
          
          {/* 标签 */}
          {showTags && connection.tags && connection.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {connection.tags.slice(0, isCompact ? 1 : 2).map((tag, index) => (
                <Badge key={index} variant="outline" size="xs">
                  {tag}
                </Badge>
              ))}
              {connection.tags.length > (isCompact ? 1 : 2) && (
                <Badge variant="outline" size="xs">
                  +{connection.tags.length - (isCompact ? 1 : 2)}
                </Badge>
              )}
            </div>
          )}

          {/* 状态徽章 */}
          {showStatus && !isCompact && (
            <Badge variant={getStatusBadgeVariant(connection.status)} size="xs">
              {getStatusText(connection.status)}
            </Badge>
          )}
        </div>
        
        {/* 连接详情行 */}
        <div className="flex items-center gap-2 mt-1">
          <MonoText variant="muted" size="xs">
            {connection.username}@{connection.host}
          </MonoText>
          <MonoText variant="muted" size="xs">
            :{connection.port}
          </MonoText>
          
          {showAuthType && connection.authType && (
            <>
              <span className="text-gray-600">•</span>
              <MonoText variant="muted" size="xs">
                {connection.authType}
              </MonoText>
            </>
          )}
        </div>

        {/* 详细信息 */}
        {isDetailed && (
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {connection.group && (
              <span>分组: {connection.group}</span>
            )}
            {showLastUsed && connection.lastUsed && (
              <span>最后使用: {formatLastUsed(connection.lastUsed)}</span>
            )}
            {connection.description && (
              <span className="truncate flex-1">
                {connection.description}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {showActions && !isCompact && (
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {connection.status === 'disconnected' || connection.status === 'error' ? (
            <Tooltip content="连接">
              <Button
                variant="solid"
                size="sm"
                onClick={(e) => handleAction('connect', e)}
              >
                <Icon name="Play" size={14} />
              </Button>
            </Tooltip>
          ) : connection.status === 'connected' ? (
            <Tooltip content="断开连接">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleAction('disconnect', e)}
              >
                <Icon name="Square" size={14} />
              </Button>
            </Tooltip>
          ) : connection.status === 'connecting' ? (
            <Tooltip content="连接中...">
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                <Icon name="Loader2" size={14} className="animate-spin" />
              </Button>
            </Tooltip>
          ) : null}

          <Tooltip content="编辑">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleAction('edit', e)}
            >
              <Icon name="Edit" size={14} />
            </Button>
          </Tooltip>

          <Tooltip content="更多操作">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(true);
              }}
            >
              <Icon name="MoreVertical" size={14} />
            </Button>
          </Tooltip>
        </div>
      )}

      {/* 右键菜单 */}
      {showContextMenu && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {connection.status === 'disconnected' && (
              <button
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                onClick={() => handleAction('connect')}
              >
                <Icon name="Play" size={14} />
                连接
              </button>
            )}
            
            {connection.status === 'connected' && (
              <button
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                onClick={() => handleAction('disconnect')}
              >
                <Icon name="Square" size={14} />
                断开连接
              </button>
            )}

            <div className="border-t border-gray-700 my-1" />

            <button
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleAction('edit')}
            >
              <Icon name="Edit" size={14} />
              编辑
            </button>

            <button
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleAction('duplicate')}
            >
              <Icon name="Copy" size={14} />
              复制
            </button>

            <button
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleAction('export')}
            >
              <Icon name="Download" size={14} />
              导出
            </button>

            <div className="border-t border-gray-700 my-1" />

            <button
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleAction('delete')}
            >
              <Icon name="Trash2" size={14} />
              删除
            </button>
          </div>

          {/* 点击外部关闭菜单 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
        </div>
      )}
    </div>
  );
});

ConnectionItem.displayName = 'ConnectionItem';

export default ConnectionItem;

/**
 * ConnectionItemCompact组件 - 紧凑型连接项
 */
export const ConnectionItemCompact = forwardRef((props, ref) => {
  return (
    <ConnectionItem
      ref={ref}
      variant="compact"
      showActions={false}
      showTags={false}
      showLastUsed={false}
      showAuthType={false}
      {...props}
    />
  );
});

ConnectionItemCompact.displayName = 'ConnectionItemCompact';

/**
 * ConnectionItemDetailed组件 - 详细型连接项
 */
export const ConnectionItemDetailed = forwardRef((props, ref) => {
  return (
    <ConnectionItem
      ref={ref}
      variant="detailed"
      showStatus={true}
      showActions={true}
      showTags={true}
      showLastUsed={true}
      showAuthType={true}
      {...props}
    />
  );
});

ConnectionItemDetailed.displayName = 'ConnectionItemDetailed';
