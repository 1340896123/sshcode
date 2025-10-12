import React, { forwardRef, useState } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Tooltip } from '../primitives/Tooltip';
import { Badge } from '../primitives/Badge';
import { Separator } from '../primitives/Separator';

const fileToolbarVariants = cva(
  'flex items-center space-x-2 px-4 py-2 bg-slate-800 border-b border-slate-700',
  {
    variants: {
      variant: {
        default: 'bg-slate-800 border-slate-700',
        compact: 'bg-slate-900/50 border-slate-700/50 py-1',
        elevated: 'bg-slate-800 border-slate-700 shadow-sm',
      },
      size: {
        sm: 'py-1 px-3',
        md: 'py-2 px-4',
        lg: 'py-3 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const buttonGroupVariants = cva(
  'flex items-center space-x-1',
  {
    variants: {
      variant: {
        default: 'space-x-1',
        separated: 'space-x-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const FileToolbar = forwardRef((
  {
    className,
    variant,
    size,
    selectedFiles = [],
    currentPath = '/',
    canUpload = true,
    canDownload = true,
    canCreate = true,
    canDelete = true,
    canRename = true,
    canCopy = true,
    canMove = true,
    canRefresh = true,
    showViewToggle = true,
    viewMode = 'list',
    onViewModeChange,
    onUpload,
    onDownload,
    onCreateFolder,
    onCreateFile,
    onDelete,
    onRename,
    onCopy,
    onMove,
    onRefresh,
    onSelectAll,
    onClearSelection,
    showSelectionInfo = true,
    compactMode = false,
    ...props
  },
  ref
) => {
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const hasSelection = selectedFiles.length > 0;
  const hasSingleSelection = selectedFiles.length === 1;

  const handleUploadClick = (type) => {
    setUploadMenuOpen(false);
    onUpload?.(type);
  };

  const handleCreateClick = (type) => {
    setCreateMenuOpen(false);
    if (type === 'folder') {
      onCreateFolder?.();
    } else {
      onCreateFile?.();
    }
  };

  const handleDownload = () => {
    if (hasSelection) {
      onDownload?.(selectedFiles);
    }
  };

  const handleDelete = () => {
    if (hasSelection) {
      onDelete?.(selectedFiles);
    }
  };

  const handleRename = () => {
    if (hasSingleSelection) {
      onRename?.(selectedFiles[0]);
    }
  };

  const handleCopy = () => {
    if (hasSelection) {
      onCopy?.(selectedFiles);
    }
  };

  const handleMove = () => {
    if (hasSelection) {
      onMove?.(selectedFiles);
    }
  };

  const renderUploadButton = () => (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
        disabled={!canUpload}
      >
        <Icon name="Upload" className="w-4 h-4 mr-2" />
        上传
        <Icon name="ChevronDown" className="w-3 h-3 ml-1" />
      </Button>
      
      {uploadMenuOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
          <button
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 text-left"
            onClick={() => handleUploadClick('files')}
          >
            <Icon name="File" className="w-4 h-4" />
            <span>上传文件</span>
          </button>
          <button
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 text-left"
            onClick={() => handleUploadClick('folder')}
          >
            <Icon name="Folder" className="w-4 h-4" />
            <span>上传文件夹</span>
          </button>
          <Separator />
          <button
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 text-left"
            onClick={() => handleUploadClick('url')}
          >
            <Icon name="Link" className="w-4 h-4" />
            <span>从 URL 上传</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderCreateButton = () => (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCreateMenuOpen(!createMenuOpen)}
        disabled={!canCreate}
      >
        <Icon name="Plus" className="w-4 h-4 mr-2" />
        新建
        <Icon name="ChevronDown" className="w-3 h-3 ml-1" />
      </Button>
      
      {createMenuOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
          <button
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 text-left"
            onClick={() => handleCreateClick('folder')}
          >
            <Icon name="Folder" className="w-4 h-4" />
            <span>新建文件夹</span>
          </button>
          <button
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 text-left"
            onClick={() => handleCreateClick('file')}
          >
            <Icon name="File" className="w-4 h-4" />
            <span>新建文件</span>
          </button>
          <Separator />
          <button
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 text-left"
            onClick={() => handleCreateClick('document')}
          >
            <Icon name="FileText" className="w-4 h-4" />
            <span>新建文档</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderViewToggle = () => {
    if (!showViewToggle) return null;

    return (
      <div className="flex items-center space-x-1 p-1 bg-slate-700/50 rounded-lg">
        <Tooltip content="列表视图">
          <Button
            variant={viewMode === 'list' ? 'solid' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange?.('list')}
            className="h-7 w-7 p-0"
          >
            <Icon name="List" className="w-4 h-4" />
          </Button>
        </Tooltip>
        
        <Tooltip content="网格视图">
          <Button
            variant={viewMode === 'grid' ? 'solid' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange?.('grid')}
            className="h-7 w-7 p-0"
          >
            <Icon name="Grid3X3" className="w-4 h-4" />
          </Button>
        </Tooltip>
        
        <Tooltip content="详细视图">
          <Button
            variant={viewMode === 'detail' ? 'solid' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange?.('detail')}
            className="h-7 w-7 p-0"
          >
            <Icon name="LayoutList" className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>
    );
  };

  const renderSelectionInfo = () => {
    if (!showSelectionInfo || !hasSelection) return null;

    return (
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <span>已选择 {selectedFiles.length} 项</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-6 px-2 text-xs"
        >
          清除
        </Button>
      </div>
    );
  };

  const renderCompactMode = () => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-2">
        {renderCreateButton()}
        {renderUploadButton()}
      </div>
      
      <div className="flex items-center space-x-2">
        {renderSelectionInfo()}
        {renderViewToggle()}
        
        <Tooltip content="刷新">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={!canRefresh}
            className="h-7 w-7 p-0"
          >
            <Icon name="RefreshCw" className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );

  const renderFullMode = () => (
    <div className="flex items-center justify-between w-full">
      {/* 左侧操作组 */}
      <div className="flex items-center space-x-2">
        <div className={buttonGroupVariants()}>
          {renderCreateButton()}
          {renderUploadButton()}
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className={buttonGroupVariants()}>
          <Tooltip content={hasSelection ? `下载 ${selectedFiles.length} 项` : '下载'}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!canDownload || !hasSelection}
            >
              <Icon name="Download" className="w-4 h-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content={hasSelection ? `删除 ${selectedFiles.length} 项` : '删除'}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={!canDelete || !hasSelection}
              className="text-red-400 border-red-600 hover:bg-red-600/10"
            >
              <Icon name="Trash2" className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className={buttonGroupVariants()}>
          <Tooltip content="重命名">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRename}
              disabled={!canRename || !hasSingleSelection}
            >
              <Icon name="Edit3" className="w-4 h-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="复制">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!canCopy || !hasSelection}
            >
              <Icon name="Copy" className="w-4 h-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="移动">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMove}
              disabled={!canMove || !hasSelection}
            >
              <Icon name="Move" className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 右侧操作组 */}
      <div className="flex items-center space-x-2">
        {renderSelectionInfo()}
        
        <Separator orientation="vertical" className="h-6" />
        
        {renderViewToggle()}
        
        <Tooltip content="全选">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="h-7 w-7 p-0"
          >
            <Icon name="CheckSquare" className="w-4 h-4" />
          </Button>
        </Tooltip>
        
        <Tooltip content="刷新">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={!canRefresh}
            className="h-7 w-7 p-0"
          >
            <Icon name="RefreshCw" className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      className={clsx(fileToolbarVariants({ variant, size, className }))}
      {...props}
    >
      {compactMode ? renderCompactMode() : renderFullMode()}
    </div>
  );
});

FileToolbar.displayName = 'FileToolbar';

// 快捷工具栏组件
export const QuickFileToolbar = forwardRef((props, ref) => (
  <FileToolbar
    ref={ref}
    variant="compact"
    size="sm"
    compactMode={true}
    showSelectionInfo={false}
    showViewToggle={false}
    {...props}
  />
));

QuickFileToolbar.displayName = 'QuickFileToolbar';

// 最小工具栏组件
export const MinimalFileToolbar = forwardRef((props, ref) => (
  <FileToolbar
    ref={ref}
    variant="compact"
    size="sm"
    compactMode={true}
    showSelectionInfo={false}
    showViewToggle={false}
    canDownload={false}
    canDelete={false}
    canRename={false}
    canCopy={false}
    canMove={false}
    {...props}
  />
));

MinimalFileToolbar.displayName = 'MinimalFileToolbar';
