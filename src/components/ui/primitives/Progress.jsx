import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from './Icon';

/**
 * Progress组件 - 进度条组件
 */
const progressVariants = createVariants(
  'w-full bg-gray-700 rounded-full overflow-hidden',
  {
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    },
    variant: {
      default: '',
      success: '',
      warning: '',
      error: '',
      info: ''
    }
  },
  {
    size: 'md',
    variant: 'default'
  }
);

const progressFillVariants = createVariants(
  'h-full transition-all duration-300 ease-out',
  {
    variant: {
      default: 'bg-blue-600',
      success: 'bg-green-600',
      warning: 'bg-yellow-600',
      error: 'bg-red-600',
      info: 'bg-cyan-600'
    }
  },
  {
    variant: 'default'
  }
);

const Progress = forwardRef(({
  value = 0,
  max = 100,
  variant,
  size,
  showLabel = false,
  labelPosition = 'right',
  animated = true,
  className,
  ...props
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const labelElement = showLabel && (
    <span className={cn(
      'text-xs font-medium text-gray-300 ml-2',
      labelPosition === 'top' && 'block mb-1 ml-0',
      labelPosition === 'bottom' && 'block mt-1 ml-0'
    )}>
      {Math.round(percentage)}%
    </span>
  );

  return (
    <div
      ref={ref}
      className={cn('flex items-center', className)}
      {...props}
    >
      {labelPosition === 'top' && labelElement}
      <div className={cn('flex-1', labelPosition === 'left' && 'order-2')}>
        <div className={progressVariants({ size, variant })}>
          <div
            className={cn(
              progressFillVariants({ variant }),
              animated && 'transition-all duration-300 ease-out'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      {(labelPosition === 'right' || labelPosition === 'left') && labelElement}
      {labelPosition === 'bottom' && labelElement}
    </div>
  );
});

Progress.displayName = 'Progress';

/**
 * CircularProgress组件 - 环形进度条
 */
export const CircularProgress = forwardRef(({
  value = 0,
  max = 100,
  size = 40,
  strokeWidth = 4,
  variant = 'default',
  showLabel = false,
  className,
  ...props
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorVariants = {
    default: 'stroke-blue-600',
    success: 'stroke-green-600',
    warning: 'stroke-yellow-600',
    error: 'stroke-red-600',
    info: 'stroke-cyan-600'
  };

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center', className)}
      {...props}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-gray-700"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn(
            'fill-none transition-all duration-300 ease-out',
            colorVariants[variant]
          )}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-medium text-gray-300">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
});

CircularProgress.displayName = 'CircularProgress';

/**
 * Spinner组件 - 加载旋转器
 */
export const Spinner = forwardRef(({
  size = 'md',
  variant = 'default',
  className,
  ...props
}, ref) => {
  const sizeVariants = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorVariants = {
    default: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-cyan-600',
    white: 'text-white',
    gray: 'text-gray-400'
  };

  return (
    <Icon
      ref={ref}
      name="Loader2"
      className={cn(
        'animate-spin',
        sizeVariants[size],
        colorVariants[variant],
        className
      )}
      {...props}
    />
  );
});

Spinner.displayName = 'Spinner';

/**
 * DotsSpinner组件 - 点状加载器
 */
export const DotsSpinner = forwardRef(({
  size = 'md',
  variant = 'default',
  className,
  ...props
}, ref) => {
  const sizeVariants = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  };

  const colorVariants = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
    info: 'bg-cyan-600',
    white: 'bg-white',
    gray: 'bg-gray-400'
  };

  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'rounded-full animate-bounce',
            sizeVariants[size],
            colorVariants[variant]
          )}
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
});

DotsSpinner.displayName = 'DotsSpinner';

/**
 * PulseSpinner组件 - 脉冲加载器
 */
export const PulseSpinner = forwardRef(({
  size = 'md',
  variant = 'default',
  className,
  ...props
}, ref) => {
  const sizeVariants = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorVariants = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
    info: 'bg-cyan-600',
    white: 'bg-white',
    gray: 'bg-gray-400'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-full animate-pulse',
        sizeVariants[size],
        colorVariants[variant],
        className
      )}
      {...props}
    />
  );
});

PulseSpinner.displayName = 'PulseSpinner';

/**
 * ProgressGroup组件 - 进度条组
 */
export const ProgressGroup = ({
  items = [],
  direction = 'vertical',
  spacing = 'md',
  className,
  ...props
}) => {
  const directionClasses = {
    vertical: 'flex-col',
    horizontal: 'flex-row'
  };

  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        spacingClasses[spacing],
        className
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={cn(
            'flex-1',
            direction === 'horizontal' && 'min-w-0'
          )}
        >
          {item.label && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">
                {item.label}
              </span>
              <span className="text-xs text-gray-400">
                {item.value}/{item.max}
              </span>
            </div>
          )}
          <Progress
            value={item.value}
            max={item.max}
            variant={item.variant}
            size={item.size}
            showLabel={item.showLabel}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * StepProgress组件 - 步骤进度条
 */
export const StepProgress = forwardRef(({
  steps = [],
  currentStep = 0,
  direction = 'horizontal',
  size = 'md',
  className,
  ...props
}, ref) => {
  const isVertical = direction === 'vertical';
  
  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        isVertical ? 'flex-col' : 'flex-row',
        className
      )}
      {...props}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id || index}
            className={cn(
              'flex items-center',
              !isVertical && 'flex-1',
              !isLast && !isVertical && 'relative'
            )}
          >
            {/* 步骤圆点 */}
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                isCompleted
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : isCurrent
                  ? 'border-blue-600 text-blue-600'
                  : 'border-gray-600 text-gray-400'
              )}
            >
              {isCompleted ? (
                <Icon name="Check" size={16} />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>

            {/* 步骤标签 */}
            <div className={cn(
              'ml-3',
              isVertical && 'mb-4'
            )}>
              <div className={cn(
                'text-sm font-medium',
                isCompleted || isCurrent
                  ? 'text-gray-100'
                  : 'text-gray-400'
              )}>
                {step.label}
              </div>
              {step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>

            {/* 连接线 */}
            {!isLast && !isVertical && (
              <div className={cn(
                'absolute left-8 top-4 h-0.5 flex-1 -ml-4',
                isCompleted ? 'bg-blue-600' : 'bg-gray-600'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
});

StepProgress.displayName = 'StepProgress';

// 命名导出和默认导出
export { Progress };
export default Progress;
