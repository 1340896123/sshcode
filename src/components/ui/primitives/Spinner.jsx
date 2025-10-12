import React from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';

const spinnerVariants = cva(
  'inline-block animate-spin',
  {
    variants: {
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12',
        '2xl': 'w-16 h-16',
      },
      color: {
        default: 'text-gray-500 dark:text-gray-400',
        primary: 'text-blue-500 dark:text-blue-400',
        secondary: 'text-gray-600 dark:text-gray-300',
        success: 'text-green-500 dark:text-green-400',
        warning: 'text-yellow-500 dark:text-yellow-400',
        error: 'text-red-500 dark:text-red-400',
        info: 'text-cyan-500 dark:text-cyan-400',
        white: 'text-white',
        muted: 'text-gray-400 dark:text-gray-500',
      },
      variant: {
        default: '',
        dots: 'animate-pulse',
        pulse: 'animate-pulse',
        bounce: 'animate-bounce',
        wave: '',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'default',
      variant: 'default',
    },
  }
);

/**
 * Spinner组件 - 加载指示器组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.size - 尺寸：xs|sm|md|lg|xl|2xl
 * @param {string} props.color - 颜色：default|primary|secondary|success|warning|error|info|white|muted
 * @param {string} props.variant - 变体：default|dots|pulse|bounce|wave
 * @param {boolean} props.showLabel - 是否显示标签
 * @param {string} props.label - 自定义标签文本
 * @param {string} props.position - 标签位置：top|bottom|left|right
 * @param {number} props.speed - 动画速度（秒）
 * @param {string} props.className - 自定义类名
 * @param {Object} props.props - 传递给组件的额外属性
 */
export function Spinner({
  size = 'md',
  color = 'default',
  variant = 'default',
  showLabel = false,
  label = '加载中...',
  position = 'right',
  speed = 1,
  className = '',
  ...props
}) {
  const getContainerClasses = () => {
    const positionClasses = {
      top: 'flex-col',
      bottom: 'flex-col-reverse',
      left: 'flex-row-reverse',
      right: 'flex-row',
    };
    
    return clsx('flex items-center gap-2', positionClasses[position]);
  };

  const getLabelClasses = () => {
    const baseClasses = 'text-sm font-medium';
    const colorClasses = {
      default: 'text-gray-600 dark:text-gray-400',
      primary: 'text-blue-600 dark:text-blue-400',
      secondary: 'text-gray-600 dark:text-gray-300',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
      info: 'text-cyan-600 dark:text-cyan-400',
      white: 'text-white',
      muted: 'text-gray-500 dark:text-gray-400',
    };
    
    return clsx(baseClasses, colorClasses[color]);
  };

  const renderSpinnerContent = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-full',
                  spinnerVariants({ size: 'xs', color })
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${speed}s`,
                }}
              />
            ))}
          </div>
        );
      
      case 'pulse':
        return (
          <div
            className={clsx(
              'rounded-full animate-pulse',
              spinnerVariants({ size, color })
            )}
            style={{
              animationDuration: `${speed}s`,
            }}
          />
        );
      
      case 'bounce':
        return (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-full animate-bounce',
                  spinnerVariants({ size: 'xs', color })
                )}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${speed}s`,
                }}
              />
            ))}
          </div>
        );
      
      case 'wave':
        return (
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-full',
                  spinnerVariants({ size: 'xs', color })
                )}
                style={{
                  animation: `wave ${speed}s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        );
      
      default:
        return (
          <svg
            className={clsx(spinnerVariants({ size, color }))}
            style={{
              animationDuration: `${speed}s`,
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
    }
  };

  return (
    <div className={clsx(getContainerClasses(), className)} {...props}>
      {renderSpinnerContent()}
      {showLabel && (
        <span className={getLabelClasses()}>
          {label}
        </span>
      )}
    </div>
  );
}

// 预设的加载器组件
export const SmallSpinner = (props) => (
  <Spinner size="sm" {...props} />
);

export const LargeSpinner = (props) => (
  <Spinner size="lg" {...props} />
);

export const DotsSpinner = (props) => (
  <Spinner variant="dots" {...props} />
);

export const PulseSpinner = (props) => (
  <Spinner variant="pulse" {...props} />
);

export const BounceSpinner = (props) => (
  <Spinner variant="bounce" {...props} />
);

export const WaveSpinner = (props) => (
  <Spinner variant="wave" {...props} />
);

// 带标签的加载器
export const LoadingSpinner = ({ 
  label = '加载中...', 
  size = 'md',
  ...props 
}) => (
  <Spinner
    size={size}
    showLabel
    label={label}
    {...props}
  />
);

// 页面级加载器
export const PageSpinner = ({ 
  label = '正在加载...', 
  fullScreen = false,
  ...props 
}) => {
  const containerClasses = clsx(
    'flex items-center justify-center',
    fullScreen ? 'fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50' : 'min-h-48'
  );

  return (
    <div className={containerClasses}>
      <Spinner
        size="xl"
        showLabel
        label={label}
        position="bottom"
        {...props}
      />
    </div>
  );
};

// 内联加载器（用于按钮内等）
export const InlineSpinner = ({ 
  size = 'sm', 
  className = '',
  ...props 
}) => (
  <Spinner
    size={size}
    className={clsx('inline-flex', className)}
    {...props}
  />
);

export default Spinner;
