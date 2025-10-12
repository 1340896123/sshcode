import React, { forwardRef } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from './Icon';

/**
 * Code组件 - 代码块组件
 */
const codeVariants = createVariants(
  'rounded-md bg-gray-900 text-gray-100 font-mono text-sm',
  {
    variant: {
      default: 'border border-gray-700',
      inline: 'bg-gray-800 px-1.5 py-0.5 rounded text-xs',
      ghost: 'bg-transparent',
      error: 'border border-red-600 bg-red-950 text-red-200',
      warning: 'border border-yellow-600 bg-yellow-950 text-yellow-200',
      success: 'border border-green-600 bg-green-950 text-green-200',
      info: 'border border-blue-600 bg-blue-950 text-blue-200'
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    }
  },
  {
    variant: 'default',
    size: 'md'
  }
);

const Code = forwardRef(({
  children,
  variant = 'default',
  size = 'md',
  language,
  showLineNumbers = false,
  highlightLines = [],
  copyable = false,
  className,
  ...props
}, ref) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(typeof children === 'string' ? children : '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (variant === 'inline') {
    return (
      <code
        ref={ref}
        className={cn(codeVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </code>
    );
  }

  const lines = typeof children === 'string' ? children.split('\n') : [];

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden',
        codeVariants({ variant, size }),
        className
      )}
      {...props}
    >
      {/* 头部工具栏 */}
      {(language || copyable) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
          {language && (
            <span className="text-xs text-gray-400 font-medium">
              {language}
            </span>
          )}
          {copyable && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <Icon name={copied ? 'Check' : 'Copy'} size={12} />
              {copied ? '已复制' : '复制'}
            </button>
          )}
        </div>
      )}

      {/* 代码内容 */}
      <div className="relative overflow-x-auto">
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm">
            {showLineNumbers ? (
              <div className="flex">
                {/* 行号 */}
                <div className="pr-4 text-gray-500 select-none border-r border-gray-700 mr-4">
                  {lines.map((_, index) => (
                    <div key={index} className="text-right">
                      {index + 1}
                    </div>
                  ))}
                </div>
                {/* 代码 */}
                <div className="flex-1">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className={cn(
                        highlightLines.includes(index + 1) && 'bg-gray-800 -mx-2 px-2 py-0.5 rounded'
                      )}
                    >
                      {line || ' '}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              lines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    highlightLines.includes(index + 1) && 'bg-gray-800 -mx-2 px-2 py-0.5 rounded'
                  )}
                >
                  {line || ' '}
                </div>
              ))
            )}
          </code>
        </pre>
      </div>
    </div>
  );
});

Code.displayName = 'Code';

/**
 * MonoText组件 - 等宽文本组件
 */
