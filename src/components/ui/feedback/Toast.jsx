import React, { useState, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';

/**
 * Toast组件 - Toast/通知组件
 */
export function Toast({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  persistent = false,
  action,
  onClose,
  className = '',
  ...props
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  const toastTypes = {
    success: {
      icon: 'CheckCircle',
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700'
    },
    error: {
      icon: 'XCircle',
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700'
    },
    warning: {
      icon: 'AlertTriangle',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700'
    },
    info: {
      icon: 'Info',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700'
    }
  };

  const config = toastTypes[type] || toastTypes.info;

  // 自动关闭
  useEffect(() => {
    if (persistent) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    // 进度条动画
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100));
        return newProgress > 0 ? newProgress : 0;
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [duration, persistent]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onClose?.(id);
    }, 300);
  };

  const handleAction = () => {
    action?.onClick?.();
    handleClose();
  };

  if (!visible) return null;

  return (
    <div
      className={clsx(
        'transform transition-all duration-300 ease-in-out',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        'max-w-sm w-full shadow-lg rounded-lg border',
        config.bgColor,
        config.borderColor,
        className
      )}
      {...props}
    >
      <div className="p-4">
        <div className="flex items-start">
          {/* 图标 */}
          <div className="flex-shrink-0">
            <Icon name={config.icon} size="md" className={config.color} />
          </div>

          {/* 内容 */}
          <div className="ml-3 flex-1">
            {title && (
              <h4 className="text-sm font-medium text-gray-100">
                {title}
              </h4>
            )}
            {message && (
              <p className={clsx(
                'text-sm text-gray-300',
                title && 'mt-1'
              )}>
                {message}
              </p>
            )}

            {/* 操作按钮 */}
            {action && (
              <button
                onClick={handleAction}
                className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:underline"
              >
                {action.label}
              </button>
            )}
          </div>

          {/* 关闭按钮 */}
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-gray-400 hover:text-gray-300 focus:outline-none focus:text-gray-300"
              aria-label="关闭通知"
            >
              <Icon name="X" size="sm" />
            </button>
          </div>
        </div>

        {/* 进度条 */}
        {!persistent && (
          <div className="mt-3">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ToastContainer组件 - Toast容器组件
 */
export function ToastContainer({
  toasts = [],
  position = 'top-right',
  maxToasts = 5,
  onRemove,
  className = '',
  ...props
}) {
  const positions = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const positionClass = positions[position] || positions['top-right'];

  return (
    <div
      className={clsx(
        'fixed z-50 space-y-2 pointer-events-none',
        positionClass,
        className
      )}
      {...props}
    >
      {toasts.slice(0, maxToasts).map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            {...toast}
            onClose={onRemove}
          />
        </div>
      ))}
    </div>
  );
}

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (options) => {
    const id = Date.now().toString();
    const toast = { id, ...options };
    
    setToasts(prev => [...prev, toast]);
    
    if (!options.persistent) {
      setTimeout(() => {
        removeToast(id);
      }, options.duration || 5000);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // 便捷方法
  const success = (message, options = {}) => addToast({ type: 'success', message, ...options });
  const error = (message, options = {}) => addToast({ type: 'error', message, ...options });
  const warning = (message, options = {}) => addToast({ type: 'warning', message, ...options });
  const info = (message, options = {}) => addToast({ type: 'info', message, ...options });

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };
};

// 预设组件
export const SuccessToast = (props) => <Toast type="success" {...props} />;
export const ErrorToast = (props) => <Toast type="error" {...props} />;
export const WarningToast = (props) => <Toast type="warning" {...props} />;
export const InfoToast = (props) => <Toast type="info" {...props} />;

export default Toast;
