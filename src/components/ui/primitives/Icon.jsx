import React from 'react';
import * as Icons from 'lucide-react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';

const iconVariants = cva(
  'inline-flex items-center justify-center',
  {
    variants: {
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-8 h-8',
        '2xl': 'w-10 h-10',
        '3xl': 'w-12 h-12',
      },
      color: {
        default: 'text-gray-500 dark:text-gray-400',
        primary: 'text-blue-500 dark:text-blue-400',
        secondary: 'text-gray-600 dark:text-gray-300',
        success: 'text-green-500 dark:text-green-400',
        warning: 'text-yellow-500 dark:text-yellow-400',
        error: 'text-red-500 dark:text-red-400',
        info: 'text-cyan-500 dark:text-cyan-400',
        muted: 'text-gray-400 dark:text-gray-500',
        inverse: 'text-white dark:text-gray-900',
      },
      weight: {
        thin: 'font-thin',
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        bold: 'font-bold',
        extrabold: 'font-extrabold',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'default',
      weight: 'normal',
    },
  }
);

/**
 * Icon组件 - 基于lucide-react的图标组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.name - 图标名称（lucide-react图标名）
 * @param {string} props.size - 图标尺寸：xs|sm|md|lg|xl|2xl|3xl
 * @param {string} props.color - 图标颜色：default|primary|secondary|success|warning|error|info|muted|inverse
 * @param {string} props.weight - 图标粗细：thin|light|normal|medium|bold|extrabold
 * @param {boolean} props.spin - 是否旋转动画
 * @param {boolean} props.bounce - 是否弹跳动画
 * @param {boolean} props.pulse - 是否脉冲动画
 * @param {string} props.className - 自定义类名
 * @param {Object} props.props - 传递给图标的额外属性
 */
export function Icon({
  name,
  size = 'md',
  color = 'default',
  weight = 'normal',
  spin = false,
  bounce = false,
  pulse = false,
  className = '',
  ...props
}) {
  // 获取lucide-react图标组件
  const IconComponent = Icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return (
      <div 
        className={clsx(
          iconVariants({ size, color, weight }),
          'flex items-center justify-center',
          className
        )}
        {...props}
      >
        <span className="text-xs">?</span>
      </div>
    );
  }

  const animationClasses = clsx({
    'animate-spin': spin,
    'animate-bounce': bounce,
    'animate-pulse': pulse,
  });

  return (
    <div 
      className={clsx(
        iconVariants({ size, color, weight }),
        animationClasses,
        className
      )}
      {...props}
    >
      <IconComponent 
        size={getSizeInPixels(size)}
        strokeWidth={getStrokeWidth(weight)}
        className="w-full h-full"
      />
    </div>
  );
}

// 获取像素尺寸
function getSizeInPixels(size) {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  };
  return sizeMap[size] || 20;
}

// 获取描边宽度
function getStrokeWidth(weight) {
  const weightMap = {
    thin: 1,
    light: 1.5,
    normal: 2,
    medium: 2.5,
    bold: 3,
    extrabold: 3.5,
  };
  return weightMap[weight] || 2;
}

// 常用图标的快捷组件
export const ChevronDownIcon = (props) => <Icon name="ChevronDown" {...props} />;
export const ChevronRightIcon = (props) => <Icon name="ChevronRight" {...props} />;
export const ChevronLeftIcon = (props) => <Icon name="ChevronLeft" {...props} />;
export const ChevronUpIcon = (props) => <Icon name="ChevronUp" {...props} />;

export const PlusIcon = (props) => <Icon name="Plus" {...props} />;
export const MinusIcon = (props) => <Icon name="Minus" {...props} />;
export const XIcon = (props) => <Icon name="X" {...props} />;
export const CheckIcon = (props) => <Icon name="Check" {...props} />;

export const SearchIcon = (props) => <Icon name="Search" {...props} />;
export const FilterIcon = (props) => <Icon name="Filter" {...props} />;
export const SettingsIcon = (props) => <Icon name="Settings" {...props} />;

export const FolderIcon = (props) => <Icon name="Folder" {...props} />;
export const FileIcon = (props) => <Icon name="File" {...props} />;
export const HomeIcon = (props) => <Icon name="Home" {...props} />;

export const UserIcon = (props) => <Icon name="User" {...props} />;
export const UsersIcon = (props) => <Icon name="Users" {...props} />;
export const ShieldIcon = (props) => <Icon name="Shield" {...props} />;

export const TerminalIcon = (props) => <Icon name="Terminal" {...props} />;
export const CodeIcon = (props) => <Icon name="Code" {...props} />;
export const CpuIcon = (props) => <Icon name="Cpu" {...props} />;

export const WifiIcon = (props) => <Icon name="Wifi" {...props} />;
export const WifiOffIcon = (props) => <Icon name="WifiOff" {...props} />;
export const ZapIcon = (props) => <Icon name="Zap" {...props} />;

export const DownloadIcon = (props) => <Icon name="Download" {...props} />;
export const UploadIcon = (props) => <Icon name="Upload" {...props} />;
export const RefreshIcon = (props) => <Icon name="RefreshCw" {...props} />;

export const EyeIcon = (props) => <Icon name="Eye" {...props} />;
export const EyeOffIcon = (props) => <Icon name="EyeOff" {...props} />;
export const LockIcon = (props) => <Icon name="Lock" {...props} />;
export const UnlockIcon = (props) => <Icon name="Unlock" {...props} />;

export const AlertCircleIcon = (props) => <Icon name="AlertCircle" {...props} />;
export const AlertTriangleIcon = (props) => <Icon name="AlertTriangle" {...props} />;
export const InfoIcon = (props) => <Icon name="Info" {...props} />;
export const HelpCircleIcon = (props) => <Icon name="HelpCircle" {...props} />;

export const LoadingIcon = (props) => <Icon name="Loader2" spin {...props} />;
export const SpinnerIcon = (props) => <Icon name="Loader2" spin {...props} />;

// 导出所有 lucide-react 图标
export const icons = Icons;

export default Icon;
