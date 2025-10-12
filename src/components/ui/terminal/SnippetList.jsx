import React, { useState, useRef, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Tag } from '../primitives/Tag';

/**
 * SnippetList组件 - 代码片段列表组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {Array} props.snippets - 代码片段列表
 * @param {Function} props.onSelect - 选择片段回调
 * @param {Function} props.onEdit - 编辑片段回调
 * @param {Function} props.onDelete - 删除片段回调
 * @param {Function} props.onCreate - 创建片段回调
 * @param {Function} props.onDuplicate - 复制片段回调
 * @param {Function} props.onExport - 导出片段回调
 * @param {Function} props.onImport - 导入片段回调
 * @param {boolean} props.showSearch - 是否显示搜索框
 * @param {boolean} props.showCategories - 是否显示分类
 * @param {boolean} props.showPreview - 是否显示预览
 * @param {boolean} props.allowEdit - 是否允许编辑
 * @param {boolean} props.allowDelete - 是否允许删除
 * @param {boolean} props.allowCreate - 是否允许创建
 * @param {string} props.selectedSnippet - 选中的片段ID
 * @param {string} props.searchQuery - 搜索查询
 * @param {Function} props.onSearchChange - 搜索变化回调
 * @param {Array} props.categories - 分类列表
 * @param {string} props.selectedCategory - 选中的分类
 * @param {Function} props.onCategoryChange - 分类变化回调
 * @param {string} props.viewMode - 视图模式：list|grid|compact
 * @param {Function} props.onViewModeChange - 视图模式变化回调
 * @param {boolean} props.sortable - 是否可排序
 * @param {string} props.sortBy - 排序字段：name|created|updated|usage
 * @param {string} props.sortOrder - 排序方向：asc|desc
 * @param {Function} props.onSortChange - 排序变化回调
 */
