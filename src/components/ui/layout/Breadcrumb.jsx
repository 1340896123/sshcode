import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { Icon } from '../primitives/Icon';

/**
 * Breadcrumb组件 - 面包屑导航
 */
const Breadcrumb = forwardRef(({
  items = [],
  separator = '/',
  showHome = true,
  homeIcon = 'Home',
  maxItems = 5,
  className = '',
  itemClassName = '',
  separatorClassName = '',
  onItemClick,
  ...props
}, ref) => {
  // 处理项目点击
  const handleItemClick = (item, index) => {
    if (onItemClick) {
      onItemClick(item, index);
    }
  };

  // 处理首页点击
  const handleHomeClick = () => {
    if (onItemClick) {
      onItemClick({ label: '首页', href: '/' }, -1);
    }
  };

  // 渲染分隔符
  const renderSeparator = (index) => (
    <li
      key={`separator-${index}`}
      className={cn(
        'flex items-center text-gray-400 dark:text-gray-600',
        separatorClassName
      )}
    >
      <span className="mx-2">{separator}</span>
    </li>
  );

  // 渲染面包屑项目
  const renderBreadcrumbItem = (item, index, isLast) => {
    const isClickable = item.href || item.onClick;
    
    return (
      <li key={index} className="flex items-center">
        {isClickable && !isLast ? (
          <button
            type="button"
            onClick={() => handleItemClick(item, index)}
            className={cn(
              'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
              'transition-colors duration-200',
              'hover:underline',
              'flex items-center gap-1',
              itemClassName
            )}
          >
            {item.icon && (
              <Icon name={item.icon} size={16} />
            )}
            <span>{item.label}</span>
          </button>
        ) : (
          <span className={cn(
            'text-gray-600 dark:text-gray-400',
            'flex items-center gap-1',
            itemClassName
          )}>
            {item.icon && (
              <Icon name={item.icon} size={16} />
            )}
            <span>{item.label}</span>
          </span>
        )}
      </li>
    );
  };

  // 构建面包屑列表
  const buildBreadcrumbItems = () => {
    const breadcrumbItems = [];

    // 添加首页
    if (showHome) {
      breadcrumbItems.push({
        label: '首页',
        href: '/',
        icon: homeIcon
      });
    }

    // 添加其他项目
    breadcrumbItems.push(...items);

    // 处理项目过多的情况
    if (breadcrumbItems.length > maxItems) {
      const firstItem = breadcrumbItems[0];
      const lastItems = breadcrumbItems.slice(-2);
      const omittedCount = breadcrumbItems.length - lastItems.length - 1;

      return [
        firstItem,
        { label: `... ${omittedCount} 项`, isOmitted: true },
        ...lastItems
      ];
    }

    return breadcrumbItems;
  };

  const breadcrumbItems = buildBreadcrumbItems();

  return (
    <nav
      ref={ref}
      className={cn('flex items-center', className)}
      aria-label="面包屑导航"
      {...props}
    >
      <ol className="flex items-center">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          if (item.isOmitted) {
            return (
              <React.Fragment key="omitted">
                {renderSeparator(index)}
                <li className="flex items-center">
                  <span className={cn(
                    'text-gray-500 dark:text-gray-400',
                    'px-2 py-1 text-sm',
                    'bg-gray-100 dark:bg-gray-800 rounded',
                    itemClassName
                  )}>
                    {item.label}
                  </span>
                </li>
                {renderSeparator(index)}
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={index}>
              {index > 0 && renderSeparator(index)}
              {renderBreadcrumbItem(item, index, isLast)}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
});

Breadcrumb.displayName = 'Breadcrumb';

/**
 * BreadcrumbItem组件 - 单个面包屑项目
 */
export const BreadcrumbItem = forwardRef(({
  children,
  href,
  icon,
  isActive = false,
  onClick,
  className = '',
  ...props
}, ref) => {
  const baseClasses = cn(
    'flex items-center gap-1',
    'transition-colors duration-200',
    isActive
      ? 'text-gray-900 dark:text-gray-100 font-medium'
      : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline',
    className
  );

  const content = (
    <>
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </>
  );

  if (href && !isActive) {
    return (
      <a
        ref={ref}
        href={href}
        className={baseClasses}
        onClick={onClick}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      className={baseClasses}
      onClick={onClick}
      disabled={isActive}
      {...props}
    >
      {content}
    </button>
  );
});

BreadcrumbItem.displayName = 'BreadcrumbItem';

/**
 * BreadcrumbSeparator组件 - 分隔符
 */
export const BreadcrumbSeparator = forwardRef(({
  children = '/',
  className = '',
  ...props
}, ref) => {
  return (
    <li
      ref={ref}
      className={cn(
        'flex items-center text-gray-400 dark:text-gray-600',
        'mx-2',
        className
      )}
      {...props}
    >
      {children}
    </li>
  );
});

BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

/**
 * FileBreadcrumb组件 - 文件路径面包屑
 */
export const FileBreadcrumb = forwardRef(({
  path = '/',
  rootLabel = '根目录',
  showRoot = true,
  maxSegments = 4,
  onSegmentClick,
  className = '',
  ...props
}, ref) => {
  // 解析路径
  const parsePath = (pathStr) => {
    if (pathStr === '/') return [];
    
    return pathStr
      .split('/')
      .filter(segment => segment.length > 0)
      .map((segment, index, segments) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        return {
          label: segment,
          href,
          isLast: index === segments.length - 1
        };
      });
  };

  const pathSegments = parsePath(path);
  const totalSegments = showRoot ? pathSegments.length + 1 : pathSegments.length;

  // 构建面包屑项目
  const buildItems = () => {
    const items = [];

    // 添加根目录
    if (showRoot) {
      items.push({
        label: rootLabel,
        href: '/',
        icon: 'HardDrive'
      });
    }

    // 添加路径段
    if (pathSegments.length > 0) {
      if (totalSegments > maxSegments) {
        // 路径过长，显示省略
        const rootItem = items[0];
        const lastTwoSegments = pathSegments.slice(-2);
        const omittedCount = pathSegments.length - lastTwoSegments.length;

        return [
          rootItem,
          { label: `... ${omittedCount} 个文件夹`, isOmitted: true },
          ...lastTwoSegments
        ];
      } else {
        items.push(...pathSegments);
      }
    }

    return items;
  };

  const items = buildItems();

  return (
    <Breadcrumb
      ref={ref}
      items={items}
      onItemClick={onSegmentClick}
      className={className}
      {...props}
    />
  );
});

FileBreadcrumb.displayName = 'FileBreadcrumb';

/**
 * URLBreadcrumb组件 - URL路径面包屑
 */
export const URLBreadcrumb = forwardRef(({
  url,
  segments,
  onSegmentClick,
  className = '',
  ...props
}, ref) => {
  // 如果直接提供segments，使用它；否则解析URL
  const breadcrumbSegments = segments || (() => {
    try {
      const urlObj = new URL(url, window.location.origin);
      const pathSegments = urlObj.pathname
        .split('/')
        .filter(segment => segment.length > 0)
        .map((segment, index, segments) => ({
          label: decodeURIComponent(segment),
          href: '/' + segments.slice(0, index + 1).join('/'),
          isLast: index === segments.length - 1
        }));

      return [
        { label: '首页', href: '/', icon: 'Home' },
        ...pathSegments
      ];
    } catch (error) {
      console.warn('Invalid URL:', url);
      return [{ label: '首页', href: '/', icon: 'Home' }];
    }
  })();

  return (
    <Breadcrumb
      ref={ref}
      items={breadcrumbSegments}
      onItemClick={onSegmentClick}
      className={className}
      {...props}
    />
  );
});

URLBreadcrumb.displayName = 'URLBreadcrumb';

// 命名导出和默认导出
export { Breadcrumb };
export default Breadcrumb;
