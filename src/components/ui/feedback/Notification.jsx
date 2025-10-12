import React, { useState, useEffect } from 'react';
import Button from '../primitives/Button';

/**
 * 通知组件
 * @param {Object} props - 组件属性
 * @param {Object} props.notification - 通知对象
 * @param {string|number} props.notification.id - 通知ID
 * @param {string} props.notification.message - 通知消息
 * @param {string} props.notification.type - 通知类型: 'success' | 'error' | 'warning' | 'info'
 * @param {number} props.notification.duration - 显示时长（毫秒），0表示不自动关闭
 * @param {boolean} props.notification.closable - 是否可手动关闭
 * @param {function} props.onClose - 关闭通知回调函数
 * @param {function} props.onClick - 点击通知回调函数（可选）
 * @param {string} props.className - 额外的CSS类名
 */
function Notification({
  notification,
  onClose,
  onClick,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose(notification.id);
      }
    }, 300); // 与CSS动画时长匹配
  };

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
  };

  const getTypeClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-[#4ec9b0] text-white';
      case 'error':
        return 'bg-[#d16969] text-white';
      case 'warning':
        return 'bg-[#dcdcaa] text-black';
      case 'info':
        return 'bg-[#007acc] text-white';
      default:
        return 'bg-[#3e3e42] text-white';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed top-5 right-5 px-4 py-3 rounded text-sm z-[10000] 
        max-w-[300px] break-words shadow-lg cursor-pointer
        transition-all duration-300 transform
        ${getTypeClasses()}
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${onClick ? 'hover:scale-105' : ''}
        ${className}
      `}
      onClick={handleClick}
      style={{
        animation: !isLeaving ? 'slideIn 0.3s ease' : 'slideOut 0.3s ease'
      }}
    >
      <div className="flex items-start gap-2">
        {/* 图标 */}
        <span className="flex-shrink-0 text-base font-bold">
          {getIcon()}
        </span>

        {/* 消息内容 */}
        <div className="flex-1 min-w-0">
          <div className="break-words">
            {notification.message}
          </div>
        </div>

        {/* 关闭按钮 */}
        {notification.closable !== false && (
          <Button
            variant="small"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="flex-shrink-0 ml-2"
            title="关闭通知"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 通知容器组件
 * @param {Object} props - 组件属性
 * @param {Array} props.notifications - 通知数组
 * @param {function} props.onClose - 关闭通知回调函数
 * @param {function} props.onClick - 点击通知回调函数（可选）
 * @param {number} props.maxCount - 最大显示通知数量
 * @param {string} props.className - 额外的CSS类名
 */
function NotificationContainer({
  notifications,
  onClose,
  onClick,
  maxCount = 5,
  className = ''
}) {
  // 只显示最新的maxCount个通知
  const visibleNotifications = notifications.slice(-maxCount);

  return (
    <div className={`notification-container ${className}`}>
      {visibleNotifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={onClose}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

/**
 * 通知Hook
 * @returns {Object} 通知相关的状态和方法
 */
function useNotification() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      duration: 3000, // 默认3秒自动关闭
      closable: true,
      ...options
    };

    setNotifications(prev => [...prev, notification]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // 便捷方法
  const success = (message, options) => addNotification(message, 'success', options);
  const error = (message, options) => addNotification(message, 'error', options);
  const warning = (message, options) => addNotification(message, 'warning', options);
  const info = (message, options) => addNotification(message, 'info', options);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info
  };
}

export { useNotification };
export default NotificationContainer;
