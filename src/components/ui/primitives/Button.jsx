import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { Icon } from './Icon';

/**
 * 增强版按钮组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.variant - 按钮变体: 'solid' | 'outline' | 'ghost' | 'link'
 * @param {string} props.color - 颜色主题: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
 * @param {string} props.size - 按钮大小: 'sm' | 'md' | 'lg'
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否加载中
 * @param {boolean} props.iconOnly - 是否仅显示图标
 * @param {string} props.leftIcon - 左侧图标名称
 * @param {string} props.rightIcon - 右侧图标名称
 * @param {boolean} props.fullWidth - 是否全宽
 * @param {boolean} props.rounded - 是否圆形
 * @param {string} props.className - 额外的CSS类名
 * @param {React.ReactNode} props.children - 按钮内容
 * @param {function} props.onClick - 点击事件处理函数
 * @param {string} props.title - 提示文本
 * @param {string} props.type - 按钮类型: 'button' | 'submit' | 'reset'
 */
const Button = forwardRef(({
  variant = 'solid',
  color = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  iconOnly = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = false,
  className = '',
  children,
  onClick,
  title,
  type = 'button',
  ...props
}, ref) => {
  // 获取变体样式
  const getVariantClasses = () => {
    const baseClasses = {
      solid: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2',
        error: 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        info: 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2'
      },
      outline: {
        primary: 'border border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500',
        secondary: 'border border-gray-600 text-gray-600 hover:bg-gray-50 hover:text-gray-700 focus:ring-2 focus:ring-gray-500',
        success: 'border border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 focus:ring-2 focus:ring-green-500',
        warning: 'border border-yellow-600 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 focus:ring-2 focus:ring-yellow-500',
        error: 'border border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-500',
        info: 'border border-cyan-600 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500'
      },
      ghost: {
        primary: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500',
        secondary: 'text-gray-600 hover:bg-gray-50 hover:text-gray-700 focus:ring-2 focus:ring-gray-500',
        success: 'text-green-600 hover:bg-green-50 hover:text-green-700 focus:ring-2 focus:ring-green-500',
        warning: 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 focus:ring-2 focus:ring-yellow-500',
        error: 'text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-500',
        info: 'text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-500'
      },
      link: {
        primary: 'text-blue-600 hover:text-blue-700 hover:underline focus:ring-2 focus:ring-blue-500',
        secondary: 'text-gray-600 hover:text-gray-700 hover:underline focus:ring-2 focus:ring-gray-500',
        success: 'text-green-600 hover:text-green-700 hover:underline focus:ring-2 focus:ring-green-500',
        warning: 'text-yellow-600 hover:text-yellow-700 hover:underline focus:ring-2 focus:ring-yellow-500',
        error: 'text-red-600 hover:text-red-700 hover:underline focus:ring-2 focus:ring-red-500',
        info: 'text-cyan-600 hover:text-cyan-700 hover:underline focus:ring-2 focus:ring-cyan-500'
      }
    };

    return baseClasses[variant]?.[color] || baseClasses.solid.primary;
  };

  // 获取尺寸样式
  const getSizeClasses = () => {
    const sizes = {
      sm: {
        padding: 'px-3 py-1.5',
        text: 'text-sm',
        icon: 'w-4 h-4',
        gap: 'gap-1'
      },
      md: {
        padding: 'px-4 py-2',
        text: 'text-base',
        icon: 'w-5 h-5',
        gap: 'gap-2'
      },
      lg: {
        padding: 'px-6 py-3',
        text: 'text-lg',
        icon: 'w-6 h-6',
        gap: 'gap-3'
      }
    };

    const sizeConfig = sizes[size] || sizes.md;
    return {
      padding: iconOnly ? 
        (size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-3' : 'p-2') : 
        sizeConfig.padding,
      text: sizeConfig.text,
      icon: sizeConfig.icon,
      gap: iconOnly ? '' : sizeConfig.gap
    };
  };

  const sizeClasses = getSizeClasses();
  const variantClasses = getVariantClasses();

  const baseClasses = cn(
    // 基础样式
    'inline-flex items-center justify-center',
    'font-medium',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    
    // 变体样式
    variantClasses,
    
    // 尺寸样式
    sizeClasses.padding,
    sizeClasses.text,
    sizeClasses.gap,
    
    // 形状样式
    rounded ? 'rounded-full' : 'rounded-md',
    fullWidth ? 'w-full' : '',
    
    // 自定义类名
    className
  );

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <Icon 
            name="Loader2" 
            className={cn('animate-spin', sizeClasses.icon)}
          />
          {!iconOnly && <span>{children || '加载中...'}</span>}
        </>
      );
    }

    return (
      <>
        {leftIcon && (
          <Icon 
            name={leftIcon} 
            className={sizeClasses.icon}
          />
        )}
        {!iconOnly && children}
        {rightIcon && (
          <Icon 
            name={rightIcon} 
            className={sizeClasses.icon}
          />
        )}
      </>
    );
  };

  return (
    <button
      ref={ref}
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      {...props}
    >
      {renderContent()}
    </button>
  );
});

Button.displayName = 'Button';

// 命名导出和默认导出
export { Button };
export default Button;

// 预设按钮变体
export const PrimaryButton = (props) => <Button variant="solid" color="primary" {...props} />;
export const SecondaryButton = (props) => <Button variant="solid" color="secondary" {...props} />;
export const SuccessButton = (props) => <Button variant="solid" color="success" {...props} />;
export const WarningButton = (props) => <Button variant="solid" color="warning" {...props} />;
export const ErrorButton = (props) => <Button variant="solid" color="error" {...props} />;
export const InfoButton = (props) => <Button variant="solid" color="info" {...props} />;

export const OutlineButton = (props) => <Button variant="outline" {...props} />;
export const GhostButton = (props) => <Button variant="ghost" {...props} />;
export const LinkButton = (props) => <Button variant="link" {...props} />;

export const IconButton = ({ icon, size = 'md', ...props }) => (
  <Button 
    iconOnly 
    leftIcon={icon} 
    size={size} 
    {...props} 
  />
);
