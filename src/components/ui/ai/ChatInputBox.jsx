import React, { useState, useRef, useEffect } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Spinner } from '../primitives/Spinner';

/**
 * ChatInputBox组件 - AI聊天输入框组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {string} props.value - 输入值
 * @param {Function} props.onChange - 值变化回调
 * @param {Function} props.onSend - 发送回调
 * @param {Function} props.onAttach - 附件回调
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否加载中
 * @param {string} props.placeholder - 占位符
 * @param {boolean} props.multiline - 是否多行
 * @param {number} props.maxRows - 最大行数
 * @param {Array} props.attachments - 附件列表
 * @param {Function} props.onRemoveAttachment - 移除附件回调
 * @param {boolean} props.allowAttach - 是否允许附件
 * @param {boolean} props.allowVoice - 是否允许语音
 * @param {boolean} props.allowEmoji - 是否允许表情
 * @param {Array} props.suggestions - 建议列表
 * @param {Function} props.onSuggestionSelect - 建议选择回调
 * @param {string} props.sendShortcut - 发送快捷键
 * @param {boolean} props.showSendButton - 是否显示发送按钮
 * @param {boolean} props.autoFocus - 是否自动聚焦
 */
export function ChatInputBox({
  className = '',
  value = '',
  onChange,
  onSend,
  onAttach,
  disabled = false,
  loading = false,
  placeholder = '输入消息...',
  multiline = true,
  maxRows = 5,
  attachments = [],
  onRemoveAttachment,
  allowAttach = true,
  allowVoice = false,
  allowEmoji = true,
  suggestions = [],
  onSuggestionSelect,
  sendShortcut = 'Enter',
  showSendButton = true,
  autoFocus = true,
  ...props
}) {
  const [isComposing, setIsComposing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // 自动调整高度
  const adjustHeight = () => {
    if (!textareaRef.current || !multiline) return;
    
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, maxRows * 24);
    textarea.style.height = `${scrollHeight}px`;
  };

  // 处理输入变化
  const handleChange = (e) => {
    onChange?.(e.target.value);
    adjustHeight();
    
    // 显示建议
    if (e.target.value.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (disabled || loading) return;

    // 处理建议导航
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      
      if (e.key === 'Tab') {
        e.preventDefault();
        const suggestion = suggestions[suggestionIndex];
        onSuggestionSelect?.(suggestion);
        setShowSuggestions(false);
        return;
      }
      
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    // 处理发送
    const shouldSend = 
      (sendShortcut === 'Enter' && e.key === 'Enter' && !e.shiftKey) ||
      (sendShortcut === 'Ctrl+Enter' && e.key === 'Enter' && e.ctrlKey) ||
      (sendShortcut === 'Cmd+Enter' && e.key === 'Enter' && e.metaKey);

    if (shouldSend && value.trim() && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // 发送消息
  const handleSend = () => {
    if (!value.trim() || disabled || loading) return;
    
    onSend?.(value.trim());
    onChange?.('');
    setShowSuggestions(false);
    
    // 重置高度
    if (textareaRef.current && multiline) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // 处理附件
  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onAttach?.(files);
    }
    e.target.value = '';
  };

  // 处理建议选择
  const handleSuggestionClick = (suggestion) => {
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
  };

  // 获取容器样式
  const containerClasses = clsx(
    'border border-gray-700 rounded-lg bg-gray-800',
    'focus-within:border-blue-500 transition-colors',
    {
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  return (
    <div className={containerClasses} {...props}>
      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div className="p-3 border-b border-gray-700 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1 text-sm text-gray-300"
            >
              <Icon name="File" size="xs" />
              <span className="truncate max-w-32">{attachment.name}</span>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onRemoveAttachment?.(index)}
              >
                <Icon name="X" size="xs" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex items-end gap-2 p-3">
        {/* 左侧工具按钮 */}
        <div className="flex items-center gap-1">
          {allowAttach && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAttach}
              disabled={disabled}
              title="添加附件"
            >
              <Icon name="Paperclip" size="sm" />
            </Button>
          )}
          
          {allowVoice && (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              title="语音输入"
            >
              <Icon name="Mic" size="sm" />
            </Button>
          )}
          
          {allowEmoji && (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              title="表情"
            >
              <Icon name="Smile" size="sm" />
            </Button>
          )}
        </div>

        {/* 输入框 */}
        <div className="flex-1 relative">
          {multiline ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full bg-transparent text-gray-100 placeholder-gray-500 outline-none resize-none"
              style={{ minHeight: '24px' }}
              rows={1}
            />
          ) : (
            <input
              ref={textareaRef}
              type="text"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full bg-transparent text-gray-100 placeholder-gray-500 outline-none"
            />
          )}

          {/* 建议列表 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={clsx(
                    'px-3 py-2 cursor-pointer text-sm',
                    'hover:bg-gray-800',
                    {
                      'bg-blue-600/20': index === suggestionIndex,
                    }
                  )}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.text || suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 发送按钮 */}
        {showSendButton && (
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!value.trim() || disabled || loading}
            loading={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <Icon name="Send" size="sm" />
            )}
          </Button>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />
    </div>
  );
}

// 预设组件
export const MinimalChatInput = (props) => (
  <ChatInputBox
    multiline={false}
    showSendButton={true}
    allowAttach={false}
    allowVoice={false}
    allowEmoji={false}
    {...props}
  />
);

export const FullChatInput = (props) => (
  <ChatInputBox
    multiline={true}
    showSendButton={true}
    allowAttach={true}
    allowVoice={true}
    allowEmoji={true}
    maxRows={8}
    {...props}
  />
);

export default ChatInputBox;
