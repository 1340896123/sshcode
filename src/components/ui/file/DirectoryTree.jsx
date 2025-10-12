import React, { forwardRef, useState, useMemo, useCallback } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Tooltip } from '../primitives/Tooltip';
import { Badge } from '../primitives/Badge';

const directoryTreeVariants = cva(
  'flex flex-col bg-slate-800 border border-slate-700 rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-slate-800 border-slate-700',
        compact: 'bg-slate-900 border-slate-600',
        minimal: 'bg-transparent border-0',
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

const nodeVariants = cva(
  'flex items-center space-x-1 px-2 py-1 rounded cursor-pointer transition-colors',
  {
    variants: {
      selected: {
        true: 'bg-blue-500/10 text-blue-400',
        false: 'text-slate-300 hover:bg-slate-700/50',
      },
      expanded: {
        true: '',
        false: '',
      },
      level: {
        0: '',
        1: 'ml-4',
        2: 'ml-8',
        3: 'ml-12',
        4: 'ml-16',
      },
    },
    defaultVariants: {
      selected: false,
      expanded: false,
      level: 0,
    },
  }
);

export const DirectoryTree = forwardRef((
  {
    className,
    variant,
    size,
    directories = [],
    selectedPath,
    expandedPaths = [],
    loading = false,
    searchable = false,
    showHidden = false,
    showIcons = true,
    showBadges = true,
    virtualScroll = false,
    maxHeight = 400,
    onDirectorySelect,
    onDirectoryExpand,
    onDirectoryCollapse,
    onDirectoryContextMenu,
    onSearch,
    onLoadMore,
    ...props
  },
  ref
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  // 过滤目录
  const filteredDirectories = useMemo(() => {
    let filtered = directories;
    
    // 隐藏文件过滤
    if (!showHidden) {
      filtered = filtered.filter(dir => !dir.name.startsWith('.'));
    }
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dir => 
        dir.name.toLowerCase().includes(query) ||
        dir.path.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [directories, showHidden, searchQuery]);

  // 构建树形结构
  const treeData = useMemo(() => {
    const buildTree = (items, parentPath = '') => {
      return items
        .filter(item => item.parentPath === parentPath)
        .map(item => ({
          ...item,
          children: buildTree(items, item.path),
        }))
        .sort((a, b) => {
          // 目录优先，然后按名称排序
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    };
    
    return buildTree(filteredDirectories);
  }, [filteredDirectories]);

  // 递归渲染目录节点
  const renderDirectoryNode = useCallback((node, level = 0) => {
    const isExpanded = expandedPaths.includes(node.path);
    const isSelected = selectedPath === node.path;
    const hasChildren = node.children && node.children.length > 0;
    const isLoading = node.loading;

    const handleToggle = (e) => {
      e.stopPropagation();
      
      if (isExpanded) {
        onDirectoryCollapse?.(node.path);
      } else {
        onDirectoryExpand?.(node.path);
      }
    };

    const handleSelect = () => {
      onDirectorySelect?.(node);
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        node,
      });
      onDirectoryContextMenu?.(node, e);
    };

    const getIcon = () => {
      if (node.type !== 'directory') {
        const ext = node.name.split('.').pop()?.toLowerCase();
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
          jpg: 'FileImage',
          png: 'FileImage',
          svg: 'FileImage',
        };
        return iconMap[ext] || 'File';
      }
      
      if (isLoading) return 'Loader2';
      if (isExpanded) return 'FolderOpen';
      if (node.name.startsWith('.')) return 'FolderOff';
      return 'Folder';
    };

    const getIconColor = () => {
      if (node.type !== 'directory') {
        const ext = node.name.split('.').pop()?.toLowerCase();
        const colorMap = {
          js: 'text-yellow-400',
          jsx: 'text-yellow-400',
          ts: 'text-blue-400',
          tsx: 'text-blue-400',
          json: 'text-green-400',
          md: 'text-slate-400',
          pdf: 'text-red-500',
          zip: 'text-purple-400',
          jpg: 'text-green-400',
          png: 'text-green-400',
        };
        return colorMap[ext] || 'text-slate-400';
      }
      
      if (node.name.startsWith('.')) return 'text-slate-500';
      return 'text-blue-400';
    };

    return (
      <div key={node.path} className="select-none">
        {/* 目录节点 */}
        <div
          className={clsx(
            nodeVariants({ 
              selected: isSelected, 
              expanded: isExpanded, 
              level 
            })
          )}
          onClick={handleSelect}
          onContextMenu={handleContextMenu}
          role="treeitem"
          aria-expanded={isExpanded}
          aria-selected={isSelected}
          tabIndex={isSelected ? 0 : -1}
        >
          {/* 展开/折叠按钮 */}
          {node.type === 'directory' && (
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0 min-w-0"
              onClick={handleToggle}
              disabled={!hasChildren && !node.hasMore}
            >
              {isLoading ? (
                <Icon name="Loader2" className="w-3 h-3 animate-spin" />
              ) : hasChildren || node.hasMore ? (
                <Icon 
                  name={isExpanded ? 'ChevronDown' : 'ChevronRight'} 
                  className="w-3 h-3" 
                />
              ) : (
                <div className="w-3 h-3" />
              )}
            </Button>
          )}
          
          {/* 图标 */}
          {showIcons && (
            <Icon 
              name={getIcon()} 
              className={clsx(
                'w-4 h-4',
                getIconColor(),
                isLoading && 'animate-spin'
              )} 
            />
          )}
          
          {/* 名称 */}
          <span className="flex-1 truncate">
            {node.name}
          </span>
          
          {/* 徽标 */}
          {showBadges && (
            <div className="flex items-center space-x-1">
              {node.unreadCount > 0 && (
                <Badge variant="primary" size="sm">
                  {node.unreadCount}
                </Badge>
              )}
              
              {node.shared && (
                <Tooltip content="已共享">
                  <Icon name="Share2" className="w-3 h-3 text-green-400" />
                </Tooltip>
              )}
              
              {node.locked && (
                <Tooltip content="已锁定">
                  <Icon name="Lock" className="w-3 h-3 text-orange-400" />
                </Tooltip>
              )}
              
              {node.starred && (
                <Tooltip content="已收藏">
                  <Icon name="Star" className="w-3 h-3 text-yellow-400" />
                </Tooltip>
              )}
            </div>
          )}
        </div>
        
        {/* 子节点 */}
        {isExpanded && hasChildren && (
          <div role="group">
            {node.children.map(child => 
              renderDirectoryNode(child, level + 1)
            )}
          </div>
        )}
        
        {/* 加载更多 */}
        {isExpanded && node.hasMore && (
          <div className="ml-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLoadMore?.(node.path)}
              className="text-slate-400 hover:text-slate-300"
            >
              <Icon name="Plus" className="w-3 h-3 mr-1" />
              加载更多
            </Button>
          </div>
        )}
      </div>
    );
  }, [
    expandedPaths, 
    selectedPath, 
    onDirectorySelect, 
    onDirectoryExpand, 
    onDirectoryCollapse, 
    onDirectoryContextMenu, 
    onLoadMore,
    showIcons,
    showBadges
  ]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
      <Icon name="FolderOpen" className="w-12 h-12 mb-2" />
      <span>没有目录</span>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
      <Icon name="Loader2" className="w-8 h-8 animate-spin mb-2" />
      <span>加载中...</span>
    </div>
  );

  return (
    <div className="relative">
      {/* 搜索栏 */}
      {searchable && (
        <div className="p-3 border-b border-slate-700">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索目录..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
                onClick={() => handleSearchChange('')}
              >
                <Icon name="X" className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 目录树 */}
      <div
        ref={ref}
        className={clsx(
          directoryTreeVariants({ variant, size, className }),
          'overflow-auto',
          maxHeight && `max-h-[${maxHeight}px]`
        )}
        role="tree"
        {...props}
      >
        {loading ? (
          renderLoading()
        ) : treeData.length === 0 ? (
          renderEmpty()
        ) : (
          <div className="p-2">
            {treeData.map(node => renderDirectoryNode(node))}
          </div>
        )}
      </div>

      {/* 上下文菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-48 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={() => setContextMenu(null)}
        >
          <div className="px-3 py-2 text-sm text-slate-300 cursor-pointer hover:bg-slate-700">
            打开
          </div>
          <div className="px-3 py-2 text-sm text-slate-300 cursor-pointer hover:bg-slate-700">
            重命名
          </div>
          <div className="px-3 py-2 text-sm text-slate-300 cursor-pointer hover:bg-slate-700">
            删除
          </div>
        </div>
      )}
    </div>
  );
});

DirectoryTree.displayName = 'DirectoryTree';

// 目录树节点组件
export const DirectoryTreeNode = forwardRef((
  {
    node,
    level = 0,
    isExpanded = false,
    isSelected = false,
    isLoading = false,
    onToggle,
    onSelect,
    onContextMenu,
    showIcon = true,
    children,
    ...props
  },
  ref
) => {
  return (
    <div ref={ref} {...props}>
      {/* 节点内容 */}
      <div
        className={clsx(
          nodeVariants({ 
            selected: isSelected, 
            expanded: isExpanded, 
            level 
          })
        )}
        onClick={onSelect}
        onContextMenu={onContextMenu}
      >
        {children}
      </div>
    </div>
  );
});

DirectoryTreeNode.displayName = 'DirectoryTreeNode';
