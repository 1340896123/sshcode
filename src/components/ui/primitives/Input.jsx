import React, { forwardRef, useState, useCallback } from 'react';
import { cn } from '../utils/clsx';
import { Icon } from './Icon';

/**
 * 增强版输入框组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.type - 输入框类型: 'text' | 'password' | 'number' | 'email' | 'search' | 'url' | 'tel'
 * @param {string} props.size - 输入框大小: 'sm' | 'md' | 'lg'
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.readonly - 是否只读
 * @param {boolean} props.required - 是否必填
 * @param {string} props.placeholder - 占位符文本
 * @param {string} props.value - 输入值
 * @param {function} props.onChange - 变化事件处理函数
 * @param {function} props.onKeyDown - 键盘按下事件处理函数
 * @param {function} props.onFocus - 获得焦点事件处理函数
 * @param {function} props.onBlur - 失去焦点事件处理函数
 * @param {function} props.onClear - 清空按钮点击事件
 * @param {boolean} props.clearable - 是否显示清空按钮
 * @param {boolean} props.error - 是否处于错误状态
 * @param {string} props.errorMessage - 错误消息
 * @param {React.ReactNode|string} props.prefix - 前缀内容（图标或文本）
 * @param {React.ReactNode|string} props.suffix - 后缀内容（图标或文本）
 * @param {string} props.prefixIcon - 前缀图标名称
 * @param {string} props.suffixIcon - 后缀图标名称
 * @param {boolean} props.showPasswordToggle - 密码类型是否显示切换按钮
 * @param {boolean} props.fullWidth - 是否全宽
 * @param {string} props.className - 额外的CSS类名
 * @param {string} props.containerClassName - 容器额外CSS类名
 * @param {string} props.id - 输入框ID
 * @param {string} props.name - 输入框名称
 * @param {number} props.rows - 文本域行数（当type为textarea时）
 * @param {boolean} props.resize - 是否可调整大小（仅textarea）
 * @param {number} props.maxLength - 最大输入长度
 * @param {string} props.pattern - 输入模式正则表达式
 */
