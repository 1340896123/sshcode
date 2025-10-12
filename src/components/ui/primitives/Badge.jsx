import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';

/**
 * Badge组件 - 徽标组件，用于显示状态、计数等
 */
const badgeVariants = createVariants(
  'inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full',
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
      sm: 'px-1 py-0.5 text-xs',
      md: 'px-2 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const Badge = forwardRef(({
  children,
  variant,
  size,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

/**
 * CountBadge组件 - 计数徽标
 */
export const CountBadge = forwardRef(({
  count = 0,
  max = 99,
  showZero = false,
  variant = 'error',
  size = 'sm',
  className,
  ...props
}, ref) => {
  if (!showZero && count === 0) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge
      ref={ref}
      variant={variant}
      size={size}
      className={cn('min-w-[1.25rem] h-5', className)}
      {...props}
    >
      {displayCount}
    </Badge>
  );
});

CountBadge.displayName = 'CountBadge';

/**
 * DotBadge组件 - 点状徽标
 */
export const DotBadge = forwardRef(({
  status = 'default',
  size = 'md',
  pulse = false,
  className,
  ...props
}, ref) => {
  const statusVariants = {
    default: 'bg-gray-500',
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
    info: 'bg-blue-500',
    loading: 'bg-blue-500'
  };

  const sizeVariants = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-full',
        statusVariants[status],
        sizeVariants[size],
        pulse && (status === 'online' || status === 'loading') && 'animate-pulse',
        className
      )}
      {...props}
    />
  );
});

DotBadge.displayName = 'DotBadge';

/**
 * StatusBadge组件 - 状态徽标
 */
export const StatusBadge = forwardRef(({
  status,
  children,
  size = 'md',
  showDot = true,
  className,
  ...props
}, ref) => {
  const statusVariants = {
    online: 'bg-green-100 text-green-800 border-green-200',
    offline: 'bg-gray-100 text-gray-800 border-gray-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    loading: 'bg-blue-100 text-blue-800 border-blue-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusVariants[status],
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'lg' && 'px-3 py-1 text-sm',
        className
      )}
      {...props}
    >
      {showDot && <DotBadge status={status} size="sm" />}
      {children}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

/**
 * EnvironmentBadge组件 - 环境标识徽标
 */
export const EnvironmentBadge = forwardRef(({
  environment = 'dev',
  size = 'md',
  className,
  ...props
}, ref) => {
  const envVariants = {
    dev: {
      variant: 'warning',
      label: 'DEV',
      description: '开发环境'
    },
    test: {
      variant: 'info',
      label: 'TEST',
      description: '测试环境'
    },
    staging: {
      variant: 'secondary',
      label: 'STAGING',
      description: '预发布环境'
    },
    prod: {
      variant: 'error',
      label: 'PROD',
      description: '生产环境'
    },
    local: {
      variant: 'default',
      label: 'LOCAL',
      description: '本地环境'
    }
  };

  const config = envVariants[environment] || envVariants.dev;

  return (
    <Badge
      ref={ref}
      variant={config.variant}
      size={size}
      className={cn('font-mono', className)}
      title={config.description}
      {...props}
    >
      {config.label}
    </Badge>
  );
});

EnvironmentBadge.displayName = 'EnvironmentBadge';

/**
 * ConnectionBadge组件 - 连接状态徽标
 */
export const ConnectionBadge = forwardRef(({
  connected = false,
  latency,
  size = 'md',
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <StatusBadge
        status={connected ? 'online' : 'offline'}
        size={size}
      >
        {connected ? '已连接' : '未连接'}
      </StatusBadge>
      {connected && latency !== undefined && (
        <span className={cn(
          'text-xs text-gray-400',
          size === 'sm' && 'text-xs',
          size === 'lg' && 'text-sm'
        )}>
          {latency}ms
        </span>
      )}
    </div>
  );
});

ConnectionBadge.displayName = 'ConnectionBadge';

/**
 * PositionedBadge组件 - 定位徽标（通常用于按钮或图标右上角）
 */
export const PositionedBadge = forwardRef(({
  children,
  badge,
  position = 'top-right',
  offset = 0,
  className,
  ...props
}, ref) => {
  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  };

  return (
    <div ref={ref} className={cn('relative inline-flex', className)} {...props}>
      {children}
      {badge && (
        <span
          className={cn(
            'absolute z-10',
            positionClasses[position],
            offset && 'translate-x-1/2 translate-y-1/2'
          )}
        >
          {typeof badge === 'number' ? (
            <CountBadge count={badge} size="sm" />
          ) : typeof badge === 'string' ? (
            <Badge variant="error" size="sm">
              {badge}
            </Badge>
          ) : (
            badge
          )}
        </span>
      )}
    </div>
  );
});

PositionedBadge.displayName = 'PositionedBadge';

/**
 * BadgeGroup组件 - 徽标组
 */
export const BadgeGroup = ({
  badges = [],
  spacing = 'sm',
  className,
  ...props
}) => {
  const spacingClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3'
  };

  return (
    <div
      className={cn('flex flex-wrap items-center', spacingClasses[spacing], className)}
      {...props}
    >
      {badges.map((badge, index) => (
        <Badge
          key={badge.id || index}
          variant={badge.variant}
          size={badge.size}
          className={badge.className}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  );
};

// 命名导出和默认导出
export { Badge };
export default Badge;
