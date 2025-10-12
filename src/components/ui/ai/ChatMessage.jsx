import React from 'react';
import Button from '../primitives/Button';
import Tooltip from '../primitives/Tooltip';

/**
 * 聊天消息组件
 * @param {Object} props - 组件属性
 * @param {Object} props.message - 消息对象
 * @param {string|number} props.message.id - 消息ID
 * @param {string} props.message.type - 消息类型: 'user' | 'ai' | 'system'
 * @param {string} props.message.content - 消息内容
 * @param {string} props.message.timestamp - 消息时间戳（可选）
 * @param {boolean} props.showActions - 是否显示操作按钮
 * @param {function} props.onCopy - 复制消息回调函数
 * @param {function} props onDelete - 删除消息回调函数（可选）
 * @param {function} props.onEdit - 编辑消息回调函数（可选）
 * @param {string} props.className - 额外的CSS类名
 */
function ChatMessage({
  message,
  showActions = true,
  onCopy,
  onDelete,
  onEdit,
  className = ''
}) {
  const getMessageClasses = () => {
    const baseClasses = 'max-w-[80%] p-3.75 rounded-xl text-sm leading-7 break-words';
    
    switch (message.type) {
      case 'user':
        return `${baseClasses} bg-[#007acc] text-white rounded-br-md`;
      case 'ai':
        return `${baseClasses} bg-[#3e3e42] text-[#d4d4d4] rounded-bl-md`;
      case 'system':
        return `${baseClasses} bg-[#2d2d30] text-[#cccccc] text-center italic`;
      default:
        return `${baseClasses} bg-[#3e3e42] text-[#d4d4d4] rounded-bl-md`;
    }
  };

  const getContainerClasses = () => {
    const baseClasses = 'mb-4 flex flex-col';
    
    switch (message.type) {
      case 'user':
        return `${baseClasses} items-end`;
      case 'ai':
        return `${baseClasses} items-start`;
      case 'system':
        return `${baseClasses} items-center`;
      default:
        return `${baseClasses} items-start`;
    }
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      // 默认复制到剪贴板
      navigator.clipboard.writeText(message.content).catch(() => {
        console.warn('复制失败');
      });
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message);
    }
  };

  const formatContent = (content) => {
    if (!content) return null;
    
    return content.split('\n').map((line, index) => (
      <div key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </div>
    ));
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return null;
    }
  };

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      {/* 消息内容 */}
      <div className={getMessageClasses()}>
        {formatContent(message.content)}
      </div>

      {/* 时间戳 */}
      {message.timestamp && (
        <div className="mt-1 text-xs text-[#666] opacity-70">
          {formatTimestamp(message.timestamp)}
        </div>
      )}

      {/* 操作按钮 */}
      {showActions && message.type !== 'system' && (
        <div className="mt-1 flex gap-1">
          <Tooltip content="复制消息">
            <Button
              variant="small"
              size="small"
              onClick={handleCopy}
              title="复制消息"
            >
              📋
            </Button>
          </Tooltip>

          {message.type === 'user' && onEdit && (
            <Tooltip content="编辑消息">
              <Button
                variant="small"
                size="small"
                onClick={handleEdit}
                title="编辑消息"
              >
                ✏️
              </Button>
            </Tooltip>
          )}

          {onDelete && (
            <Tooltip content="删除消息">
              <Button
                variant="small"
                size="small"
                onClick={handleDelete}
                title="删除消息"
              >
                🗑️
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 加载中的消息组件
 * @param {Object} props - 组件属性
 * @param {string} props.text - 加载文本
 * @param {string} props.className - 额外的CSS类名
 */
function ChatMessageLoading({ text = '正在思考', className = '' }) {
  return (
    <div className={`mb-4 flex flex-col items-start ${className}`}>
      <div className="bg-[#3e3e42] text-[#d4d4d4] rounded-xl rounded-bl-md p-3.75 text-sm leading-7">
        <span>{text}</span>
        <span className="inline-block w-1 h-1 bg-[#d4d4d4] rounded-full animate-pulse ml-1"></span>
        <span className="inline-block w-1 h-1 bg-[#d4d4d4] rounded-full animate-pulse ml-1" style={{animationDelay: '0.2s'}}></span>
        <span className="inline-block w-1 h-1 bg-[#d4d4d4] rounded-full animate-pulse ml-1" style={{animationDelay: '0.4s'}}></span>
      </div>
    </div>
  );
}

export { ChatMessageLoading };
export default ChatMessage;
