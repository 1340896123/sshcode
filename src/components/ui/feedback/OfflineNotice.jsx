import React, { useState, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * OfflineNotice组件 - 离线提示组件
 */
export function OfflineNotice({
  showWhenOnline = false,
  showRetryButton = true,
  retryInterval = 5000,
  autoRetry = true,
  onRetry,
  onOnline,
  onOffline,
  className = '',
  ...props
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryTime, setLastRetryTime] = useState(null);

  // 检查网络状态
  const checkNetworkStatus = async () => {
    try {
      // 尝试发送一个简单的请求来检查网络连接
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 3000
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // 手动重试
  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setLastRetryTime(Date.now());
    
    try {
      const isNetworkOnline = await checkNetworkStatus();
      
      if (isNetworkOnline) {
        setIsOnline(true);
        onRetry?.(true);
        setRetryCount(0);
      } else {
        onRetry?.(false);
      }
    } catch (error) {
      onRetry?.(false);
    } finally {
      setIsRetrying(false);
    }
  };

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0);
      onOnline?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
      onOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);

  // 自动重试
  useEffect(() => {
    if (!autoRetry || isOnline || !isRetrying) return;

    const interval = setInterval(() => {
      handleRetry();
    }, retryInterval);

    return () => clearInterval(interval);
  }, [autoRetry, isOnline, isRetrying, retryInterval]);

  // 决定是否显示
  const shouldShow = showWhenOnline ? true : !isOnline;

  if (!shouldShow) return null;

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 right-0 z-50',
        isOnline 
          ? 'bg-green-600/10 border border-green-600/30 text-green-300'
          : 'bg-red-600/10 border border-red-600/30 text-red-300',
        'px-4 py-3',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 网络状态图标 */}
          <Icon 
            name={isOnline ? 'Wifi' : 'WifiOff'} 
            size="md" 
            className={isOnline ? 'text-green-400' : 'text-red-400'} 
          />
          
          {/* 状态信息 */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {isOnline ? '网络已连接' : '网络连接断开'}
              </span>
              
              {!isOnline && retryCount > 0 && (
                <span className="text-xs text-red-400/60">
                  (已重试 {retryCount} 次)
                </span>
              )}
            </div>
            
            {!isOnline && (
              <p className="text-sm text-red-400/80">
                请检查您的网络连接，或点击重试按钮重新连接
              </p>
            )}
            
            {isOnline && (
              <p className="text-sm text-green-400/80">
                网络连接已恢复正常
              </p>
            )}
            
            {/* 最后重试时间 */}
            {!isOnline && lastRetryTime && (
              <p className="text-xs text-red-400/60 mt-1">
                最后重试时间: {new Date(lastRetryTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {!isOnline && showRetryButton && (
            <Button
              onClick={handleRetry}
              size="sm"
              variant="solid"
              color={isOnline ? 'green' : 'red'}
              icon={isRetrying ? 'Loader2' : 'RefreshCw'}
              disabled={isRetrying}
            >
              {isRetrying ? '重试中...' : '重试'}
            </Button>
          )}
          
          {isOnline && (
            <Button
              size="sm"
              variant="ghost"
              color="green"
              icon="X"
              onClick={() => {/* 可以添加关闭逻辑 */}}
            />
          )}
        </div>
      </div>

      {/* 重试进度指示器 */}
      {!isOnline && autoRetry && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-xs text-red-400/60">
            <Icon name="Clock" size="xs" />
            <span>自动重试中...</span>
            {isRetrying && <Icon name="Loader2" size="xs" className="animate-spin" />}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * NetworkStatusIndicator组件 - 网络状态指示器
 */
export function NetworkStatusIndicator({
  showText = false,
  position = 'top-right',
  className = '',
  ...props
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const positionClasses = {
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4'
  };

  const positionClass = positionClasses[position] || positionClasses['top-right'];

  return (
    <div
      className={clsx(
        positionClass,
        'flex items-center gap-2 px-3 py-2 rounded-lg border',
        isOnline 
          ? 'bg-green-600/10 border-green-600/30 text-green-300'
          : 'bg-red-600/10 border-red-600/30 text-red-400',
        className
      )}
      {...props}
    >
      <Icon 
        name={isOnline ? 'Wifi' : 'WifiOff'} 
        size="sm" 
        className={isOnline ? 'text-green-400' : 'text-red-400'} 
      />
      {showText && (
        <span className="text-sm font-medium">
          {isOnline ? '在线' : '离线'}
        </span>
      )}
    </div>
  );
}

/**
 * PersistentOfflineNotice组件 - 持久化离线提示
 */
export function PersistentOfflineNotice(props) {
  return (
    <OfflineNotice
      autoRetry={true}
      retryInterval={10000}
      showRetryButton={true}
      {...props}
    />
  );
}

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const updateConnectionType = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateConnectionType);
      updateConnectionType();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  return {
    isOnline,
    connectionType,
    isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g'
  };
};

export default OfflineNotice;
