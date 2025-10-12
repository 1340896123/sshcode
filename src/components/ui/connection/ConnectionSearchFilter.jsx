import React, { forwardRef, useState, useMemo } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import Button from '../primitives/Button';
import Input from '../primitives/Input';
import Select from '../primitives/Select';
import Switch from '../primitives/Switch';
import Tooltip from '../primitives/Tooltip';

/**
 * ConnectionSearchFilter组件 - 连接搜索筛选器
 */
const searchFilterVariants = createVariants(
  'bg-gray-900 border border-gray-800 rounded-lg',
  {
    variant: {
      default: 'bg-gray-900 border-gray-800',
      compact: 'bg-gray-900 border-gray-800',
      detailed: 'bg-gray-900 border-gray-800'
    },
    size: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const ConnectionSearchFilter = forwardRef(({
  connections = [],
  onFilter,
  onSearch,
  onSort,
  onGroup,
  loading = false,
  showAdvanced = false,
  showGroups = true,
  showTags = true,
  showStatus = true,
  showSort = true,
  variant,
  size,
  className,
  ...props
}, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState([]);
  const [authTypeFilter, setAuthTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupBy, setGroupBy] = useState('none');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // 提取所有可用的分组
  const availableGroups = useMemo(() => {
    const groups = [...new Set(connections.map(conn => conn.group).filter(Boolean))];
    return groups.sort();
  }, [connections]);

  // 提取所有可用的标签
  const availableTags = useMemo(() => {
    const tags = connections.reduce((acc, conn) => {
      if (conn.tags) {
        acc.push(...conn.tags);
      }
      return acc;
    }, []);
    return [...new Set(tags)].sort();
  }, [connections]);

  // 提取所有可用的认证类型
  const availableAuthTypes = useMemo(() => {
    const authTypes = [...new Set(connections.map(conn => conn.authType).filter(Boolean))];
    return authTypes.sort();
  }, [connections]);

  // 应用筛选和排序
  const filteredAndSortedConnections = useMemo(() => {
    let filtered = connections;

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conn => 
        conn.name.toLowerCase().includes(query) ||
        conn.host.toLowerCase().includes(query) ||
        conn.username?.toLowerCase().includes(query) ||
        conn.description?.toLowerCase().includes(query) ||
        conn.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(conn => conn.status === statusFilter);
    }

    // 分组筛选
    if (groupFilter !== 'all') {
      filtered = filtered.filter(conn => conn.group === groupFilter);
    }

    // 标签筛选
    if (tagFilter.length > 0) {
      filtered = filtered.filter(conn => 
        tagFilter.some(tag => conn.tags?.includes(tag))
      );
    }

    // 认证类型筛选
    if (authTypeFilter !== 'all') {
      filtered = filtered.filter(conn => conn.authType === authTypeFilter);
    }

    // 仅显示在线
    if (showOnlineOnly) {
      filtered = filtered.filter(conn => conn.status === 'connected');
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // 处理不同类型的排序
      if (sortBy === 'lastUsed') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 分组
    if (groupBy !== 'none') {
      const grouped = {};
      filtered.forEach(conn => {
        const key = conn[groupBy] || '未分组';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(conn);
      });
      return grouped;
    }

    return filtered;
  }, [
    connections,
    searchQuery,
    statusFilter,
    groupFilter,
    tagFilter,
    authTypeFilter,
    sortBy,
    sortOrder,
    groupBy,
    showOnlineOnly
  ]);

  // 通知父组件筛选结果
  React.useEffect(() => {
    onFilter?.(filteredAndSortedConnections);
  }, [filteredAndSortedConnections, onFilter]);

  // 通知父组件搜索查询
  React.useEffect(() => {
    onSearch?.(searchQuery);
  }, [searchQuery, onSearch]);

  // 通知父组件排序设置
  React.useEffect(() => {
    onSort?.({ sortBy, sortOrder });
  }, [sortBy, sortOrder, onSort]);

  // 通知父组件分组设置
  React.useEffect(() => {
    onGroup?.(groupBy);
  }, [groupBy, onGroup]);

  const handleTagFilterChange = (tag) => {
    setTagFilter(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setGroupFilter('all');
    setTagFilter([]);
    setAuthTypeFilter('all');
    setSortBy('name');
    setSortOrder('asc');
    setGroupBy('none');
    setShowOnlineOnly(false);
  };

  const hasActiveFilters = searchQuery || 
    statusFilter !== 'all' || 
    groupFilter !== 'all' || 
    tagFilter.length > 0 || 
    authTypeFilter !== 'all' || 
    showOnlineOnly;

  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  return (
    <div
      ref={ref}
      className={cn(searchFilterVariants({ variant, size }), className)}
      {...props}
    >
      {/* 基础搜索 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="搜索连接名称、主机地址、用户名..."
              value={searchQuery}
              onChange={setSearchQuery}
              prefix={<Icon name="Search" size={16} />}
              suffix={
                searchQuery && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSearchQuery('')}
                  >
                    <Icon name="X" size={14} />
                  </Button>
                )
              }
              clearable
            />
          </div>
          
          {showAdvanced && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
            >
              <Icon name="RefreshCw" size={14} />
              重置
            </Button>
          )}
        </div>

        {/* 基础筛选器 */}
        <div className="flex flex-wrap items-center gap-3">
          {showStatus && (
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="min-w-32"
            >
              <option value="all">全部状态</option>
              <option value="connected">已连接</option>
              <option value="disconnected">已断开</option>
              <option value="connecting">连接中</option>
              <option value="error">错误</option>
            </Select>
          )}

          {showGroups && availableGroups.length > 0 && (
            <Select
              value={groupFilter}
              onChange={setGroupFilter}
              className="min-w-32"
            >
              <option value="all">全部分组</option>
              {availableGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </Select>
          )}

          {showSort && (
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onChange={setSortBy}
                className="min-w-32"
              >
                <option value="name">按名称</option>
                <option value="host">按主机</option>
                <option value="lastUsed">按最后使用</option>
                <option value="status">按状态</option>
                <option value="group">按分组</option>
              </Select>
              
              <Button
                variant="outline"
                size="xs"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                <Icon 
                  name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} 
                  size={14} 
                />
              </Button>
            </div>
          )}

          {showAdvanced && (
            <div className="flex items-center gap-2">
              <Switch
                checked={showOnlineOnly}
                onChange={setShowOnlineOnly}
                size="sm"
              />
              <span className="text-sm text-gray-400">仅显示在线</span>
            </div>
          )}
        </div>

        {/* 高级筛选器 */}
        {showAdvanced && isDetailed && (
          <div className="space-y-4 pt-4 border-t border-gray-800">
            {/* 标签筛选 */}
            {showTags && availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  标签筛选
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={tagFilter.includes(tag) ? 'solid' : 'outline'}
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => handleTagFilterChange(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 认证类型筛选 */}
            {availableAuthTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  认证类型
                </label>
                <Select
                  value={authTypeFilter}
                  onChange={setAuthTypeFilter}
                  className="min-w-32"
                >
                  <option value="all">全部类型</option>
                  {availableAuthTypes.map(authType => (
                    <option key={authType} value={authType}>{authType}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* 分组选项 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                分组显示
              </label>
              <Select
                value={groupBy}
                onChange={setGroupBy}
                className="min-w-32"
              >
                <option value="none">不分组</option>
                <option value="group">按分组</option>
                <option value="status">按状态</option>
                <option value="authType">按认证类型</option>
              </Select>
            </div>
          </div>
        )}

        {/* 筛选统计 */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-500">
              筛选结果: {Array.isArray(filteredAndSortedConnections) 
                ? filteredAndSortedConnections.length 
                : Object.values(filteredAndSortedConnections).reduce((sum, group) => sum + group.length, 0)
              } / {connections.length}
            </div>
            
            <div className="flex items-center gap-2">
              {searchQuery && (
                <Badge variant="outline" size="xs">
                  搜索: {searchQuery}
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="outline" size="xs">
                  状态: {statusFilter}
                </Badge>
              )}
              {groupFilter !== 'all' && (
                <Badge variant="outline" size="xs">
                  分组: {groupFilter}
                </Badge>
              )}
              {tagFilter.length > 0 && (
                <Badge variant="outline" size="xs">
                  标签: {tagFilter.length}
                </Badge>
              )}
              {showOnlineOnly && (
                <Badge variant="outline" size="xs">
                  仅在线
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ConnectionSearchFilter.displayName = 'ConnectionSearchFilter';

export default ConnectionSearchFilter;

/**
 * QuickSearch组件 - 快速搜索
 */
export const QuickSearch = forwardRef(({
  connections = [],
  onConnectionSelect,
  placeholder = "快速搜索连接...",
  className,
  ...props
}, ref) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredConnections = useMemo(() => {
    if (!query) return [];
    
    const q = query.toLowerCase();
    return connections
      .filter(conn => 
        conn.name.toLowerCase().includes(q) ||
        conn.host.toLowerCase().includes(q) ||
        conn.username?.toLowerCase().includes(q)
      )
      .slice(0, 8); // 限制显示数量
  }, [connections, query]);

  const handleSelect = (connection) => {
    onConnectionSelect?.(connection);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref} {...props}>
      <Input
        placeholder={placeholder}
        value={query}
        onChange={setQuery}
        onFocus={() => setIsOpen(true)}
        prefix={<Icon name="Search" size={16} />}
        className={className}
      />
      
      {isOpen && (query || filteredConnections.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {filteredConnections.length === 0 ? (
            <div className="p-3 text-center text-gray-500 text-sm">
              没有找到匹配的连接
            </div>
          ) : (
            <div className="py-1">
              {filteredConnections.map(conn => (
                <button
                  key={conn.id}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                  onClick={() => handleSelect(conn)}
                >
                  <Icon 
                    name={conn.status === 'connected' ? 'Wifi' : 'WifiOff'} 
                    size={14}
                    className={cn(
                      conn.status === 'connected' ? 'text-green-500' : 'text-gray-500'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conn.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {conn.username}@{conn.host}:{conn.port}
                    </div>
                  </div>
                  <Badge 
                    variant={conn.status === 'connected' ? 'success' : 'default'} 
                    size="xs"
                  >
                    {conn.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 点击外部关闭下拉 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
});

QuickSearch.displayName = 'QuickSearch';
