import React, { forwardRef, useState, useCallback, useRef } from 'react';
import { cn } from '../utils/clsx';
import { Icon } from '../primitives/Icon';

/**
 * Accordion组件 - 可折叠面板组件
 */
const Accordion = forwardRef(({
  // 基础配置
  value,
  onChange,
  multiple = false,
  defaultValue = null,
  collapsible = true,
  
  // 样式配置
  variant = 'default', // 'default' | 'bordered' | 'ghost' | 'filled'
  size = 'md', // 'sm' | 'md' | 'lg'
  
  // 功能配置
  animated = true,
  iconPosition = 'left', // 'left' | 'right'
  chevron = true,
  
  // 样式
  className = '',
  itemClassName = '',
  headerClassName = '',
  contentClassName = '',
  
  // 子组件
  children,
  
  ...props
}, ref) => {
  const [openItems, setOpenItems] = useState(() => {
    if (value !== undefined) return Array.isArray(value) ? value : [value];
    if (defaultValue !== null) return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    return [];
  });

  // 处理项目点击
  const handleItemClick = useCallback((itemValue) => {
    let newOpenItems;
    
    if (multiple) {
      if (openItems.includes(itemValue)) {
        if (collapsible || openItems.length > 1) {
          newOpenItems = openItems.filter(item => item !== itemValue);
        } else {
          newOpenItems = openItems; // 至少保持一个打开
        }
      } else {
        newOpenItems = [...openItems, itemValue];
      }
    } else {
      if (openItems.includes(itemValue)) {
        if (collapsible) {
          newOpenItems = [];
        } else {
          newOpenItems = [itemValue]; // 至少保持一个打开
        }
      } else {
        newOpenItems = [itemValue];
      }
    }
    
    setOpenItems(newOpenItems);
    
    if (onChange) {
      onChange(multiple ? newOpenItems : newOpenItems[0] || null);
    }
  }, [multiple, collapsible, openItems, onChange]);

  // 获取子组件中的AccordionItem
  const accordionItems = React.Children.toArray(children).filter(
    child => child?.type?.displayName === 'AccordionItem'
  );

  // 获取样式
  const getItemClasses = () => {
    const variantClasses = {
      default: 'border border-gray-200 dark:border-gray-700 rounded-md',
      bordered: 'border-b border-gray-200 dark:border-gray-700',
      ghost: 'border-0',
      filled: 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md'
    };

    return cn(
      'overflow-hidden',
      variantClasses[variant],
      itemClassName
    );
  };

  const getHeaderClasses = (isOpen) => {
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg'
    };

    const variantClasses = {
      default: cn(
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        isOpen && 'bg-gray-50 dark:bg-gray-800'
      ),
      bordered: cn(
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        isOpen && 'bg-gray-50 dark:bg-gray-800'
      ),
      ghost: cn(
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        isOpen && 'bg-gray-100 dark:bg-gray-800'
      ),
      filled: cn(
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        isOpen && 'bg-gray-100 dark:bg-gray-700'
      )
    };

    return cn(
      'flex items-center justify-between w-full',
      'font-medium text-left',
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
      sizeClasses[size],
      variantClasses[variant],
      headerClassName
    );
  };

  const getContentClasses = (isOpen) => {
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg'
    };

    return cn(
      'text-gray-600 dark:text-gray-400',
      'bg-white dark:bg-gray-900',
      sizeClasses[size],
      animated && 'transition-all duration-200 ease-in-out',
      isOpen ? (animated ? 'max-h-96 opacity-100' : '') : (animated ? 'max-h-0 opacity-0 overflow-hidden' : 'hidden'),
      contentClassName
    );
  };

  // 渲染手风琴项目
  const renderAccordionItems = () => {
    return accordionItems.map((item) => {
      const itemValue = item.props.value;
      const isOpen = openItems.includes(itemValue);
      const isDisabled = item.props.disabled;

      return (
        <div
          key={itemValue}
          className={getItemClasses()}
        >
          <button
            type="button"
            className={getHeaderClasses(isOpen)}
            onClick={() => !isDisabled && handleItemClick(itemValue)}
            disabled={isDisabled}
            aria-expanded={isOpen}
            aria-controls={`accordion-content-${itemValue}`}
          >
            <div className={cn(
              'flex items-center gap-3 flex-1 min-w-0',
              iconPosition === 'right' && 'flex-row-reverse'
            )}>
              {/* 左侧图标 */}
              {iconPosition === 'left' && item.props.icon && (
                <Icon 
                  name={item.props.icon} 
                  size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
                  className={cn(
                    'flex-shrink-0',
                    isDisabled ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                  )}
                />
              )}
              
              {/* 标题和描述 */}
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {item.props.title}
                </div>
                {item.props.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {item.props.description}
                  </div>
                )}
              </div>
              
              {/* 右侧图标 */}
              {iconPosition === 'right' && item.props.icon && (
                <Icon 
                  name={item.props.icon} 
                  size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
                  className={cn(
                    'flex-shrink-0',
                    isDisabled ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                  )}
                />
              )}
              
              {/* 展开/收起箭头 */}
              {chevron && (
                <Icon 
                  name="ChevronDown" 
                  size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
                  className={cn(
                    'flex-shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-180',
                    isDisabled ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                  )}
                />
              )}
            </div>
            
            {/* 右侧操作按钮 */}
            {item.props.actions && (
              <div className="flex items-center gap-2 ml-4">
                {item.props.actions}
              </div>
            )}
          </button>
          
          <div
            id={`accordion-content-${itemValue}`}
            className={getContentClasses(isOpen)}
            role="region"
            aria-labelledby={`accordion-header-${itemValue}`}
          >
            {item.props.children}
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={ref}
      className={cn('space-y-2', className)}
      {...props}
    >
      {renderAccordionItems()}
    </div>
  );
});

