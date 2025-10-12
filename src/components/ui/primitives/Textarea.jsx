import React, { forwardRef, useEffect, useRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants, sizeVariants } from '../utils/cva';

/**
 * Textarea组件 - 增强版文本域，支持自动高度
 */
const textareaVariants = createVariants(
  // 基础样式
  'flex w-full rounded-md border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
  // 变体
  {
    variant: {
      default: '',
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
      warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500'
    },
    size: {
      sm: 'px-2 py-1 text-xs min-h-[60px]',
      md: 'px-3 py-2 text-sm min-h-[80px]',
      lg: 'px-4 py-3 text-base min-h-[100px]'
    },
    resize: {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    }
  },
  // 默认值
  {
    variant: 'default',
    size: 'md',
    resize: 'vertical'
  }
);

const Textarea = forwardRef(({
  className,
  variant,
  size,
  resize,
  autoHeight = false,
  minHeight,
  maxHeight,
  value,
  onChange,
  onHeightChange,
  ...props
}, ref) => {
  const internalRef = useRef(null);
  const textareaRef = ref || internalRef;

  // 自动高度处理
  useEffect(() => {
    if (autoHeight && textareaRef.current) {
      const textarea = textareaRef.current;
      
      // 重置高度以获取正确的scrollHeight
      textarea.style.height = 'auto';
      
      // 计算新高度
      let newHeight = textarea.scrollHeight;
      
      // 应用最小高度限制
      if (minHeight) {
        newHeight = Math.max(newHeight, minHeight);
      }
      
      // 应用最大高度限制
      if (maxHeight) {
        newHeight = Math.min(newHeight, maxHeight);
      }
      
      // 设置新高度
      textarea.style.height = `${newHeight}px`;
      
      // 通知高度变化
      if (onHeightChange) {
        onHeightChange(newHeight);
      }
    }
  }, [value, autoHeight, minHeight, maxHeight, onHeightChange, textareaRef]);

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className={cn(textareaVariants({ variant, size, resize }), className)}
      onChange={handleChange}
      value={value}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;

/**
 * 带字符计数的Textarea
 */
export const TextareaWithCounter = forwardRef(({
  maxLength,
  showCounter = true,
  counterPosition = 'bottom-right',
  className,
  ...props
}, ref) => {
  const [count, setCount] = React.useState(0);

  const handleChange = (e) => {
    setCount(e.target.value.length);
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const counterClasses = cn(
    'absolute text-xs text-gray-400 pointer-events-none',
    {
      'bottom-2 right-2': counterPosition === 'bottom-right',
      'bottom-2 left-2': counterPosition === 'bottom-left',
      'top-2 right-2': counterPosition === 'top-right',
      'top-2 left-2': counterPosition === 'top-left'
    }
  );

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        maxLength={maxLength}
        onChange={handleChange}
        className={className}
        {...props}
      />
      {showCounter && maxLength && (
        <span className={counterClasses}>
          {count}/{maxLength}
        </span>
      )}
    </div>
  );
});

TextareaWithCounter.displayName = 'TextareaWithCounter';

/**
 * 带工具栏的Textarea
 */
export const TextareaWithToolbar = forwardRef(({
  showToolbar = true,
  toolbarPosition = 'top',
  onClear,
  onCopy,
  onPaste,
  className,
  ...props
}, ref) => {
  const handleClear = () => {
    if (props.onChange) {
      const event = {
        target: { value: '' }
      };
      props.onChange(event);
    }
    if (onClear) {
      onClear();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.value || '');
      if (onCopy) {
        onCopy();
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (props.onChange) {
        const event = {
          target: { value: (props.value || '') + text }
        };
        props.onChange(event);
      }
      if (onPaste) {
        onPaste(text);
      }
    } catch (err) {
      console.error('Failed to paste text:', err);
    }
  };

  const toolbar = (
    <div className="flex items-center gap-1 p-2 border-b border-gray-700 bg-gray-800">
      <button
        type="button"
        onClick={handleClear}
        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
        title="清空"
      >
        清空
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
        title="复制"
      >
        复制
      </button>
      <button
        type="button"
        onClick={handlePaste}
        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
        title="粘贴"
      >
        粘贴
      </button>
    </div>
  );

  return (
    <div className={cn('border border-gray-600 rounded-md overflow-hidden', className)}>
      {showToolbar && toolbarPosition === 'top' && toolbar}
      <Textarea
        ref={ref}
        className="border-none rounded-none"
        {...props}
      />
      {showToolbar && toolbarPosition === 'bottom' && toolbar}
    </div>
  );
});

TextareaWithToolbar.displayName = 'TextareaWithToolbar';
