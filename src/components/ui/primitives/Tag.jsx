import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from './Icon';

/**
 * Tag组件 - 标签组件
 */
const tagVariants = createVariants(
  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors',
  {
    variant: {
      default: 'bg-gray-700 text-gray-300',
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-gray-600 text-white',
      success: 'bg-green-600 text-white',
      warning: 'bg-yellow-600 text-white',
      error: 'bg-red-600 text-white',
      info: 'bg-cyan-600 text-white',
      outline: 'border border-gray-600 text-gray-300 bg-transparent'
    },
    size: {
      sm: 'px-1.5 py-0.5 text-xs',
      md: 'px-2 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const Tag = forwardRef(({
  children,
  variant,
  size,
  removable = false,
  onRemove,
  icon,
  className,
  ...props
}, ref) => {
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <span
      ref={ref}
      className={cn(tagVariants({ variant, size }), className)}
      {...props}
    >
      {icon && (
        <Icon name={icon} size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />
      )}
      <span>{children}</span>
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-1 hover:opacity-70 focus:outline-none"
        >
          <Icon name="X" size={size === 'sm' ? 10 : size === 'lg' ? 14 : 12} />
        </button>
      )}
    </span>
  );
});

Tag.displayName = 'Tag';

/**
 * StatusDot组件 - 状态点组件
 */
export const StatusDot = forwardRef(({
  status = 'default',
  size = 'md',
  pulse = false,
  className,
  ...props
}, ref) => {
  const statusVariants = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
    info: 'bg-blue-500',
    loading: 'bg-blue-500',
    default: 'bg-gray-500'
  };

  const sizeVariants = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-full',
        statusVariants[status],
        sizeVariants[size],
        pulse && status === 'online' && 'animate-pulse',
        pulse && status === 'loading' && 'animate-spin',
        className
      )}
      {...props}
    />
  );
});

StatusDot.displayName = 'StatusDot';

/**
 * StatusWithText组件 - 带文字的状态组件
 */
export const StatusWithText = forwardRef(({
  status,
  text,
  size = 'md',
  showDot = true,
  className,
  ...props
}, ref) => {
  const textVariants = {
    online: 'text-green-400',
    offline: 'text-gray-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    success: 'text-green-400',
    info: 'text-blue-400',
    loading: 'text-blue-400',
    default: 'text-gray-400'
  };

  const sizeVariants = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2',
        textVariants[status],
        sizeVariants[size],
        className
      )}
      {...props}
    >
      {showDot && <StatusDot status={status} size={size} pulse={status === 'online' || status === 'loading'} />}
      <span>{text}</span>
    </span>
  );
});

StatusWithText.displayName = 'StatusWithText';

/**
 * TagGroup组件 - 标签组
 */
export const TagGroup = ({
  tags = [],
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  maxVisible,
  className,
  ...props
}) => {
  const [showAll, setShowAll] = React.useState(false);
  
  const visibleTags = showAll ? tags : tags.slice(0, maxVisible);
  const hasMore = tags.length > (maxVisible || tags.length);

  const handleRemove = (tagIndex) => {
    if (onRemove) {
      onRemove(tagIndex);
    }
  };

  return (
    <div
      className={cn('flex flex-wrap items-center gap-1', className)}
      {...props}
    >
      {visibleTags.map((tag, index) => (
        <Tag
          key={tag.id || index}
          variant={variant}
          size={size}
          removable={removable}
          onRemove={() => handleRemove(index)}
          icon={tag.icon}
        >
          {tag.label || tag}
        </Tag>
      ))}
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={cn(
            'text-xs text-gray-400 hover:text-gray-200',
            size === 'sm' && 'text-xs',
            size === 'lg' && 'text-sm'
          )}
        >
          +{tags.length - (maxVisible || tags.length)} 更多
        </button>
      )}
      {hasMore && showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className={cn(
            'text-xs text-gray-400 hover:text-gray-200',
            size === 'sm' && 'text-xs',
            size === 'lg' && 'text-sm'
          )}
        >
          收起
        </button>
      )}
    </div>
  );
};

/**
 * InteractiveTag组件 - 可交互标签
 */
export const InteractiveTag = forwardRef(({
  children,
  variant = 'default',
  size = 'md',
  selected = false,
  onClick,
  onRemove,
  icon,
  className,
  ...props
}, ref) => {
  const interactiveVariants = {
    default: selected 
      ? 'bg-blue-600 text-white' 
      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer',
    primary: selected
      ? 'bg-blue-700 text-white'
      : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer',
    secondary: selected
      ? 'bg-gray-700 text-white'
      : 'bg-gray-600 text-white hover:bg-gray-700 cursor-pointer',
    success: selected
      ? 'bg-green-700 text-white'
      : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer',
    warning: selected
      ? 'bg-yellow-700 text-white'
      : 'bg-yellow-600 text-white hover:bg-yellow-700 cursor-pointer',
    error: selected
      ? 'bg-red-700 text-white'
      : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer',
    info: selected
      ? 'bg-cyan-700 text-white'
      : 'bg-cyan-600 text-white hover:bg-cyan-700 cursor-pointer',
    outline: selected
      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
      : 'border-gray-600 text-gray-300 bg-transparent hover:border-gray-500 cursor-pointer'
  };

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors',
        interactiveVariants[variant],
        size === 'sm' && 'px-1.5 py-0.5 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {icon && (
        <Icon name={icon} size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />
      )}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-1 hover:opacity-70 focus:outline-none"
        >
          <Icon name="X" size={size === 'sm' ? 10 : size === 'lg' ? 14 : 12} />
        </button>
      )}
    </span>
  );
});

InteractiveTag.displayName = 'InteractiveTag';

// 命名导出和默认导出
export { Tag };
export default Tag;