Accordion.displayName = 'Accordion';

/**
 * AccordionItem组件 - 手风琴项目
 */
export const AccordionItem = forwardRef(({
  value,
  title,
  description,
  icon,
  actions,
  disabled = false,
  className = '',
  children,
  ...props
}, ref) => {
  return null; // 这个组件只用于配置，实际渲染由Accordion处理
});

AccordionItem.displayName = 'AccordionItem';

/**
 * AccordionHeader组件 - 手风琴头部
 */
export const AccordionHeader = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between w-full',
        'font-medium text-left',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

AccordionHeader.displayName = 'AccordionHeader';

/**
 * AccordionContent组件 - 手风琴内容
 */
export const AccordionContent = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'text-gray-600 dark:text-gray-400',
        'bg-white dark:bg-gray-900',
        'px-4 py-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

AccordionContent.displayName = 'AccordionContent';

/**
 * ConnectionAccordion组件 - 连接详情手风琴
 */
export const ConnectionAccordion = forwardRef(({
  connection,
  onEdit,
  onDelete,
  onTest,
  className = '',
  ...props
}, ref) => {
  return (
    <Accordion
      ref={ref}
      className={className}
      {...props}
    >
      <AccordionItem
        value={connection.id}
        title={connection.name}
        description={`${connection.username}@${connection.host}:${connection.port}`}
        icon="Server"
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTest?.(connection)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="测试连接"
            >
              <Icon name="Wifi" size={16} />
            </button>
            <button
              type="button"
              onClick={() => onEdit?.(connection)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="编辑"
            >
              <Icon name="Edit" size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(connection)}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600"
              title="删除"
            >
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">主机:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{connection.host}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">端口:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{connection.port}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">用户:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{connection.username}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">认证:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {connection.authType === 'password' ? '密码' : '私钥'}
              </span>
            </div>
          </div>
          
          {connection.tags && connection.tags.length > 0 && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">标签:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {connection.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {connection.description && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">描述:</span>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {connection.description}
              </p>
            </div>
          )}
        </div>
      </AccordionItem>
    </Accordion>
  );
});

ConnectionAccordion.displayName = 'ConnectionAccordion';

/**
 * LogAccordion组件 - 日志手风琴
 */
export const LogAccordion = forwardRef(({
  logs = [],
  className = '',
  ...props
}, ref) => {
  return (
    <Accordion
      ref={ref}
      className={className}
      {...props}
    >
      {logs.map((log, index) => (
        <AccordionItem
          key={index}
          value={`log-${index}`}
          title={log.title}
          description={`${log.timestamp} - ${log.level}`}
          icon={log.level === 'error' ? 'AlertCircle' : log.level === 'warning' ? 'AlertTriangle' : 'Info'}
        >
          <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <pre className="whitespace-pre-wrap">{log.content}</pre>
          </div>
        </AccordionItem>
      ))}
    </Accordion>
  );
});

LogAccordion.displayName = 'LogAccordion';

export default Accordion;
