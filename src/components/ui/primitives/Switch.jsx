import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';

/**
 * Switch组件 - 开关切换器
 */
const switchVariants = createVariants(
  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variant: {
      default: 'bg-gray-600 data-[state=checked]:bg-blue-600',
      success: 'bg-gray-600 data-[state=checked]:bg-green-600',
      warning: 'bg-gray-600 data-[state=checked]:bg-yellow-600',
      error: 'bg-gray-600 data-[state=checked]:bg-red-600'
    },
    size: {
      sm: 'h-4 w-7',
      md: 'h-6 w-11',
      lg: 'h-8 w-14'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const thumbVariants = createVariants(
  'inline-block rounded-full bg-white transition-transform',
  {
    size: {
      sm: 'h-3 w-3 data-[state=checked]:translate-x-3',
      md: 'h-4 w-4 data-[state=checked]:translate-x-5',
      lg: 'h-5 w-5 data-[state=checked]:translate-x-6'
    }
  },
  {
    size: 'md'
  }
);

const Switch = forwardRef(({
  checked,
  onChange,
  disabled = false,
  variant,
  size,
  className,
  ...props
}, ref) => {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn(switchVariants({ variant, size }), className)}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      <span
        data-state={checked ? 'checked' : 'unchecked'}
        className={thumbVariants({ size })}
      />
    </button>
  );
});

Switch.displayName = 'Switch';

// 命名导出和默认导出
export { Switch };
export default Switch;

/**
 * Checkbox组件 - 复选框
 */
export const Checkbox = forwardRef(({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  variant = 'default',
  size = 'md',
  className,
  ...props
}, ref) => {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const variantClasses = {
    default: 'border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500',
    success: 'border-gray-600 bg-gray-800 text-green-600 focus:ring-green-500',
    warning: 'border-gray-600 bg-gray-800 text-yellow-600 focus:ring-yellow-500',
    error: 'border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500'
  };

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      className={cn(
        'relative inline-flex items-center justify-center rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        checked && !indeterminate && 'border-blue-600 bg-blue-600',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {checked && !indeterminate && (
        <svg
          className="text-white"
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {indeterminate && (
        <div
          className={cn(
            'bg-current',
            size === 'sm' ? 'h-1 w-2' : size === 'md' ? 'h-1 w-2.5' : 'h-1.5 w-3'
          )}
        />
      )}
    </button>
  );
});

Checkbox.displayName = 'Checkbox';

/**
 * Radio组件 - 单选框
 */
export const Radio = forwardRef(({
  checked,
  onChange,
  value,
  disabled = false,
  variant = 'default',
  size = 'md',
  className,
  ...props
}, ref) => {
  const handleClick = () => {
    if (!disabled && onChange && !checked) {
      onChange(value);
    }
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const dotSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  const variantClasses = {
    default: 'border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500',
    success: 'border-gray-600 bg-gray-800 text-green-600 focus:ring-green-500',
    warning: 'border-gray-600 bg-gray-800 text-yellow-600 focus:ring-yellow-500',
    error: 'border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500'
  };

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        checked && 'border-blue-600 bg-blue-600',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {checked && (
        <div className={cn('rounded-full bg-white', dotSizes[size])} />
      )}
    </button>
  );
});

Radio.displayName = 'Radio';

/**
 * RadioGroup组件 - 单选框组
 */
export const RadioGroup = ({
  options = [],
  value,
  onChange,
  disabled = false,
  variant = 'default',
  size = 'md',
  orientation = 'vertical',
  className,
  ...props
}) => {
  const handleChange = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
  };

  const orientationClasses = {
    vertical: 'flex flex-col gap-2',
    horizontal: 'flex flex-row gap-4',
    grid: 'grid grid-cols-2 gap-2'
  };

  return (
    <div
      className={cn(orientationClasses[orientation], className)}
      role="radiogroup"
      {...props}
    >
      {options.map((option) => (
        <div
          key={option.value}
          className={cn(
            'flex items-center gap-2',
            disabled && 'opacity-50'
          )}
        >
          <Radio
            checked={value === option.value}
            onChange={() => handleChange(option.value)}
            value={option.value}
            disabled={disabled || option.disabled}
            variant={variant}
            size={size}
          />
          <label
            className={cn(
              'text-sm text-gray-300 cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
            onClick={() => {
              if (!disabled && !option.disabled) {
                handleChange(option.value);
              }
            }}
          >
            {option.label}
            {option.description && (
              <span className="block text-xs text-gray-500">
                {option.description}
              </span>
            )}
          </label>
        </div>
      ))}
    </div>
  );
};

/**
 * CheckboxGroup组件 - 复选框组
 */
export const CheckboxGroup = ({
  options = [],
  value = [],
  onChange,
  disabled = false,
  variant = 'default',
  size = 'md',
  orientation = 'vertical',
  className,
  ...props
}) => {
  const handleChange = (optionValue, checked) => {
    const newValue = checked
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);
    
    if (onChange) {
      onChange(newValue);
    }
  };

  const orientationClasses = {
    vertical: 'flex flex-col gap-2',
    horizontal: 'flex flex-row gap-4',
    grid: 'grid grid-cols-2 gap-2'
  };

  return (
    <div
      className={cn(orientationClasses[orientation], className)}
      role="group"
      {...props}
    >
      {options.map((option) => {
        const isChecked = value.includes(option.value);
        return (
          <div
            key={option.value}
            className={cn(
              'flex items-center gap-2',
              disabled && 'opacity-50'
            )}
          >
            <Checkbox
              checked={isChecked}
              onChange={(checked) => handleChange(option.value, checked)}
              disabled={disabled || option.disabled}
              variant={variant}
              size={size}
            />
            <label
              className={cn(
                'text-sm text-gray-300 cursor-pointer',
                disabled && 'cursor-not-allowed'
              )}
              onClick={() => {
                if (!disabled && !option.disabled) {
                  handleChange(option.value, !isChecked);
                }
              }}
            >
              {option.label}
              {option.description && (
                <span className="block text-xs text-gray-500">
                  {option.description}
                </span>
              )}
            </label>
          </div>
        );
      })}
    </div>
  );
};
