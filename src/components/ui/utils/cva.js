import { cva } from 'class-variance-authority';

// 重新导出 cva 以便其他组件使用
export { cva };

/**
 * 创建组件变体的工具函数
 * 基于class-variance-authority封装，提供统一的变体管理
 */
export const createVariants = (base, variants = {}, defaultVariants = {}) => {
  return cva(base, {
    variants,
    defaultVariants
  });
};

/**
 * 常用的尺寸变体
 */
export const sizeVariants = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
};

/**
 * 常用的颜色变体
 */
export const colorVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
  error: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent hover:bg-gray-700 focus:ring-gray-500',
  outline: 'border border-gray-600 bg-transparent hover:bg-gray-800 focus:ring-gray-500'
};

/**
 * 常用的状态变体
 */
export const stateVariants = {
  active: 'opacity-100',
  disabled: 'opacity-50 cursor-not-allowed',
  loading: 'opacity-75 cursor-wait'
};
