import React from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';

const statusDotVariants = cva(
  'inline-flex items-center justify-center rounded-full relative',
  {
    variants: {
      size: {
        xs: 'w-2 h-2',
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
        xl: 'w-6 h-6',
      },
      status: {
        online: 'bg-green-500',
        offline: 'bg-gray-400',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
        success: 'bg-green-500',
        connecting: 'bg-yellow-500 animate-pulse',
        loading: 'bg-blue-500 animate-pulse',
        disabled: 'bg-gray-300',
      },
      variant: {
        solid: '',
        outline: 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900',
        glow: '',
      },
    },
    compoundVariants: [
      {
        status: 'online',
        variant: 'outline',
        class: 'ring-green-500',
      },
      {
        status: 'offline',
        variant: 'outline',
        class: 'ring-gray-400',
      },
      {
        status: 'error',
        variant: 'outline',
        class: 'ring-red-500',
      },
      {
        status: 'warning',
        variant: 'outline',
        class: 'ring-yellow-500',
      },
      {
        status: 'info',
        variant: 'outline',
        class: 'ring-blue-500',
      },
      {
        status: 'success',
        variant: 'outline',
        class: 'ring-green-500',
      },
      {
        status: 'connecting',
        variant: 'outline',
        class: 'ring-yellow-500',
      },
      {
        status: 'loading',
        variant: 'outline',
        class: 'ring-blue-500',
      },
      {
        status: 'disabled',
        variant: 'outline',
        class: 'ring-gray-300',
      },
      {
        status: 'online',
        variant: 'glow',
        class: 'shadow-lg shadow-green-500/50',
      },
      {
        status: 'error',
        variant: 'glow',
        class: 'shadow-lg shadow-red-500/50',
      },
      {
        status: 'warning',
        variant: 'glow',
        class: 'shadow-lg shadow-yellow-500/50',
      },
    ],
    defaultVariants: {
      size: 'md',
      status: 'offline',
      variant: 'solid',
    },
  }
);

/**
 * StatusDot组件 - 状态指示器组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.size - 尺寸：xs|sm|md|lg|xl
 * @param {string} props.status - 状态：online|offline|error|warning|info|success|connecting|loading|disabled
 * @param {string} props.variant - 变体：solid|outline|glow
 * @param {boolean} props.pulse - 是否显示脉冲动画
 * @param {boolean} props.showLabel - 是否显示状态标签
 * @param {string} props.label - 自定义标签文本
 * @param {string} props.position - 标签位置：top|bottom|left|right
 * @param {string} props.className - 自定义类名
 * @param {Object} props.props - 传递给组件的额外属性
 */
export function StatusDot({
  size = 'md',
  status = 'offline',
  variant = 'solid',
  pulse = false,
  showLabel = false,
  label,
  position = 'right',
  className = '',
  ...props
}) {
  const getStatusLabel = () => {
    if (label) return label;
    
    const statusLabels = {
      online: '在线',
      offline: '离线',
      error: '错误',
      warning: '警告',
      info: '信息',
      success: '成功',
      connecting: '连接中',
      loading: '加载中',
      disabled: '禁用',
    };
    
    return statusLabels[status] || status;
  };

  const getLabelClasses = () => {
    const baseClasses = 'text-sm font-medium';
    const colorClasses = {
      online: 'text-green-600 dark:text-green-400',
      offline: 'text-gray-600 dark:text-gray-400',
      error: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
      success: 'text-green-600 dark:text-green-400',
      connecting: 'text-yellow-600 dark:text-yellow-400',
      loading: 'text-blue-600 dark:text-blue-400',
      disabled: 'text-gray-500 dark:text-gray-400',
    };
    
    return clsx(baseClasses, colorClasses[status]);
  };

  const getContainerClasses = () => {
    const positionClasses = {
      top: 'flex-col',
      bottom: 'flex-col-reverse',
      left: 'flex-row-reverse',
      right: 'flex-row',
    };
    
    return clsx('flex items-center gap-2', positionClasses[position]);
  };

  const shouldPulse = pulse || status === 'connecting' || status === 'loading';

  return (
    <div className={clsx(getContainerClasses(), className)} {...props}>
      <div 
        className={clsx(
          statusDotVariants({ size, status, variant }),
          shouldPulse && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className={getLabelClasses()}>
          {getStatusLabel()}
        </span>
      )}
    </div>
  );
}

// 预设的状态点组件
export const OnlineStatusDot = (props) => (
  <StatusDot status="online" {...props} />
);

export const OfflineStatusDot = (props) => (
  <StatusDot status="offline" {...props} />
);

export const ErrorStatusDot = (props) => (
  <StatusDot status="error" {...props} />
);

export const WarningStatusDot = (props) => (
  <StatusDot status="warning" {...props} />
);

export const ConnectingStatusDot = (props) => (
  <StatusDot status="connecting" pulse {...props} />
);

export const LoadingStatusDot = (props) => (
  <StatusDot status="loading" pulse {...props} />
);

// 带标签的状态组件
export const StatusIndicator = ({ 
  status, 
  label, 
  size = 'sm', 
  position = 'right',
  ...props 
}) => (
  <StatusDot
    status={status}
    size={size}
    showLabel
    label={label}
    position={position}
    {...props}
  />
);

// 连接状态组件
export const ConnectionStatus = ({ 
  connected, 
  connecting, 
  error, 
  showLabel = true,
  ...props 
}) => {
  let status = 'offline';
  if (error) status = 'error';
  else if (connecting) status = 'connecting';
  else if (connected) status = 'online';

  return (
    <StatusDot
      status={status}
      showLabel={showLabel}
      pulse={connecting}
      {...props}
    />
  );
};

export default StatusDot;
