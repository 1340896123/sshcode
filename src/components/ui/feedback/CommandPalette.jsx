import React, { useState, useEffect, useRef } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * CommandPalette组件 - 全局快捷键面板组件
 */
export function CommandPalette({
  commands = [],
  isOpen = false,
  onClose,
  onSelect,
  placeholder = '输入命令或搜索...',
  className = '',
  ...props
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedindex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 过滤命令
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCommands(commands);
    } else {
      const filtered = commands.filter(cmd => 
        cmd.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.keywords?.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [searchTerm, commands]);

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedindex]) {
            handleSelect(filteredCommands[selectedindex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedindex, filteredCommands]);

  // 滚动到选中项
  useEffect(() => {
    if (listRef.current && filteredCommands[selectedindex]) {
      const selectedElement = listRef.current.children[selectedindex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedindex, filteredCommands]);

  const handleSelect = (command) => {
    onSelect?.(command);
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedIndex(0);
    onClose?.();
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // 分组命令
  const groupedCommands = filteredCommands.reduce((groups, cmd) => {
    const category = cmd.category || '其他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(cmd);
    return groups;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* 命令面板 */}
      <div className="relative min-h-screen px-4 py-16 sm:p-8">
        <div className="mx-auto max-w-2xl">
          <div 
            className={clsx(
              'bg-gray-800 border border-gray-700 rounded-lg shadow-xl',
              'overflow-hidden',
              className
            )}
            {...props}
          >
            {/* 搜索框 */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Icon 
                  name="Search" 
                  size="sm" 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" 
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleInputChange}
                  placeholder={placeholder}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 命令列表 */}
            <div 
              ref={listRef}
              className="max-h-96 overflow-y-auto"
            >
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Icon name="SearchX" size="lg" className="mx-auto mb-2" />
                  <div>未找到匹配的命令</div>
                </div>
              ) : (
                Object.entries(groupedCommands).map(([category, categoryCommands], categoryIndex) => (
                  <div key={category}>
                    {/* 分类标题 */}
                    {categoryIndex > 0 && (
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-900/50">
                        {category}
                      </div>
                    )}
                    
                    {/* 命令项 */}
                    {categoryCommands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      const isSelected = globalIndex === selectedindex;
                      
                      return (
                        <button
                          key={command.id || index}
                          onClick={() => handleSelect(command)}
                          className={clsx(
                            'w-full px-4 py-3 flex items-center gap-3 text-left',
                            'hover:bg-gray-700/50 transition-colors',
                            isSelected && 'bg-blue-600/20 border-l-2 border-blue-500',
                            command.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                          disabled={command.disabled}
                        >
                          {/* 图标 */}
                          {command.icon && (
                            <div className="flex-shrink-0">
                              <Icon 
                                name={command.icon} 
                                size="sm" 
                                className={isSelected ? 'text-blue-400' : 'text-gray-400'} 
                              />
                            </div>
                          )}
                          
                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                'text-sm font-medium',
                                isSelected ? 'text-blue-400' : 'text-gray-100'
                              )}>
                                {command.title}
                              </span>
                              {command.badge && (
                                <span className="px-2 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded">
                                  {command.badge}
                                </span>
                              )}
                            </div>
                            {command.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                {command.description}
                              </div>
                            )}
                          </div>
                          
                          {/* 快捷键 */}
                          {command.shortcut && (
                            <div className="flex-shrink-0">
                              <kbd className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600">
                                {command.shortcut}
                              </kbd>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* 底部提示 */}
            <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-gray-700 rounded border border-gray-600 text-xs">↑↓</kbd>
                    <span>导航</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-gray-700 rounded border border-gray-600 text-xs">Enter</kbd>
                    <span>选择</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-gray-700 rounded border border-gray-600 text-xs">Esc</kbd>
                    <span>关闭</span>
                  </div>
                </div>
                {filteredCommands.length > 0 && (
                  <div>
                    {selectedindex + 1} / {filteredCommands.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for command palette
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState([]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  const registerCommands = (newCommands) => {
    setCommands(prev => [...prev, ...newCommands]);
  };

  const unregisterCommands = (commandIds) => {
    setCommands(prev => prev.filter(cmd => !commandIds.includes(cmd.id)));
  };

  // 全局快捷键监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K 打开命令面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    commands,
    registerCommands,
    unregisterCommands
  };
};

// 预设组件
export const ConnectionCommandPalette = (props) => {
  const { commands: additionalCommands = [], ...rest } = props;
  
  const connectionCommands = [
    {
      id: 'new-connection',
      title: '新建连接',
      description: '创建新的SSH连接',
      icon: 'Plus',
      shortcut: 'Ctrl+N',
      category: '连接管理',
      action: () => console.log('新建连接')
    },
    {
      id: 'quick-connect',
      title: '快速连接',
      description: '快速连接到最近的服务器',
      icon: 'Wifi',
      shortcut: 'Ctrl+Shift+K',
      category: '连接管理',
      action: () => console.log('快速连接')
    },
    {
      id: 'disconnect-all',
      title: '断开所有连接',
      description: '断开当前所有SSH连接',
      icon: 'X',
      category: '连接管理',
      action: () => console.log('断开所有连接')
    }
  ];

  return (
    <CommandPalette
      commands={[...connectionCommands, ...additionalCommands]}
      {...rest}
    />
  );
};

export default CommandPalette;
