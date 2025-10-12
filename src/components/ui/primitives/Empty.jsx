import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from './Icon';

/**
 * Empty组件 - 空状态组件
 */
const emptyVariants = createVariants(
  'flex flex-col items-center justify-center p-8 text-center',
  {
    variant: {
      default: '',
      card: 'border border-gray-700 rounded-lg bg-gray-800/50',
      inline: 'flex-row p-4 text-left',
      minimal: 'p-4'
    },
    size: {
      sm: 'p-4',
      md: 'p-8',
      lg: 'p-12'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const Empty = forwardRef(({
  icon,
  title,
  description,
  action,
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}, ref) => {
  const isInline = variant === 'inline';

  return (
    <div
      ref={ref}
      className={cn(
        emptyVariants({ variant, size }),
        className
      )}
      {...props}
    >
      {/* 图标 */}
      {icon && (
        <div className={cn(
          'mb-4 text-gray-400',
          isInline && 'mb-0 mr-4'
        )}>
          {typeof icon === 'string' ? (
            <Icon name={icon} size={48} />
          ) : (
            icon
          )}
        </div>
      )}

      {/* 内容 */}
      <div className={cn(
        'space-y-2',
        isInline && 'space-y-1'
      )}>
        {title && (
          <h3 className={cn(
            'font-medium text-gray-200',
            isInline ? 'text-sm' : 'text-lg'
          )}>
            {title}
          </h3>
        )}

        {description && (
          <p className={cn(
            'text-gray-400',
            isInline ? 'text-xs' : 'text-sm'
          )}>
            {description}
          </p>
        )}

        {children}

        {action && (
          <div className={cn(
            'mt-4',
            isInline && 'mt-0 ml-4'
          )}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
});

Empty.displayName = 'Empty';

/**
 * Skeleton组件 - 骨架屏组件
 */
export const Skeleton = forwardRef(({
  variant = 'default',
  width,
  height,
  className,
  animated = true,
  ...props
}, ref) => {
  const variantClasses = {
    default: 'rounded',
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    avatar: 'rounded-full w-10 h-10',
    button: 'rounded h-10 w-20',
    input: 'rounded h-10 w-full',
    card: 'rounded-lg h-32 w-full'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'bg-gray-700',
        variantClasses[variant],
        animated && 'animate-pulse',
        className
      )}
      style={{
        width,
        height
      }}
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonGroup组件 - 骨架屏组
 */
export const SkeletonGroup = ({
  lines = 3,
  showAvatar = false,
  showTitle = true,
  className,
  ...props
}) => {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height="h-4" />
            <Skeleton width="60%" height="h-3" />
          </div>
        </div>
      )}
      
      {showTitle && <Skeleton width="30%" height="h-6" />}
      
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '80%' : '100%'}
          height="h-4"
        />
      ))}
    </div>
  );
};

/**
 * TableSkeleton组件 - 表格骨架屏
 */
export const TableSkeleton = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  ...props
}) => {
  return (
    <div className={cn('w-full', className)} {...props}>
      {showHeader && (
        <div className="flex border-b border-gray-700 pb-2 mb-2">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={`header-${index}`}
              variant="text"
              className="flex-1 mr-2 last:mr-0"
            />
          ))}
        </div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant="text"
                className="flex-1 mr-2 last:mr-0"
                width={colIndex === columns - 1 ? '60%' : '100%'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * CardSkeleton组件 - 卡片骨架屏
 */
export const CardSkeleton = forwardRef(({
  showHeader = true,
  showImage = false,
  showFooter = false,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'border border-gray-700 rounded-lg p-4 space-y-4',
        className
      )}
      {...props}
    >
      {showImage && (
        <Skeleton variant="rectangular" height="h-32" className="w-full" />
      )}
      
      {showHeader && (
        <div className="space-y-2">
          <Skeleton width="40%" height="h-6" />
          <Skeleton width="20%" height="h-4" />
        </div>
      )}
      
      <div className="space-y-2">
        <Skeleton height="h-4" />
        <Skeleton height="h-4" />
        <Skeleton width="80%" height="h-4" />
      </div>
      
      {showFooter && (
        <div className="flex justify-between pt-4 border-t border-gray-700">
          <Skeleton variant="button" />
          <Skeleton variant="button" />
        </div>
      )}
    </div>
  );
});

