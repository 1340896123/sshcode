import React, { useState, useRef, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { StatusDot } from '../primitives/StatusDot';
import { Spinner } from '../primitives/Spinner';

/**
 * ChatThread组件 - AI聊天线程组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {Array} props.messages - 消息列表
 * @param {Function} props.onSendMessage - 发送消息回调
 * @param {Function} props.onRetryMessage - 重试消息回调
 * @param {Function} props.onDeleteMessage - 删除消息回调
 * @param {Function} props.onEditMessage - 编辑消息回调
 * @param {Function} props.onCopyMessage - 复制消息回调
 * @param {Function} props.onRegenerateResponse - 重新生成回复回调
 * @param {boolean} props.loading - 是否加载中
 * @param {boolean} props.allowEdit - 是否允许编辑消息
 * @param {boolean} props.allowDelete - 是否允许删除消息
 * @param {boolean} props.allowCopy - 是否允许复制消息
 * @param {boolean} props.allowRetry - 是否允许重试
 * @param {boolean} props.showTimestamp - 是否显示时间戳
 * @param {boolean} props.showAvatar - 是否显示头像
 * @param {boolean} props.showStatus - 是否显示状态
 * @param {string} props.userAvatar - 用户头像
 * @param {string} props.aiAvatar - AI头像
 * @param {string} props.userName - 用户名称
 * @param {string} props.aiName - AI名称
 * @param {boolean} props.autoScroll - 是否自动滚动
 * @param {boolean} props.markdown - 是否支持Markdown
 * @param {boolean} props.codeHighlight - 是否代码高亮
 * @param {Function} props.onScrollToBottom - 滚动到底部回调
 * @param {Function} props.onMessageClick - 消息点击回调
 */
export function ChatThread({
  className = '',
  messages = [],
  onSendMessage,
  onRetryMessage,
  onDeleteMessage,
  onEditMessage,
  onCopyMessage,
  onRegenerateResponse,
  loading = false,
  allowEdit = true,
  allowDelete = true,
  allowCopy = true,
  allowRetry = true,
  showTimestamp = true,
  showAvatar = true,
  showStatus = true,
  userAvatar = '',
  aiAvatar = '',
  userName = '用户',
  aiName = 'AI助手',
  autoScroll = true,
  markdown = true,
  codeHighlight = true,
  onScrollToBottom,
  onMessageClick,
  ...props
}) {
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [scrolledToBottom, setScrolledToBottom] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && scrolledToBottom) {
      scrollToBottom();
    }
  }, [messages, autoScroll, scrolledToBottom]);

  // 监听滚动事件
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    
    setScrolledToBottom(isAtBottom);
  };

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    onScrollToBottom?.();
  };

  // 处理消息编辑
  const handleEditMessage = (message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  // 保存编辑
  const saveEdit = (messageId) => {
    if (editContent.trim()) {
      onEditMessage?.(messageId, editContent.trim());
    }
    setEditingMessageId(null);
    setEditContent('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 获取消息状态
  const getMessageStatus = (message) => {
    if (message.error) return 'error';
    if (message.sending) return 'loading';
    if (message.id === messages[messages.length - 1]?.id && loading) return 'loading';
    return 'success';
  };

  // 渲染头像
  const renderAvatar = (isUser) => {
    if (!showAvatar) return null;

    const avatar = isUser ? userAvatar : aiAvatar;
    const name = isUser ? userName : aiName;

    if (avatar) {
      return (
        <img 
          src={avatar} 
          alt={name}
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }

    return (
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-600 text-white'
      )}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  // 渲染消息内容
  const renderMessageContent = (message) => {
    const isEditing = editingMessageId === message.id;

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-gray-100 resize-none focus:outline-none focus:border-blue-500"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="xs" onClick={() => saveEdit(message.id)}>
              保存
            </Button>
            <Button size="xs" variant="outline" onClick={cancelEdit}>
              取消
            </Button>
          </div>
        </div>
      );
    }

    // 简单的Markdown渲染（实际项目中应该使用专门的Markdown库）
    const content = message.content || '';
    const lines = content.split('\n');
    
    return (
      <div className="prose prose-invert max-w-none">
        {lines.map((line, index) => {
          // 代码块
          if (line.startsWith('```')) {
            const isCodeStart = line === '```' || line.startsWith('```');
            if (isCodeStart) {
              const codeLines = [];
              let i = index + 1;
              while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
              }
              
              return (
                <div key={index} className="bg-gray-900 rounded p-3 my-2">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    <code>{codeLines.join('\n')}</code>
                  </pre>
                </div>
              );
            }
          }
          
          // 行内代码
          const inlineCode = line.match(/`([^`]+)`/g);
          if (inlineCode) {
            let processedLine = line;
            inlineCode.forEach(code => {
              const text = code.slice(1, -1);
              processedLine = processedLine.replace(code, `<code class="bg-gray-800 px-1 rounded text-sm">${text}</code>`);
            });
            
            return (
              <p key={index} className="text-gray-100" dangerouslySetInnerHTML={{ __html: processedLine }} />
            );
          }
          
          // 普通文本
          if (line.trim()) {
            return <p key={index} className="text-gray-100">{line}</p>;
          }
          
          return <br key={index} />;
        })}
      </div>
    );
  };

  // 渲染消息操作按钮
  const renderMessageActions = (message) => {
    const isUser = message.role === 'user';
    const status = getMessageStatus(message);

    return (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {allowCopy && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onCopyMessage?.(message)}
            title="复制"
          >
            <Icon name="Copy" size="xs" />
          </Button>
        )}
        
        {allowEdit && isUser && status === 'success' && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => handleEditMessage(message)}
            title="编辑"
          >
            <Icon name="Edit" size="xs" />
          </Button>
        )}
        
        {allowRetry && !isUser && status === 'error' && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onRetryMessage?.(message)}
            title="重试"
          >
            <Icon name="RefreshCw" size="xs" />
          </Button>
        )}
        
        {allowDelete && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onDeleteMessage?.(message)}
            title="删除"
          >
            <Icon name="Trash2" size="xs" />
          </Button>
        )}
      </div>
    );
  };

  // 渲染单个消息
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const status = getMessageStatus(message);
    const showActions = allowEdit || allowDelete || allowCopy || allowRetry;

    return (
      <div
        key={message.id || index}
        className={clsx(
          'flex gap-3 p-4 group hover:bg-gray-800/30 transition-colors',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
        onClick={() => onMessageClick?.(message)}
      >
        {/* 头像 */}
        {renderAvatar(isUser)}

        {/* 消息内容 */}
        <div className={clsx('flex-1 min-w-0', isUser ? 'text-right' : 'text-left')}>
          {/* 用户名和时间戳 */}
          <div className={clsx(
            'flex items-center gap-2 mb-1',
            isUser ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-sm font-medium text-gray-300">
              {isUser ? userName : aiName}
            </span>
            
            {showTimestamp && message.timestamp && (
              <span className="text-xs text-gray-500">
                {formatTimestamp(message.timestamp)}
              </span>
            )}
            
            {showStatus && (
              <StatusDot
                status={status}
                size="xs"
                pulse={status === 'loading'}
              />
            )}
          </div>

          {/* 消息气泡 */}
          <div className={clsx(
            'relative inline-block max-w-full',
            isUser ? 'ml-auto' : 'mr-auto'
          )}>
            <div className={clsx(
              'rounded-lg p-3',
              isUser 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-100 border border-gray-700'
            )}>
              {renderMessageContent(message)}
            </div>

            {/* 操作按钮 */}
            {showActions && (
              <div className={clsx(
                'absolute top-0',
                isUser ? 'right-full mr-2' : 'left-full ml-2'
              )}>
                {renderMessageActions(message)}
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {status === 'error' && message.error && (
            <div className="mt-2 text-xs text-red-400">
              {message.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染加载指示器
  const renderLoadingIndicator = () => {
    if (!loading) return null;

    return (
      <div className="flex gap-3 p-4">
        {renderAvatar(false)}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-300">{aiName}</span>
            <StatusDot status="loading" size="xs" pulse />
          </div>
          <div className="bg-gray-800 text-gray-100 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-sm">正在思考...</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 获取容器样式
  const containerClasses = clsx(
    'flex flex-col h-full bg-gray-900',
    className
  );

  return (
    <div className={containerClasses} {...props}>
      {/* 消息列表 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Icon name="MessageSquare" size="lg" className="mx-auto mb-2" />
              <p>开始与AI助手对话</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            {renderLoadingIndicator()}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 滚动到底部按钮 */}
      {!scrolledToBottom && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            variant="solid"
            onClick={scrollToBottom}
            className="rounded-full shadow-lg"
          >
            <Icon name="ChevronDown" size="sm" />
          </Button>
        </div>
      )}
    </div>
  );
}

// 预设的聊天线程组件
export const MinimalChatThread = (props) => (
  <ChatThread
    showAvatar={false}
    showTimestamp={false}
    showStatus={false}
    allowEdit={false}
    allowDelete={false}
    allowRetry={true}
    {...props}
  />
);

export const FullChatThread = (props) => (
  <ChatThread
    showAvatar={true}
    showTimestamp={true}
    showStatus={true}
    allowEdit={true}
    allowDelete={true}
    allowRetry={true}
    allowCopy={true}
    markdown={true}
    codeHighlight={true}
    {...props}
  />
);

export const CompactChatThread = (props) => (
  <ChatThread
    showAvatar={true}
    showTimestamp={false}
    showStatus={true}
    allowEdit={false}
    allowDelete={false}
    allowRetry={true}
    allowCopy={true}
    {...props}
  />
);

export default ChatThread;
