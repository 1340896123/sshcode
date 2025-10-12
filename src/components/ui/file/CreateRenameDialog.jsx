import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
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

export const CreateRenameDialog = forwardRef((
  {
    className,
    size,
    open,
    onClose,
    onConfirm,
    mode = 'create', // 'create' | 'rename' | 'duplicate'
    itemType = 'file', // 'file' | 'folder'
    initialName = '',
    initialPath = '/',
    loading = false,
    error = null,
    validationRules = {},
    showPathInput = false,
    availableTemplates = [],
    ...props
  },
  ref
) => {
  const [name, setName] = useState(initialName);
  const [path, setPath] = useState(initialPath);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const inputRef = useRef(null);

  const titles = {
    create: {
      file: '新建文件',
      folder: '新建文件夹',
    },
    rename: {
      file: '重命名文件',
      folder: '重命名文件夹',
    },
    duplicate: {
      file: '复制文件',
      folder: '复制文件夹',
    },
  };

  const descriptions = {
    create: {
      file: '输入文件名称以创建新文件',
      folder: '输入文件夹名称以创建新文件夹',
    },
    rename: {
      file: '输入新的文件名称',
      folder: '输入新的文件夹名称',
    },
    duplicate: {
      file: '输入复制后的文件名称',
      folder: '输入复制后的文件夹名称',
    },
  };

  const title = titles[mode][itemType];
  const description = descriptions[mode][itemType];

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  useEffect(() => {
    setName(initialName);
    setPath(initialPath);
    setValidationErrors({});
    setSelectedTemplate(null);
  }, [open, initialName, initialPath]);

  const validateName = (value) => {
    const errors = {};
    
    // 必填验证
    if (!value || value.trim().length === 0) {
      errors.required = '名称不能为空';
    }
    
    // 长度验证
    if (value && (value.length < 1 || value.length > 255)) {
      errors.length = '名称长度必须在 1-255 个字符之间';
    }
    
    // 特殊字符验证
    const invalidChars = /[<>:"/\\|?*]/;
    if (value && invalidChars.test(value)) {
      errors.chars = '名称不能包含以下字符: < > : " / \\ | ? *';
    }
    
    // 文件扩展名验证（仅文件）
    if (itemType === 'file' && mode === 'create') {
      const hasExtension = /\.[^.]+$/.test(value);
      if (!hasExtension && value) {
        errors.extension = '文件必须包含扩展名';
      }
    }
    
    // 自定义验证规则
    if (validationRules.required && !value) {
      errors.required = validationRules.required || '名称不能为空';
    }
    
    if (validationRules.pattern && value && !validationRules.pattern.test(value)) {
      errors.pattern = validationRules.message || '名称格式不正确';
    }
    
    if (validationRules.minLength && value.length < validationRules.minLength) {
      errors.minLength = `名称至少需要 ${validationRules.minLength} 个字符`;
    }
    
    if (validationRules.maxLength && value.length > validationRules.maxLength) {
      errors.maxLength = `名称不能超过 ${validationRules.maxLength} 个字符`;
    }
    
    return errors;
  };

  const handleNameChange = (value) => {
    setName(value);
    const errors = validateName(value);
    setValidationErrors(errors);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setName(template.name);
    setValidationErrors(validateName(template.name));
  };

  const handleConfirm = () => {
    const errors = validateName(name);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const data = {
      name: name.trim(),
      path: path.trim(),
      type: itemType,
      template: selectedTemplate,
    };
    
    onConfirm?.(data);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'create':
        return itemType === 'folder' ? 'FolderPlus' : 'FilePlus';
      case 'rename':
        return 'Edit3';
      case 'duplicate':
        return 'Copy';
      default:
        return 'File';
    }
  };

  const getConfirmText = () => {
    switch (mode) {
      case 'create':
        return '创建';
      case 'rename':
        return '重命名';
      case 'duplicate':
        return '复制';
      default:
        return '确认';
    }
  };

  const isConfirmDisabled = loading || Object.keys(validationErrors).length > 0 || !name.trim();

  const renderTemplateSection = () => {
    if (mode !== 'create' || availableTemplates.length === 0) return null;

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300">
          选择模板 (可选)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableTemplates.map((template) => (
            <button
              key={template.id}
              className={clsx(
                'p-3 border rounded-lg text-left transition-colors',
                selectedTemplate?.id === template.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 hover:bg-slate-700/50'
              )}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Icon name={template.icon || 'File'} className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">
                  {template.name}
                </span>
              </div>
              {template.description && (
                <p className="text-xs text-slate-500">
                  {template.description}
                </p>
              )}
              {template.badge && (
                <Badge variant="secondary" size="sm" className="mt-1">
                  {template.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderPathSection = () => {
    if (!showPathInput) return null;

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          路径
        </label>
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder={initialPath}
          className="w-full font-mono"
        />
      </div>
    );
  };

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={onClose}
      size={size}
      className={clsx(dialogVariants({ size }), className)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {/* 头部 */}
      <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg">
          <Icon name={getIcon()} className="w-5 h-5 text-blue-400" />
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
        {/* 模板选择 */}
        {renderTemplateSection()}

        {/* 名称输入 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            {mode === 'rename' ? '新名称' : '名称'}
          </label>
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={itemType === 'folder' ? '文件夹名称' : '文件名.扩展名'}
            className={clsx(
              'w-full',
              validationErrors.required && 'border-red-500 focus:border-red-500'
            )}
            errorMessage={validationErrors.required || validationErrors.length || validationErrors.chars || validationErrors.extension || validationErrors.pattern}
          />
          
          {/* 其他验证错误 */}
          {Object.keys(validationErrors).map((key) => (
            validationErrors[key] && key !== 'required' && key !== 'length' && key !== 'chars' && key !== 'extension' && key !== 'pattern' && (
              <div key={key} className="text-xs text-red-400 mt-1">
                {validationErrors[key]}
              </div>
            )
          ))}
        </div>

        {/* 路径输入 */}
        {renderPathSection()}

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
          <div>• 名称不能为空</div>
          <div>• 不能包含字符: {'<'} {'>'} : " / \ | ? *</div>
          {itemType === 'file' && mode === 'create' && (
            <div>• 文件必须包含扩展名 (如: .txt, .js, .md)</div>
          )}
          <div>• 按 Enter 确认，Esc 取消</div>
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
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          loading={loading}
        >
          {getConfirmText()}
        </Button>
      </div>
    </Modal>
  );
});

CreateRenameDialog.displayName = 'CreateRenameDialog';

// 快速创建对话框
export const QuickCreateDialog = forwardRef((props, ref) => (
  <CreateRenameDialog
    ref={ref}
    mode="create"
    size="sm"
    showPathInput={false}
    {...props}
  />
));

QuickCreateDialog.displayName = 'QuickCreateDialog';

// 重命名对话框
export const RenameDialog = forwardRef((props, ref) => (
  <CreateRenameDialog
    ref={ref}
    mode="rename"
    size="sm"
    showPathInput={false}
    {...props}
  />
));

RenameDialog.displayName = 'RenameDialog';
