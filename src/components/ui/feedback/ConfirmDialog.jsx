import React, { forwardRef, useState } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import Button from '../primitives/Button';
import Input from '../primitives/Input';
import Textarea from '../primitives/Textarea';
import Switch from '../primitives/Switch';
import Modal from '../feedback/Modal';

/**
 * ConfirmDialog组件 - 确认对话框
 */
const confirmDialogVariants = createVariants(
  '',
  {
    variant: {
      default: '',
      danger: '',
      warning: '',
      info: '',
      success: ''
    },
    size: {
      sm: '',
      md: '',
      lg: ''
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const ConfirmDialog = forwardRef(({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  type = 'default', // default | danger | warning | info | success
  loading = false,
  disabled = false,
  showIcon = true,
  requireConfirmation = false,
  confirmationText,
  confirmationPlaceholder,
  showDetails = false,
  details,
  showCheckbox = false,
  checkboxLabel,
  checkboxRequired = false,
  size = 'md',
  className,
  ...props
}, ref) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(showDetails);

  const getTypeConfig = (dialogType) => {
    const configs = {
      default: {
        icon: 'AlertCircle',
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-800/50',
        confirmVariant: 'solid'
      },
      danger: {
        icon: 'AlertTriangle',
        iconColor: 'text-red-500',
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-800/50',
        confirmVariant: 'solid'
      },
      warning: {
        icon: 'AlertTriangle',
        iconColor: 'text-yellow-500',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-800/50',
        confirmVariant: 'solid'
      },
      info: {
        icon: 'Info',
        iconColor: 'text-cyan-500',
        bgColor: 'bg-cyan-900/20',
        borderColor: 'border-cyan-800/50',
        confirmVariant: 'solid'
      },
      success: {
        icon: 'CheckCircle',
        iconColor: 'text-green-500',
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-800/50',
        confirmVariant: 'solid'
      }
    };
    return configs[dialogType] || configs.default;
  };

  const typeConfig = getTypeConfig(type);

  const isConfirmDisabled = () => {
    if (disabled || loading) return true;
    if (requireConfirmation && confirmationInput !== confirmationText) return true;
    if (showCheckbox && checkboxRequired && !checkboxChecked) return true;
    return false;
  };

  const handleConfirm = () => {
    if (!isConfirmDisabled()) {
      onConfirm?.({
        confirmation: confirmationInput,
        checkbox: checkboxChecked
      });
    }
  };

  const handleClose = () => {
    if (!loading) {
      setConfirmationInput('');
      setCheckboxChecked(false);
      onClose?.();
    }
  };

  return (
    <Modal
      ref={ref}
      isOpen={isOpen}
      onClose={handleClose}
      size={size}
      className={className}
      {...props}
    >
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-start gap-4">
          {showIcon && (
            <div className={cn(
              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
              typeConfig.bgColor
            )}>
              <Icon 
                name={typeConfig.icon} 
                size={24} 
                className={typeConfig.iconColor}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-100">
              {title}
            </h3>
            
            {message && (
              <p className="text-gray-300 mt-2">
                {message}
              </p>
            )}
            
            {description && (
              <p className="text-sm text-gray-500 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* 确认输入 */}
        {requireConfirmation && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              请输入 <span className="font-mono bg-gray-800 px-1 rounded">{confirmationText}</span> 以确认操作
            </label>
            <Input
              value={confirmationInput}
              onChange={setConfirmationInput}
              placeholder={confirmationPlaceholder || `输入 "${confirmationText}"`}
              className="font-mono"
              disabled={loading}
            />
          </div>
        )}

        {/* 复选框 */}
        {showCheckbox && (
          <div className="flex items-center gap-2">
            <Switch
              checked={checkboxChecked}
              onChange={setCheckboxChecked}
              disabled={loading}
            />
            <label className="text-sm text-gray-300">
              {checkboxLabel}
            </label>
            {checkboxRequired && (
              <Badge variant="outline" size="xs">
                必需
              </Badge>
            )}
          </div>
        )}

        {/* 详情面板 */}
        {details && (
          <div className="space-y-2">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              onClick={() => setShowDetailsPanel(!showDetailsPanel)}
            >
              <Icon 
                name={showDetailsPanel ? 'ChevronDown' : 'ChevronRight'} 
                size={14} 
              />
              {showDetailsPanel ? '隐藏详情' : '显示详情'}
            </button>
            
            {showDetailsPanel && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                {typeof details === 'string' ? (
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                    {details}
                  </pre>
                ) : React.isValidElement(details) ? (
                  details
                ) : (
                  <div className="space-y-2">
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="text-sm font-medium text-gray-400 min-w-20">
                          {key}:
                        </span>
                        <span className="text-sm text-gray-300 flex-1">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'solid' : typeConfig.confirmVariant}
            onClick={handleConfirm}
            loading={loading}
            disabled={isConfirmDisabled()}
            className={type === 'danger' && 'bg-red-600 hover:bg-red-700'}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';

export default ConfirmDialog;

/**
 * DeleteConfirmDialog组件 - 删除确认对话框
 */
export const DeleteConfirmDialog = forwardRef(({
  itemName,
  itemType = '项目',
  additionalInfo,
  ...props
}, ref) => {
  const title = `删除${itemType}`;
  const message = `确定要删除${itemType} "${itemName}" 吗？`;
  const description = additionalInfo || '此操作不可撤销，请谨慎操作。';

  return (
    <ConfirmDialog
      ref={ref}
      title={title}
      message={message}
      description={description}
      type="danger"
      confirmText="删除"
      cancelText="取消"
      showIcon={true}
      {...props}
    />
  );
});

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';

/**
 * DisconnectConfirmDialog组件 - 断开连接确认对话框
 */
export const DisconnectConfirmDialog = forwardRef(({
  connectionName,
  hasActiveTransfers = false,
  ...props
}, ref) => {
  const title = '断开连接';
  const message = `确定要断开与 "${connectionName}" 的连接吗？`;
  const description = hasActiveTransfers 
    ? '警告：当前有正在进行的文件传输，断开连接将中断所有传输任务。'
    : '断开连接后，当前会话将结束。';

  return (
    <ConfirmDialog
      ref={ref}
      title={title}
      message={message}
      description={description}
      type="warning"
      confirmText="断开连接"
      cancelText="取消"
      showIcon={true}
      {...props}
    />
  );
});

DisconnectConfirmDialog.displayName = 'DisconnectConfirmDialog';

/**
 * OverwriteConfirmDialog组件 - 覆盖确认对话框
 */
export const OverwriteConfirmDialog = forwardRef(({
  fileName,
  targetPath,
  sourceInfo,
  targetInfo,
  showApplyToAll = false,
  ...props
}, ref) => {
  const title = '文件已存在';
  const message = `目标位置已存在文件 "${fileName}"`;
  
  const details = (
    <div className="space-y-3">
      {sourceInfo && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">源文件：</h4>
          <div className="bg-gray-900 rounded p-2 text-xs text-gray-400 space-y-1">
            {sourceInfo.path && <div>路径: {sourceInfo.path}</div>}
            {sourceInfo.size && <div>大小: {sourceInfo.size}</div>}
            {sourceInfo.modified && <div>修改时间: {sourceInfo.modified}</div>}
          </div>
        </div>
      )}
      
      {targetInfo && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">目标文件：</h4>
          <div className="bg-gray-900 rounded p-2 text-xs text-gray-400 space-y-1">
            {targetInfo.path && <div>路径: {targetInfo.path}</div>}
            {targetInfo.size && <div>大小: {targetInfo.size}</div>}
            {targetInfo.modified && <div>修改时间: {targetInfo.modified}</div>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ConfirmDialog
      ref={ref}
      title={title}
      message={message}
      details={details}
      type="warning"
      confirmText="覆盖"
      cancelText="取消"
      showCheckbox={showApplyToAll}
      checkboxLabel="应用到所有冲突"
      showDetails={true}
      {...props}
    />
  );
});

OverwriteConfirmDialog.displayName = 'OverwriteConfirmDialog';

/**
 * BatchOperationConfirmDialog组件 - 批量操作确认对话框
 */
export const BatchOperationConfirmDialog = forwardRef(({
  operation,
  items,
  itemType = '项目',
  operationIcon,
  ...props
}, ref) => {
  const operationText = {
    delete: '删除',
    move: '移动',
    copy: '复制',
    download: '下载',
    upload: '上传'
  };

  const operationIcons = {
    delete: 'Trash2',
    move: 'Move',
    copy: 'Copy',
    download: 'Download',
    upload: 'Upload'
  };

  const title = `${operationText[operation]}${itemType}`;
  const message = `确定要${operationText[operation]} ${items.length} 个${itemType}吗？`;
  
  const details = (
    <div className="space-y-1">
      <div className="text-sm text-gray-300 mb-2">
        将要{operationText[operation]}的{itemType}：
      </div>
      <div className="bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="text-xs text-gray-400 py-1">
            {typeof item === 'string' ? item : item.name || item.path}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ConfirmDialog
      ref={ref}
      title={title}
      message={message}
      details={details}
      type={operation === 'delete' ? 'danger' : 'warning'}
      confirmText={`确认${operationText[operation]}`}
      cancelText="取消"
      showIcon={true}
      showDetails={true}
      {...props}
    />
  );
});

BatchOperationConfirmDialog.displayName = 'BatchOperationConfirmDialog';

/**
 * SettingsChangeConfirmDialog组件 - 设置更改确认对话框
 */
export const SettingsChangeConfirmDialog = forwardRef(({
  settingName,
  currentValue,
  newValue,
  requiresRestart = false,
  ...props
}, ref) => {
  const title = '更改设置';
  const message = `确定要更改 "${settingName}" 设置吗？`;
  
  const details = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">当前值:</span>
        <span className="text-sm font-mono text-gray-300">{String(currentValue)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">新值:</span>
        <span className="text-sm font-mono text-blue-400">{String(newValue)}</span>
      </div>
      {requiresRestart && (
        <div className="flex items-center gap-2 text-yellow-400">
          <Icon name="AlertTriangle" size={14} />
          <span className="text-sm">此更改需要重启应用后生效</span>
        </div>
      )}
    </div>
  );

  return (
    <ConfirmDialog
      ref={ref}
      title={title}
      message={message}
      details={details}
      type="info"
      confirmText="应用更改"
      cancelText="取消"
      showDetails={true}
      {...props}
    />
  );
});

SettingsChangeConfirmDialog.displayName = 'SettingsChangeConfirmDialog';
