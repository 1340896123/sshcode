import React, { useState, useEffect, useRef } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';

/**
 * DragOverlay组件 - 拖拽文件到终端的上传提示组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {boolean} props.visible - 是否可见
 * @param {boolean} props.active - 是否激活状态（拖拽中）
 * @param {Array} props.files - 拖拽的文件列表
 * @param {Function} props.onDrop - 文件拖放回调
 * @param {Function} props.onDragEnter - 拖拽进入回调
 * @param {Function} props.onDragLeave - 拖拽离开回调
 * @param {Function} props.onDragOver - 拖拽经过回调
 * @param {boolean} props.multiple - 是否支持多文件
 * @param {Array} props.acceptTypes - 接受的文件类型
 * @param {number} props.maxSize - 最大文件大小（字节）
 * @param {number} props.maxFiles - 最大文件数量
 * @param {string} props.title - 提示标题
 * @param {string} props.description - 提示描述
 * @param {string} props.uploadPath - 上传路径
 * @param {boolean} props.showPreview - 是否显示文件预览
 * @param {boolean} props.showProgress - 是否显示上传进度
 * @param {Object} props.progress - 上传进度信息
 * @param {string} props.variant - 变体：default|minimal|detailed
 * @param {string} props.position - 位置：center|top|bottom
 * @param {boolean} props.fullscreen - 是否全屏覆盖
 */
