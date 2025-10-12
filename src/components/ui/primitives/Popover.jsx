import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from './Icon';

/**
 * Popover组件 - 气泡弹出框组件
 */
const popoverVariants = createVariants(
  'relative z-50',
  {
    variant: {
      default: 'bg-gray-800 border border-gray-600 text-gray-100 shadow-lg',
      dark: 'bg-gray-900 border border-gray-700 text-gray-100 shadow-xl',
      light: 'bg-white border border-gray-200 text-gray-900 shadow-lg',
      success: 'bg-green-600 border border-green-500 text-white shadow-lg',
      warning: 'bg-yellow-600 border border-yellow-500 text-white shadow-lg',
      error: 'bg-red-600 border border-red-500 text-white shadow-lg',
      info: 'bg-blue-600 border border-blue-500 text-white shadow-lg'
    },
    size: {
      sm: 'max-w-xs',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const Popover = forwardRef(({
  children,
  content,
  trigger = 'hover',
  position = 'top',
  offset = 8,
  delay = 0,
  disabled = false,
  arrow = true,
  closeOnClick = false,
  variant,
  size,
  className,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const timeoutRef = useRef(null);

  // 计算弹出框位置
  const calculatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + scrollX + triggerRect.width / 2 - popoverRect.width / 2;
        y = triggerRect.top + scrollY - popoverRect.height - offset;
        break;
      case 'bottom':
        x = triggerRect.left + scrollX + triggerRect.width / 2 - popoverRect.width / 2;
        y = triggerRect.bottom + scrollY + offset;
        break;
      case 'left':
        x = triggerRect.left + scrollX - popoverRect.width - offset;
        y = triggerRect.top + scrollY + triggerRect.height / 2 - popoverRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + scrollX + offset;
        y = triggerRect.top + scrollY + triggerRect.height / 2 - popoverRect.height / 2;
        break;
      case 'top-start':
        x = triggerRect.left + scrollX;
        y = triggerRect.top + scrollY - popoverRect.height - offset;
        break;
      case 'top-end':
        x = triggerRect.right + scrollX - popoverRect.width;
        y = triggerRect.top + scrollY - popoverRect.height - offset;
        break;
      case 'bottom-start':
        x = triggerRect.left + scrollX;
        y = triggerRect.bottom + scrollY + offset;
        break;
      case 'bottom-end':
        x = triggerRect.right + scrollX - popoverRect.width;
        y = triggerRect.bottom + scrollY + offset;
        break;
      case 'left-start':
        x = triggerRect.left + scrollX - popoverRect.width - offset;
        y = triggerRect.top + scrollY;
        break;
      case 'left-end':
        x = triggerRect.left + scrollX - popoverRect.width - offset;
        y = triggerRect.bottom + scrollY - popoverRect.height;
        break;
      case 'right-start':
        x = triggerRect.right + scrollX + offset;
        y = triggerRect.top + scrollY;
        break;
      case 'right-end':
        x = triggerRect.right + scrollX + offset;
        y = triggerRect.bottom + scrollY - popoverRect.height;
        break;
    }

    // 边界检查
    const padding = 8;
    x = Math.max(padding, Math.min(x, window.innerWidth - popoverRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - popoverRect.height - padding));

    setCoords({ x, y });
  };

  const handleOpen = () => {
    if (disabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  const handleClick = (e) => {
    if (trigger === 'click') {
      e.preventDefault();
      if (isOpen) {
        handleClose();
      } else {
        handleOpen();
      }
    }
  };

  // 事件处理
  useEffect(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const events = {
      hover: {
        mouseenter: handleOpen,
        mouseleave: handleClose,
        click: undefined
      },
      click: {
        mouseenter: undefined,
        mouseleave: undefined,
        click: handleClick
      },
      manual: {
        mouseenter: undefined,
        mouseleave: undefined,
        click: undefined
      }
    };

    const eventHandlers = events[trigger];
    
    if (eventHandlers.mouseenter) {
      triggerEl.addEventListener('mouseenter', eventHandlers.mouseenter);
    }
    if (eventHandlers.mouseleave) {
      triggerEl.addEventListener('mouseleave', eventHandlers.mouseleave);
    }
    if (eventHandlers.click) {
      triggerEl.addEventListener('click', eventHandlers.click);
    }

    return () => {
      if (eventHandlers.mouseenter) {
        triggerEl.removeEventListener('mouseenter', eventHandlers.mouseenter);
      }
      if (eventHandlers.mouseleave) {
        triggerEl.removeEventListener('mouseleave', eventHandlers.mouseleave);
      }
      if (eventHandlers.click) {
        triggerEl.removeEventListener('click', eventHandlers.click);
      }
    };
  }, [trigger, disabled]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeOnClick]);

  // 位置计算
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition);
      
      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition);
      };
    }
  }, [isOpen, position]);

  // 箭头位置计算
  const getArrowStyles = () => {
    if (!arrow || !triggerRef.current) return {};

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current?.getBoundingClientRect();
    
    if (!popoverRect) return {};

    let arrowStyles = {};

    switch (position) {
      case 'top':
      case 'bottom':
        arrowStyles.left = `${triggerRect.left + triggerRect.width / 2 - coords.x - 6}px`;
        break;
      case 'left':
      case 'right':
        arrowStyles.top = `${triggerRect.top + triggerRect.height / 2 - coords.y - 6}px`;
        break;
    }

    return arrowStyles;
  };

  const renderArrow = () => {
    if (!arrow) return null;

    const arrowPositions = {
      top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full',
      bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full',
      left: 'right-0 top-1/2 transform -translate-y-1/2 translate-x-full',
      right: 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-full',
      'top-start': 'bottom-0 left-4 transform translate-y-full',
      'top-end': 'bottom-0 right-4 transform translate-y-full',
      'bottom-start': 'top-0 left-4 transform -translate-y-full',
      'bottom-end': 'top-0 right-4 transform -translate-y-full',
      'left-start': 'right-0 top-4 transform translate-x-full',
      'left-end': 'right-0 bottom-4 transform translate-x-full',
      'right-start': 'left-0 top-4 transform -translate-x-full',
      'right-end': 'left-0 bottom-4 transform -translate-x-full'
    };

    return (
      <div
        className={cn(
          'absolute w-3 h-3 bg-gray-800 border border-gray-600 transform rotate-45',
          arrowPositions[position]
        )}
        style={getArrowStyles()}
      />
    );
  };

  return (
    <>
      <span ref={triggerRef} className="inline-block">
        {children}
      </span>
      
      {isOpen && (
        <div
          ref={popoverRef}
          className={cn(
            'absolute rounded-lg p-3',
            popoverVariants({ variant, size }),
            className
          )}
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`
          }}
          {...props}
        >
          {renderArrow()}
          {typeof content === 'function' ? content({ onClose: handleClose }) : content}
        </div>
      )}
    </>
  );
});

Popover.displayName = 'Popover';

/**
 * PopoverTrigger组件 - Popover触发器
 */
export const PopoverTrigger = forwardRef(({
  children,
  asChild = false,
  ...props
}, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref,
      ...props
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      className="inline-flex items-center justify-center"
      {...props}
    >
      {children}
    </button>
  );
});

PopoverTrigger.displayName = 'PopoverTrigger';

/**
 * PopoverContent组件 - Popover内容
 */
export const PopoverContent = forwardRef(({
  title,
  description,
  children,
  showClose = false,
  onClose,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('space-y-2', className)}
      {...props}
    >
      {(title || showClose) && (
        <div className="flex items-center justify-between">
          {title && (
            <h3 className="text-sm font-medium text-gray-100">
              {title}
            </h3>
          )}
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
      )}
      
      {description && (
        <p className="text-xs text-gray-400">
          {description}
        </p>
      )}
      
      {children}
    </div>
  );
});

PopoverContent.displayName = 'PopoverContent';

/**
 * PopoverConfirm组件 - 确认弹窗
 */
export const PopoverConfirm = forwardRef(({
  title = '确认操作',
  description,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'error',
  loading = false,
  children,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setIsOpen(false);
  };

  const confirmButtonVariants = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    error: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };

  return (
    <Popover
      ref={ref}
      trigger="click"
      position="top"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      {...props}
    >
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      
      <PopoverContent title={title} description={description}>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1',
              confirmButtonVariants[confirmVariant]
            )}
          >
            {loading && <Icon name="Loader2" size={12} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
});

PopoverConfirm.displayName = 'PopoverConfirm';

/**
 * HoverCard组件 - 悬停卡片
 */
export const HoverCard = forwardRef(({
  children,
  content,
  header,
  footer,
  delay = 300,
  className,
  ...props
}, ref) => {
  return (
    <Popover
      ref={ref}
      trigger="hover"
      position="top"
      delay={delay}
      variant="dark"
      size="md"
      className={className}
      {...props}
    >
      {children}
      
      <PopoverContent>
        {header && (
          <div className="pb-2 border-b border-gray-700">
            {header}
          </div>
        )}
        
        <div>{content}</div>
        
        {footer && (
          <div className="pt-2 border-t border-gray-700">
            {footer}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

HoverCard.displayName = 'HoverCard';

export default Popover;
