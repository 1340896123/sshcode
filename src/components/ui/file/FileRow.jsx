import React, { forwardRef } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Badge } from '../primitives/Badge';
import { Tooltip } from '../primitives/Tooltip';
import { Checkbox } from '../primitives/Switch';

export const FileRow = forwardRef((
  {
    className,
    file,
    columns,
    selected = false,
    onSelect,
    onClick,
    onDoubleClick,
    onRightClick,
    showIcon = true,
    formatFileSize,
    formatDate,
    getFileIcon,
    variant = 'default',
    size = 'md',
    ...props
  },
  ref
) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    } else if (e.key === 'ContextMenu') {
      e.preventDefault();
      onRightClick?.(e);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    onRightClick?.(e);
  };

  const getIconColor = (file) => {
    if (file.type === 'directory') {
      return file.name.startsWith('.') ? 'text-slate-500' : 'text-blue-400';
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const colorMap = {
      // 代码文件
      js: 'text-yellow-400',
      jsx: 'text-yellow-400',
      ts: 'text-blue-400',
      tsx: 'text-blue-400',
      json: 'text-green-400',
      xml: 'text-orange-400',
      html: 'text-orange-400',
      css: 'text-blue-500',
      scss: 'text-pink-400',
      less: 'text-blue-600',
      
      // 文档文件
      md: 'text-slate-400',
      txt: 'text-slate-400',
      pdf: 'text-red-500',
      doc: 'text-blue-500',
      docx: 'text-blue-500',
      
      // 压缩文件
      zip: 'text-purple-400',
      tar: 'text-purple-400',
      gz: 'text-purple-400',
      rar: 'text-purple-400',
      '7z': 'text-purple-400',
      
      // 图片文件
      jpg: 'text-green-400',
      jpeg: 'text-green-400',
      png: 'text-green-400',
      gif: 'text-green-400',
      svg: 'text-green-400',
      webp: 'text-green-400',
      
      // 视频文件
      mp4: 'text-red-400',
      avi: 'text-red-400',
      mov: 'text-red-400',
      wmv: 'text-red-400',
      flv: 'text-red-400',
      
      // 音频文件
      mp3: 'text-pink-400',
      wav: 'text-pink-400',
      flac: 'text-pink-400',
      aac: 'text-pink-400',
      ogg: 'text-pink-400',
      
      // 可执行文件
      exe: 'text-slate-500',
      sh: 'text-green-500',
      bat: 'text-slate-500',
      ps1: 'text-blue-500',
    };
    
    return colorMap[ext] || 'text-slate-400';
  };

  const getPermissionsColor = (permissions) => {
    if (!permissions) return '';
    
    // 检查是否为可写权限
    if (permissions.includes('w')) {
      return 'text-green-400';
    }
    // 检查是否为只读权限
    if (permissions.includes('r') && !permissions.includes('w')) {
      return 'text-yellow-400';
    }
    // 检查是否为无权限
    if (!permissions.includes('r') && !permissions.includes('w') && !permissions.includes('x')) {
      return 'text-red-400';
    }
    
    return 'text-slate-400';
  };

  const renderCell = (column) => {
    const value = file[column.id];
    
    switch (column.id) {
      case 'name':
        return (
          <div className="flex items-center space-x-2 min-w-0">
            {showIcon && (
              <Icon 
                name={getFileIcon?.(file) || 'File'} 
                className={clsx(
                  'w-4 h-4 flex-shrink-0',
                  getIconColor(file)
                )} 
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-slate-300">
                {file.name}
              </div>
              {file.description && (
                <div className="text-xs text-slate-500 truncate">
                  {file.description}
                </div>
              )}
            </div>
            {file.tags?.length > 0 && (
              <div className="flex items-center space-x-1">
                {file.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="secondary" size="sm">
                    {tag}
                  </Badge>
                ))}
                {file.tags.length > 2 && (
                  <Badge variant="secondary" size="sm">
                    +{file.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
        
      case 'size':
        return (
          <div className={clsx('font-mono', column.align === 'right' && 'text-right')}>
            {formatFileSize?.(file.sizeBytes || file.size)}
          </div>
        );
        
      case 'modified':
        return (
          <div className="text-slate-400">
            {formatDate?.(file.modified)}
          </div>
        );
        
      case 'permissions':
        return (
          <div className={clsx(
            'font-mono text-sm',
            getPermissionsColor(file.permissions)
          )}>
            {file.permissions || '-'}
          </div>
        );
        
      case 'owner':
        return (
          <div className="flex items-center space-x-2">
            <span className="text-slate-300">{file.owner || '-'}</span>
            {file.group && (
              <span className="text-slate-500 text-xs">:{file.group}</span>
            )}
          </div>
        );
        
      default:
        return (
          <div className="text-slate-300">
            {value || '-'}
          </div>
        );
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  return (
    <tr
      ref={ref}
      className={clsx(
        'cursor-pointer transition-colors',
        selected && 'bg-blue-500/10 hover:bg-blue-500/20',
        !selected && 'hover:bg-slate-700/50',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      role="row"
      aria-selected={selected}
      tabIndex={0}
      {...props}
    >
      {/* 选择框 */}
      {onSelect && (
        <td className="w-10">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={`选择 ${file.name}`}
          />
        </td>
      )}
      
      {/* 数据列 */}
      {columns.map((column) => (
        <td
          key={column.id}
          className={clsx(
            'border-slate-700',
            column.align === 'right' && 'text-right',
            column.align === 'center' && 'text-center'
          )}
          style={{ width: column.width }}
        >
          {renderCell(column)}
        </td>
      ))}
      
      {/* 操作列 */}
      <td className="w-10 text-right">
        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {file.type === 'directory' && (
            <Tooltip content="进入目录">
              <button
                className="p-1 hover:bg-slate-600 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
                aria-label={`进入 ${file.name}`}
              >
                <Icon name="ArrowRight" className="w-3 h-3" />
              </button>
            </Tooltip>
          )}
          
          <Tooltip content="更多操作">
            <button
              className="p-1 hover:bg-slate-600 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onRightClick?.(e);
              }}
              aria-label={`操作 ${file.name}`}
            >
              <Icon name="MoreVertical" className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
});

FileRow.displayName = 'FileRow';

// 文件行状态指示器
export const FileRowStatus = forwardRef((
  { 
    file, 
    showStatus = true,
    className,
    ...props 
  },
  ref
) => {
  if (!showStatus) return null;

  const getStatusIcon = () => {
    if (file.uploading) return 'Upload';
    if (file.downloading) return 'Download';
    if (file.syncing) return 'Sync';
    if (file.error) return 'AlertCircle';
    if (file.locked) return 'Lock';
    if (file.shared) return 'Share2';
    if (file.starred) return 'Star';
    return null;
  };

  const getStatusColor = () => {
    if (file.uploading || file.downloading || file.syncing) return 'text-blue-400';
    if (file.error) return 'text-red-400';
    if (file.locked) return 'text-orange-400';
    if (file.shared) return 'text-green-400';
    if (file.starred) return 'text-yellow-400';
    return '';
  };

  const statusIcon = getStatusIcon();
  if (!statusIcon) return null;

  return (
    <Tooltip content={file.statusText || '状态信息'}>
      <div
        ref={ref}
        className={clsx('flex items-center', getStatusColor(), className)}
        {...props}
      >
        <Icon 
          name={statusIcon} 
          className={clsx(
            'w-3 h-3',
            (file.uploading || file.downloading || file.syncing) && 'animate-spin'
          )} 
        />
      </div>
    </Tooltip>
  );
});

FileRowStatus.displayName = 'FileRowStatus';
