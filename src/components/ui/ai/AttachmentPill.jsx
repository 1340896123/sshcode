import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * AttachmentPill组件 - 引用与上下文组件
 */
export function AttachmentPill({
  type = 'file', // file|terminal|snippet|text
  name = '',
  content = '',
  preview = '',
  onRemove,
  onClick,
  removable = true,
  clickable = true,
  size = 'md', // sm|md|lg
  className = '',
  ...props
}) {
  const [showPreview, setShowPreview] = useState(false);

  const getTypeStyles = () => {
    const styles = {
      file: {
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-700',
        icon: 'File',
        iconColor: 'primary'
      },
      terminal: {
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-700',
        icon: 'Terminal',
        iconColor: 'success'
      },
      snippet: {
        bgColor: 'bg-purple-900/20',
        borderColor: 'border-purple-700',
        icon: 'Code',
        iconColor: 'muted'
      },
      text: {
        bgColor: 'bg-gray-800',
        borderColor: 'border-gray-600',
        icon: 'MessageSquare',
        iconColor: 'muted'
      }
    };
    return styles[type] || styles.file;
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base'
    };
    return sizes[size] || sizes.md;
  };

  const styles = getTypeStyles();
  const sizeStyles = getSizeStyles();

  return (
    <div className={clsx('relative inline-block', className)} {...props}>
      {/* 主药丸 */}
      <div
        className={clsx(
          `${styles.bgColor} ${styles.borderColor} border rounded-full flex items-center gap-2`,
          sizeStyles,
          clickable && 'cursor-pointer hover:opacity-80 transition-opacity',
          'max-w-48'
        )}
        onClick={() => clickable && setShowPreview(!showPreview)}
      >
        <Icon name={styles.icon} size="xs" color={styles.iconColor} />
        <span className="truncate text-gray-100">{name}</span>
        {removable && (
          <Button
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="p-0 hover:bg-transparent"
          >
            <Icon name="X" size="xs" color="muted" />
          </Button>
        )}
      </div>

      {/* 预览弹窗 */}
      {showPreview && (preview || content) && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon name={styles.icon} size="sm" color={styles.iconColor} />
              <span className="text-sm font-medium text-gray-100">{name}</span>
            </div>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setShowPreview(false)}
            >
              <Icon name="X" size="xs" />
            </Button>
          </div>
          
          <div className="text-xs text-gray-300 max-h-32 overflow-y-auto">
            {preview || content}
          </div>
        </div>
      )}
    </div>
  );
}

// 预设组件
export const FileAttachment = (props) => (
  <AttachmentPill type="file" {...props} />
);

export const TerminalAttachment = (props) => (
  <AttachmentPill type="terminal" {...props} />
);

export const SnippetAttachment = (props) => (
  <AttachmentPill type="snippet" {...props} />
);

export const TextAttachment = (props) => (
  <AttachmentPill type="text" {...props} />
);

export default AttachmentPill;
