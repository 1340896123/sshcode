import React, { forwardRef, useState, useCallback } from 'react';
import { cn } from '../utils/clsx';
import { Icon } from '../primitives/Icon';

/**
 * AppShell组件 - 应用外壳布局，包含顶部栏、侧栏、内容区和状态栏
 */
const AppShell = forwardRef(({
  // 布局配置
  sidebarPosition = 'left', // 'left' | 'right'
  sidebarWidth = 280,
  sidebarCollapsed = false,
  onSidebarToggle,
  showTopbar = true,
  showStatusBar = true,
  topbarHeight = 56,
  statusBarHeight = 32,
  
  // 响应式配置
  collapsible = true,
  responsive = true,
  mobileBreakpoint = 'md',
  
  // 样式配置
  className = '',
  topbarClassName = '',
  sidebarClassName = '',
  contentClassName = '',
  statusBarClassName = '',
  
  // 子组件
  topbar,
  sidebar,
  statusBar,
  children,
  
  ...props
}, ref) => {
  const [isCollapsed, setIsCollapsed] = useState(sidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  // 处理侧边栏切换
  const handleSidebarToggle = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (onSidebarToggle) {
      onSidebarToggle(newCollapsed);
    }
  }, [isCollapsed, onSidebarToggle]);

  // 检测移动端
  React.useEffect(() => {
    if (!responsive) return;

    const checkMobile = () => {
      const breakpointMap = {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280
      };
      const breakpoint = breakpointMap[mobileBreakpoint] || 768;
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [responsive, mobileBreakpoint]);

  // 计算侧边栏宽度
  const currentSidebarWidth = isMobile ? 0 : (isCollapsed ? 60 : sidebarWidth);
  
  // 计算内容区域样式
  const contentStyle = {
    marginLeft: sidebarPosition === 'left' ? currentSidebarWidth : 0,
    marginRight: sidebarPosition === 'right' ? currentSidebarWidth : 0,
    marginTop: showTopbar ? topbarHeight : 0,
    marginBottom: showStatusBar ? statusBarHeight : 0,
  };

  // 计算侧边栏样式
  const sidebarStyle = {
    width: currentSidebarWidth,
    left: sidebarPosition === 'left' ? 0 : 'auto',
    right: sidebarPosition === 'right' ? 0 : 'auto',
    top: showTopbar ? topbarHeight : 0,
    bottom: showStatusBar ? statusBarHeight : 0,
  };

  // 顶部栏
  const renderTopbar = () => {
    if (!showTopbar) return null;

    return (
      <div 
        className={cn(
          'fixed top-0 left-0 right-0 z-40',
          'bg-white dark:bg-gray-900',
          'border-b border-gray-200 dark:border-gray-700',
          'flex items-center justify-between',
          'px-4',
          'transition-all duration-200',
          topbarClassName
        )}
        style={{ height: topbarHeight }}
      >
        <div className="flex items-center gap-4">
          {collapsible && (
            <button
              onClick={handleSidebarToggle}
              className={cn(
                'p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors',
                'lg:hidden'
              )}
            >
              <Icon name="Menu" size={20} />
            </button>
          )}
          
          {collapsible && !isMobile && (
            <button
              onClick={handleSidebarToggle}
              className={cn(
                'p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors',
                'hidden lg:flex'
              )}
            >
              <Icon name={isCollapsed ? 'ChevronRight' : 'ChevronLeft'} size={16} />
            </button>
          )}
          
          {topbar}
        </div>
      </div>
    );
  };

  // 侧边栏
  const renderSidebar = () => {
    if (!sidebar || isMobile) return null;

    return (
      <div
        className={cn(
          'fixed z-30',
          'bg-white dark:bg-gray-900',
          'border-r border-gray-200 dark:border-gray-700',
          'transition-all duration-300 ease-in-out',
          sidebarPosition === 'left' ? 'border-r' : 'border-l',
          sidebarClassName
        )}
        style={sidebarStyle}
      >
        {typeof sidebar === 'function' ? sidebar({ isCollapsed, isMobile }) : sidebar}
      </div>
    );
  };

  // 状态栏
  const renderStatusBar = () => {
    if (!showStatusBar) return null;

    return (
      <div 
        className={cn(
          'fixed bottom-0 left-0 right-0 z-20',
          'bg-gray-50 dark:bg-gray-900',
          'border-t border-gray-200 dark:border-gray-700',
          'flex items-center justify-between',
          'px-4 text-xs text-gray-600 dark:text-gray-400',
          'transition-all duration-200',
          statusBarClassName
        )}
        style={{ 
          height: statusBarHeight,
          marginLeft: sidebarPosition === 'left' ? currentSidebarWidth : 0,
          marginRight: sidebarPosition === 'right' ? currentSidebarWidth : 0,
        }}
      >
        {statusBar}
      </div>
    );
  };

  return (
    <div 
      ref={ref}
      className={cn(
        'min-h-screen bg-gray-50 dark:bg-gray-900',
        className
      )}
      {...props}
    >
      {renderTopbar()}
      {renderSidebar()}
      
      <main 
        className={cn(
          'relative transition-all duration-300 ease-in-out',
          'overflow-hidden',
          contentClassName
        )}
        style={contentStyle}
      >
        {children}
      </main>
      
      {renderStatusBar()}
    </div>
  );
});

AppShell.displayName = 'AppShell';

/**
 * Topbar组件 - 顶部栏
 */
export const Topbar = forwardRef(({
  title,
  subtitle,
  leftActions,
  rightActions,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        'flex items-center justify-between w-full',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <div>
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {leftActions && (
          <div className="flex items-center gap-2">
            {leftActions}
          </div>
        )}
      </div>
      
      {rightActions && (
        <div className="flex items-center gap-2">
          {rightActions}
        </div>
      )}
    </div>
  );
});

Topbar.displayName = 'Topbar';

/**
 * Sidebar组件 - 侧边栏
 */
export const Sidebar = forwardRef(({
  children,
  isCollapsed = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        'h-full flex flex-col',
        isCollapsed ? 'items-center' : '',
        className
      )}
      {...props}
    >
      {typeof children === 'function' ? children({ isCollapsed }) : children}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

/**
 * SidebarSection组件 - 侧边栏分组
 */
export const SidebarSection = forwardRef(({
  title,
  children,
  isCollapsed = false,
  showBorder = true,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        'flex flex-col',
        showBorder && 'border-b border-gray-200 dark:border-gray-700',
        !isCollapsed && 'py-4',
        isCollapsed && 'py-2',
        className
      )}
      {...props}
    >
      {!isCollapsed && title && (
        <div className="px-4 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}
      
      <div className={cn(
        'flex flex-col',
        !isCollapsed && 'gap-1',
        isCollapsed && 'gap-2 items-center'
      )}>
        {typeof children === 'function' ? children({ isCollapsed }) : children}
      </div>
    </div>
  );
});

SidebarSection.displayName = 'SidebarSection';

/**
 * StatusBar组件 - 状态栏
 */
export const StatusBar = forwardRef(({
  left,
  center,
  right,
  className = '',
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        'flex items-center justify-between w-full',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        {left}
      </div>
      
      {center && (
        <div className="flex items-center gap-4">
          {center}
        </div>
      )}
      
      <div className="flex items-center gap-4">
        {right}
      </div>
    </div>
  );
});

StatusBar.displayName = 'StatusBar';

export default AppShell;
