import React, { forwardRef } from 'react';
import { clsx } from '../utils/clsx';

/**
 * FocusRing组件 - 焦点可见性组件
 */
export const FocusRing = forwardRef(({
  children,
  className = '',
  color = 'blue',
  size = 'md',
  offset = 2,
  inset = false,
  disabled = false,
  ...props
}, ref) => {
  const ringStyles = {
    blue: 'ring-blue-500 ring-offset-blue-50',
    green: 'ring-green-500 ring-offset-green-50',
    red: 'ring-red-500 ring-offset-red-50',
    purple: 'ring-purple-500 ring-offset-purple-50',
    yellow: 'ring-yellow-500 ring-offset-yellow-50',
    gray: 'ring-gray-500 ring-offset-gray-50'
  };

  const sizeStyles = {
    sm: 'ring-1',
    md: 'ring-2',
    lg: 'ring-4'
  };

  const offsetStyles = {
    0: 'ring-offset-0',
    1: 'ring-offset-1',
    2: 'ring-offset-2',
    4: 'ring-offset-4'
  };

  const focusClasses = clsx(
    'focus:outline-none',
    ringStyles[color] || ringStyles.blue,
    sizeStyles[size] || sizeStyles.md,
    offsetStyles[offset] || offsetStyles[2],
    {
      'focus-visible:ring-2 focus-visible:ring-offset-2': !disabled,
      'focus-visible:ring-0 focus-visible:ring-offset-0': disabled
    },
    className
  );

  return (
    <div
      ref={ref}
      className={focusClasses}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {children}
    </div>
  );
});

FocusRing.displayName = 'FocusRing';

// 预设组件
export const BlueFocusRing = (props) => <FocusRing color="blue" {...props} />;
export const GreenFocusRing = (props) => <FocusRing color="green" {...props} />;
export const RedFocusRing = (props) => <FocusRing color="red" {...props} />;
export const PurpleFocusRing = (props) => <FocusRing color="purple" {...props} />;
export const YellowFocusRing = (props) => <FocusRing color="yellow" {...props} />;
export const GrayFocusRing = (props) => <FocusRing color="gray" {...props} />;

// Hook for focus ring
export const useFocusRing = (options = {}) => {
  return {
    'aria-label': options.label,
    'aria-describedby': options.describedBy,
    'aria-expanded': options.expanded,
    'aria-selected': options.selected,
    'aria-disabled': options.disabled,
    'tabIndex': options.disabled ? -1 : 0,
    className: clsx(
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      options.className
    )
  };
};

export default FocusRing;
