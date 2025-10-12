import React, { useState, useEffect } from 'react';
import { clsx } from '../utils/clsx';

/**
 * LoadingBar组件 - 全局LoadingBar组件
 */
export function LoadingBar({
  loading = false,
  progress = 0,
  duration = 2000,
  color = 'blue',
  height = 'h-1',
  position = 'top',
  showPercentage = false,
  className = '',
  ...props
}) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500'
  };

  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    fixed: 'fixed top-0 left-0 right-0 z-50'
  };

  // 动画进度
  useEffect(() => {
    if (loading) {
      setIsVisible(true);
      
      // 自动递增进度
      const interval = setInterval(() => {
        setAnimatedProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      // 完成进度
      setAnimatedProgress(100);
      
      // 隐藏进度条
      setTimeout(() => {
        setIsVisible(false);
        setAnimatedProgress(0);
      }, 300);
    }
  }, [loading]);

  // 手动控制进度
  useEffect(() => {
    if (progress > 0) {
      setAnimatedProgress(progress);
    }
  }, [progress]);

  const currentProgress = progress > 0 ? progress : animatedProgress;
  const colorClass = colorClasses[color] || colorClasses.blue;
  const positionClass = positionClasses[position] || positionClasses.top;

  if (!isVisible && currentProgress === 0) return null;

  return (
    <div
      className={clsx(
        positionClass,
        position === 'fixed' && 'z-50',
        className
      )}
      {...props}
    >
      {/* 进度条背景 */}
      <div className={clsx('w-full bg-gray-700', height)}>
        {/* 进度条 */}
        <div
          className={clsx(
            'transition-all duration-300 ease-out',
            colorClass,
            height
          )}
          style={{ width: `${currentProgress}%` }}
        />
      </div>

      {/* 百分比显示 */}
      {showPercentage && (
        <div className="absolute top-1 right-2 text-xs text-gray-400">
          {Math.round(currentProgress)}%
        </div>
      )}
    </div>
  );
}

/**
 * GlobalLoadingBar组件 - 全局LoadingBar管理器
 */
export function GlobalLoadingBar() {
  const [loadingStates, setLoadingStates] = useState({});

  const startLoading = (key = 'default', options = {}) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { loading: true, ...options }
    }));
  };

  const stopLoading = (key = 'default') => {
    setLoadingStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  };

  const setProgress = (key = 'default', progress) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { ...prev[key], progress }
    }));
  };

  const isLoading = Object.keys(loadingStates).length > 0;
  const activeLoading = Object.values(loadingStates)[0];

  return (
    <>
      <LoadingBar
        loading={isLoading}
        progress={activeLoading?.progress}
        duration={activeLoading?.duration}
        color={activeLoading?.color}
        position="fixed"
      />
      
      {/* Hook for external usage */}
      <LoadingBarProvider
        startLoading={startLoading}
        stopLoading={stopLoading}
        setProgress={setProgress}
        loadingStates={loadingStates}
      />
    </>
  );
}

// Context for global loading bar management
const LoadingBarContext = React.createContext({
  startLoading: () => {},
  stopLoading: () => {},
  setProgress: () => {},
  isLoading: false
});

/**
 * LoadingBarProvider组件 - LoadingBar上下文提供者
 */
export function LoadingBarProvider({ 
  startLoading, 
  stopLoading, 
  setProgress, 
  loadingStates,
  children 
}) {
  const value = {
    startLoading,
    stopLoading,
    setProgress,
    isLoading: Object.keys(loadingStates).length > 0
  };

  return (
    <LoadingBarContext.Provider value={value}>
      {children}
    </LoadingBarContext.Provider>
  );
}

// Hook for using global loading bar
export const useLoadingBar = () => {
  const context = React.useContext(LoadingBarContext);
  if (!context) {
    throw new Error('useLoadingBar must be used within a LoadingBarProvider');
  }
  return context;
};

// 预设组件
export const TopLoadingBar = (props) => (
  <LoadingBar position="top" {...props} />
);

export const BottomLoadingBar = (props) => (
  <LoadingBar position="bottom" {...props} />
);

export const FixedLoadingBar = (props) => (
  <LoadingBar position="fixed" {...props} />
);

export const BlueLoadingBar = (props) => (
  <LoadingBar color="blue" {...props} />
);

export const GreenLoadingBar = (props) => (
  <LoadingBar color="green" {...props} />
);

export const RedLoadingBar = (props) => (
  <LoadingBar color="red" {...props} />
);

// 便捷Hook
export const useAsyncLoading = () => {
  const { startLoading, stopLoading, setProgress } = useLoadingBar();

  const runAsync = async (asyncFn, options = {}) => {
    const { key = 'default', onProgress } = options;
    
    try {
      startLoading(key, options);
      
      if (onProgress) {
        const result = await asyncFn((progress) => {
          setProgress(key, progress);
          onProgress(progress);
        });
        return result;
      } else {
        const result = await asyncFn();
        return result;
      }
    } finally {
      stopLoading(key);
    }
  };

  return { runAsync };
};

export default LoadingBar;