CardSkeleton.displayName = 'CardSkeleton';

/**
 * ListSkeleton组件 - 列表骨架屏
 */
export const ListSkeleton = ({
  items = 5,
  showAvatar = false,
  showAction = false,
  className,
  ...props
}) => {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          {showAvatar && <Skeleton variant="avatar" />}
          <div className="flex-1 space-y-2">
            <Skeleton width="30%" height="h-4" />
            <Skeleton width="60%" height="h-3" />
          </div>
          {showAction && <Skeleton variant="button" />}
        </div>
      ))}
    </div>
  );
};

/**
 * EmptyState组件 - 预定义空状态
 */
export const EmptyState = {
  // 数据相关
  NoData: (props) => (
    <Empty
      icon="Database"
      title="暂无数据"
      description="当前没有可显示的数据"
      {...props}
    />
  ),
  
  NoResults: (props) => (
    <Empty
      icon="Search"
      title="未找到结果"
      description="尝试调整搜索条件或筛选器"
      {...props}
    />
  ),
  
  NoFiles: (props) => (
    <Empty
      icon="File"
      title="暂无文件"
      description="此目录为空或没有文件"
      {...props}
    />
  ),
  
  NoConnections: (props) => (
    <Empty
      icon="WifiOff"
      title="暂无连接"
      description="尚未配置任何SSH连接"
      {...props}
    />
  ),
  
  // 网络相关
  NetworkError: (props) => (
    <Empty
      icon="WifiOff"
      title="网络连接失败"
      description="无法连接到服务器，请检查网络设置"
      {...props}
    />
  ),
  
  ServerError: (props) => (
    <Empty
      icon="AlertTriangle"
      title="服务器错误"
      description="服务器遇到问题，请稍后重试"
      {...props}
    />
  ),
  
  // 权限相关
  NoPermission: (props) => (
    <Empty
      icon="Lock"
      title="权限不足"
      description="您没有权限访问此内容"
      {...props}
    />
  ),
  
  AccessDenied: (props) => (
    <Empty
      icon="Ban"
      title="访问被拒绝"
      description="无法访问请求的资源"
      {...props}
    />
  ),
  
  // 功能相关
  NotAvailable: (props) => (
    <Empty
      icon="XCircle"
      title="功能不可用"
      description="此功能当前不可用"
      {...props}
    />
  ),
  
  InDevelopment: (props) => (
    <Empty
      icon="Settings"
      title="开发中"
      description="此功能正在开发中，敬请期待"
      {...props}
    />
  ),
  
  // 通用
  Loading: (props) => (
    <Empty
      icon="Loader2"
      title="加载中..."
      description="正在获取数据，请稍候"
      {...props}
    />
  ),
  
  Error: (props) => (
    <Empty
      icon="AlertCircle"
      title="出现错误"
      description="操作过程中遇到错误"
      {...props}
    />
  ),
  
  Success: (props) => (
    <Empty
      icon="CheckCircle"
      title="操作成功"
      description="操作已成功完成"
      {...props}
    />
  )
};

/**
 * LoadingState组件 - 加载状态
 */
export const LoadingState = forwardRef(({
  text = '加载中...',
  size = 'md',
  variant = 'spinner',
  className,
  ...props
}, ref) => {
  const sizeVariants = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center space-y-4',
        className
      )}
      {...props}
    >
      {variant === 'spinner' && (
        <Icon name="Loader2" size={size === 'sm' ? 24 : size === 'lg' ? 48 : 32} className="animate-spin text-blue-500" />
      )}
      
      {variant === 'dots' && (
        <div className="flex space-x-1">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: `${index * 0.1}s` }}
            />
          ))}
        </div>
      )}
      
      {variant === 'pulse' && (
        <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse" />
      )}
      
      <p className={cn('text-gray-400', sizeVariants[size])}>
        {text}
      </p>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

export default Empty;