export function SnippetList({
  className = '',
  snippets = [],
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  onDuplicate,
  onExport,
  onImport,
  showSearch = true,
  showCategories = true,
  showPreview = true,
  allowEdit = true,
  allowDelete = true,
  allowCreate = true,
  selectedSnippet = '',
  searchQuery = '',
  onSearchChange,
  categories = [],
  selectedCategory = '',
  onCategoryChange,
  viewMode = 'list',
  onViewModeChange,
  sortable = false,
  sortBy = 'name',
  sortOrder = 'asc',
  onSortChange,
  ...props
}) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [expandedSnippets, setExpandedSnippets] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);

  // 同步外部搜索查询
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // 点击外部关闭上下文菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 过滤片段
  const filteredSnippets = React.useMemo(() => {
    let filtered = snippets;

    // 按分类过滤
    if (selectedCategory) {
      filtered = filtered.filter(snippet => 
        snippet.category === selectedCategory
      );
    }

    // 按搜索查询过滤
    if (localSearchQuery) {
      const query = localSearchQuery.toLowerCase();
      filtered = filtered.filter(snippet => 
        snippet.name.toLowerCase().includes(query) ||
        snippet.description.toLowerCase().includes(query) ||
        snippet.content.toLowerCase().includes(query) ||
        snippet.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 排序
    if (sortable && sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // 处理日期字段
        if (sortBy === 'created' || sortBy === 'updated') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        // 处理使用次数
        if (sortBy === 'usage') {
          aValue = aValue || 0;
          bValue = bValue || 0;
        }

        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : 1;
        }
        return aValue > bValue ? 1 : -1;
      });
    }

    return filtered;
  }, [snippets, selectedCategory, localSearchQuery, sortable, sortBy, sortOrder]);

  // 处理搜索变化
  const handleSearchChange = (value) => {
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };

  // 处理片段展开/收起
  const toggleSnippetExpansion = (snippetId) => {
    const newExpanded = new Set(expandedSnippets);
    if (newExpanded.has(snippetId)) {
      newExpanded.delete(snippetId);
    } else {
      newExpanded.add(snippetId);
    }
    setExpandedSnippets(newExpanded);
  };

  // 处理右键菜单
  const handleContextMenu = (event, snippet) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      snippet,
    });
  };

  // 处理菜单操作
  const handleMenuAction = (action, snippet) => {
    switch (action) {
      case 'edit':
        onEdit?.(snippet);
        break;
      case 'delete':
        onDelete?.(snippet);
        break;
      case 'duplicate':
        onDuplicate?.(snippet);
        break;
      case 'export':
        onExport?.(snippet);
        break;
    }
    setContextMenu(null);
  };

  // 获取片段图标
  const getSnippetIcon = (snippet) => {
    const iconMap = {
      command: 'Terminal',
      script: 'Code',
      function: 'Zap',
      variable: 'Database',
      alias: 'Tag',
      template: 'FileText',
      config: 'Settings',
    };

    return snippet.icon || iconMap[snippet.type] || 'FileText';
  };

  // 获取语言标签颜色
  const getLanguageColor = (language) => {
    const colorMap = {
      bash: 'bg-green-500/20 text-green-400 border-green-500/30',
      sh: 'bg-green-500/20 text-green-400 border-green-500/30',
      python: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      py: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      javascript: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      js: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      json: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      yaml: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      yml: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      sql: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };

    return colorMap[language?.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // 渲染列表视图
  const renderListView = () => (
    <div className="space-y-2">
      {filteredSnippets.map((snippet) => (
        <div
          key={snippet.id}
          className={clsx(
            'p-3 border border-gray-700 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer',
            'group',
            {
              'bg-blue-600/10 border-blue-500': selectedSnippet === snippet.id,
              'border-gray-700': selectedSnippet !== snippet.id,
            }
          )}
          onClick={() => onSelect?.(snippet)}
          onContextMenu={(e) => handleContextMenu(e, snippet)}
        >
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="flex-shrink-0 mt-1">
              <Icon name={getSnippetIcon(snippet)} size="sm" color="muted" />
            </div>

            {/* 主要内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-100 truncate">
                  {snippet.name}
                </h3>
                
                {/* 语言标签 */}
                {snippet.language && (
                  <span className={clsx(
                    'px-1.5 py-0.5 text-xs rounded border',
                    getLanguageColor(snippet.language)
                  )}>
                    {snippet.language}
                  </span>
                )}

                {/* 分类标签 */}
                {showCategories && snippet.category && (
                  <Tag size="xs" variant="outline">
                    {snippet.category}
                  </Tag>
                )}
              </div>

              {/* 描述 */}
              {snippet.description && (
                <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                  {snippet.description}
                </p>
              )}

              {/* 标签 */}
              {snippet.tags && snippet.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {snippet.tags.slice(0, 3).map((tag, index) => (
                    <Tag key={index} size="xs" variant="muted">
                      {tag}
                    </Tag>
                  ))}
                  {snippet.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{snippet.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 预览 */}
              {showPreview && snippet.content && (
                <div className="relative">
                  <pre className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded overflow-hidden">
                    <code>
                      {expandedSnippets.has(snippet.id) 
                        ? snippet.content 
                        : snippet.content.slice(0, 100) + (snippet.content.length > 100 ? '...' : '')
                      }
                    </code>
                  </pre>
                  
                  {snippet.content.length > 100 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSnippetExpansion(snippet.id);
                      }}
                      className="absolute bottom-1 right-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      {expandedSnippets.has(snippet.id) ? '收起' : '展开'}
                    </button>
                  )}
                </div>
              )}

              {/* 元信息 */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>创建: {new Date(snippet.created).toLocaleDateString()}</span>
                {snippet.updated && (
                  <span>更新: {new Date(snippet.updated).toLocaleDateString()}</span>
                )}
                {snippet.usage !== undefined && (
                  <span>使用: {snippet.usage} 次</span>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {allowEdit && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(snippet);
                  }}
                >
                  <Icon name="Edit" size="xs" />
                </Button>
              )}
              
              {allowDelete && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(snippet);
                  }}
                >
                  <Icon name="Trash2" size="xs" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染网格视图
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredSnippets.map((snippet) => (
        <div
          key={snippet.id}
          className={clsx(
            'p-4 border border-gray-700 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer',
            'group',
            {
              'bg-blue-600/10 border-blue-500': selectedSnippet === snippet.id,
              'border-gray-700': selectedSnippet !== snippet.id,
            }
          )}
          onClick={() => onSelect?.(snippet)}
          onContextMenu={(e) => handleContextMenu(e, snippet)}
        >
          <div className="flex items-start gap-2 mb-2">
            <Icon name={getSnippetIcon(snippet)} size="sm" color="muted" />
            <h3 className="font-medium text-gray-100 truncate flex-1">
              {snippet.name}
            </h3>
          </div>

          {snippet.description && (
            <p className="text-gray-400 text-sm mb-2 line-clamp-2">
              {snippet.description}
            </p>
          )}

          {snippet.language && (
            <span className={clsx(
              'inline-block px-1.5 py-0.5 text-xs rounded border mb-2',
              getLanguageColor(snippet.language)
            )}>
              {snippet.language}
            </span>
          )}

          {showPreview && snippet.content && (
            <pre className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded mb-2 h-20 overflow-hidden">
              <code className="line-clamp-3">
                {snippet.content.slice(0, 80) + (snippet.content.length > 80 ? '...' : '')}
              </code>
            </pre>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{new Date(snippet.created).toLocaleDateString()}</span>
            {snippet.usage !== undefined && (
              <span>{snippet.usage} 次</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染紧凑视图
  const renderCompactView = () => (
    <div className="space-y-1">
      {filteredSnippets.map((snippet) => (
        <div
          key={snippet.id}
          className={clsx(
            'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800/50 transition-colors cursor-pointer',
            {
              'bg-blue-600/20': selectedSnippet === snippet.id,
            }
          )}
          onClick={() => onSelect?.(snippet)}
          onContextMenu={(e) => handleContextMenu(e, snippet)}
        >
          <Icon name={getSnippetIcon(snippet)} size="xs" color="muted" />
          <span className="flex-1 text-sm text-gray-100 truncate">
            {snippet.name}
          </span>
          {snippet.language && (
            <span className={clsx(
              'px-1 py-0.5 text-xs rounded border',
              getLanguageColor(snippet.language)
            )}>
              {snippet.language}
            </span>
          )}
          {snippet.usage !== undefined && (
            <span className="text-xs text-gray-500">
              {snippet.usage}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  // 获取容器样式
  const containerClasses = clsx(
    'bg-gray-900 border border-gray-700 rounded-lg',
    className
  );

  return (
    <div className={containerClasses} {...props}>
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-100">代码片段</h2>
          
          <div className="flex items-center gap-2">
            {/* 视图模式切换 */}
            <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
              <Button
                size="xs"
                variant={viewMode === 'list' ? 'solid' : 'ghost'}
                onClick={() => onViewModeChange?.('list')}
              >
                <Icon name="List" size="xs" />
              </Button>
              <Button
                size="xs"
                variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                onClick={() => onViewModeChange?.('grid')}
              >
                <Icon name="Grid3x3" size="xs" />
              </Button>
              <Button
                size="xs"
                variant={viewMode === 'compact' ? 'solid' : 'ghost'}
                onClick={() => onViewModeChange?.('compact')}
              >
                <Icon name="List" size="xs" />
              </Button>
            </div>

            {/* 操作按钮 */}
            {allowCreate && (
              <Button size="sm" onClick={() => onCreate?.()}>
                <Icon name="Plus" size="sm" />
                新建
              </Button>
            )}
            
            {onImport && (
              <Button size="sm" variant="outline" onClick={() => onImport?.()}>
                <Icon name="Upload" size="sm" />
                导入
              </Button>
            )}
            
            {onExport && (
              <Button size="sm" variant="outline" onClick={() => onExport?.()}>
                <Icon name="Download" size="sm" />
                导出
              </Button>
            )}
          </div>
        </div>

        {/* 搜索和分类 */}
        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="flex-1">
              <Input
                placeholder="搜索片段..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                prefix={<Icon name="Search" size="sm" />}
                size="sm"
              />
            </div>
          )}

          {showCategories && categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange?.(e.target.value)}
              className="bg-gray-800 text-gray-100 border border-gray-600 rounded px-3 py-1.5 text-sm"
            >
              <option value="">全部分类</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}

          {sortable && (
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                onSortChange?.(field, order);
              }}
              className="bg-gray-800 text-gray-100 border border-gray-600 rounded px-3 py-1.5 text-sm"
            >
              <option value="name-asc">名称 (A-Z)</option>
              <option value="name-desc">名称 (Z-A)</option>
              <option value="created-desc">创建时间 (最新)</option>
              <option value="created-asc">创建时间 (最早)</option>
              <option value="updated-desc">更新时间 (最新)</option>
              <option value="updated-asc">更新时间 (最早)</option>
              <option value="usage-desc">使用次数 (最多)</option>
              <option value="usage-asc">使用次数 (最少)</option>
            </select>
          )}
        </div>
      </div>

      {/* 片段列表 */}
      <div className="p-4">
        {filteredSnippets.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="FileX" size="lg" color="muted" className="mx-auto mb-2" />
            <p className="text-gray-500">
              {localSearchQuery ? '无匹配的片段' : '暂无代码片段'}
            </p>
            {allowCreate && !localSearchQuery && (
              <Button size="sm" className="mt-2" onClick={() => onCreate?.()}>
                创建第一个片段
              </Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'compact' && renderCompactView()}
          </>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-40"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {allowEdit && (
            <button
              className="w-full px-3 py-1.5 text-left text-sm text-gray-100 hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleMenuAction('edit', contextMenu.snippet)}
            >
              <Icon name="Edit" size="xs" />
              编辑
            </button>
          )}
          
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-gray-100 hover:bg-gray-700 flex items-center gap-2"
            onClick={() => handleMenuAction('duplicate', contextMenu.snippet)}
          >
            <Icon name="Copy" size="xs" />
            复制
          </button>
          
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-gray-100 hover:bg-gray-700 flex items-center gap-2"
            onClick={() => handleMenuAction('export', contextMenu.snippet)}
          >
            <Icon name="Download" size="xs" />
            导出
          </button>
          
          {allowDelete && (
            <>
              <div className="border-t border-gray-700 my-1"></div>
              <button
                className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                onClick={() => handleMenuAction('delete', contextMenu.snippet)}
              >
                <Icon name="Trash2" size="xs" />
                删除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 预设的片段列表组件
export const CommandSnippetList = (props) => (
  <SnippetList
    viewMode="list"
    showPreview={true}
    showCategories={true}
    allowEdit={true}
    allowDelete={true}
    allowCreate={true}
    {...props}
  />
);

export const CompactSnippetList = (props) => (
  <SnippetList
    viewMode="compact"
    showPreview={false}
    showCategories={false}
    showSearch={true}
    {...props}
  />
);

export const GridSnippetList = (props) => (
  <SnippetList
    viewMode="grid"
    showPreview={true}
    showCategories={true}
    {...props}
  />
);

export default SnippetList;
