import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';

/**
 * AutocompleteMenu组件 - 自动补全菜单组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {Array} props.suggestions - 建议列表
 * @param {number} props.selectedIndex - 选中索引
 * @param {Function} props.onSelect - 选择回调
 * @param {Function} props.onHighlight - 高亮回调
 * @param {boolean} props.visible - 是否可见
 * @param {Object} props.position - 位置信息 {x, y}
 * @param {number} props.maxItems - 最大显示项目数
 * @param {boolean} props.showIcons - 是否显示图标
 * @param {boolean} props.showDescriptions - 是否显示描述
 * @param {boolean} props.showTypes - 是否显示类型标签
 * @param {string} props.filterText - 过滤文本
 * @param {Function} props.onFilterChange - 过滤变化回调
 * @param {boolean} props.allowEmptyFilter - 是否允许空过滤
 * @param {string} props.emptyMessage - 空状态消息
 * @param {Function} props.onEmptyAction - 空状态操作回调
 * @param {Object} props.theme - 主题配置
 */
export function AutocompleteMenu({
  className = '',
  suggestions = [],
  selectedIndex = -1,
  onSelect,
  onHighlight,
  visible = false,
  position = { x: 0, y: 0 },
  maxItems = 10,
  showIcons = true,
  showDescriptions = true,
  showTypes = true,
  filterText = '',
  onFilterChange,
  allowEmptyFilter = true,
  emptyMessage = '无匹配项',
  onEmptyAction,
  theme = 'dark',
  ...props
}) {
  const [filter, setFilter] = useState(filterText);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const menuRef = useRef(null);
  const filterInputRef = useRef(null);

  // 过滤建议
  const filteredSuggestions = React.useMemo(() => {
    if (!filter || allowEmptyFilter) {
      return suggestions;
    }

    const lowerFilter = filter.toLowerCase();
    return suggestions.filter(suggestion => {
      const text = (suggestion.text || suggestion).toLowerCase();
      const description = (suggestion.description || '').toLowerCase();
      const type = (suggestion.type || '').toLowerCase();
      
      return text.includes(lowerFilter) || 
             description.includes(lowerFilter) || 
             type.includes(lowerFilter);
    });
  }, [suggestions, filter, allowEmptyFilter]);

  // 限制显示数量
  const displaySuggestions = filteredSuggestions.slice(0, maxItems);

  // 同步外部状态
  useEffect(() => {
    setFilter(filterText);
  }, [filterText]);

  useEffect(() => {
    setHighlightedIndex(selectedIndex);
  }, [selectedIndex]);

  // 自动聚焦过滤输入
  useEffect(() => {
    if (visible && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [visible]);

  // 键盘导航
  const handleKeyDown = useCallback((e) => {
    if (!visible) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = highlightedIndex < displaySuggestions.length - 1 
          ? highlightedIndex + 1 
          : 0;
        setHighlightedIndex(nextIndex);
        onHighlight?.(nextIndex, displaySuggestions[nextIndex]);
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = highlightedIndex > 0 
          ? highlightedIndex - 1 
          : displaySuggestions.length - 1;
        setHighlightedIndex(prevIndex);
        onHighlight?.(prevIndex, displaySuggestions[prevIndex]);
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && displaySuggestions[highlightedIndex]) {
          onSelect?.(displaySuggestions[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        // 父组件处理关闭逻辑
        break;

      case 'Tab':
        e.preventDefault();
        if (highlightedIndex >= 0 && displaySuggestions[highlightedIndex]) {
          onSelect?.(displaySuggestions[highlightedIndex]);
        }
        break;
    }
  }, [visible, highlightedIndex, displaySuggestions, onSelect, onHighlight]);

  // 全局键盘事件监听
  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  // 处理过滤变化
  const handleFilterChange = (e) => {
    const newFilter = e.target.value;
    setFilter(newFilter);
    onFilterChange?.(newFilter);
    setHighlightedIndex(-1);
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestion, index) => {
    onSelect?.(suggestion);
    setHighlightedIndex(index);
  };

  // 处理建议悬停
  const handleSuggestionHover = (index) => {
    setHighlightedIndex(index);
    onHighlight?.(index, displaySuggestions[index]);
  };

  // 获取建议图标
  const getSuggestionIcon = (suggestion) => {
    const iconMap = {
      command: 'Terminal',
      file: 'File',
      folder: 'Folder',
      user: 'User',
      host: 'Server',
      path: 'FolderOpen',
      variable: 'Code',
      function: 'Zap',
      alias: 'Tag',
      history: 'History',
      snippet: 'FileText',
    };

    const iconName = suggestion.icon || iconMap[suggestion.type] || 'ChevronRight';
    return <Icon name={iconName} size="sm" color="muted" />;
  };

  // 获取类型标签颜色
  const getTypeColor = (type) => {
    const colorMap = {
      command: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      file: 'bg-green-500/20 text-green-400 border-green-500/30',
      folder: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      user: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      host: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      path: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      variable: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      function: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      alias: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      history: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      snippet: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    };

    return colorMap[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // 高亮匹配文本
  const highlightMatch = (text, highlight) => {
    if (!highlight) return text;

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-500/30 text-yellow-300 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // 获取菜单样式
  const menuClasses = clsx(
    'absolute z-50 min-w-80 max-w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl',
    'overflow-hidden',
    {
      'invisible opacity-0': !visible,
      'visible opacity-100': visible,
    },
    className
  );

  // 获取容器样式
  const containerClasses = clsx(
    'bg-gray-900',
    {
      'bg-gray-800': theme === 'light',
      'bg-blue-900': theme === 'blue',
    }
  );

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className={menuClasses}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      {...props}
    >
      <div className={containerClasses}>
        {/* 过滤输入框 */}
        {allowEmptyFilter && (
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Icon name="Search" size="sm" color="muted" />
              <input
                ref={filterInputRef}
                type="text"
                value={filter}
                onChange={handleFilterChange}
                placeholder="过滤建议..."
                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-sm"
              />
              {filter && (
                <button
                  onClick={() => {
                    setFilter('');
                    onFilterChange?.('');
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <Icon name="X" size="xs" color="muted" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 建议列表 */}
        <div className="max-h-64 overflow-y-auto">
          {displaySuggestions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <Icon name="SearchX" size="lg" color="muted" className="mx-auto mb-2" />
              <div>{emptyMessage}</div>
              {onEmptyAction && (
                <button
                  onClick={onEmptyAction}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-xs"
                >
                  查看更多选项
                </button>
              )}
            </div>
          ) : (
            displaySuggestions.map((suggestion, index) => (
              <div
                key={suggestion.id || index}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                  'hover:bg-gray-800',
                  {
                    'bg-blue-600/20 border-l-2 border-blue-500': index === highlightedIndex,
                    'border-l-2 border-transparent': index !== highlightedIndex,
                  }
                )}
                onClick={() => handleSuggestionClick(suggestion, index)}
                onMouseEnter={() => handleSuggestionHover(index)}
              >
                {/* 图标 */}
                {showIcons && (
                  <div className="flex-shrink-0">
                    {getSuggestionIcon(suggestion)}
                  </div>
                )}

                {/* 主要内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* 文本 */}
                    <span className="text-gray-100 font-mono text-sm truncate">
                      {highlightMatch(suggestion.text || suggestion, filter)}
                    </span>

                    {/* 类型标签 */}
                    {showTypes && suggestion.type && (
                      <span className={clsx(
                        'px-1.5 py-0.5 text-xs rounded border',
                        getTypeColor(suggestion.type)
                      )}>
                        {suggestion.type}
                      </span>
                    )}
                  </div>

                  {/* 描述 */}
                  {showDescriptions && suggestion.description && (
                    <div className="text-gray-500 text-xs truncate mt-0.5">
                      {highlightMatch(suggestion.description, filter)}
                    </div>
                  )}
                </div>

                {/* 快捷键 */}
                {suggestion.shortcut && (
                  <div className="flex-shrink-0">
                    <span className="text-gray-600 text-xs font-mono bg-gray-800 px-1.5 py-0.5 rounded">
                      {suggestion.shortcut}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 底部信息 */}
        {filteredSuggestions.length > maxItems && (
          <div className="p-2 border-t border-gray-700 text-center">
            <span className="text-gray-600 text-xs">
              显示 {maxItems} / {filteredSuggestions.length} 项
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 预设的自动补全菜单
export const CommandAutocompleteMenu = (props) => (
  <AutocompleteMenu
    showIcons={true}
    showDescriptions={true}
    showTypes={true}
    allowEmptyFilter={true}
    emptyMessage="无匹配命令"
    {...props}
  />
);

export const PathAutocompleteMenu = (props) => (
  <AutocompleteMenu
    showIcons={true}
    showDescriptions={false}
    showTypes={true}
    allowEmptyFilter={false}
    emptyMessage="无匹配路径"
    {...props}
  />
);

export const HistoryAutocompleteMenu = (props) => (
  <AutocompleteMenu
    showIcons={true}
    showDescriptions={true}
    showTypes={false}
    allowEmptyFilter={true}
    emptyMessage="无历史记录"
    {...props}
  />
);

export const SnippetAutocompleteMenu = (props) => (
  <AutocompleteMenu
    showIcons={true}
    showDescriptions={true}
    showTypes={true}
    allowEmptyFilter={true}
    emptyMessage="无代码片段"
    {...props}
  />
);

export default AutocompleteMenu;
