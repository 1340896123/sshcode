import React, { useState, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Progress } from '../primitives/Progress';
import { StatusDot } from '../primitives/Tag';

/**
 * ServerHealthCard组件 - 服务器健康卡片组件
 */
export function ServerHealthCard({
  serverId = '',
  serverName = '',
  metrics = {},
  onRefresh,
  showDetails = false,
  compact = false,
  className = '',
  ...props
}) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [refreshing, setRefreshing] = useState(false);

  const defaultMetrics = {
    cpu: { usage: 0, cores: 4, temperature: 45 },
    memory: { used: 0, total: 8192, percentage: 0 },
    disk: { used: 0, total: 1024, percentage: 0 },
    network: { upload: 0, download: 0, latency: 0 },
    uptime: 0,
    loadAverage: [0, 0, 0],
    processes: 0
  };

  const healthMetrics = { ...defaultMetrics, ...metrics };

  useEffect(() => {
    // 模拟数据更新
    const interval = setInterval(() => {
      if (onRefresh && !refreshing) {
        handleRefresh();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onRefresh, refreshing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const getHealthStatus = () => {
    const { cpu, memory, disk } = healthMetrics;
    
    if (cpu.usage > 90 || memory.percentage > 90 || disk.percentage > 95) {
      return { status: 'critical', text: '危险', color: 'error' };
    } else if (cpu.usage > 70 || memory.percentage > 70 || disk.percentage > 80) {
      return { status: 'warning', text: '警告', color: 'warning' };
    } else {
      return { status: 'healthy', text: '健康', color: 'success' };
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const healthStatus = getHealthStatus();

  if (compact) {
    return (
      <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg p-3', className)} {...props}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusDot status={healthStatus.color} size="sm" pulse={healthStatus.status === 'healthy'} />
            <span className="text-sm font-medium text-gray-100">{serverName}</span>
          </div>
          <Button size="xs" variant="ghost" onClick={handleRefresh} disabled={refreshing}>
            <Icon name="RefreshCw" size="xs" className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-gray-500">CPU</div>
            <div className="text-gray-300">{healthMetrics.cpu.usage}%</div>
          </div>
          <div>
            <div className="text-gray-500">内存</div>
            <div className="text-gray-300">{healthMetrics.memory.percentage}%</div>
          </div>
          <div>
            <div className="text-gray-500">磁盘</div>
            <div className="text-gray-300">{healthMetrics.disk.percentage}%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg', className)} {...props}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <StatusDot status={healthStatus.color} size="md" pulse={healthStatus.status === 'healthy'} />
          <div>
            <h3 className="text-sm font-medium text-gray-100">{serverName}</h3>
            <div className="text-xs text-gray-500">状态: {healthStatus.text}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="xs" variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size="xs" />
          </Button>
          <Button size="xs" variant="ghost" onClick={handleRefresh} disabled={refreshing}>
            <Icon name="RefreshCw" size="xs" className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* 基础指标 */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">CPU</span>
              <span className="text-xs text-gray-300">{healthMetrics.cpu.usage}%</span>
            </div>
            <Progress value={healthMetrics.cpu.usage} size="sm" />
            <div className="text-xs text-gray-600 mt-1">
              {healthMetrics.cpu.cores} 核心 • {healthMetrics.cpu.temperature}°C
            </div>
          </div>

          {/* 内存 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">内存</span>
              <span className="text-xs text-gray-300">{healthMetrics.memory.percentage}%</span>
            </div>
            <Progress value={healthMetrics.memory.percentage} size="sm" />
            <div className="text-xs text-gray-600 mt-1">
              {formatBytes(healthMetrics.memory.used)} / {formatBytes(healthMetrics.memory.total)}
            </div>
          </div>

          {/* 磁盘 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">磁盘</span>
              <span className="text-xs text-gray-300">{healthMetrics.disk.percentage}%</span>
            </div>
            <Progress value={healthMetrics.disk.percentage} size="sm" />
            <div className="text-xs text-gray-600 mt-1">
              {formatBytes(healthMetrics.disk.used)} / {formatBytes(healthMetrics.disk.total)}
            </div>
          </div>
        </div>

        {/* 网络和系统信息 */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-500 mb-1">网络</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Icon name="Upload" size="xs" />
                <span className="text-gray-300">{formatBytes(healthMetrics.network.upload)}/s</span>
              </div>
              <div className="flex items-center gap-1">
                <Icon name="Download" size="xs" />
                <span className="text-gray-300">{formatBytes(healthMetrics.network.download)}/s</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-gray-500 mb-1">系统</div>
            <div className="text-gray-300">
              运行时间: {formatUptime(healthMetrics.uptime)} • 
              负载: {healthMetrics.loadAverage[0].toFixed(2)}
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        {isExpanded && (
          <div className="pt-3 border-t border-gray-700 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-500">负载平均值</div>
                <div className="text-gray-300">
                  1分钟: {healthMetrics.loadAverage[0].toFixed(2)} • 
                  5分钟: {healthMetrics.loadAverage[1].toFixed(2)} • 
                  15分钟: {healthMetrics.loadAverage[2].toFixed(2)}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">进程数</div>
                <div className="text-gray-300">{healthMetrics.processes} 个运行进程</div>
              </div>
              
              <div>
                <div className="text-gray-500">网络延迟</div>
                <div className="text-gray-300">{healthMetrics.network.latency} ms</div>
              </div>
              
              <div>
                <div className="text-gray-500">最后更新</div>
                <div className="text-gray-300">{new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 预设组件
export const CompactServerHealthCard = (props) => (
  <ServerHealthCard compact={true} {...props} />
);

export const DetailedServerHealthCard = (props) => (
  <ServerHealthCard showDetails={true} {...props} />
);

export default ServerHealthCard;
