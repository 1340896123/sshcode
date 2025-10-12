import React, { forwardRef, useState } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import MonoText from '../primitives/MonoText';
import Button from '../primitives/Button';
import Input from '../primitives/Input';

/**
 * ConnectionList组件 - 连接列表
 */
const connectionListVariants = createVariants(
  'bg-gray-900 border border-gray-800 rounded-lg',
  {
    variant: {
      default: 'bg-gray-900 border-gray-800',
      compact: 'bg-gray-900 border-gray-800',
      detailed: 'bg-gray-900 border-gray-800'
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

const ConnectionList = forwardRef(({
  connections = [],
  selectedConnectionId,
  onConnectionSelect,
  onConnectionEdit,
  onConnectionDelete,
  onConnectionConnect,
  onConnectionDisconnect,
  loading = false,
  searchable = true,
  showStatus = true,
  showLastUsed = true,
  showActions = true,
  variant,
  size,
  className,
  ...props
}, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 过滤连接
  const filteredConnections = connections.filter(connection => {
    const matchesSearch = !searchQuery || 
      connection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connection.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connection.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || connection.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
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

  const handleConnectionAction = (action, connection, event) => {
    event.stopPropagation();
    
    switch (action) {
      case 'connect':
        onConnectionConnect?.(connection);
        break;
      case 'disconnect':
        onConnectionDisconnect?.(connection);
        break;
      case 'edit':
        onConnectionEdit?.(connection);
        break;
      case 'delete':
        onConnectionDelete?.(connection);
        break;
      default:
        break;
    }
  };

  const renderConnectionItem = (connection) => {
    const isSelected = connection.id === selectedConnectionId;
    const isCompact = variant === 'compact';
    const isDetailed = variant === 'detailed';

    return (
      <div
        key={connection.id}
        className={cn(
          'flex items-center gap-3 p-3 -mx-3 rounded-lg cursor-pointer transition-colors',
          'hover:bg-gray-800/50',
          isSelected && 'bg-blue-900/20 border border-blue-800/50',
          className
        )}
        onClick={() => onConnectionSelect?.(connection)}
      >
        {/* 状态指示器 */}
        {showStatus && (
          <div className="flex-shrink-0">
            <div className={cn(
              'w-2 h-2 rounded-full',
              connection.status === 'connected' && 'bg-green-500',
              connection.status === 'connecting' && 'bg-yellow-500 animate-pulse',
              connection.status === 'disconnected' && 'bg-gray-500',
              connection.status === 'error' && 'bg-red-500'
            )} />
          </div>
        )}

        {/* 连接信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              'font-medium text-gray-100 truncate',
              isCompact && 'text-sm',
              isDetailed && 'text-base'
            )}>
              {connection.name}
            </h4>
            {connection.tags && connection.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {connection.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="outline" size="xs">
                    {tag}
                  </Badge>
                ))}
                {connection.tags.length > 2 && (
                  <Badge variant="outline" size="xs">
                    +{connection.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <MonoText variant="muted" size="xs">
              {connection.username}@{connection.host}
            </MonoText>
            <MonoText variant="muted" size="xs">
              :{connection.port}
            </MonoText>
            {showStatus && (
              <Badge variant={getStatusColor(connection.status)} size="xs">
                {getStatusText(connection.status)}
              </Badge>
            )}
          </div>

          {isDetailed && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {connection.authType && (
                <span>认证: {connection.authType}</span>
              )}
              {connection.group && (
                <span>分组: {connection.group}</span>
              )}
              {showLastUsed && connection.lastUsed && (
                <span>最后使用: {formatLastUsed(connection.lastUsed)}</span>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {showActions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {connection.status === 'disconnected' || connection.status === 'error' ? (
              <Button
                variant="solid"
                size="sm"
                onClick={(e) => handleConnectionAction('connect', connection, e)}
              >
                <Icon name="Play" size={14} />
              </Button>
            ) : connection.status === 'connected' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleConnectionAction('disconnect', connection, e)}
              >
                <Icon name="Square" size={14} />
              </Button>
            ) : connection.status === 'connecting' ? (
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                <Icon name="Loader2" size={14} className="animate-spin" />
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleConnectionAction('edit', connection, e)}
            >
              <Icon name="Edit" size={14} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleConnectionAction('delete', connection, e)}
            >
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={cn(connectionListVariants({ variant, size }), className)}
      {...props}
    >
      {/* 搜索和过滤 */}
      {(searchable || connections.length > 0) && (
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {searchable && (
              <div className="flex-1">
                <Input
                  placeholder="搜索连接..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  prefix={<Icon name="Search" size={16} />}
                  clearable
                />
              </div>
            )}
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="connected">已连接</option>
              <option value="disconnected">已断开</option>
              <option value="connecting">连接中</option>
              <option value="error">错误</option>
            </select>
          </div>
        </div>
      )}

      {/* 连接列表 */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={20} className="animate-spin text-gray-500" />
          </div>
        ) : filteredConnections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? '没有找到匹配的连接' : '暂无连接'}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredConnections.map(renderConnectionItem)}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      {connections.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
          共 {connections.length} 个连接
          {filteredConnections.length !== connections.length && 
            ` (显示 ${filteredConnections.length} 个)`
          }
        </div>
      )}
    </div>
  );
});

ConnectionList.displayName = 'ConnectionList';

export default ConnectionList;

/**
 * ConnectionGroup组件 - 连接分组
 */
export const ConnectionGroup = forwardRef(({
  title,
  connections = [],
  defaultExpanded = true,
  onConnectionSelect,
  onConnectionEdit,
  onConnectionDelete,
  onConnectionConnect,
  onConnectionDisconnect,
  className,
  ...props
}, ref) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      ref={ref}
      className={cn('border border-gray-800 rounded-lg overflow-hidden', className)}
      {...props}
    >
      <div
        className="flex items-center justify-between p-3 bg-gray-800/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icon
            name="ChevronRight"
            size={16}
            className={cn('transition-transform', isExpanded && 'rotate-90')}
          />
          <h4 className="font-medium text-gray-100">{title}</h4>
          <Badge variant="outline" size="xs">
            {connections.length}
          </Badge>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 pt-0">
          {connections.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              该分组暂无连接
            </div>
          ) : (
            <div className="space-y-2">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => onConnectionSelect?.(connection)}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    connection.status === 'connected' && 'bg-green-500',
                    connection.status === 'connecting' && 'bg-yellow-500 animate-pulse',
                    connection.status === 'disconnected' && 'bg-gray-500',
                    connection.status === 'error' && 'bg-red-500'
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-100 truncate">
                        {connection.name}
                      </span>
                      <MonoText variant="muted" size="xs">
                        {connection.username}@{connection.host}:{connection.port}
                      </MonoText>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {connection.status === 'disconnected' && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConnectionConnect?.(connection);
                        }}
                      >
                        <Icon name="Play" size={12} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnectionEdit?.(connection);
                      }}
                    >
                      <Icon name="Edit" size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ConnectionGroup.displayName = 'ConnectionGroup';
