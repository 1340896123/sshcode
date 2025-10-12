import React, { forwardRef, useState, useMemo } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Switch';
import { Badge } from '../primitives/Badge';
import { Tooltip } from '../primitives/Tooltip';
import { FileRow } from './FileRow';

const fileTableVariants = cva(
  'w-full border-collapse bg-slate-800',
  {
    variants: {
      variant: {
        default: 'bg-slate-800',
        compact: 'bg-slate-900',
        striped: 'bg-slate-800',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const headerVariants = cva(
  'bg-slate-900 border-b border-slate-700 font-medium text-slate-300',
  {
    variants: {
      sticky: {
        true: 'sticky top-0 z-10',
        false: '',
      },
    },
    defaultVariants: {
      sticky: true,
    },
  }
);

const rowVariants = cva(
  'border-b border-slate-700 transition-colors',
  {
    variants: {
      variant: {
        default: 'hover:bg-slate-700/50',
        compact: 'hover:bg-slate-800/50',
        striped: 'hover:bg-slate-700/50 even:bg-slate-800/30',
      },
      selected: {
        true: 'bg-blue-500/10 hover:bg-blue-500/20',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'striped',
        selected: true,
        class: 'bg-blue-500/20 hover:bg-blue-500/30',
      },
    ],
    defaultVariants: {
      variant: 'default',
      selected: false,
    },
  }
);

export const FileTable = forwardRef((
  {
    className,
    variant,
    size,
    files = [],
    columns,
    selectedFiles = [],
    onSelectionChange,
    onFileClick,
    onFileDoubleClick,
    onFileRightClick,
    onSort,
    sortColumn,
    sortDirection,
    loading = false,
    error = null,
    showHeader = true,
    stickyHeader = true,
    selectable = true,
    multiSelect = true,
    showIcons = true,
    showSize = true,
    showModified = true,
    showPermissions = false,
    showOwner = false,
    emptyMessage = '没有文件或目录',
    ...props
  },
  ref
) => {
  const [selectAll, setSelectAll] = useState(false);

  const defaultColumns = [
    {
      id: 'name',
      label: '名称',
      sortable: true,
      width: 'auto',
      minWidth: '200px',
    },
    {
      id: 'size',
      label: '大小',
      sortable: true,
      width: '100px',
      align: 'right',
    },
    {
      id: 'modified',
      label: '修改时间',
      sortable: true,
      width: '150px',
    },
    {
      id: 'permissions',
      label: '权限',
      sortable: false,
      width: '120px',
    },
    {
      id: 'owner',
      label: '拥有者',
      sortable: true,
      width: '100px',
    },
  ];

  const tableColumns = useMemo(() => {
    const cols = columns || defaultColumns;
    return cols.filter(col => {
      if (!showSize && col.id === 'size') return false;
      if (!showModified && col.id === 'modified') return false;
      if (!showPermissions && col.id === 'permissions') return false;
      if (!showOwner && col.id === 'owner') return false;
      return true;
    });
  }, [columns, showSize, showModified, showPermissions, showOwner]);

  const sortedFiles = useMemo(() => {
    if (!sortColumn) return files;

    return [...files].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // 目录优先排序
      if (sortColumn === 'name') {
        const aIsDir = a.type === 'directory';
        const bIsDir = b.type === 'directory';
        if (aIsDir !== bIsDir) {
          return aIsDir ? -1 : 1;
        }
      }

      // 大小排序（转换为字节）
      if (sortColumn === 'size') {
        aValue = a.sizeBytes || 0;
        bValue = b.sizeBytes || 0;
      }

      // 时间排序
      if (sortColumn === 'modified') {
        aValue = new Date(a.modified || 0);
        bValue = new Date(b.modified || 0);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [files, sortColumn, sortDirection]);

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange?.(files.map(file => file.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleFileSelect = (fileId, checked) => {
    let newSelection;
    if (checked) {
      newSelection = multiSelect 
        ? [...selectedFiles, fileId]
        : [fileId];
    } else {
      newSelection = selectedFiles.filter(id => id !== fileId);
    }
    onSelectionChange?.(newSelection);
  };

  const handleSort = (columnId) => {
    const column = tableColumns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    let newDirection = 'asc';
    if (sortColumn === columnId && sortDirection === 'asc') {
      newDirection = 'desc';
    }

    onSort?.(columnId, newDirection);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (file) => {
    if (file.type === 'directory') {
      return file.name.startsWith('.') ? 'FolderOff' : 'Folder';
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const iconMap = {
      txt: 'FileText',
      js: 'FileCode',
      jsx: 'FileCode',
      ts: 'FileCode',
      tsx: 'FileCode',
      json: 'FileJson',
      md: 'FileText',
      pdf: 'FileText',
      zip: 'Archive',
      tar: 'Archive',
      gz: 'Archive',
      jpg: 'FileImage',
      jpeg: 'FileImage',
      png: 'FileImage',
      gif: 'FileImage',
      svg: 'FileImage',
      mp4: 'FileVideo',
      avi: 'FileVideo',
      mp3: 'FileAudio',
      wav: 'FileAudio',
    };
    
    return iconMap[ext] || 'File';
  };

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <thead className={headerVariants({ sticky: stickyHeader })}>
        <tr>
          {selectable && (
            <th className="w-10 px-3 py-2 text-left">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                aria-label="全选"
              />
            </th>
          )}
          
          {tableColumns.map((column) => (
            <th
              key={column.id}
              className={clsx(
                'px-3 py-2 text-left font-medium',
                column.align === 'right' && 'text-right',
                column.align === 'center' && 'text-center'
              )}
              style={{ width: column.width, minWidth: column.minWidth }}
            >
              {column.sortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-slate-300 hover:text-white"
                  onClick={() => handleSort(column.id)}
                >
                  {column.label}
                  {sortColumn === column.id && (
                    <Icon 
                      name={sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown'} 
                      className="w-3 h-3 ml-1" 
                    />
                  )}
                </Button>
              ) : (
                column.label
              )}
            </th>
          ))}
          
          <th className="w-10 px-3 py-2 text-right">
            {/* 操作列 */}
          </th>
        </tr>
      </thead>
    );
  };

  const renderEmpty = () => (
    <tbody>
      <tr>
        <td 
          colSpan={tableColumns.length + (selectable ? 2 : 0)}
          className="px-4 py-8 text-center text-slate-500"
        >
          <div className="flex flex-col items-center space-y-2">
            <Icon name="FolderOpen" className="w-12 h-12 text-slate-600" />
            <span>{emptyMessage}</span>
          </div>
        </td>
      </tr>
    </tbody>
  );

  const renderError = () => (
    <tbody>
      <tr>
        <td 
          colSpan={tableColumns.length + (selectable ? 2 : 0)}
          className="px-4 py-8 text-center text-red-400"
        >
          <div className="flex flex-col items-center space-y-2">
            <Icon name="AlertCircle" className="w-12 h-12 text-red-500" />
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              重试
            </Button>
          </div>
        </td>
      </tr>
    </tbody>
  );

  const renderLoading = () => (
    <tbody>
      <tr>
        <td 
          colSpan={tableColumns.length + (selectable ? 2 : 0)}
          className="px-4 py-8 text-center text-slate-500"
        >
          <div className="flex flex-col items-center space-y-2">
            <Icon name="Loader2" className="w-8 h-8 animate-spin" />
            <span>加载中...</span>
          </div>
        </td>
      </tr>
    </tbody>
  );

  const renderBody = () => (
    <tbody>
      {sortedFiles.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          columns={tableColumns}
          selected={selectedFiles.includes(file.id)}
          onSelect={(checked) => handleFileSelect(file.id, checked)}
          onClick={() => onFileClick?.(file)}
          onDoubleClick={() => onFileDoubleClick?.(file)}
          onRightClick={(e) => onFileRightClick?.(file, e)}
          showIcon={showIcons}
          formatFileSize={formatFileSize}
          formatDate={formatDate}
          getFileIcon={getFileIcon}
          variant={variant}
          size={size}
          className={rowVariants({ 
            variant, 
            selected: selectedFiles.includes(file.id) 
          })}
        />
      ))}
    </tbody>
  );

  return (
    <div className="overflow-auto">
      <table
        ref={ref}
        className={clsx(fileTableVariants({ variant, size, className }))}
        {...props}
      >
        {renderHeader()}
        {loading ? renderLoading() : error ? renderError() : sortedFiles.length === 0 ? renderEmpty() : renderBody()}
      </table>
    </div>
  );
});

FileTable.displayName = 'FileTable';