export const MonoText = forwardRef(({
  children,
  size = 'md',
  weight = 'normal',
  color = 'default',
  className,
  ...props
}, ref) => {
  const sizeVariants = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const weightVariants = {
    thin: 'font-thin',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  const colorVariants = {
    default: 'text-gray-300',
    muted: 'text-gray-500',
    primary: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-cyan-400'
  };

  return (
    <span
      ref={ref}
      className={cn(
        'font-mono',
        sizeVariants[size],
        weightVariants[weight],
        colorVariants[color],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

MonoText.displayName = 'MonoText';

/**
 * InlineCode组件 - 行内代码组件
 */
export const InlineCode = forwardRef(({
  children,
  variant = 'default',
  className,
  ...props
}, ref) => {
  const variantClasses = {
    default: 'bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded text-xs',
    error: 'bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded text-xs border border-red-600/30',
    warning: 'bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded text-xs border border-yellow-600/30',
    success: 'bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded text-xs border border-green-600/30',
    info: 'bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded text-xs border border-blue-600/30'
  };

  return (
    <code
      ref={ref}
      className={cn(
        'font-mono',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
});

InlineCode.displayName = 'InlineCode';

/**
 * CodeBlock组件 - 增强版代码块
 */
export const CodeBlock = forwardRef(({
  children,
  title,
  description,
  language,
  filename,
  showLineNumbers = false,
  highlightLines = [],
  copyable = true,
  expandable = false,
  maxLines,
  className,
  ...props
}, ref) => {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const codeRef = React.useRef(null);

  const lines = typeof children === 'string' ? children.split('\n') : [];
  const shouldTruncate = !expanded && maxLines && lines.length > maxLines;
  const displayLines = shouldTruncate ? lines.slice(0, maxLines) : lines;

  React.useEffect(() => {
    if (codeRef.current && maxLines) {
      const lineHeight = parseInt(window.getComputedStyle(codeRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      setIsOverflowing(codeRef.current.scrollHeight > maxHeight);
    }
  }, [children, maxLines]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(typeof children === 'string' ? children : '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div
      ref={ref}
      className={cn(
        'border border-gray-700 rounded-md overflow-hidden bg-gray-900',
        className
      )}
      {...props}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-3">
          {filename && (
            <div className="flex items-center gap-2">
              <Icon name="File" size={14} className="text-gray-400" />
              <span className="text-sm text-gray-300 font-medium">
                {filename}
              </span>
            </div>
          )}
          {language && !filename && (
            <span className="text-xs text-gray-400 font-medium uppercase">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {copyable && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <Icon name={copied ? 'Check' : 'Copy'} size={12} />
              {copied ? '已复制' : '复制'}
            </button>
          )}
          {expandable && isOverflowing && (
            <button
              type="button"
              onClick={handleExpand}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            >
              <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={12} />
              {expanded ? '收起' : '展开'}
            </button>
          )}
        </div>
      </div>

      {/* 描述 */}
      {description && (
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      )}

      {/* 代码内容 */}
      <div className="relative overflow-x-auto">
        <pre
          ref={codeRef}
          className={cn(
            'p-4 overflow-x-auto text-sm',
            !expanded && maxLines && 'overflow-hidden'
          )}
          style={!expanded && maxLines ? { maxHeight: `${maxLines * 1.5}em` } : {}}
        >
          <code className="font-mono">
            {showLineNumbers ? (
              <div className="flex">
                {/* 行号 */}
                <div className="pr-4 text-gray-500 select-none border-r border-gray-700 mr-4">
                  {displayLines.map((_, index) => (
                    <div key={index} className="text-right">
                      {index + 1}
                    </div>
                  ))}
                </div>
                {/* 代码 */}
                <div className="flex-1">
                  {displayLines.map((line, index) => (
                    <div
                      key={index}
                      className={cn(
                        highlightLines.includes(index + 1) && 'bg-gray-800 -mx-2 px-2 py-0.5 rounded'
                      )}
                    >
                      {line || ' '}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              displayLines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    highlightLines.includes(index + 1) && 'bg-gray-800 -mx-2 px-2 py-0.5 rounded'
                  )}
                >
                  {line || ' '}
                </div>
              ))
            )}
          </code>
        </pre>
      </div>

      {/* 展开/收起指示器 */}
      {shouldTruncate && (
        <div className="px-4 py-2 bg-gradient-to-t from-gray-900 to-transparent border-t border-gray-700">
          <button
            type="button"
            onClick={handleExpand}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span>还有 {lines.length - maxLines} 行</span>
            <Icon name="ChevronDown" size={12} />
          </button>
        </div>
      )}
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

/**
 * SyntaxHighlighter组件 - 语法高亮代码块（简化版）
 */
export const SyntaxHighlighter = forwardRef(({
  children,
  language = 'text',
  theme = 'dark',
  showLineNumbers = false,
  startingLineNumber = 1,
  className,
  ...props
}, ref) => {
  // 简化的语法高亮实现
  const highlightSyntax = (code, lang) => {
    // 这里可以集成更复杂的语法高亮库
    // 目前只是简单的处理
    return code;
  };

  const highlightedCode = highlightSyntax(children, language);
  const lines = highlightedCode.split('\n');

  return (
    <Code
      ref={ref}
      variant="default"
      language={language}
      showLineNumbers={showLineNumbers}
      className={className}
      {...props}
    >
      {children}
    </Code>
  );
});

SyntaxHighlighter.displayName = 'SyntaxHighlighter';

/**
 * PathText组件 - 路径文本组件
 */
export const PathText = forwardRef(({
  children,
  separator = '/',
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn('font-mono text-sm text-gray-400', className)}
      {...props}
    >
      {children}
    </span>
  );
});

PathText.displayName = 'PathText';

/**
 * CommandText组件 - 命令文本组件
 */
export const CommandText = forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn('font-mono text-sm text-green-400', className)}
      {...props}
    >
      {children}
    </span>
  );
});

CommandText.displayName = 'CommandText';

/**
 * KeyText组件 - 按键文本组件
 */
export const KeyText = forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <kbd
      ref={ref}
      className={cn(
        'px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md',
        'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
});

KeyText.displayName = 'KeyText';

/**
 * VersionText组件 - 版本文本组件
 */
export const VersionText = forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn('font-mono text-xs text-blue-400', className)}
      {...props}
    >
      {children}
    </span>
  );
});

VersionText.displayName = 'VersionText';

/**
 * HashText组件 - 哈希文本组件
 */
export const HashText = forwardRef(({
  children,
  showLength = 8,
  className,
  ...props
}, ref) => {
  const text = typeof children === 'string' ? children : '';
  const displayText = text.length > showLength ? text.slice(0, showLength) + '...' : text;
  
  return (
    <span
      ref={ref}
      className={cn('font-mono text-xs text-gray-500', className)}
      title={text}
      {...props}
    >
      {displayText}
    </span>
  );
});

HashText.displayName = 'HashText';

/**
 * IPText组件 - IP地址文本组件
 */
export const IPText = forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn('font-mono text-sm text-cyan-400', className)}
      {...props}
    >
      {children}
    </span>
  );
});

IPText.displayName = 'IPText';

/**
 * PortText组件 - 端口文本组件
 */
export const PortText = forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn('font-mono text-sm text-orange-400', className)}
      {...props}
    >
      {children}
    </span>
  );
});

PortText.displayName = 'PortText';

// 命名导出和默认导出
export { Code };
export default Code;
