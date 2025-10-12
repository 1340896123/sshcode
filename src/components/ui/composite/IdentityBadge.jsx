import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { StatusDot } from '../primitives/Tag';

/**
 * IdentityBadge组件 - 权限/身份徽章组件
 */
export function IdentityBadge({
  user = {},
  permissions = [],
  onEdit,
  showDetails = false,
  compact = false,
  variant = 'default', // default|minimal|detailed
  className = '',
  ...props
}) {
  const [expanded, setExpanded] = useState(showDetails);

  const getIdentityLevel = () => {
    const username = user.username || '';
    
    if (username === 'root' || user.uid === 0) {
      return { level: 'root', label: 'Root', color: 'error', icon: 'Shield' };
    } else if (username.startsWith('admin') || user.groups?.includes('sudo')) {
      return { level: 'admin', label: '管理员', color: 'warning', icon: 'Shield' };
    } else if (user.readOnly) {
      return { level: 'readonly', label: '只读', color: 'muted', icon: 'Lock' };
    } else {
      return { level: 'user', label: '普通用户', color: 'success', icon: 'User' };
    }
  };

  const getPermissionIcon = (permission) => {
    const iconMap = {
      read: 'Eye',
      write: 'Edit',
      execute: 'Play',
      delete: 'Trash2',
      admin: 'Shield',
      sudo: 'Key'
    };
    return iconMap[permission] || 'Check';
  };

  const formatPermissions = () => {
    if (!permissions || permissions.length === 0) {
      return [];
    }

    return permissions.map(perm => ({
      name: perm,
      icon: getPermissionIcon(perm),
      color: getPermissionColor(perm)
    }));
  };

  const getPermissionColor = (permission) => {
    const colorMap = {
      read: 'text-blue-400',
      write: 'text-green-400',
      execute: 'text-yellow-400',
      delete: 'text-red-400',
      admin: 'text-purple-400',
      sudo: 'text-orange-400'
    };
    return colorMap[permission] || 'text-gray-400';
  };

  const identity = getIdentityLevel();
  const permissionList = formatPermissions();

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-2', className)} {...props}>
        <Icon name={identity.icon} size="sm" color={identity.color} />
        <span className={clsx('text-sm font-medium', `text-${identity.color}-400`)}>
          {user.username || 'Unknown'}
        </span>
        <StatusDot status={identity.color} size="xs" />
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={clsx('flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-full', className)} {...props}>
        <Icon name={identity.icon} size="xs" color={identity.color} />
        <span className={clsx('text-xs', `text-${identity.color}-400`)}>
          {user.username}
        </span>
      </div>
    );
  }

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg', className)} {...props}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center',
              `bg-${identity.color}-900/20 border border-${identity.color}-700`
            )}>
              <Icon name={identity.icon} size="sm" color={identity.color} />
            </div>
            <StatusDot status={user.connected ? 'success' : 'error'} size="xs" className="absolute -bottom-1 -right-1" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-100">
                {user.username || 'Unknown'}
              </span>
              <span className={clsx(
                'px-2 py-0.5 text-xs rounded-full',
                `bg-${identity.color}-900/20 text-${identity.color}-400 border border-${identity.color}-700`
              )}>
                {identity.label}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {user.host && `${user.host}`} • {user.shell && user.shell}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size="xs" />
          </Button>
          {onEdit && (
            <Button size="xs" variant="ghost" onClick={onEdit}>
              <Icon name="Edit" size="xs" />
            </Button>
          )}
        </div>
      </div>

      {/* 详细信息 */}
      {expanded && (
        <div className="p-3 space-y-3">
          {/* 用户信息 */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">用户信息</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">用户ID:</span>
                <span className="ml-2 text-gray-300">{user.uid || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">组ID:</span>
                <span className="ml-2 text-gray-300">{user.gid || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">主目录:</span>
                <span className="ml-2 text-gray-300">{user.home || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">登录时间:</span>
                <span className="ml-2 text-gray-300">
                  {user.loginTime ? new Date(user.loginTime).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* 权限列表 */}
          {permissionList.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-2">权限</h4>
              <div className="flex flex-wrap gap-2">
                {permissionList.map((permission, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs',
                      'bg-gray-900 border border-gray-600'
                    )}
                  >
                    <Icon name={permission.icon} size="xs" className={permission.color} />
                    <span className="text-gray-300">{permission.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 用户组 */}
          {user.groups && user.groups.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-2">用户组</h4>
              <div className="flex flex-wrap gap-1">
                {user.groups.map((group, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-300"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 状态信息 */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">状态</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">连接状态:</span>
                <div className="flex items-center gap-1">
                  <StatusDot status={user.connected ? 'success' : 'error'} size="xs" />
                  <span className="text-gray-300">
                    {user.connected ? '已连接' : '未连接'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">权限级别:</span>
                <span className={clsx('font-medium', `text-${identity.color}-400`)}>
                  {identity.label}
                </span>
              </div>
              
              {user.lastActivity && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">最后活动:</span>
                  <span className="text-gray-300">
                    {new Date(user.lastActivity).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 预设组件
export const RootBadge = (props) => (
  <IdentityBadge user={{ username: 'root', uid: 0 }} {...props} />
);

export const AdminBadge = (props) => (
  <IdentityBadge user={{ username: 'admin', groups: ['sudo'] }} {...props} />
);

export const UserBadge = (props) => (
  <IdentityBadge user={{ username: 'user' }} {...props} />
);

export const ReadOnlyBadge = (props) => (
  <IdentityBadge user={{ username: 'readonly', readOnly: true }} {...props} />
);

export const CompactIdentityBadge = (props) => (
  <IdentityBadge compact={true} {...props} />
);

export const MinimalIdentityBadge = (props) => (
  <IdentityBadge variant="minimal" {...props} />
);

export default IdentityBadge;
