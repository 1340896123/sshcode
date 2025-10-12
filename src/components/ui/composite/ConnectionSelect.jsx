import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Select } from '../primitives/Select';
import { StatusDot } from '../primitives/Tag';

/**
 * ConnectionSelect组件 - 选择连接下拉组件
 */
export function ConnectionSelect({
  connections = [],
  selectedConnection = '',
  onSelect,
  onConnect,
  onDisconnect,
  onEdit,
  onAdd,
  showStatus = true,
  showActions = true,
  compact = false,
  className = '',
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConnectionSelect = (connectionId) => {
    onSelect?.(connectionId);
    setIsOpen(false);
  };

  const handleQuickConnect = (e, connectionId) => {
    e.stopPropagation();
    onConnect?.(connectionId);
  };

  const handleQuickDisconnect = (e, connectionId) => {
    e.stopPropagation();
    onDisconnect?.(connectionId);
  };

  const handleEdit = (e, connectionId) => {
    e.stopPropagation();
    onEdit?.(connectionId);
  };

  const formatConnectionOption = (connection) => {
    const statusInfo = connection.status === 'connected' ? '在线' : 
                     connection.status === 'connecting' ? '连接中' : '离线';
    
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {showStatus && (
            <StatusDot
              status={connection.status}
              size="xs"
              pulse={connection.status === 'connected'}
            />
          )}
          <span className="text-sm text-gray-100">{connection.name}</span>
          <span className="text-xs text-gray-500">
            {connection.user}@{connection.host}:{connection.port}
          </span>
        </div>
        
        {showActions && (
          <div className="flex items-center gap-1">
            {connection.status === 'connected' ? (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => handleQuickDisconnect(e, connection.id)}
                title="断开连接"
              >
                <Icon name="X" size="xs" />
              </Button>
            ) : (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => handleQuickConnect(e, connection.id)}
                title="连接"
              >
                <Icon name="Wifi" size="xs" />
              </Button>
            )}
            
            <Button
              size="xs"
              variant="ghost"
              onClick={(e) => handleEdit(e, connection.id)}
              title="编辑"
            >
              <Icon name="Edit" size="xs" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const connectionOptions = connections.map(connection => ({
    value: connection.id,
    label: formatConnectionOption(connection),
    disabled: false
  }));

  if (compact) {
    return (
      <Select
        value={selectedConnection}
        onChange={handleConnectionSelect}
        options={connectionOptions}
        placeholder="选择连接..."
        size="sm"
        className={className}
        {...props}
      />
    );
  }

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg', className)} {...props}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="Wifi" size="sm" />
            <span className="text-sm font-medium text-gray-100">连接选择</span>
          </div>
          <Button size="xs" onClick={onAdd}>
            <Icon name="Plus" size="xs" />
            添加
          </Button>
        </div>

        <Select
          value={selectedConnection}
          onChange={handleConnectionSelect}
          options={connectionOptions}
          placeholder="选择SSH连接..."
          size="sm"
          className="w-full"
        />

        {selectedConnection && (
          <div className="mt-3 p-2 bg-gray-900 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot
                  status={connections.find(c => c.id === selectedConnection)?.status || 'offline'}
                  size="xs"
                />
                <span className="text-xs text-gray-300">
                  {connections.find(c => c.id === selectedConnection)?.name || '未知连接'}
                </span>
              </div>
              
              <div className="flex gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onConnect?.(selectedConnection)}
                >
                  连接
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onDisconnect?.(selectedConnection)}
                >
                  断开
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 预设组件
export const CompactConnectionSelect = (props) => (
  <ConnectionSelect compact={true} showActions={false} {...props} />
);

export const MinimalConnectionSelect = (props) => (
  <ConnectionSelect compact={true} showStatus={false} showActions={false} {...props} />
);

export const FullConnectionSelect = (props) => (
  <ConnectionSelect showStatus={true} showActions={true} compact={false} {...props} />
);

export default ConnectionSelect;