const Input = forwardRef(({
  type = 'text',
  size = 'md',
  disabled = false,
  readonly = false,
  required = false,
  placeholder = '',
  value = '',
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  onClear,
  clearable = false,
  error = false,
  errorMessage,
  prefix,
  suffix,
  prefixIcon,
  suffixIcon,
  showPasswordToggle = false,
  fullWidth = false,
  className = '',
  containerClassName = '',
  id,
  name,
  rows = 3,
  resize = false,
  maxLength,
  pattern,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // 获取尺寸样式
  const getSizeClasses = () => {
    const sizes = {
      sm: {
        padding: 'px-3 py-1.5',
        text: 'text-sm',
        icon: 'w-4 h-4',
        gap: 'gap-2'
      },
      md: {
        padding: 'px-4 py-2',
        text: 'text-base',
        icon: 'w-5 h-5',
        gap: 'gap-3'
      },
      lg: {
        padding: 'px-5 py-3',
        text: 'text-lg',
        icon: 'w-6 h-6',
        gap: 'gap-4'
      }
    };

    return sizes[size] || sizes.md;
  };

  const sizeClasses = getSizeClasses();

  // 计算内边距（考虑prefix和suffix）
  const getPaddingClasses = () => {
    let paddingClass = sizeClasses.padding;
    
    if (prefix || prefixIcon) {
      paddingClass = paddingClass.replace('px-', 'pl-').replace(/(\d+)/, (match) => {
        const baseSize = parseInt(match);
        return `${baseSize + 8}`;
      });
    }
    
    if (suffix || suffixIcon || clearable || showPasswordToggle) {
      paddingClass = paddingClass.replace(/px-(\d+)/, 'pr-$1').replace(/(\d+)/, (match) => {
        const baseSize = parseInt(match);
        return `${baseSize + 8}`;
      });
    }
    
    return paddingClass;
  };

  // 获取输入框样式
  const getInputClasses = () => {
    return cn(
      // 基础样式
      'w-full',
      'bg-[#3e3e42]',
      'border border-[#5a5a5a]',
      'rounded-lg',
      'font-inherit',
      'outline-none',
      'transition-all duration-200',
      
      // 文本颜色
      'text-[#d4d4d4]',
      'placeholder:text-[#969696]',
      
      // 边框颜色
      error 
        ? 'border-[#d16969] focus:border-[#d16969] focus:shadow-[0_0_0_3px_rgba(209,105,105,0.15)]'
        : isFocused 
          ? 'border-[#007acc] focus:border-[#007acc] focus:shadow-[0_0_0_3px_rgba(0,122,204,0.15)]'
          : 'border-[#5a5a5a] focus:border-[#007acc]',
      
      // 状态样式
      disabled && 'bg-[#2d2d30] text-[#666] cursor-not-allowed',
      readonly && 'bg-[#2d2d30] cursor-default',
      
      // 尺寸样式
      getPaddingClasses(),
      sizeClasses.text,
      
      // 自定义类名
      className
    );
  };

  // 获取容器样式
  const getContainerClasses = () => {
    return cn(
      'relative',
      'inline-flex',
      'items-center',
      fullWidth ? 'w-full' : '',
      containerClassName
    );
  };

  // 清空处理
  const handleClear = useCallback(() => {
    if (onChange) {
      onChange({ target: { value: '' } });
    }
    if (onClear) {
      onClear();
    }
  }, [onChange, onClear]);

  // 密码显示切换
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  // 焦点处理
  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  }, [onFocus]);

  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  }, [onBlur]);

  // 渲染前缀
  const renderPrefix = () => {
    if (!prefix && !prefixIcon) return null;

    return (
      <div className={cn(
        'absolute left-0 top-1/2 transform -translate-y-1/2',
        'flex items-center',
        'text-gray-500 dark:text-gray-400',
        sizeClasses.gap,
        'pl-3'
      )}>
        {prefixIcon && (
          <Icon name={prefixIcon} className={sizeClasses.icon} />
        )}
        {prefix && typeof prefix === 'string' ? (
          <span className={sizeClasses.text}>{prefix}</span>
        ) : (
          prefix
        )}
      </div>
    );
  };

  // 渲染后缀
  const renderSuffix = () => {
    const hasSuffix = suffix || suffixIcon || clearable || showPasswordToggle;
    if (!hasSuffix) return null;

    return (
      <div className={cn(
        'absolute right-0 top-1/2 transform -translate-y-1/2',
        'flex items-center',
        'text-gray-500 dark:text-gray-400',
        sizeClasses.gap,
        'pr-3'
      )}>
        {suffixIcon && (
          <Icon name={suffixIcon} className={sizeClasses.icon} />
        )}
        {suffix && typeof suffix === 'string' ? (
          <span className={sizeClasses.text}>{suffix}</span>
        ) : (
          suffix
        )}
        
        {clearable && value && !disabled && !readonly && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'flex items-center justify-center',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'transition-colors',
              sizeClasses.icon
            )}
            tabIndex={-1}
          >
            <Icon name="X" className={sizeClasses.icon} />
          </button>
        )}
        
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={cn(
              'flex items-center justify-center',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'transition-colors',
              sizeClasses.icon
            )}
            tabIndex={-1}
          >
            <Icon name={showPassword ? 'EyeOff' : 'Eye'} className={sizeClasses.icon} />
          </button>
        )}
      </div>
    );
  };

  // 渲染错误消息
  const renderError = () => {
    if (!error && !errorMessage) return null;

    return (
      <div className="mt-1 text-sm text-red-600 dark:text-red-400">
        {errorMessage || '输入有误'}
      </div>
    );
  };

  // 渲染字符计数
  const renderCharCount = () => {
    if (!maxLength) return null;

    const currentLength = value?.length || 0;
    const isOverLimit = currentLength > maxLength;

    return (
      <div className={cn(
        'mt-1 text-xs text-right',
        isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
      )}>
        {currentLength}/{maxLength}
      </div>
    );
  };

  const containerClasses = getContainerClasses();
  const inputClasses = getInputClasses();
  const inputType = type === 'password' && showPassword ? 'text' : type;

  const commonProps = {
    ref,
    id,
    name,
    value,
    onChange,
    onKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,
    disabled,
    readOnly: readonly,
    required,
    placeholder,
    className: inputClasses,
    maxLength,
    pattern,
    ...props
  };

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <div className={containerClasses}>
        {renderPrefix()}
        
        {type === 'textarea' ? (
          <textarea
            {...commonProps}
            rows={rows}
            style={{
              resize: resize ? 'vertical' : 'none'
            }}
          />
        ) : (
          <input
            {...commonProps}
            type={inputType}
          />
        )}
        
        {renderSuffix()}
      </div>
      
      {renderError()}
      {renderCharCount()}
    </div>
  );
});

Input.displayName = 'Input';

// 命名导出和默认导出
export { Input };
export default Input;

// 预设输入框变体
export const SearchInput = (props) => (
  <Input
    type="search"
    prefixIcon="Search"
    clearable
    {...props}
  />
);

export const PasswordInput = (props) => (
  <Input
    type="password"
    showPasswordToggle
    {...props}
  />
);

export const NumberInput = (props) => (
  <Input
    type="number"
    {...props}
  />
);

export const EmailInput = (props) => (
  <Input
    type="email"
    prefixIcon="Mail"
    {...props}
  />
);

export const UrlInput = (props) => (
  <Input
    type="url"
    prefixIcon="Link"
    {...props}
  />
);
