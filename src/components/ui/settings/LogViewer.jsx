import React, { useState, useEffect, useRef } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Select } from '../primitives/Select';

/**
 * LogViewer组件 - 日志与诊断查看器组件
 */
export function LogViewer({
  logs = [],
  onClear,
  onExport,
  onRefresh,
  autoScroll = true,
  maxHeight = 400,
  className = '',
  ...props
}) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const logContainerRef = useRef(null);

  const logLevels = [
    { value: 'all', label: '全部', color: 'text-gray-400' },
    { value: 'error', label: '错误', color: 'text-red-400' },
    { value: 'warning', label: '警告', color: 'text-yellow-400' },
    { value: 'info', label: '信息', color: 'text-blue-400' },
    { value: 'debug', label: '调试', color: 'text-gray-500' }
  ];

  // 模拟日志数据
  const sampleLogs = [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      level: 'info',
      source: 'connection',
      message: 'SSH连接已建立',
      details: { host: '192.168.1.100', user: 'admin' }
    },
    {
      id: 2,
      timestamp: new Date().toISOString(),
      level: 'warning',
      source: 'ai',
      message: 'AI响应时间较长',
      details: { duration: '5.2s', model: 'gpt-4' }
    },
    {
      id: 3,
      timestamp: new Date().toISOString(),
      level: 'error',
      source: 'file',
      message: '文件上传失败',
      details: { file: 'config.txt', error: 'Permission denied' }
    },
    {
      id: 4,
      timestamp: new Date().toISOString(),
      level: 'debug',
      source: 'terminal',
      message: '命令执行完成',
      details: { command: 'ls -la', exitCode: 0 }
    }
  ];

  const displayLogs = logs.length > 0 ? logs : sampleLogs;

  const filteredLogs = displayLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  useEffect(() => {
    if (autoScroll && !isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll, isPaused]);

  const getLevelColor = (level) => {
    const levelConfig = logLevels.find(l => l.value === level);
    return levelConfig ? levelConfig.color : 'text-gray-400';
  };

  const getSourceIcon = (source) => {
    const iconMap = {
      connection: 'Wifi',
      ai: 'Bot',
      file: 'FileText',
      terminal: 'Terminal',
      system: 'Settings'
    };
    return iconMap[source] || 'Info';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleExport = () => {
    const logText = filteredLogs.map(log => 
      `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ssh-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    onExport?.();
  };

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg', className)} {...props}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Icon name="FileText" size="sm" />
          <h3 className="text-sm font-medium text-gray-100">日志与诊断</h3>
          <span className="text-xs text-gray-500">({filteredLogs.length} 条记录)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant={isPaused ? 'solid' : 'ghost'}
            onClick={() => setIsPaused(!isPaused)}
          >
            <Icon name={isPaused ? 'Play' : 'Pause'} size="xs" />
          </Button>
          <Button size="xs" variant="ghost" onClick={onRefresh}>
            <Icon name="RefreshCw" size="xs" />
          </Button>
          <Button size="xs" variant="ghost" onClick={handleExport}>
            <Icon name="Download" size="xs" />
          </Button>
          <Button size="xs" variant="ghost" onClick={onClear}>
            <Icon name="Trash2" size="xs" />
          </Button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-700">
        <Select
          value={filter}
          onChange={setFilter}
          options={logLevels}
          size="sm"
          className="w-24"
        />
        
        <div className="flex-1 relative">
          <Icon name="Search" size="xs" className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索日志..."
            className="w-full pl-8 pr-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 日志内容 */}
      <div
        ref={logContainerRef}
        className="overflow-y-auto font-mono text-xs"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <Icon name="Inbox" size="lg" />
              <div className="mt-2">暂无日志记录</div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-2 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-2">
                  <Icon 
                    name={getSourceIcon(log.source)} 
                    size="xs" 
                    className="mt-0.5 text-gray-500" 
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className={clsx('font-medium', getLevelColor(log.level))}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-gray-400">
                        [{log.source}]
                      </span>
                    </div>
                    
                    <div className="text-gray-300 mt-1">
                      {log.message}
                    </div>
                    
                    {log.details && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-400">
                          详细信息
                        </summary>
                        <pre className="mt-1 text-gray-600 text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between p-2 border-t border-gray-700 text-xs text-gray-500">
        <div>
          {isPaused && <span className="text-yellow-400">已暂停</span>}
          {!isPaused && <span>实时更新</span>}
        </div>
        <div>
          显示 {filteredLogs.length} / {displayLogs.length} 条记录
        </div>
      </div>
    </div>
  );
}

export default LogViewer;
