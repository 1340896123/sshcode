import clsx from 'clsx';

// 重新导出 clsx 以便其他组件使用
export { clsx };

/**
 * 条件类名合并工具函数
 * 基于clsx封装，提供统一的类名处理
 */
export const cn = (...inputs) => {
  return clsx(inputs);
};

/**
 * 合并变体类名和自定义类名
 */
export const mergeClasses = (variantClasses, customClasses) => {
  return cn(variantClasses, customClasses);
};

/**
 * 处理响应式类名
 */
export const responsive = (base, breakpoints = {}) => {
  const classes = [base];
  
  Object.entries(breakpoints).forEach(([breakpoint, className]) => {
    if (className) {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return cn(classes);
};