export function DragOverlay({
  className = '',
  visible = false,
  active = false,
  files = [],
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
  multiple = true,
  acceptTypes = [],
  maxSize = 100 * 1024 * 1024, // 100MB
  maxFiles = 10,
  title = '拖拽文件到此处上传',
  description = '支持单个或批量文件上传',
  uploadPath = '',
  showPreview = true,
  showProgress = false,
  progress = {},
  variant = 'default',
  position = 'center',
  fullscreen = false,
  ...props
}) {
  const [dragCounter, setDragCounter] = useState(0);
  const [isValidDrag, setIsValidDrag] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);
  const overlayRef = useRef(null);

  // 处理拖拽进入
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => prev + 1);
    
    const newFiles = Array.from(e.dataTransfer.files);
    const validation = validateFiles(newFiles);
    
    setIsValidDrag(validation.isValid);
    setValidationErrors(validation.errors);
    
    onDragEnter?.(e, newFiles, validation);
  };

  // 处理拖拽离开
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => prev - 1);
    
    if (dragCounter <= 1) {
      setIsValidDrag(true);
      setValidationErrors([]);
    }
    
    onDragLeave?.(e);
  };

  // 处理拖拽经过
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    onDragOver?.(e);
  };

  // 处理文件拖放
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(0);
    setIsValidDrag(true);
    setValidationErrors([]);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validation = validateFiles(droppedFiles);
    
    if (validation.isValid) {
      onDrop?.(e, droppedFiles);
    } else {
      // 可以在这里显示错误提示
      console.error('File validation failed:', validation.errors);
    }
  };

  // 验证文件
  const validateFiles = (filesToValidate) => {
    const errors = [];
    let isValid = true;

    // 检查文件数量
    if (!multiple && filesToValidate.length > 1) {
      errors.push('只支持单个文件上传');
      isValid = false;
    }

    if (filesToValidate.length > maxFiles) {
      errors.push(`最多支持 ${maxFiles} 个文件`);
      isValid = false;
    }

    // 检查文件类型
    if (acceptTypes.length > 0) {
      const invalidFiles = filesToValidate.filter(file => {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        return !acceptTypes.includes(file.type) && !acceptTypes.includes(fileExtension);
      });

      if (invalidFiles.length > 0) {
        errors.push(`不支持的文件类型: ${invalidFiles.map(f => f.name).join(', ')}`);
        isValid = false;
      }
    }

    // 检查文件大小
    const oversizedFiles = filesToValidate.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      errors.push(`文件大小不能超过 ${maxSizeMB}MB: ${oversizedFiles.map(f => f.name).join(', ')}`);
      isValid = false;
    }

    return { isValid, errors };
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件图标
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
      // 文档
      pdf: 'FileText',
      doc: 'FileText',
      docx: 'FileText',
      txt: 'FileText',
      md: 'FileText',
      rtf: 'FileText',
      
      // 图片
      jpg: 'Image',
      jpeg: 'Image',
      png: 'Image',
      gif: 'Image',
      svg: 'Image',
      webp: 'Image',
      bmp: 'Image',
      
      // 视频
      mp4: 'Video',
      avi: 'Video',
      mov: 'Video',
      wmv: 'Video',
      flv: 'Video',
      webm: 'Video',
      
      // 音频
      mp3: 'Music',
      wav: 'Music',
      flac: 'Music',
      aac: 'Music',
      ogg: 'Music',
      
      // 压缩文件
      zip: 'Archive',
      rar: 'Archive',
      '7z': 'Archive',
      tar: 'Archive',
      gz: 'Archive',
      
      // 代码
      js: 'Code',
      jsx: 'Code',
      ts: 'Code',
      tsx: 'Code',
      py: 'Code',
      java: 'Code',
      cpp: 'Code',
      c: 'Code',
      css: 'Code',
      html: 'Code',
      json: 'Code',
      xml: 'Code',
      yaml: 'Code',
      yml: 'Code',
      
      // 可执行文件
      exe: 'Terminal',
      sh: 'Terminal',
      bat: 'Terminal',
      ps1: 'Terminal',
      
      // 数据库
      sql: 'Database',
      db: 'Database',
      sqlite: 'Database',
      
      // 配置文件
      conf: 'Settings',
      config: 'Settings',
      ini: 'Settings',
      env: 'Settings',
    };

    return iconMap[extension] || 'File';
  };

  // 获取容器样式
  const getContainerClasses = () => {
    return clsx(
      'fixed inset-0 pointer-events-none z-50',
      {
        'pointer-events-auto': visible,
      }
    );
  };

  // 获取覆盖层样式
  const getOverlayClasses = () => {
    return clsx(
      'absolute inset-0 flex items-center justify-center transition-all duration-300',
      {
        'bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500': active && isValidDrag,
        'bg-red-500/10 backdrop-blur-sm border-2 border-dashed border-red-500': active && !isValidDrag,
        'bg-gray-900/50 backdrop-blur-sm border-2 border-dashed border-gray-600': !active,
        'opacity-0 invisible': !visible,
        'opacity-100 visible': visible,
      },
      {
        'inset-4': !fullscreen,
        'inset-0': fullscreen,
      }
    );
  };

  // 获取内容样式
  const getContentClasses = () => {
    return clsx(
      'text-center max-w-md mx-auto p-8',
      {
        'p-4': variant === 'minimal',
        'p-12': variant === 'detailed',
      }
    );
  };

  // 渲染最小变体
  const renderMinimalVariant = () => (
    <div className="flex items-center gap-3 text-gray-300">
      <Icon 
        name={isValidDrag ? 'Upload' : 'XCircle'} 
        size="lg" 
        color={isValidDrag ? 'primary' : 'error'} 
      />
      <span className="text-sm">
        {isValidDrag ? '释放以上传' : '文件无效'}
      </span>
    </div>
  );

  // 渲染默认变体
  const renderDefaultVariant = () => (
    <div className="space-y-4">
      <Icon 
        name={isValidDrag ? 'UploadCloud' : 'XCircle'} 
        size="xl" 
        color={isValidDrag ? 'primary' : 'error'} 
        className={clsx(
          'mx-auto transition-transform duration-300',
          active && 'scale-110'
        )}
      />
      
      <div>
        <h3 className="text-lg font-medium text-gray-100 mb-2">
          {isValidDrag ? title : '文件验证失败'}
        </h3>
        <p className="text-gray-400 text-sm">
          {isValidDrag ? description : '请检查文件格式和大小'}
        </p>
      </div>

      {uploadPath && (
        <div className="text-xs text-gray-500 bg-gray-800/50 rounded px-3 py-2">
          上传到: {uploadPath}
        </div>
      )}
    </div>
  );

  // 渲染详细变体
  const renderDetailedVariant = () => (
    <div className="space-y-6">
      <Icon 
        name={isValidDrag ? 'UploadCloud' : 'XCircle'} 
        size="2xl" 
        color={isValidDrag ? 'primary' : 'error'} 
        className={clsx(
          'mx-auto transition-transform duration-300',
          active && 'scale-110'
        )}
      />
      
      <div>
        <h3 className="text-xl font-medium text-gray-100 mb-3">
          {isValidDrag ? title : '文件验证失败'}
        </h3>
        <p className="text-gray-400 mb-4">
          {isValidDrag ? description : '请检查文件格式和大小'}
        </p>
      </div>

      {/* 文件预览 */}
      {showPreview && files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">
            待上传文件 ({files.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 text-sm bg-gray-800/50 rounded px-3 py-2">
                <Icon name={getFileIcon(file.name)} size="sm" color="muted" />
                <span className="flex-1 truncate text-gray-300">{file.name}</span>
                <span className="text-gray-500">{formatFileSize(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 验证错误 */}
      {!isValidDrag && validationErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-400">验证错误:</h4>
          <ul className="text-xs text-red-300 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start gap-2">
                <Icon name="AlertCircle" size="xs" color="error" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 上传进度 */}
      {showProgress && progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">上传进度</span>
            <span className="text-gray-400">
              {progress.loaded} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 上传信息 */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>支持格式: {acceptTypes.length > 0 ? acceptTypes.join(', ') : '所有格式'}</div>
        <div>最大大小: {formatFileSize(maxSize)}</div>
        {!multiple && <div>仅支持单个文件</div>}
        {maxFiles > 1 && <div>最多 {maxFiles} 个文件</div>}
      </div>
    </div>
  );

  // 渲染内容
  const renderContent = () => {
    switch (variant) {
      case 'minimal':
        return renderMinimalVariant();
      case 'detailed':
        return renderDetailedVariant();
      default:
        return renderDefaultVariant();
    }
  };

  return (
    <div 
      ref={overlayRef}
      className={getContainerClasses()}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      {...props}
    >
      <div 
        className={getOverlayClasses()}
        onDragLeave={handleDragLeave}
      >
        <div className={getContentClasses()}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// 预设的拖拽覆盖层组件
export const MinimalDragOverlay = (props) => (
  <DragOverlay
    variant="minimal"
    showPreview={false}
    showProgress={false}
    {...props}
  />
);

export const DefaultDragOverlay = (props) => (
  <DragOverlay
    variant="default"
    showPreview={true}
    showProgress={false}
    {...props}
  />
);

export const DetailedDragOverlay = (props) => (
  <DragOverlay
    variant="detailed"
    showPreview={true}
    showProgress={true}
    {...props}
  />
);

export const FullscreenDragOverlay = (props) => (
  <DragOverlay
    fullscreen={true}
    variant="default"
    showPreview={true}
    {...props}
  />
);

// 专用拖拽覆盖层
export const ImageDragOverlay = (props) => (
  <DragOverlay
    title="拖拽图片到此处上传"
    description="支持 JPG、PNG、GIF、SVG 等格式"
    acceptTypes={['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', '.jpg', '.jpeg', '.png', '.gif', '.svg']}
    maxSize={10 * 1024 * 1024} // 10MB
    variant="detailed"
    {...props}
  />
);

export const DocumentDragOverlay = (props) => (
  <DragOverlay
    title="拖拽文档到此处上传"
    description="支持 PDF、DOC、TXT 等格式"
    acceptTypes={['application/pdf', 'application/msword', 'text/plain', '.pdf', '.doc', '.docx', '.txt']}
    maxSize={50 * 1024 * 1024} // 50MB
    variant="detailed"
    {...props}
  />
);

export const CodeDragOverlay = (props) => (
  <DragOverlay
    title="拖拽代码文件到此处上传"
    description="支持 JS、TS、Python、Java 等代码文件"
    acceptTypes={['text/javascript', 'text/typescript', 'text/x-python', 'text/x-java-source', '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.html']}
    maxSize={5 * 1024 * 1024} // 5MB
    variant="detailed"
    {...props}
  />
);

export default DragOverlay;
