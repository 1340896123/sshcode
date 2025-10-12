import React, { useState, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Code } from '../primitives/Code';

/**
 * FilePreview组件 - 文件预览器组件
 */
export function FilePreview({
  file = null,
  content = '',
  loading = false,
  error = null,
  onDownload,
  onClose,
  maxWidth = 800,
  maxHeight = 600,
  className = '',
  ...props
}) {
  const [previewMode, setPreviewMode] = useState('auto');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (file) {
      setPreviewMode(getDefaultPreviewMode());
    }
  }, [file]);

  const getDefaultPreviewMode = () => {
    if (!file) return 'text';
    
    const extension = file.name?.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return 'image';
    } else if (['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'json', 'xml', 'yaml', 'yml', 'ini', 'conf'].includes(extension)) {
      return 'text';
    } else if (['pdf'].includes(extension)) {
      return 'pdf';
    } else {
      return 'binary';
    }
  };

  const getFileIcon = () => {
    if (!file) return 'File';
    
    const extension = file.name?.split('.').pop()?.toLowerCase();
    const iconMap = {
      // 图片
      jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image', svg: 'Image',
      // 代码
      js: 'Code2', jsx: 'Code2', ts: 'Code2', tsx: 'Code2', 
      html: 'Code', css: 'Code', json: 'FileJson', xml: 'FileText',
      // 文档
      txt: 'FileText', md: 'FileText', pdf: 'FileText',
      // 压缩
      zip: 'Archive', rar: 'Archive', tar: 'Archive', gz: 'Archive',
      // 默认
      default: 'File'
    };
    
    return iconMap[extension] || iconMap.default;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '未知大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Icon name="Loader2" size="lg" className="animate-spin" />
            <div className="mt-2">加载中...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-red-400">
          <div className="text-center">
            <Icon name="XCircle" size="lg" />
            <div className="mt-2">预览失败</div>
            <div className="text-xs text-gray-500 mt-1">{error}</div>
          </div>
        </div>
      );
    }

    if (!file) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Icon name="File" size="lg" />
            <div className="mt-2">选择文件预览</div>
          </div>
        </div>
      );
    }

    switch (previewMode) {
      case 'image':
        if (imageError) {
          return (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Icon name="ImageOff" size="lg" />
                <div className="mt-2">图片加载失败</div>
              </div>
            </div>
          );
        }
        
        return (
          <div className="flex items-center justify-center p-4">
            <img
              src={content || file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded"
              onError={() => setImageError(true)}
              style={{ maxHeight: maxHeight - 100 }}
            />
          </div>
        );

      case 'text':
        return (
          <div className="p-4 overflow-auto" style={{ maxHeight: maxHeight - 100 }}>
            <Code
              code={content}
              language={getLanguageFromExtension()}
              showLineNumbers={true}
              theme="dark"
              className="text-sm"
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Icon name="FileText" size="lg" />
              <div className="mt-2">PDF文件预览</div>
              <Button size="sm" className="mt-3" onClick={onDownload}>
                <Icon name="Download" size="sm" />
                下载查看
              </Button>
            </div>
          </div>
        );

      case 'binary':
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Icon name="File" size="lg" />
              <div className="mt-2">二进制文件</div>
              <div className="text-xs text-gray-500 mt-1">无法预览此文件类型</div>
              <Button size="sm" className="mt-3" onClick={onDownload}>
                <Icon name="Download" size="sm" />
                下载文件
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getLanguageFromExtension = () => {
    if (!file) return 'text';
    
    const extension = file.name?.split('.').pop()?.toLowerCase();
    const languageMap = {
      js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
      html: 'html', css: 'css', json: 'json', xml: 'xml',
      md: 'markdown', yaml: 'yaml', yml: 'yaml',
      py: 'python', sh: 'bash', sql: 'sql'
    };
    
    return languageMap[extension] || 'text';
  };

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg', className)} {...props}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Icon name={getFileIcon()} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-100 truncate">
              {file?.name || '文件预览'}
            </h3>
            <div className="text-xs text-gray-500">
              {file && (
                <>
                  {formatFileSize(file.size)} • {new Date(file.modified).toLocaleString()}
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button size="xs" variant="ghost" onClick={onDownload} title="下载">
              <Icon name="Download" size="xs" />
            </Button>
          )}
          {onClose && (
            <Button size="xs" variant="ghost" onClick={onClose} title="关闭">
              <Icon name="X" size="xs" />
            </Button>
          )}
        </div>
      </div>

      {/* 预览模式切换 */}
      {file && ['text', 'image'].includes(previewMode) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">预览模式:</span>
            <div className="flex gap-1">
              {['text', 'image'].map(mode => (
                <Button
                  key={mode}
                  size="xs"
                  variant={previewMode === mode ? 'solid' : 'ghost'}
                  onClick={() => setPreviewMode(mode)}
                >
                  {mode === 'text' ? '文本' : '图片'}
                </Button>
              ))}
            </div>
          </div>
          
          {content && (
            <div className="text-xs text-gray-500">
              {content.length} 字符
            </div>
          )}
        </div>
      )}

      {/* 预览内容 */}
      <div 
        className="overflow-auto"
        style={{ 
          maxWidth: `${maxWidth}px`, 
          maxHeight: `${maxHeight}px` 
        }}
      >
        {renderPreview()}
      </div>
    </div>
  );
}

// 预设组件
export const ImagePreview = (props) => (
  <FilePreview {...props} />
);

export const CodePreview = (props) => (
  <FilePreview {...props} />
);

export const BinaryPreview = (props) => (
  <FilePreview {...props} />
);

export default FilePreview;
