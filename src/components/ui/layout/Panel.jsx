import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';

/**
 * Panel组件 - 通用面板容器
 */
const panelVariants = createVariants(
  'bg-gray-900 border border-gray-800 rounded-lg',
  {
    variant: {
      default: 'bg-gray-900 border-gray-800',
      elevated: 'bg-gray-900 border-gray-700 shadow-lg',
      outlined: 'bg-gray-900 border-gray-600',
      filled: 'bg-gray-800 border-gray-700',
      glass: 'bg-gray-900/80 border-gray-700/50 backdrop-blur-sm'
    },
    size: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    },
    radius: {
      none: 'rounded-none',
      sm: 'rounded',
      md: 'rounded-lg',
      lg: 'rounded-xl',
      full: 'rounded-full'
    }
  },
  {
    variant: 'default',
    size: 'md',
    radius: 'md'
  }
);

const Panel = forwardRef(({
  children,
  variant,
  size,
  radius,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(panelVariants({ variant, size, radius }), className)}
      {...props}
    >
      {children}
    </div>
  );
});

Panel.displayName = 'Panel';

export default Panel;

/**
 * Card组件 - 卡片容器
 */
export const Card = forwardRef(({
  title,
  subtitle,
  actions,
  children,
  variant,
  size,
  radius,
  className,
  ...props
}, ref) => {
  const hasHeader = title || subtitle || actions;

  return (
    <Panel
      ref={ref}
      variant={variant}
      size={size}
      radius={radius}
      className={cn('flex flex-col', className)}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center justify-between mb-4 last:mb-0">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-gray-100 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </Panel>
  );
});

Card.displayName = 'Card';

/**
 * CardSection组件 - 卡片分区
 */
export const CardSection = forwardRef(({
  title,
  children,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('space-y-3', className)}
      {...props}
    >
      {title && (
        <h4 className="text-sm font-medium text-gray-300">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
});

CardSection.displayName = 'CardSection';

/**
 * CardGrid组件 - 卡片网格
 */
export const CardGrid = forwardRef(({
  columns = 1,
  gap = 4,
  children,
  className,
  ...props
}, ref) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  const gapClasses = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'grid',
        gridClasses[columns] || gridClasses[1],
        gapClasses[gap] || gapClasses[4],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

CardGrid.displayName = 'CardGrid';

/**
 * CollapsibleCard组件 - 可折叠卡片
 */
export const CollapsibleCard = forwardRef(({
  title,
  subtitle,
  actions,
  children,
  defaultExpanded = true,
  variant,
  size,
  radius,
  className,
  ...props
}, ref) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <Panel
      ref={ref}
      variant={variant}
      size={size}
      radius={radius}
      className={cn('flex flex-col', className)}
      {...props}
    >
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-gray-100 truncate flex items-center gap-2">
              <svg
                className={cn(
                  'w-4 h-4 transition-transform',
                  isExpanded ? 'rotate-90' : ''
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </Panel>
  );
});

CollapsibleCard.displayName = 'CollapsibleCard';

/**
 * StatsCard组件 - 统计卡片
 */
export const StatsCard = forwardRef(({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  variant = 'default',
  size = 'md',
  className,
  ...props
}, ref) => {
  const changeColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <Card
      ref={ref}
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            {value}
          </p>
          {change && (
            <p className={cn('text-sm mt-1', changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-gray-500">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';

/**
 * ListCard组件 - 列表卡片
 */
export const ListCard = forwardRef(({
  title,
  subtitle,
  actions,
  items = [],
  emptyText = '暂无数据',
  variant,
  size,
  className,
  ...props
}, ref) => {
  return (
    <Card
      ref={ref}
      title={title}
      subtitle={subtitle}
      actions={actions}
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    >
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 -mx-3 rounded hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                {typeof item === 'string' ? (
                  <span className="text-sm text-gray-300 truncate">
                    {item}
                  </span>
                ) : (
                  <>
                    {item.title && (
                      <span className="text-sm font-medium text-gray-300 truncate">
                        {item.title}
                      </span>
                    )}
                    {item.description && (
                      <span className="text-xs text-gray-500 block mt-0.5 truncate">
                        {item.description}
                      </span>
                    )}
                  </>
                )}
              </div>
              {item.actions && (
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {item.actions}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

ListCard.displayName = 'ListCard';
