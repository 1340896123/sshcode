import React, { forwardRef, useState, useEffect } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Checkbox } from '../primitives/Switch';
import { Modal } from '../feedback/Modal';
import { Badge } from '../primitives/Badge';
import { Tooltip } from '../primitives/Tooltip';

const permissionEditorVariants = cva(
  'bg-slate-900 border border-slate-700 rounded-lg shadow-xl',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const permissionGridVariants = cva(
  'grid gap-4',
  {
    variants: {
      layout: {
        compact: 'grid-cols-1',
        standard: 'grid-cols-3',
        detailed: 'grid-cols-4',
      },
    },
    defaultVariants: {
      layout: 'standard',
    },
  }
);

export const PermissionEditor = forwardRef((
  {
    className,
    size,
    open,
    onClose,
    onConfirm,
    files = [],
    initialPermissions = {},
    loading = false,
    error = null,
    showAdvanced = true,
    showRecursive = true,
    showOwnerGroup = true,
    ...props
  },
  ref
) => {
  const [permissions, setPermissions] = useState({
    owner: { read: true, write: true, execute: false },
    group: { read: true, write: false, execute: false },
    other: { read: true, write: false, execute: false },
  });
  
  const [numericMode, setNumericMode] = useState('755');
  const [owner, setOwner] = useState('');
  const [group, setGroup] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const hasMultipleFiles = files.length > 1;
  const hasDirectories = files.some(file => file.type === 'directory');

  useEffect(() => {
    if (open) {
      // 初始化权限设置
      if (initialPermissions && Object.keys(initialPermissions).length > 0) {
        setPermissions(initialPermissions);
        setNumericMode(permissionsToNumeric(initialPermissions));
      } else {
        // 默认权限
        const defaultPerms = hasDirectories ? {
          owner: { read: true, write: true, execute: true },
          group: { read: true, write: false, execute: true },
          other: { read: true, write: false, execute: true },
        } : {
          owner: { read: true, write: true, execute: false },
          group: { read: true, write: false, execute: false },
          other: { read: true, write: false, execute: false },
        };
        setPermissions(defaultPerms);
        setNumericMode(permissionsToNumeric(defaultPerms));
      }
      
      // 设置所有者和组
      if (files.length === 1) {
        setOwner(files[0].owner || '');
        setGroup(files[0].group || '');
      }
    }
  }, [open, initialPermissions, files, hasDirectories]);

  const permissionsToNumeric = (perms) => {
    const toOctal = (perm) => {
      let value = 0;
      if (perm.read) value += 4;
      if (perm.write) value += 2;
      if (perm.execute) value += 1;
      return value;
    };
    
    return `${toOctal(perms.owner)}${toOctal(perms.group)}${toOctal(perms.other)}`;
  };

  const numericToPermissions = (numeric) => {
    const parseOctal = (digit) => ({
      read: (digit & 4) !== 0,
      write: (digit & 2) !== 0,
      execute: (digit & 1) !== 0,
    });
    
    const match = numeric.match(/^([0-7])([0-7])([0-7])$/);
    if (!match) return permissions;
    
    return {
      owner: parseOctal(parseInt(match[1])),
      group: parseOctal(parseInt(match[2])),
      other: parseOctal(parseInt(match[3])),
    };
  };

  const handlePermissionChange = (category, permission, value) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: value,
      },
    }));
    
    // 更新数字模式
    const newPerms = {
      ...permissions,
      [category]: {
        ...permissions[category],
        [permission]: value,
      },
    };
    setNumericMode(permissionsToNumeric(newPerms));
  };

  const handleNumericChange = (value) => {
    // 只允许输入 0-7 的数字
    const cleanValue = value.replace(/[^0-7]/g, '').slice(0, 3);
    setNumericMode(cleanValue);
    
    if (cleanValue.length === 3) {
      const newPerms = numericToPermissions(cleanValue);
      setPermissions(newPerms);
    }
  };

  const handlePresetSelect = (preset) => {
    setPermissions(preset.permissions);
    setNumericMode(permissionsToNumeric(preset.permissions));
  };

  const handleConfirm = () => {
    const data = {
      files,
      permissions,
      numericMode,
      owner: owner || undefined,
      group: group || undefined,
      recursive,
    };
    
    onConfirm?.(data);
  };

  const getPermissionDisplay = () => {
    const permString = (perm) => {
      return `${perm.read ? 'r' : '-'}${perm.write ? 'w' : '-'}${perm.execute ? 'x' : '-'}`;
    };
    
    return `${permString(permissions.owner)}${permString(permissions.group)}${permString(permissions.other)}`;
  };

  const renderPermissionCheckbox = (category, permission, label) => {
    const isChecked = permissions[category]?.[permission] || false;
    
    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => handlePermissionChange(category, permission, checked)}
          disabled={loading}
        />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
    );
  };

  const renderPermissionGrid = () => (
    <div className={permissionGridVariants({ layout: advancedMode ? 'detailed' : 'standard' })}>
      {/* 表头 */}
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">权限</div>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">所有者</div>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">组</div>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">其他</div>
      
      {/* 读权限 */}
      <div className="text-sm text-slate-300">读</div>
      {renderPermissionCheckbox('owner', 'read', '')}
      {renderPermissionCheckbox('group', 'read', '')}
      {renderPermissionCheckbox('other', 'read', '')}
      
      {/* 写权限 */}
      <div className="text-sm text-slate-300">写</div>
      {renderPermissionCheckbox('owner', 'write', '')}
      {renderPermissionCheckbox('group', 'write', '')}
      {renderPermissionCheckbox('other', 'write', '')}
      
      {/* 执行权限 */}
      <div className="text-sm text-slate-300">执行</div>
      {renderPermissionCheckbox('owner', 'execute', '')}
      {renderPermissionCheckbox('group', 'execute', '')}
      {renderPermissionCheckbox('other', 'execute', '')}
    </div>
  );

  const renderPresetButtons = () => {
    const presets = [
      {
        name: '文件默认',
        description: '644 - 所有者读写，组和其他只读',
        permissions: {
          owner: { read: true, write: true, execute: false },
          group: { read: true, write: false, execute: false },
          other: { read: true, write: false, execute: false },
        },
      },
      {
        name: '目录默认',
        description: '755 - 所有者全部，组和其他读写执行',
        permissions: {
          owner: { read: true, write: true, execute: true },
          group: { read: true, write: false, execute: true },
          other: { read: true, write: false, execute: true },
        },
      },
      {
        name: '可执行文件',
        description: '755 - 所有用户可执行',
        permissions: {
          owner: { read: true, write: true, execute: true },
          group: { read: true, write: false, execute: true },
          other: { read: true, write: false, execute: true },
        },
      },
      {
        name: '私有文件',
        description: '600 - 只有所有者可读写',
        permissions: {
          owner: { read: true, write: true, execute: false },
          group: { read: false, write: false, execute: false },
          other: { read: false, write: false, execute: false },
        },
      },
    ];

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">快速预设</label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              className="p-2 text-left border border-slate-600 rounded hover:bg-slate-700/50 transition-colors"
              onClick={() => handlePresetSelect(preset)}
              disabled={loading}
            >
              <div className="text-sm font-medium text-slate-300">{preset.name}</div>
              <div className="text-xs text-slate-500">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderNumericInput = () => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">数字模式</label>
      <div className="flex items-center space-x-3">
        <Input
          value={numericMode}
          onChange={(e) => handleNumericChange(e.target.value)}
          placeholder="755"
          maxLength={3}
          className="w-20 font-mono text-center"
          disabled={loading}
        />
        <div className="flex items-center space-x-2">
          <Tooltip content={getPermissionDisplay()}>
            <div className="text-xs text-slate-500 font-mono">
              ({getPermissionDisplay()})
            </div>
          </Tooltip>
        </div>
      </div>
      <div className="text-xs text-slate-500">
        输入 3 位八进制数字 (0-7)，如 755
      </div>
    </div>
  );

  const renderOwnerGroup = () => {
    if (!showOwnerGroup) return null;

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300">所有者和组</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">所有者</label>
            <Input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="用户名"
              disabled={loading || hasMultipleFiles}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">组</label>
            <Input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="组名"
              disabled={loading || hasMultipleFiles}
            />
          </div>
        </div>
        {hasMultipleFiles && (
          <div className="text-xs text-slate-500">
            批量操作不支持修改所有者和组
          </div>
        )}
      </div>
    );
  };

  const renderRecursiveOption = () => {
    if (!showRecursive || !hasDirectories) return null;

    return (
      <div className="flex items-center space-x-2 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
        <Checkbox
          checked={recursive}
          onCheckedChange={setRecursive}
          disabled={loading}
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-300">
            递归应用到子目录和文件
          </div>
          <div className="text-xs text-slate-500">
            将权限设置应用到所选目录及其所有内容
          </div>
        </div>
      </div>
    );
  };

  const title = hasMultipleFiles 
    ? `编辑 ${files.length} 个项目的权限` 
    : `编辑 "${files[0]?.name}" 的权限`;

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={onClose}
      size={size}
      className={clsx(permissionEditorVariants({ size }), className)}
      {...props}
    >
      {/* 头部 */}
      <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg">
          <Icon name="Shield" className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-400">
            设置文件和目录的访问权限
          </p>
        </div>
      </div>

      {/* 内容 */}
      <div className="px-6 py-4 space-y-6">
        {/* 预设按钮 */}
        {renderPresetButtons()}

        {/* 权限网格 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-300">权限设置</label>
            {showAdvanced && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdvancedMode(!advancedMode)}
                className="text-xs"
              >
                {advancedMode ? '简化' : '高级'}
              </Button>
            )}
          </div>
          {renderPermissionGrid()}
        </div>

        {/* 数字输入 */}
        {renderNumericInput()}

        {/* 所有者和组 */}
        {renderOwnerGroup()}

        {/* 递归选项 */}
        {renderRecursiveOption()}

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
          <div>• 读 (r): 查看文件内容或目录列表</div>
          <div>• 写 (w): 修改文件或创建/删除目录中的文件</div>
          <div>• 执行 (x): 运行文件或进入目录</div>
          <div>• 数字模式: 4=读, 2=写, 1=执行，相加得到权限值</div>
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
          disabled={loading}
          loading={loading}
        >
          应用权限
        </Button>
      </div>
    </Modal>
  );
});

PermissionEditor.displayName = 'PermissionEditor';

// 快速权限编辑器
export const QuickPermissionEditor = forwardRef((props, ref) => (
  <PermissionEditor
    ref={ref}
    size="sm"
    showAdvanced={false}
    showOwnerGroup={false}
    showRecursive={false}
    {...props}
  />
));

QuickPermissionEditor.displayName = 'QuickPermissionEditor';
