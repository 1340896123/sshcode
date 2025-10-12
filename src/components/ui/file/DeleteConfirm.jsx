import React, { forwardRef, useState, useEffect } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Switch';
import { Modal } from '../feedback/Modal';
import { Badge } from '../primitives/Badge';

const dialogVariants = cva(
  'bg-slate-900 border border-slate-700 rounded-lg shadow-xl',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const DeleteConfirm = forwardRef((
  {
    className,
    size,
    open,
    onClose,
    onConfirm,
    files = [],
    loading = false,
    error = null,
    showPermanentOption = false,
    showFilesList = true,
    confirmText = '删除',
    dangerText = '永久删除',
    ...props
  },
  ref
) => {
  const [permanentDelete, setPermanentDelete] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const hasMultipleFiles = files.length > 1;
  const hasDirectories = files.some(file => file.type === 'directory');
  const hasProtectedFiles = files.some(file => file.protected);
  const hasLargeFiles = files.some(file => file.sizeBytes > 100 * 1024 * 1024); // 100MB

  const totalSize = files.reduce((sum, file) => sum + (file.sizeBytes || 0), 0);
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getDangerousActions = () => {
    const actions = [];
    
    if (hasDirectories) {
      actions.push('删除目录及其所有内容');
    }
    
    if (hasProtectedFiles) {
      actions.push('删除受保护的文件');
    }
    
    if (totalSize > 1024 * 1024 * 1024) { // 1GB
      actions.push('删除大量数据');
    }
    
    return actions;
  };

  const getConfirmRequirement = () => {
    if (hasMultipleFiles) {
      return `请输入 "delete ${files.length}" 来确认`;
    }
    
    if (files[0]?.type === 'directory') {
      return `请输入 "delete directory" 来确认`;
    }
    
    return '请输入 "delete" 来确认';
  };

  const getExpectedInput = () => {
    if (hasMultipleFiles) {
      return `delete ${files.length}`;
    }
    
    if (files[0]?.type === 'directory') {
      return 'delete directory';
    }
    
    return 'delete';
  };

  useEffect(() => {
    if (open) {
      setPermanentDelete(false);
      setConfirmInput('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (hasMultipleFiles || files[0]?.type === 'directory') {
      if (confirmInput !== getExpectedInput()) {
        return;
      }
    }
    
    onConfirm?.({
      files,
      permanent: permanentDelete,
    });
  };

  const isConfirmDisabled = loading || 
    (hasMultipleFiles && confirmInput !== `delete ${files.length}`) ||
    (files.length === 1 && files[0]?.type === 'directory' && confirmInput !== 'delete directory') ||
    (files.length === 1 && files[0]?.type !== 'directory' && confirmInput !== 'delete');

  const renderFileList = () => {
    if (!showFilesList) return null;

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-300">
          将删除以下 {hasMultipleFiles ? '项目' : '项目'}:
        </div>
        <div className={clsx(
          'max-h-40 overflow-auto bg-slate-800/50 border border-slate-600 rounded-lg',
          files.length > 5 && 'p-2',
          files.length <= 5 && 'p-3'
        )}>
          {files.map((file, index) => (
            <div
              key={file.id || index}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <Icon 
                  name={file.type === 'directory' ? 'Folder' : 'File'} 
                  className={clsx(
                    'w-4 h-4 flex-shrink-0',
                    file.type === 'directory' ? 'text-blue-400' : 'text-slate-400'
                  )} 
                />
                <span className="text-sm text-slate-300 truncate">
                  {file.name}
                </span>
                {file.protected && (
                  <Badge variant="warning" size="sm">
                    受保护
                  </Badge>
                )}
              </div>
              <div className="text-xs text-slate-500 ml-2">
                {file.type !== 'directory' && formatFileSize(file.sizeBytes)}
              </div>
            </div>
          ))}
        </div>
        
        {/* 总计信息 */}
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>总计: {files.length} 项</span>
          {totalSize > 0 && (
            <span>{formatFileSize(totalSize)}</span>
          )}
        </div>
      </div>
    );
  };

  const renderWarningSection = () => {
    const dangerousActions = getDangerousActions();
    if (dangerousActions.length === 0) return null;

    return (
      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <div className="flex items-start space-x-2">
          <Icon name="AlertTriangle" className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-400">
            <div className="font-medium mb-1">警告</div>
            <ul className="space-y-1 text-xs">
              {dangerousActions.map((action, index) => (
                <li key={index}>• {action}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmInput = () => {
    if (!hasMultipleFiles && files[0]?.type !== 'directory') return null;

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          确认操作
        </label>
        <input
          type="text"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          placeholder={getExpectedInput()}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="text-xs text-slate-500">
          {getConfirmRequirement()}
        </div>
      </div>
    );
  };

  const renderPermanentOption = () => {
    if (!showPermanentOption) return null;

    return (
      <div className="flex items-center space-x-2 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
        <Checkbox
          checked={permanentDelete}
          onCheckedChange={setPermanentDelete}
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-300">
            永久删除
          </div>
          <div className="text-xs text-slate-500">
            跳过回收站，无法恢复
          </div>
        </div>
      </div>
    );
  };

  const title = hasMultipleFiles 
    ? `删除 ${files.length} 个项目` 
    : `删除 "${files[0]?.name}"`;

  const description = hasMultipleFiles
    ? '此操作将删除选定的文件和文件夹'
    : '此操作将删除选定的项目';

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={onClose}
      size={size}
      className={clsx(dialogVariants({ size }), className)}
      {...props}
    >
      {/* 头部 */}
      <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-center w-10 h-10 bg-red-500/10 rounded-lg">
          <Icon name="Trash2" className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {/* 内容 */}
      <div className="px-6 py-4 space-y-4">
        {/* 文件列表 */}
        {renderFileList()}

        {/* 警告信息 */}
        {renderWarningSection()}

        {/* 永久删除选项 */}
        {renderPermanentOption()}

        {/* 确认输入 */}
        {renderConfirmInput()}

        {/* 错误信息 */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <Icon name="AlertCircle" className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">
              {error}
            </span>
          </div>
        )}

        {/* 帮助信息 */}
        <div className="text-xs text-slate-500 space-y-1">
          <div>• 删除的文件将移至回收站</div>
          <div>• 可以从回收站恢复删除的文件</div>
          {showPermanentOption && (
            <div>• 永久删除的文件无法恢复</div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          取消
        </Button>

        <Button
          variant={permanentDelete ? 'solid' : 'outline'}
          className={permanentDelete ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white' : 'border-red-600 text-red-400 hover:bg-red-600/10'}
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          loading={loading}
        >
          {permanentDelete ? dangerText : confirmText}
        </Button>
      </div>
    </Modal>
  );
});

DeleteConfirm.displayName = 'DeleteConfirm';

// 快速删除确认
export const QuickDeleteConfirm = forwardRef((props, ref) => (
  <DeleteConfirm
    ref={ref}
    size="sm"
    showFilesList={false}
    showPermanentOption={false}
    {...props}
  />
));

QuickDeleteConfirm.displayName = 'QuickDeleteConfirm';

// 批量删除确认
export const BatchDeleteConfirm = forwardRef((props, ref) => (
  <DeleteConfirm
    ref={ref}
    size="lg"
    showFilesList={true}
    showPermanentOption={true}
    {...props}
  />
));

BatchDeleteConfirm.displayName = 'BatchDeleteConfirm';
