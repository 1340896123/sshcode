import React, { forwardRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center p-8 text-center',
  {
    variants: {
      variant: {
        default: 'bg-slate-800/50 border border-slate-700 rounded-lg',
        minimal: 'bg-transparent border-0',
        elevated: 'bg-slate-800 border-slate-700 shadow-lg',
      },
      size: {
        sm: 'p-4',
        md: 'p-8',
        lg: 'p-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const iconVariants = cva(
  'mb-4',
  {
    variants: {
      size: {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const EmptyState = forwardRef((
  {
    className,
    variant,
    size,
    type = 'empty', // 'empty' | 'error' | 'no-permission' | 'disconnected' | 'loading'
    icon,
    title,
    description,
    actions = [],
    badges = [],
    showIllustration = true,
    ...props
  },
  ref
) => {
  const getDefaultConfig = () => {
    const configs = {
      empty: {
        icon: 'Inbox',
        title: '没有内容',
        description: '此目录为空或没有可显示的项目',
        color: 'text-slate-400',
      },
      error: {
        icon: 'AlertCircle',
        title: '发生错误',
        description: '加载内容时出现问题，请重试',
        color: 'text-red-400',
      },
      'no-permission': {
        icon: 'Lock',
        title: '没有权限',
        description: '您没有访问此目录的权限',
        color: 'text-orange-400',
      },
      disconnected: {
        icon: 'WifiOff',
        title: '连接断开',
        description: '与服务器的连接已断开，请重新连接',
        color: 'text-slate-400',
      },
      loading: {
        icon: 'Loader2',
        title: '加载中',
        description: '正在获取内容，请稍候...',
        color: 'text-blue-400',
      },
      'no-files': {
        icon: 'FileX',
        title: '没有文件',
        description: '此目录中没有文件',
        color: 'text-slate-400',
      },
      'no-directories': {
        icon: 'FolderX',
        title: '没有目录',
        description: '此目录中没有子目录',
        color: 'text-slate-400',
      },
      'search-empty': {
        icon: 'SearchX',
        title: '没有找到结果',
        description: '没有找到匹配的项目，请尝试其他搜索词',
        color: 'text-slate-400',
      },
      'filter-empty': {
        icon: 'FilterX',
        title: '没有匹配项',
        description: '当前筛选条件下没有匹配的项目',
        color: 'text-slate-400',
      },
    };

    return configs[type] || configs.empty;
  };

  const config = getDefaultConfig();
  const displayIcon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  const renderIcon = () => {
    if (type === 'loading') {
      return (
        <div className={iconVariants({ size })}>
          <Icon 
            name={displayIcon} 
            className={clsx(
              'animate-spin',
              config.color
            )} 
          />
        </div>
      );
    }

    return (
      <div className={iconVariants({ size })}>
        <Icon name={displayIcon} className={config.color} />
      </div>
    );
  };

  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'solid'}
            size={action.size || 'md'}
            onClick={action.onClick}
            disabled={action.disabled}
            loading={action.loading}
            className={action.className}
          >
            {action.icon && (
              <Icon name={action.icon} className="w-4 h-4 mr-2" />
            )}
            {action.label}
          </Button>
        ))}
      </div>
    );
  };

  const renderBadges = () => {
    if (badges.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {badges.map((badge, index) => (
          <Badge
            key={index}
            variant={badge.variant || 'secondary'}
            size={badge.size || 'sm'}
            className={badge.className}
          >
            {badge.icon && (
              <Icon name={badge.icon} className="w-3 h-3 mr-1" />
            )}
            {badge.label}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={clsx(emptyStateVariants({ variant, size, className }))}
      {...props}
    >
      {showIllustration && renderIcon()}
      
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-white mb-2">
          {displayTitle}
        </h3>
        
        <p className="text-sm text-slate-400 mb-4">
          {displayDescription}
        </p>
        
        {renderBadges()}
        {renderActions()}
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// 预设的空状态组件
export const FileEmptyState = forwardRef((props, ref) => (
  <EmptyState
    ref={ref}
    type="no-files"
    actions={[
      {
        label: '上传文件',
        icon: 'Upload',
        onClick: props.onUpload,
      },
      {
        label: '新建文件',
        icon: 'FilePlus',
        variant: 'outline',
        onClick: props.onCreateFile,
      },
    ]}
    {...props}
  />
));

FileEmptyState.displayName = 'FileEmptyState';

export const DirectoryEmptyState = forwardRef((props, ref) => (
  <EmptyState
    ref={ref}
    type="no-directories"
    actions={[
      {
        label: '新建文件夹',
        icon: 'FolderPlus',
        onClick: props.onCreateFolder,
      },
    ]}
    {...props}
  />
));

DirectoryEmptyState.displayName = 'DirectoryEmptyState';

export const SearchEmptyState = forwardRef((props, ref) => (
  <EmptyState
    ref={ref}
    type="search-empty"
    actions={[
      {
        label: '清除搜索',
        icon: 'X',
        variant: 'outline',
        onClick: props.onClearSearch,
      },
    ]}
    badges={[
      {
        label: `搜索 "${props.query}"`,
        variant: 'secondary',
      },
    ]}
    {...props}
  />
));

SearchEmptyState.displayName = 'SearchEmptyState';

export const ErrorState = forwardRef((props, ref) => (
  <EmptyState
    ref={ref}
    type="error"
    actions={[
      {
        label: '重试',
        icon: 'RefreshCw',
        onClick: props.onRetry,
      },
      {
        label: '返回上级',
        icon: 'ArrowLeft',
        variant: 'outline',
        onClick: props.onGoBack,
      },
    ]}
    {...props}
  />
));

ErrorState.displayName = 'ErrorState';

export const NoPermissionState = forwardRef((props, ref) => (
  <EmptyState
    ref={ref}
    type="no-permission"
    actions={[
      {
        label: '申请权限',
        icon: 'Shield',
        onClick: props.onRequestPermission,
      },
      {
        label: '返回上级',
        icon: 'ArrowLeft',
        variant: 'outline',
        onClick: props.onGoBack,
      },
    ]}
    badges={[
      {
        label: '权限不足',
        variant: 'warning',
        icon: 'Lock',
      },
    ]}
    {...props}
  />
));

NoPermissionState.displayName = 'NoPermissionState';

export const DisconnectedState = forwardRef((props, ref) => (
  <EmptyState
    ref={ref}
    type="disconnected"
    actions={[
      {
        label: '重新连接',
        icon: 'Wifi',
        onClick: props.onReconnect,
        loading: props.reconnecting,
      },
      {
        label: '检查连接',
        icon: 'Settings',
        variant: 'outline',
        onClick: props.onCheckConnection,
      },
    ]}
    badges={[
      {
        label: '连接已断开',
        variant: 'danger',
        icon: 'WifiOff',
      },
    ]}
    {...props}
  />
));

DisconnectedState.displayName = 'DisconnectedState';

// 最小化空状态
export const MinimalEmptyState = forwardRef((props, ref) => (
  <EmptyState
    ref={ref}
    variant="minimal"
    size="sm"
    showIllustration={false}
    {...props}
  />
));

MinimalEmptyState.displayName = 'MinimalEmptyState';
