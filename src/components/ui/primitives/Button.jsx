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
        primary: 'bg-[#007acc] text-white hover:bg-[#005a9e] focus:ring-2 focus:ring-[#007acc] focus:ring-offset-2',
        secondary: 'bg-[#666] text-white hover:bg-[#555] focus:ring-2 focus:ring-[#666] focus:ring-offset-2',
        success: 'bg-[#28a745] text-white hover:bg-[#218838] focus:ring-2 focus:ring-[#28a745] focus:ring-offset-2',
        warning: 'bg-[#ffc107] text-white hover:bg-[#e0a800] focus:ring-2 focus:ring-[#ffc107] focus:ring-offset-2',
        error: 'bg-[#dc3545] text-white hover:bg-[#c82333] focus:ring-2 focus:ring-[#dc3545] focus:ring-offset-2',
        info: 'bg-[#17a2b8] text-white hover:bg-[#138496] focus:ring-2 focus:ring-[#17a2b8] focus:ring-offset-2'
      },
      outline: {
        primary: 'border border-[#007acc] text-[#007acc] hover:bg-[#007acc] hover:text-white focus:ring-2 focus:ring-[#007acc]',
        secondary: 'border border-[#666] text-[#666] hover:bg-[#666] hover:text-white focus:ring-2 focus:ring-[#666]',
        success: 'border border-[#28a745] text-[#28a745] hover:bg-[#28a745] hover:text-white focus:ring-2 focus:ring-[#28a745]',
        warning: 'border border-[#ffc107] text-[#ffc107] hover:bg-[#ffc107] hover:text-white focus:ring-2 focus:ring-[#ffc107]',
        error: 'border border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white focus:ring-2 focus:ring-[#dc3545]',
        info: 'border border-[#17a2b8] text-[#17a2b8] hover:bg-[#17a2b8] hover:text-white focus:ring-2 focus:ring-[#17a2b8]'
      },
      ghost: {
        primary: 'text-[#007acc] hover:bg-[#007acc] hover:text-white focus:ring-2 focus:ring-[#007acc]',
        secondary: 'text-[#666] hover:bg-[#666] hover:text-white focus:ring-2 focus:ring-[#666]',
        success: 'text-[#28a745] hover:bg-[#28a745] hover:text-white focus:ring-2 focus:ring-[#28a745]',
        warning: 'text-[#ffc107] hover:bg-[#ffc107] hover:text-white focus:ring-2 focus:ring-[#ffc107]',
        error: 'text-[#dc3545] hover:bg-[#dc3545] hover:text-white focus:ring-2 focus:ring-[#dc3545]',
        info: 'text-[#17a2b8] hover:bg-[#17a2b8] hover:text-white focus:ring-2 focus:ring-[#17a2b8]'
      },
      link: {
        primary: 'text-[#007acc] hover:text-[#005a9e] hover:underline focus:ring-2 focus:ring-[#007acc]',
        secondary: 'text-[#666] hover:text-[#555] hover:underline focus:ring-2 focus:ring-[#666]',
        success: 'text-[#28a745] hover:text-[#218838] hover:underline focus:ring-2 focus:ring-[#28a745]',
        warning: 'text-[#ffc107] hover:text-[#e0a800] hover:underline focus:ring-2 focus:ring-[#ffc107]',
        error: 'text-[#dc3545] hover:text-[#c82333] hover:underline focus:ring-2 focus:ring-[#dc3545]',
        info: 'text-[#17a2b8] hover:text-[#138496] hover:underline focus:ring-2 focus:ring-[#17a2b8]'
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
