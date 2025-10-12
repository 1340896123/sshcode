import React, { forwardRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Breadcrumb } from '../layout/Breadcrumb';

const pathBarVariants = cva(
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

export const PathBar = forwardRef((
  {
    className,
    variant,
    size,
    currentPath = '/',
    onNavigate,
    onRefresh,
    onGoBack,
    onGoForward,
    onGoUp,
    onToggleHidden,
    showHidden = false,
    canGoBack = false,
    canGoForward = false,
    canGoUp = true,
    editingPath = false,
    onEditPath,
    onSavePath,
    onCancelEdit,
    ...props
  },
  ref
) => {
  const parsePath = (path) => {
    if (!path || path === '/') return [{ name: '根目录', path: '/' }];
    
    const parts = path.split('/').filter(Boolean);
    const breadcrumbs = [{ name: '根目录', path: '/' }];
    
    let currentPathBuilder = '';
    parts.forEach((part, index) => {
      currentPathBuilder += '/' + part;
      breadcrumbs.push({
        name: part,
        path: currentPathBuilder,
        isLast: index === parts.length - 1,
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = parsePath(currentPath);

  const handleBreadcrumbClick = (path) => {
    onNavigate?.(path);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSavePath?.(e.target.value);
    } else if (e.key === 'Escape') {
      onCancelEdit?.();
    }
  };

  const renderPathInput = () => (
    <div className="flex-1 flex items-center space-x-2">
      <Input
        defaultValue={currentPath}
        onKeyDown={handleKeyDown}
        className="flex-1"
        placeholder="输入路径..."
        autoFocus
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onSavePath}
      >
        <Icon name="Check" className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancelEdit}
      >
        <Icon name="X" className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderBreadcrumb = () => (
    <div className="flex-1 flex items-center space-x-1 min-w-0">
      <Breadcrumb
        items={breadcrumbs}
        onItemClick={handleBreadcrumbClick}
        maxItems={5}
        showHome
        homeIcon="Home"
      />
    </div>
  );

  return (
    <div
      ref={ref}
      className={clsx(pathBarVariants({ variant, size, className }))}
      {...props}
    >
      {/* 导航按钮组 */}
      <div className="flex items-center space-x-1 mr-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoBack}
          disabled={!canGoBack}
          aria-label="后退"
        >
          <Icon name="ChevronLeft" className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoForward}
          disabled={!canGoForward}
          aria-label="前进"
        >
          <Icon name="ChevronRight" className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoUp}
          disabled={!canGoUp}
          aria-label="上级目录"
        >
          <Icon name="ArrowUp" className="w-4 h-4" />
        </Button>
      </div>

      {/* 路径显示/编辑区域 */}
      {editingPath ? renderPathInput() : renderBreadcrumb()}

      {/* 操作按钮组 */}
      <div className="flex items-center space-x-1 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          aria-label="刷新"
        >
          <Icon name="RefreshCw" className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onEditPath}
          aria-label="编辑路径"
        >
          <Icon name="Edit3" className="w-4 h-4" />
        </Button>

        <Button
          variant={showHidden ? 'solid' : 'ghost'}
          size="sm"
          onClick={onToggleHidden}
          aria-label={showHidden ? '隐藏隐藏文件' : '显示隐藏文件'}
        >
          <Icon name="Eye" className="w-4 h-4" />
        </Button>
      </div>

      {/* 路径信息 */}
      <div className="flex items-center space-x-2 ml-4 text-xs text-slate-500">
        <span>当前目录:</span>
        <span className="text-slate-400 font-mono">
          {currentPath}
        </span>
      </div>
    </div>
  );
});

PathBar.displayName = 'PathBar';

// 快捷键支持的 PathBar
export const ShortcutPathBar = forwardRef((props, ref) => {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+Left: 后退
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        props.onGoBack?.();
      }
      // Alt+Right: 前进
      else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        props.onGoForward?.();
      }
      // Alt+Up: 上级目录
      else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        props.onGoUp?.();
      }
      // F5: 刷新
      else if (e.key === 'F5') {
        e.preventDefault();
        props.onRefresh?.();
      }
      // Ctrl+L: 编辑路径
      else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        props.onEditPath?.();
      }
      // Ctrl+H: 切换隐藏文件
      else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        props.onToggleHidden?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [props]);

  return <PathBar ref={ref} {...props} />;
});

ShortcutPathBar.displayName = 'ShortcutPathBar';

// 增强版 PathBar，支持搜索和过滤
export const EnhancedPathBar = forwardRef((
  {
    onSearch,
    searchQuery,
    onClearSearch,
    showSearch = false,
    ...props
  },
  ref
) => {
  return (
    <div className="flex flex-col">
      <PathBar ref={ref} {...props} />
      
      {/* 搜索栏 */}
      {showSearch && (
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Icon name="Search" className="w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索文件和目录..."
              value={searchQuery}
              onChange={(e) => onSearch?.(e.target.value)}
              className="flex-1"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSearch}
                aria-label="清除搜索"
              >
                <Icon name="X" className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

EnhancedPathBar.displayName = 'EnhancedPathBar';
