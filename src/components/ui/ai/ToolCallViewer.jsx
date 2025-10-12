import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { StatusDot } from '../primitives/StatusDot';
import { Spinner } from '../primitives/Spinner';

/**
 * ToolCallViewer组件 - AI工具调用查看器组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {Array} props.toolCalls - 工具调用列表
 * @param {boolean} props.loading - 是否加载中
 * @param {boolean} props.collapsible - 是否可折叠
 * @param {boolean} props.defaultExpanded - 默认是否展开
 * @param {boolean} props.showTimestamp - 是否显示时间戳
 * @param {boolean} props.showDuration - 是否显示执行时长
 * @param {boolean} props.showStatus - 是否显示状态
 * @param {boolean} props.allowCancel - 是否允许取消
 * @param {boolean} props.allowRetry - 是否允许重试
 * @param {Function} props.onCancel - 取消回调
 * @param {Function} props.onRetry - 重试回调
 * @param {Function} props.onExpand - 展开回调
 * @param {Function} props.onCollapse - 折叠回调
 * @param {string} props.variant - 变体：default|compact|detailed
 */
export function ToolCallViewer({
  className = '',
  toolCalls = [],
  loading = false,
  collapsible = true,
  defaultExpanded = true,
  showTimestamp = true,
  showDuration = true,
  showStatus = true,
  allowCancel = true,
  allowRetry = true,
  onCancel,
  onRetry,
  onExpand,
  onCollapse,
  variant = 'default',
  ...props
}) {
  const [expandedCalls, setExpandedCalls] = useState(new Set());
  const [allExpanded, setAllExpanded] = useState(defaultExpanded);

  // 处理展开/折叠
  const toggleCallExpansion = (callId) => {
    const newExpanded = new Set(expandedCalls);
    if (newExpanded.has(callId)) {
      newExpanded.delete(callId);
    } else {
      newExpanded.add(callId);
    }
    setExpandedCalls(newExpanded);
  };

  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpandedCalls(new Set());
      setAllExpanded(false);
      onCollapse?.();
    } else {
      setExpandedCalls(new Set(toolCalls.map(call => call.id)));
      setAllExpanded(true);
      onExpand?.();
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // 格式化执行时长
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '--';
    
    const duration = endTime - startTime;
    if (duration < 1000) {
      return `${duration}ms`;
    } else {
      return `${(duration / 1000).toFixed(1)}s`;
    }
  };

  // 获取工具状态
  const getToolStatus = (toolCall) => {
    if (toolCall.error) return 'error';
    if (toolCall.cancelled) return 'disabled';
    if (toolCall.endTime) return 'success';
    if (toolCall.startTime) return 'loading';
    return 'offline';
  };

  // 获取工具图标
  const getToolIcon = (toolName) => {
    const iconMap = {
      'terminal': 'Terminal',
      'file_upload': 'Upload',
      'file_download': 'Download',
      'file_read': 'FileText',
      'file_write': 'Edit',
      'file_delete': 'Trash2',
      'directory_list': 'Folder',
      'command_execute': 'Terminal',
      'search': 'Search',
      'system_info': 'Cpu',
      'network_test': 'Wifi',
      'process_list': 'List',
    };

    return iconMap[toolName] || 'Tool';
  };

  // 渲染工具参数
  const renderToolParams = (params) => {
    if (!params || typeof params !== 'object') return null;

    return (
      <div className="space-y-2">
        {Object.entries(params).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="text-xs text-gray-500 font-mono min-w-20">
              {key}:
            </span>
            <div className="flex-1">
              {typeof value === 'string' && value.length > 100 ? (
                <details className="text-xs text-gray-300">
                  <summary className="cursor-pointer hover:text-gray-200">
                    {value.substring(0, 100)}...
                  </summary>
                  <pre className="whitespace-pre-wrap bg-gray-800/50 p-2 rounded mt-1">
                    {value}
                  </pre>
                </details>
              ) : (
                <span className="text-xs text-gray-300 font-mono break-all">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染工具结果
  const renderToolResult = (result) => {
    if (!result) return null;

    return (
      <div className="mt-3 p-3 bg-gray-800/50 rounded">
        <div className="text-xs text-gray-400 mb-2">执行结果:</div>
        <div className="text-xs text-gray-300">
          {typeof result === 'string' ? (
            <pre className="whitespace-pre-wrap">{result}</pre>
          ) : (
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      </div>
    );
  };

  // 渲染工具错误
  const renderToolError = (error) => {
    if (!error) return null;

    return (
      <div className="mt-3 p-3 bg-red-900/20 border border-red-700/50 rounded">
        <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
          <Icon name="AlertCircle" size="xs" />
          执行错误:
        </div>
        <div className="text-xs text-red-300">
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      </div>
    );
  };

  // 渲染单个工具调用
  const renderToolCall = (toolCall) => {
    const isExpanded = expandedCalls.has(toolCall.id);
    const status = getToolStatus(toolCall);
    const canExpand = toolCall.params || toolCall.result || toolCall.error;

    return (
      <div
        key={toolCall.id}
        className="border border-gray-700 rounded-lg overflow-hidden"
      >
        {/* 工具调用头部 */}
        <div
          className={clsx(
            'flex items-center gap-3 p-3 cursor-pointer transition-colors',
            'hover:bg-gray-800/50'
          )}
          onClick={() => canExpand && toggleCallExpansion(toolCall.id)}
        >
          {/* 状态指示器 */}
          {showStatus && (
            <StatusDot
              status={status}
              size="sm"
              pulse={status === 'loading'}
            />
          )}

          {/* 工具图标和名称 */}
          <div className="flex items-center gap-2 flex-1">
            <Icon name={getToolIcon(toolCall.tool)} size="sm" color="muted" />
            <div>
              <div className="text-sm font-medium text-gray-100">
                {toolCall.tool}
              </div>
              {toolCall.description && (
                <div className="text-xs text-gray-500">
                  {toolCall.description}
                </div>
              )}
            </div>
          </div>

          {/* 时间和时长 */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {showTimestamp && toolCall.startTime && (
              <span>{formatTimestamp(toolCall.startTime)}</span>
            )}
            {showDuration && toolCall.startTime && (
              <span>
                {formatDuration(toolCall.startTime, toolCall.endTime)}
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            {status === 'loading' && allowCancel && (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel?.(toolCall);
                }}
                title="取消"
              >
                <Icon name="X" size="xs" />
              </Button>
            )}
            
            {status === 'error' && allowRetry && (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry?.(toolCall);
                }}
                title="重试"
              >
                <Icon name="RefreshCw" size="xs" />
              </Button>
            )}

            {canExpand && (
              <Icon
                name={isExpanded ? 'ChevronDown' : 'ChevronRight'}
                size="sm"
                color="muted"
                className={clsx(
                  'transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </div>
        </div>

        {/* 工具调用详情 */}
        {isExpanded && (
          <div className="border-t border-gray-700 p-3 space-y-3">
            {/* 工具参数 */}
            {toolCall.params && (
              <div>
                <div className="text-xs text-gray-400 mb-2">调用参数:</div>
                {renderToolParams(toolCall.params)}
              </div>
            )}

            {/* 工具结果 */}
            {renderToolResult(toolCall.result)}

            {/* 工具错误 */}
            {renderToolError(toolCall.error)}
          </div>
        )}
      </div>
    );
  };

  // 获取容器样式
  const containerClasses = clsx(
    'bg-gray-900 border border-gray-700 rounded-lg',
    className
  );

  // 获取内容样式
  const contentClasses = clsx(
    'divide-y divide-gray-700',
    {
      'p-3': variant === 'compact',
      'p-4': variant === 'default',
      'p-6': variant === 'detailed',
    }
  );

  if (toolCalls.length === 0 && !loading) {
    return (
      <div className={containerClasses} {...props}>
        <div className="p-6 text-center text-gray-500">
          <Icon name="Tool" size="lg" className="mx-auto mb-2" />
          <p>暂无工具调用</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} {...props}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Icon name="Tool" size="sm" color="muted" />
          <h3 className="text-sm font-medium text-gray-100">
            AI工具调用 ({toolCalls.length})
          </h3>
          {loading && <Spinner size="sm" />}
        </div>

        {collapsible && toolCalls.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            onClick={toggleAllExpanded}
          >
            <Icon name={allExpanded ? 'ChevronUp' : 'ChevronDown'} size="sm" />
            {allExpanded ? '收起全部' : '展开全部'}
          </Button>
        )}
      </div>

      {/* 工具调用列表 */}
      <div className={contentClasses}>
        {toolCalls.map(renderToolCall)}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Spinner size="sm" />
            <span>正在执行工具调用...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 预设组件
export const CompactToolCallViewer = (props) => (
  <ToolCallViewer
    variant="compact"
    showTimestamp={false}
    showDuration={false}
    collapsible={false}
    {...props}
  />
);

export const DetailedToolCallViewer = (props) => (
  <ToolCallViewer
    variant="detailed"
    showTimestamp={true}
    showDuration={true}
    showStatus={true}
    defaultExpanded={true}
    {...props}
  />
);

export default ToolCallViewer;
