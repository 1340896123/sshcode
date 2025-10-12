import React, { useState, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * UpdateBanner组件 - 更新提示组件
 */
export function UpdateBanner({
  version = '1.0.0',
  updateVersion = '1.1.0',
  updateInfo = '',
  autoCheck = true,
  checkInterval = 60000, // 1分钟
  showDismiss = true,
  showProgress = false,
  onUpdate,
  onDismiss,
  className = '',
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [hasUpdate, setHasUpdate] = useState(false);

  // 检查更新
  const checkForUpdates = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    
    try {
      // 模拟检查更新
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 这里应该调用实际的更新检查API
      const hasNewUpdate = await mockCheckUpdate();
      setHasUpdate(hasNewUpdate);
      setIsVisible(hasNewUpdate);
    } catch (error) {
      console.error('检查更新失败:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // 模拟更新检查
  const mockCheckUpdate = async () => {
    // 简单的版本比较逻辑
    const currentVersion = version.split('.').map(Number);
    const newVersion = updateVersion.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (newVersion[i] > currentVersion[i]) return true;
      if (newVersion[i] < currentVersion[i]) return false;
    }
    
    return false;
  };

  // 执行更新
  const handleUpdate = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    setUpdateProgress(0);
    
    try {
      // 模拟更新过程
      for (let i = 0; i <= 100; i += 10) {
        setUpdateProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      onUpdate?.();
      setIsVisible(false);
      
      // 刷新页面以应用更新
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('更新失败:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 关闭横幅
  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // 自动检查更新
  useEffect(() => {
    if (!autoCheck) return;
    
    checkForUpdates();
    
    const interval = setInterval(checkForUpdates, checkInterval);
    return () => clearInterval(interval);
  }, [autoCheck, checkInterval]);

  if (!isVisible) return null;

  return (
    <div
      className={clsx(
        'bg-blue-600/10 border border-blue-600/30 text-blue-300 px-4 py-3',
        'flex items-center justify-between',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {/* 更新图标 */}
        <Icon name="DownloadCloud" size="md" className="text-blue-400" />
        
        {/* 更新信息 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-300">
              发现新版本 {updateVersion}
            </span>
            <span className="text-xs text-blue-500">
              (当前版本: {version})
            </span>
          </div>
          
          {updateInfo && (
            <p className="text-sm text-blue-400/80 mt-1">
              {updateInfo}
            </p>
          )}
          
          {/* 更新进度 */}
          {isUpdating && showProgress && (
            <div className="mt-2 w-48">
              <div className="bg-blue-900/30 rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${updateProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-400/60 mt-1">
                更新中... {updateProgress}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {!isUpdating ? (
          <>
            <Button
              onClick={handleUpdate}
              size="sm"
              variant="solid"
              color="blue"
              icon="Download"
            >
              立即更新
            </Button>
            
            {showDismiss && (
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                color="blue"
                icon="X"
              />
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="solid"
            color="blue"
            icon="Loader2"
            disabled
          >
            更新中...
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * AutoUpdateBanner组件 - 自动更新横幅
 */
export function AutoUpdateBanner(props) {
  return (
    <UpdateBanner
      autoCheck={true}
      checkInterval={300000} // 5分钟
      showProgress={true}
      {...props}
    />
  );
}

/**
 * SilentUpdateBanner组件 - 静默更新横幅
 */
export function SilentUpdateBanner(props) {
  return (
    <UpdateBanner
      autoCheck={true}
      checkInterval={600000} // 10分钟
      showDismiss={true}
      {...props}
    />
  );
}

// Hook for update management
export const useUpdateManager = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // 实际的更新检查逻辑
      const response = await fetch('/api/check-updates');
      const data = await response.json();
      setUpdateInfo(data);
      return data;
    } catch (error) {
      console.error('检查更新失败:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  const performUpdate = async () => {
    setIsUpdating(true);
    try {
      // 实际的更新逻辑
      await fetch('/api/perform-update', { method: 'POST' });
      window.location.reload();
    } catch (error) {
      console.error('更新失败:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateInfo,
    isChecking,
    isUpdating,
    checkForUpdates,
    performUpdate
  };
};

export default UpdateBanner;
