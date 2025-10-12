import React, { forwardRef, useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../utils/clsx';
import { Icon } from '../primitives/Icon';

/**
 * Tabs组件 - 选项卡组件，支持关闭、拖拽排序、溢出滚动
 */
const Tabs = forwardRef(({
  // 基础配置
  value,
  onChange,
  orientation = 'horizontal', // 'horizontal' | 'vertical'
  variant = 'default', // 'default' | 'pills' | 'underline' | 'enclosed'
  size = 'md', // 'sm' | 'md' | 'lg'
  
  // 功能配置
  closable = false,
  draggable = false,
  scrollable = true,
  animated = true,
  
  // 样式配置
  className = '',
  listClassName = '',
  tabClassName = '',
  panelClassName = '',
  
  // 子组件
  children,
  
  ...props
}, ref) => {
  const [draggedTab, setDraggedTab] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  
  const tabsListRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // 获取子组件中的Tab和Panel
  const tabs = React.Children.toArray(children).filter(
    child => child?.type?.displayName === 'Tab'
  );
  
  const panels = React.Children.toArray(children).filter(
    child => child?.type?.displayName === 'TabPanel'
  );

  // 处理选项卡点击
  const handleTabClick = useCallback((tabValue) => {
    if (onChange) {
      onChange(tabValue);
    }
  }, [onChange]);

  // 处理选项卡关闭
  const handleTabClose = useCallback((e, tabValue) => {
    e.stopPropagation();
    // 这里可以触发关闭事件
    console.log('Close tab:', tabValue);
  }, []);

  // 拖拽处理
  const handleDragStart = useCallback((e, tab, index) => {
    if (!draggable) return;
    
    setDraggedTab({ tab, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  }, [draggable]);

  const handleDragOver = useCallback((e, index) => {
    if (!draggable || !draggedTab) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, [draggable, draggedTab]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    if (!draggable || !draggedTab) return;
    
    e.preventDefault();
    setDragOverIndex(null);
    
    // 这里可以触发重排序事件
    console.log('Reorder tab from', draggedTab.index, 'to', dropIndex);
    setDraggedTab(null);
  }, [draggable, draggedTab]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (!tabsListRef.current || !scrollable) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
    
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth);
    
    // 检测是否正在滚动
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [scrollable]);

  // 滚动到活动选项卡
  const scrollToActiveTab = useCallback(() => {
    if (!tabsListRef.current || !scrollable || !value) return;
    
    const activeTab = tabsListRef.current.querySelector('[data-active="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: animated ? 'smooth' : 'auto',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [scrollable, animated, value]);

  // 滚动控制
  const scrollLeft = useCallback(() => {
    if (!tabsListRef.current) return;
    tabsListRef.current.scrollBy({ left: -200, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    if (!tabsListRef.current) return;
    tabsListRef.current.scrollBy({ left: 200, behavior: 'smooth' });
  }, []);

  // 监听value变化，滚动到活动选项卡
  useEffect(() => {
    scrollToActiveTab();
  }, [value, scrollToActiveTab]);

  // 监听滚动状态
  useEffect(() => {
    const tabsList = tabsListRef.current;
    if (!tabsList) return;
    
    tabsList.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查
    
    return () => {
      tabsList.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // 获取样式
  const getTabsListClasses = () => {
    const orientationClasses = {
      horizontal: 'flex-row',
      vertical: 'flex-col'
    };

    const variantClasses = {
      default: orientation === 'horizontal' 
        ? 'border-b border-gray-200 dark:border-gray-700' 
        : 'border-r border-gray-200 dark:border-gray-700',
      pills: '',
      underline: 'border-b border-transparent',
      enclosed: 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg'
    };

    return cn(
      'flex',
      orientationClasses[orientation],
      variantClasses[variant],
      scrollable && orientation === 'horizontal' && 'overflow-x-auto scrollbar-hide',
      'relative',
      listClassName
    );
  };

  const getTabClasses = (isActive, isDisabled) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    const variantClasses = {
      default: cn(
        orientation === 'horizontal'
          ? 'border-b-2 border-transparent'
          : 'border-r-2 border-transparent',
        isActive && orientation === 'horizontal' && 'border-blue-500 text-blue-600 dark:text-blue-400',
        isActive && orientation === 'vertical' && 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
        !isActive && 'hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
      ),
      pills: cn(
        'rounded-md',
        isActive && 'bg-blue-500 text-white',
        !isActive && 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
      ),
      underline: cn(
        'border-b-2 border-transparent',
        isActive && 'border-blue-500 text-blue-600 dark:text-blue-400',
        !isActive && 'hover:border-gray-300 dark:hover:border-gray-600'
      ),
      enclosed: cn(
        'border-b-2 border-transparent',
        isActive && 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 rounded-t-md',
        !isActive && 'hover:border-gray-300 dark:hover:border-gray-600'
      )
    };

    return cn(
      'flex items-center gap-2',
      'font-medium',
      'transition-all duration-200',
      'cursor-pointer',
      'select-none',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      sizeClasses[size],
      variantClasses[variant],
      isDisabled && 'opacity-50 cursor-not-allowed',
      draggedTab && 'opacity-50',
      tabClassName
    );
  };

  const getPanelClasses = () => {
    return cn(
      'focus:outline-none',
      animated && 'transition-all duration-200 ease-in-out',
      panelClassName
    );
  };

  // 渲染选项卡
  const renderTabs = () => {
    return tabs.map((tab, index) => {
      const isActive = tab.props.value === value;
      const isDisabled = tab.props.disabled;
      const isDragged = draggedTab?.index === index;
      const isDragOver = dragOverIndex === index;

      return (
        <div
          key={tab.props.value}
          ref={ref}
          className={cn(
            'relative group',
            getTabClasses(isActive, isDisabled),
            isDragged && 'opacity-50 cursor-grabbing',
            isDragOver && !isDragged && 'border-t-2 border-t-blue-500'
          )}
          onClick={() => !isDisabled && handleTabClick(tab.props.value)}
          draggable={draggable && !isDisabled}
          onDragStart={(e) => handleDragStart(e, tab, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          data-active={isActive}
          role="tab"
          aria-selected={isActive}
          aria-disabled={isDisabled}
          tabIndex={isActive ? 0 : -1}
        >
          {/* 拖拽指示器 */}
          {draggable && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="GripVertical" size={12} className="text-gray-400" />
            </div>
          )}
          
          {/* 选项卡内容 */}
          <div className="flex items-center gap-2">
            {tab.props.icon && (
              <Icon name={tab.props.icon} size={16} />
            )}
            
            <span className="truncate">{tab.props.label}</span>
            
            {tab.props.badge && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {tab.props.badge}
              </span>
            )}
            
            {closable && !isDisabled && (
              <button
                type="button"
                onClick={(e) => handleTabClose(e, tab.props.value)}
                className="flex items-center justify-center w-4 h-4 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon name="X" size={12} />
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  // 渲染面板
  const renderPanels = () => {
    return panels.map(panel => (
      <div
        key={panel.props.value}
        className={getPanelClasses()}
        role="tabpanel"
        aria-labelledby={`tab-${panel.props.value}`}
        hidden={panel.props.value !== value}
      >
        {panel.props.children}
      </div>
    ));
  };

  return (
    <div
      ref={ref}
      className={cn('w-full', className)}
      {...props}
    >
      {/* 选项卡列表 */}
      <div className="relative">
        {/* 左侧滚动按钮 */}
        {scrollable && orientation === 'horizontal' && showLeftScroll && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-r-md shadow-md"
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
        )}
        
        {/* 右侧滚动按钮 */}
        {scrollable && orientation === 'horizontal' && showRightScroll && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-md shadow-md"
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        )}
        
        <div
          ref={tabsListRef}
          className={getTabsListClasses()}
          role="tablist"
          aria-orientation={orientation}
        >
          {renderTabs()}
        </div>
      </div>
      
      {/* 面板内容 */}
      <div>
        {renderPanels()}
      </div>
    </div>
  );
});

Tabs.displayName = 'Tabs';

/**
 * Tab组件 - 单个选项卡
 */
export const Tab = forwardRef(({
  value,
  label,
  icon,
  badge,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  return null; // 这个组件只用于配置，实际渲染由Tabs处理
});

Tab.displayName = 'Tab';

/**
 * TabPanel组件 - 选项卡面板
 */
export const TabPanel = forwardRef(({
  value,
  children,
  className = '',
  ...props
}, ref) => {
  return null; // 这个组件只用于配置，实际渲染由Tabs处理
});

TabPanel.displayName = 'TabPanel';

/**
 * TabList组件 - 选项卡列表容器
 */
export const TabList = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex', className)}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
});

TabList.displayName = 'TabList';

/**
 * TabPanels组件 - 面板容器
 */
export const TabPanels = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
});

TabPanels.displayName = 'TabPanels';

export default Tabs;
