import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Progress } from '../primitives/Progress';
import { Badge } from '../primitives/Badge';
import { Tooltip } from '../primitives/Tooltip';

const transferQueueVariants = cva(
  'bg-slate-800 border border-slate-700 rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-slate-800 border-slate-700',
        compact: 'bg-slate-900 border-slate-600',
        minimal: 'bg-transparent border-0',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const transferItemVariants = cva(
  'flex items-center space-x-3 p-3 border-b border-slate-700 last:border-b-0',
  {
    variants: {
      status: {
        pending: 'bg-slate-800/50',
        active: 'bg-blue-500/5 border-blue-500/20',
        completed: 'bg-green-500/5 border-green-500/20',
        failed: 'bg-red-500/5 border-red-500/20',
        paused: 'bg-orange-500/5 border-orange-500/20',
        cancelled: 'bg-slate-700/50',
      },
    },
    defaultVariants: {
      status: 'pending',
    },
  }
);

export const TransferQueue = forwardRef((
  {
    className,
    variant,
    size,
    transfers = [],
    showDetails = true,
    showSpeed = true,
    showTime = true,
    maxHeight = 400,
    autoScroll = true,
    onTransferAction,
    onClearCompleted,
    onClearAll,
    onRetryTransfer,
    onPauseTransfer,
    onResumeTransfer,
    onCancelTransfer,
    ...props
  },
  ref
) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const listRef = useRef(null);

  const activeTransfers = transfers.filter(t => t.status === 'active');
  const completedTransfers = transfers.filter(t => t.status === 'completed');
  const failedTransfers = transfers.filter(t => t.status === 'failed');
  const totalProgress = transfers.length > 0 
    ? transfers.reduce((sum, t) => sum + (t.progress || 0), 0) / transfers.length 
    : 0;

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let speed = bytesPerSecond;
    let unitIndex = 0;
    
    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024;
      unitIndex++;
    }
    
    return `${speed.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  useEffect(() => {
    if (autoScroll && listRef.current) {
      const activeElement = listRef.current.querySelector('[data-status="active"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [transfers, autoScroll]);

  const toggleExpanded = (transferId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(transferId)) {
      newExpanded.delete(transferId);
    } else {
      newExpanded.add(transferId);
    }
    setExpandedItems(newExpanded);
  };

  const handleTransferAction = (transferId, action) => {
    onTransferAction?.(transferId, action);
  };

  const renderTransferIcon = (transfer) => {
    const iconMap = {
      upload: 'Upload',
      download: 'Download',
      copy: 'Copy',
      move: 'Move',
    };
    
    const statusColorMap = {
      pending: 'text-slate-400',
      active: 'text-blue-400',
      completed: 'text-green-400',
      failed: 'text-red-400',
      paused: 'text-orange-400',
      cancelled: 'text-slate-500',
    };

    return (
      <Icon 
        name={iconMap[transfer.type] || 'File'} 
        className={clsx(
          'w-5 h-5',
          statusColorMap[transfer.status]
        )} 
      />
    );
  };

  const renderTransferStatus = (transfer) => {
    const statusMap = {
      pending: { text: '等待中', color: 'text-slate-400' },
      active: { text: '传输中', color: 'text-blue-400' },
      completed: { text: '已完成', color: 'text-green-400' },
      failed: { text: '失败', color: 'text-red-400' },
      paused: { text: '已暂停', color: 'text-orange-400' },
      cancelled: { text: '已取消', color: 'text-slate-500' },
    };

    const status = statusMap[transfer.status] || statusMap.pending;

    return (
      <Badge 
        variant="secondary" 
        size="sm"
        className={status.color}
      >
        {status.text}
      </Badge>
    );
  };

  const renderTransferActions = (transfer) => {
    const canPause = transfer.status === 'active';
    const canResume = transfer.status === 'paused';
    const canCancel = transfer.status === 'active' || transfer.status === 'paused';
    const canRetry = transfer.status === 'failed';
    const canRemove = transfer.status === 'completed' || transfer.status === 'failed' || transfer.status === 'cancelled';

    return (
      <div className="flex items-center space-x-1">
        {canPause && (
          <Tooltip content="暂停">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTransferAction(transfer.id, 'pause')}
              className="h-6 w-6 p-0"
            >
              <Icon name="Pause" className="w-3 h-3" />
            </Button>
          </Tooltip>
        )}
        
        {canResume && (
          <Tooltip content="继续">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTransferAction(transfer.id, 'resume')}
              className="h-6 w-6 p-0"
            >
              <Icon name="Play" className="w-3 h-3" />
            </Button>
          </Tooltip>
        )}
        
        {canRetry && (
          <Tooltip content="重试">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTransferAction(transfer.id, 'retry')}
              className="h-6 w-6 p-0"
            >
              <Icon name="RefreshCw" className="w-3 h-3" />
            </Button>
          </Tooltip>
        )}
        
        {canCancel && (
          <Tooltip content="取消">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTransferAction(transfer.id, 'cancel')}
              className="h-6 w-6 p-0 text-red-400"
            >
              <Icon name="X" className="w-3 h-3" />
            </Button>
          </Tooltip>
        )}
        
        {canRemove && (
          <Tooltip content="移除">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTransferAction(transfer.id, 'remove')}
              className="h-6 w-6 p-0"
            >
              <Icon name="Trash2" className="w-3 h-3" />
            </Button>
          </Tooltip>
        )}
      </div>
    );
  };

  const renderTransferItem = (transfer) => {
    const isExpanded = expandedItems.has(transfer.id);
    const isActive = transfer.status === 'active';
    
    return (
      <div
        key={transfer.id}
        className={transferItemVariants({ status: transfer.status })}
        data-status={transfer.status}
      >
        {/* 基本信息 */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {renderTransferIcon(transfer)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-slate-300 truncate">
                {transfer.fileName}
              </span>
              {renderTransferStatus(transfer)}
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-slate-500">
              <span>{formatFileSize(transfer.totalBytes)}</span>
              {showSpeed && isActive && transfer.speed && (
                <span>{formatSpeed(transfer.speed)}</span>
              )}
              {showTime && isActive && transfer.eta && (
                <span>剩余 {formatTime(transfer.eta)}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {renderTransferActions(transfer)}
            
            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(transfer.id)}
                className="h-6 w-6 p-0"
              >
                <Icon 
                  name={isExpanded ? 'ChevronUp' : 'ChevronDown'} 
                  className="w-3 h-3" 
                />
              </Button>
            )}
          </div>
        </div>
        
        {/* 进度条 */}
        {isActive && (
          <div className="mt-2">
            <Progress
              value={transfer.progress || 0}
              className="h-1"
            />
          </div>
        )}
        
        {/* 详细信息 */}
        {isExpanded && showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-600 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>源路径:</span>
              <span className="font-mono truncate ml-2">{transfer.sourcePath}</span>
            </div>
            <div className="flex justify-between">
              <span>目标路径:</span>
              <span className="font-mono truncate ml-2">{transfer.targetPath}</span>
            </div>
            <div className="flex justify-between">
              <span>已传输:</span>
              <span>{formatFileSize(transfer.transferredBytes)} / {formatFileSize(transfer.totalBytes)}</span>
            </div>
            {transfer.error && (
              <div className="flex justify-between text-red-400">
                <span>错误:</span>
                <span className="ml-2">{transfer.error}</span>
              </div>
            )}
            {transfer.createdAt && (
              <div className="flex justify-between">
                <span>开始时间:</span>
                <span>{new Date(transfer.createdAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
      <Icon name="Inbox" className="w-12 h-12 mb-2" />
      <span>没有传输任务</span>
    </div>
  );

  const renderHeader = () => {
    if (transfers.length === 0) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-300">
            传输队列 ({transfers.length})
          </span>
          
          {activeTransfers.length > 0 && (
            <Badge variant="primary" size="sm">
              {activeTransfers.length} 进行中
            </Badge>
          )}
          
          {completedTransfers.length > 0 && (
            <Badge variant="success" size="sm">
              {completedTransfers.length} 已完成
            </Badge>
          )}
          
          {failedTransfers.length > 0 && (
            <Badge variant="danger" size="sm">
              {failedTransfers.length} 失败
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {completedTransfers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCompleted}
              className="text-xs"
            >
              清除已完成
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs"
          >
            清除全部
          </Button>
        </div>
      </div>
    );
  };

  const renderOverallProgress = () => {
    if (transfers.length === 0) return null;

    return (
      <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>总体进度</span>
          <span>{Math.round(totalProgress)}%</span>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={clsx(transferQueueVariants({ variant, size, className }))}
      {...props}
    >
      {renderHeader()}
      {renderOverallProgress()}
      
      <div 
        ref={listRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        {transfers.length === 0 ? (
          renderEmpty()
        ) : (
          <div>
            {transfers.map(renderTransferItem)}
          </div>
        )}
      </div>
    </div>
  );
});

TransferQueue.displayName = 'TransferQueue';

// 紧凑版传输队列
export const CompactTransferQueue = forwardRef((props, ref) => (
  <TransferQueue
    ref={ref}
    variant="compact"
    size="sm"
    showDetails={false}
    showSpeed={false}
    showTime={false}
    {...props}
  />
));

CompactTransferQueue.displayName = 'CompactTransferQueue';

// 最小版传输队列（仅显示状态）
export const MinimalTransferQueue = forwardRef((props, ref) => (
  <TransferQueue
    ref={ref}
    variant="minimal"
    size="sm"
    showDetails={false}
    showSpeed={false}
    showTime={false}
    maxHeight={200}
    {...props}
  />
));

MinimalTransferQueue.displayName = 'MinimalTransferQueue';
