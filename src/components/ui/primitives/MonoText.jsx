import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';

/**
 * MonoText组件 - 行内等宽文本
 */
const monoTextVariants = createVariants(
  'font-mono',
  {
    variant: {
      default: 'text-gray-300',
      muted: 'text-gray-500',
      accent: 'text-blue-400',
      success: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400',
      code: 'text-cyan-400'
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl'
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold'
    }
  },
  {
    variant: 'default',
    size: 'sm',
    weight: 'normal'
  }
);

const MonoText = forwardRef(({
  children,
  variant,
  size,
  weight,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn(monoTextVariants({ variant, size, weight }), className)}
      {...props}
    >
      {children}
    </span>
  );
});

MonoText.displayName = 'MonoText';

export default MonoText;

/**
 * PathText组件 - 路径文本
 */
export const PathText = forwardRef(({
  path,
  separator = '/',
  maxSegments = 3,
  variant = 'code',
  size = 'sm',
  className,
  ...props
}, ref) => {
  const segments = path.split(separator);
  
  if (segments.length <= maxSegments) {
    return (
      <MonoText
        ref={ref}
        variant={variant}
        size={size}
        className={className}
        {...props}
      >
        {path}
      </MonoText>
    );
  }

  const displayedSegments = [
    segments[0],
    '...',
    ...segments.slice(-(maxSegments - 1))
  ];

  return (
    <MonoText
      ref={ref}
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {displayedSegments.join(separator)}
    </MonoText>
  );
});

PathText.displayName = 'PathText';

/**
 * CommandText组件 - 命令文本
 */
export const CommandText = forwardRef(({
  command,
  highlightArgs = true,
  variant = 'code',
  size = 'sm',
  className,
  ...props
}, ref) => {
  if (!highlightArgs) {
    return (
      <MonoText
        ref={ref}
        variant={variant}
        size={size}
        className={className}
        {...props}
      >
        {command}
      </MonoText>
    );
  }

  // 简单的命令解析高亮
  const parts = command.split(' ');
  const [cmd, ...args] = parts;

  return (
    <MonoText
      ref={ref}
      variant={variant}
      size={size}
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    >
      <span className="text-cyan-400">{cmd}</span>
      {args.map((arg, index) => (
        <span key={index} className="text-gray-400">
          {arg.startsWith('-') ? (
            <span className="text-yellow-400">{arg}</span>
          ) : arg.startsWith('"') || arg.startsWith("'") ? (
            <span className="text-green-400">{arg}</span>
          ) : (
            arg
          )}
          {index < args.length - 1 && ' '}
        </span>
      ))}
    </MonoText>
  );
});

CommandText.displayName = 'CommandText';

/**
 * KeyText组件 - 快捷键文本
 */
export const KeyText = forwardRef(({
  keys,
  separator = '+',
  variant = 'default',
  size = 'xs',
  className,
  ...props
}, ref) => {
  const keyArray = Array.isArray(keys) ? keys : [keys];

  return (
    <MonoText
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded',
        className
      )}
      {...props}
    >
      {keyArray.map((key, index) => (
        <React.Fragment key={key}>
          <span className="uppercase">{key}</span>
          {index < keyArray.length - 1 && (
            <span className="text-gray-500">{separator}</span>
          )}
        </React.Fragment>
      ))}
    </MonoText>
  );
});

KeyText.displayName = 'KeyText';

/**
 * VersionText组件 - 版本号文本
 */
export const VersionText = forwardRef(({
  version,
  prefix = 'v',
  variant = 'muted',
  size = 'xs',
  className,
  ...props
}, ref) => {
  return (
    <MonoText
      ref={ref}
      variant={variant}
      size={size}
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    >
      <span className="text-gray-600">{prefix}</span>
      <span>{version}</span>
    </MonoText>
  );
});

VersionText.displayName = 'VersionText';

/**
 * HashText组件 - 哈希值文本
 */
export const HashText = forwardRef(({
  hash,
  showLength = 8,
  variant = 'muted',
  size = 'xs',
  className,
  ...props
}, ref) => {
  const shortHash = hash.length > showLength 
    ? `${hash.slice(0, showLength)}...` 
    : hash;

  return (
    <MonoText
      ref={ref}
      variant={variant}
      size={size}
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    >
      <span className="text-gray-600">#</span>
      <span className="font-mono">{shortHash}</span>
      {hash.length > showLength && (
        <span
          className="text-cyan-400 cursor-help"
          title={hash}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </MonoText>
  );
});

HashText.displayName = 'HashText';

/**
 * IPText组件 - IP地址文本
 */
export const IPText = forwardRef(({
  ip,
  variant = 'code',
  size = 'sm',
  className,
  ...props
}, ref) => {
  const isIPv6 = ip.includes(':');
  const isLocalhost = ip === 'localhost' || ip === '127.0.0.1' || ip === '::1';

  return (
    <MonoText
      ref={ref}
      variant={isLocalhost ? 'success' : variant}
      size={size}
      className={cn(
        'inline-flex items-center gap-1',
        isLocalhost && 'text-green-400',
        className
      )}
      {...props}
    >
      {isIPv6 && '['}
      {ip}
      {isIPv6 && ']'}
    </MonoText>
  );
});

IPText.displayName = 'IPText';

/**
 * PortText组件 - 端口号文本
 */
export const PortText = forwardRef(({
  port,
  variant = 'code',
  size = 'sm',
  className,
  ...props
}, ref) => {
  const isCommonPort = [22, 80, 443, 8080, 3000, 5000, 8000, 9000].includes(port);
  const isSSH = port === 22;

  return (
    <MonoText
      ref={ref}
      variant={isSSH ? 'success' : isCommonPort ? 'accent' : variant}
      size={size}
      className={cn(
        'inline-flex items-center gap-1',
        isSSH && 'text-green-400',
        isCommonPort && !isSSH && 'text-blue-400',
        className
      )}
      {...props}
    >
      <span className="text-gray-600">:</span>
      <span>{port}</span>
    </MonoText>
  );
});

PortText.displayName = 'PortText';
