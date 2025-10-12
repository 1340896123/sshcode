import React, { forwardRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Badge } from '../primitives/Badge';

const tabInnerNavVariants = cva(
  'flex items-center space-x-1 bg-slate-800/50 border-b border-slate-700 px-2',
  {
    variants: {
      variant: {
        default: 'bg-slate-800/50',
        pills: 'bg-slate-900 border-slate-700 rounded-lg p-1',
      },
      size: {
        sm: 'py-1',
        md: 'py-2',
        lg: 'py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const tabItemVariants = cva(
  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer',
  {
    variants: {
      active: {
        true: '',
        false: '',
      },
      variant: {
        default: '',
        pills: '',
      },
    },
    compoundVariants: [
      {
        active: true,
        variant: 'default',
        class: 'text-blue-400 border-b-2 border-blue-500 bg-transparent',
      },
      {
        active: false,
        variant: 'default',
        class: 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50',
      },
      {
        active: true,
        variant: 'pills',
        class: 'text-white bg-blue-500 shadow-sm',
      },
      {
        active: false,
        variant: 'pills',
        class: 'text-slate-400 hover:text-slate-300 hover:bg-slate-700',
      },
    ],
    defaultVariants: {
      active: false,
      variant: 'default',
    },
  }
);

export const TabInnerNav = forwardRef((
  {
    className,
    variant,
    size,
    tabs,
    activeTab,
    onTabChange,
    showBadges = true,
    showIcons = true,
    disabledTabs = [],
    ...props
  },
  ref
) => {
  const handleTabClick = (tabId) => {
    if (disabledTabs.includes(tabId)) return;
    onTabChange?.(tabId);
  };

  const handleKeyDown = (event, tabId) => {
    if (disabledTabs.includes(tabId)) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onTabChange?.(tabId);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        navigateToPreviousTab();
        break;
      case 'ArrowRight':
        event.preventDefault();
        navigateToNextTab();
        break;
      case 'Home':
        event.preventDefault();
        const firstTab = tabs.find(tab => !disabledTabs.includes(tab.id));
        if (firstTab) onTabChange?.(firstTab.id);
        break;
      case 'End':
        event.preventDefault();
        const lastTab = [...tabs].reverse().find(tab => !disabledTabs.includes(tab.id));
        if (lastTab) onTabChange?.(lastTab.id);
        break;
    }
  };

  const navigateToPreviousTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    let prevIndex = currentIndex - 1;
    
    while (prevIndex >= 0) {
      const tab = tabs[prevIndex];
      if (!disabledTabs.includes(tab.id)) {
        onTabChange?.(tab.id);
        break;
      }
      prevIndex--;
    }
  };

  const navigateToNextTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    let nextIndex = currentIndex + 1;
    
    while (nextIndex < tabs.length) {
      const tab = tabs[nextIndex];
      if (!disabledTabs.includes(tab.id)) {
        onTabChange?.(tab.id);
        break;
      }
      nextIndex++;
    }
  };

  const getTabAriaSelected = (tabId) => activeTab === tabId;

  const getTabIndex = (tabId) => {
    if (disabledTabs.includes(tabId)) return -1;
    return activeTab === tabId ? 0 : -1;
  };

  return (
    <div
      ref={ref}
      className={clsx(tabInnerNavVariants({ variant, size, className }))}
      role="tablist"
      aria-orientation="horizontal"
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = disabledTabs.includes(tab.id);
        
        return (
          <div
            key={tab.id}
            className={clsx(
              tabItemVariants({ active: isActive, variant }),
              isDisabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            role="tab"
            aria-selected={getTabAriaSelected(tab.id)}
            aria-controls={`tabpanel-${tab.id}`}
            aria-disabled={isDisabled}
            tabIndex={getTabIndex(tab.id)}
          >
            {/* 图标 */}
            {showIcons && tab.icon && (
              <Icon 
                name={tab.icon} 
                className={clsx(
                  'w-4 h-4',
                  isActive && 'text-current'
                )} 
              />
            )}

            {/* 标签文本 */}
            <span className="truncate">
              {tab.label}
            </span>

            {/* 徽标 */}
            {showBadges && tab.badge && (
              <Badge
                variant={isActive ? 'primary' : 'secondary'}
                size="sm"
                className={clsx(
                  'ml-1',
                  tab.badge.variant === 'danger' && 'bg-red-500 text-white',
                  tab.badge.variant === 'warning' && 'bg-yellow-500 text-black',
                  tab.badge.variant === 'success' && 'bg-green-500 text-white'
                )}
              >
                {tab.badge.count || tab.badge.text}
              </Badge>
            )}

            {/* 状态指示器 */}
            {tab.status && (
              <div className={clsx(
                'w-2 h-2 rounded-full',
                tab.status === 'active' && 'bg-green-500',
                tab.status === 'warning' && 'bg-yellow-500',
                tab.status === 'error' && 'bg-red-500',
                tab.status === 'idle' && 'bg-slate-500'
              )} />
            )}

            {/* 快捷键提示 */}
            {tab.shortcut && (
              <span className="text-xs text-slate-500 ml-1">
                {tab.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

TabInnerNav.displayName = 'TabInnerNav';

// 预定义的标签配置
export const DefaultTabConfig = {
  FILE: {
    id: 'files',
    label: '文件',
    icon: 'Folder',
    shortcut: 'Alt+1',
  },
  TERMINAL: {
    id: 'terminal',
    label: '终端',
    icon: 'Terminal',
    shortcut: 'Alt+2',
  },
  AI: {
    id: 'ai',
    label: 'AI 助手',
    icon: 'Bot',
    shortcut: 'Alt+3',
  },
};

// 使用示例
export const SessionTabNav = (props) => (
  <TabInnerNav
    tabs={[
      DefaultTabConfig.FILE,
      DefaultTabConfig.TERMINAL,
      DefaultTabConfig.AI,
    ]}
    {...props}
  />
);
