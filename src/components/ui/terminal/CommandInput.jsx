import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Spinner } from '../primitives/Spinner';

/**
 * CommandInput组件 - 终端命令输入组件
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.className - 自定义类名
 * @param {string} props.value - 输入值
 * @param {Function} props.onChange - 值变化回调
 * @param {Function} props.onSubmit - 提交回调
 * @param {Function} props.onKeyDown - 键盘按下回调
 * @param {boolean} props.multiline - 是否支持多行输入
 * @param {boolean} props.autoFocus - 是否自动聚焦
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否加载中
 * @param {string} props.placeholder - 占位符文本
 * @param {Array} props.history - 命令历史
 * @param {number} props.historyIndex - 当前历史索引
 * @param {Function} props.onHistoryNavigate - 历史导航回调
 * @param {Array} props.suggestions - 自动补全建议
 * @param {boolean} props.showSuggestions - 是否显示建议
 * @param {Function} props.onSuggestionSelect - 建议选择回调
 * @param {string} props.prompt - 提示符
 * @param {string} props.fontSize - 字体大小
 * @param {string} props.fontFamily - 字体族
 * @param {boolean} props.showLineNumbers - 是否显示行号（多行模式）
 * @param {number} props.maxRows - 最大行数（多行模式）
 * @param {Function} props.onCtrlEnter - Ctrl+Enter回调（多行模式）
 * @param {Function} props.onEscape - Escape键回调
 */
export function CommandInput({
  className = '',
  value = '',
  onChange,
  onSubmit,
  onKeyDown,
  multiline = false,
  autoFocus = true,
  disabled = false,
  loading = false,
  placeholder = '输入命令...',
  history = [],
  historyIndex = -1,
  onHistoryNavigate,
  suggestions = [],
  showSuggestions = true,
  onSuggestionSelect,
  prompt = '$',
  fontSize = '14px',
  fontFamily = '"Cascadia Code", "Fira Code", monospace',
  showLineNumbers = false,
  maxRows = 10,
  onCtrlEnter,
  onEscape,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const inputElement = multiline ? textareaRef.current : inputRef.current;

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputElement && !disabled) {
      inputElement.focus();
    }
  }, [autoFocus, inputElement, disabled]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    if (disabled || loading) return;

    // 处理历史导航
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        onHistoryNavigate?.(newIndex, history[newIndex]);
      }
      return;
    }

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        onHistoryNavigate?.(newIndex, history[newIndex]);
      } else if (historyIndex === 0) {
        onHistoryNavigate?.(-1, '');
      }
      return;
    }

    // 处理自动补全导航
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const nextIndex = suggestionIndex < suggestions.length - 1 ? suggestionIndex + 1 : 0;
        setSuggestionIndex(nextIndex);
        return;
      }

      if (e.key === 'Enter' && suggestionIndex >= 0) {
        e.preventDefault();
        const suggestion = suggestions[suggestionIndex];
        onSuggestionSelect?.(suggestion);
        setSuggestionIndex(-1);
        return;
      }

      if (e.key === 'Escape') {
        setSuggestionIndex(-1);
        onEscape?.();
        return;
      }
    }

    // 处理提交
    if (e.key === 'Enter') {
      if (multiline && e.ctrlKey) {
        onCtrlEnter?.();
      } else if (!multiline && value.trim()) {
        e.preventDefault();
        onSubmit?.(value);
        setSuggestionIndex(-1);
      }
      return;
    }

    // 处理其他键盘事件
    onKeyDown?.(e);
  }, [
    disabled,
    loading,
    history,
    historyIndex,
    onHistoryNavigate,
    showSuggestions,
    suggestions,
    suggestionIndex,
    onSuggestionSelect,
    multiline,
    value,
    onSubmit,
    onCtrlEnter,
    onEscape,
    onKeyDown
  ]);

  // 处理输入变化
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    setCursorPosition(e.target.selectionStart);
    setSuggestionIndex(-1);
  };

  // 处理聚焦
  const handleFocus = () => {
    setIsFocused(true);
  };

  // 处理失焦
  const handleBlur = () => {
    setIsFocused(false);
    setSuggestionIndex(-1);
  };

  // 处理组合输入开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 处理组合输入结束
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // 格式化多行文本（添加行号）
  const formatMultilineText = (text) => {
    if (!showLineNumbers) return text;
    
    const lines = text.split('\n');
    const maxLineNumber = lines.length;
    const lineNumberWidth = maxLineNumber.toString().length;
    
    return lines
      .map((line, index) => {
        const lineNumber = (index + 1).toString().padStart(lineNumberWidth, ' ');
        return `${lineNumber} ${line}`;
      })
      .join('\n');
  };

  // 获取输入框样式
  const getInputClasses = () => {
    return clsx(
      'w-full bg-transparent text-gray-100 placeholder-gray-500',
      'outline-none resize-none',
      {
        'font-mono': true,
        'opacity-50 cursor-not-allowed': disabled,
        'animate-pulse': loading,
      }
    );
  };

  // 获取容器样式
  const containerClasses = clsx(
    'flex items-start gap-2 bg-gray-800 border border-gray-700 rounded-lg',
    'transition-all duration-200',
    {
      'border-blue-500 shadow-lg shadow-blue-500/20': isFocused,
      'border-gray-600': !isFocused,
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  // 获取提示符样式
  const promptClasses = clsx(
    'text-gray-400 font-mono flex-shrink-0',
    'select-none',
    {
      'pt-2': multiline,
      'self-center': !multiline,
    }
  );

  // 渲染建议列表
  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0 || suggestionIndex === -1) {
      return null;
    }

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50">
        <div className="max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={clsx(
                'px-3 py-2 cursor-pointer text-sm font-mono',
                'hover:bg-gray-800 transition-colors',
                {
                  'bg-blue-600 text-white': index === suggestionIndex,
                  'text-gray-300': index !== suggestionIndex,
                }
              )}
              onClick={() => {
                onSuggestionSelect?.(suggestion);
                setSuggestionIndex(-1);
              }}
            >
              {suggestion.text || suggestion}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={containerClasses} {...props}>
      {/* 提示符 */}
      <div className={promptClasses}>
        {prompt}
      </div>

      {/* 输入区域 */}
      <div className="flex-1 relative">
        {renderSuggestions()}
        
        {multiline ? (
          <textarea
            ref={textareaRef}
            value={formatMultilineText(value)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={disabled}
            placeholder={placeholder}
            className={getInputClasses()}
            style={{
              fontSize,
              fontFamily,
              minHeight: '60px',
              maxHeight: `${maxRows * 1.5}em`,
            }}
            rows={Math.min(value.split('\n').length, maxRows)}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={disabled}
            placeholder={placeholder}
            className={clsx(getInputClasses(), 'py-3')}
            style={{
              fontSize,
              fontFamily,
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        )}

        {/* 光标位置指示器（调试用） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-0 right-0 text-xs text-gray-600 p-1">
            {cursorPosition}
          </div>
        )}
      </div>

      {/* 状态指示器 */}
      <div className="flex items-center gap-2 flex-shrink-0 pt-2">
        {loading && (
          <Spinner size="sm" color="primary" />
        )}
        
        {/* 历史导航指示器 */}
        {historyIndex >= 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Icon name="History" size="xs" />
            <span>{historyIndex + 1}/{history.length}</span>
          </div>
        )}

        {/* 多行模式指示器 */}
        {multiline && (
          <div className="text-xs text-gray-500">
            {value.split('\n').length} 行
          </div>
        )}

        {/* 建议指示器 */}
        {showSuggestions && suggestions.length > 0 && isFocused && (
          <div className="text-xs text-gray-500">
            Tab 补全
          </div>
        )}
      </div>
    </div>
  );
}

// 预设的命令输入组件
export const SingleLineCommandInput = (props) => (
  <CommandInput
    multiline={false}
    showLineNumbers={false}
    {...props}
  />
);

export const MultiLineCommandInput = (props) => (
  <CommandInput
    multiline={true}
    showLineNumbers={true}
    {...props}
  />
);

export const HistoryEnabledCommandInput = (props) => (
  <CommandInput
    history={[]}
    historyIndex={-1}
    onHistoryNavigate={() => {}}
    suggestions={[]}
    showSuggestions={true}
    {...props}
  />
);

// 搜索框样式的命令输入
export const SearchCommandInput = (props) => (
  <CommandInput
    prompt="/"
    placeholder="搜索命令..."
    multiline={false}
    className="border-gray-600 bg-gray-900"
    {...props}
  />
);

// 密码输入样式（用于敏感命令）
export const SecureCommandInput = (props) => (
  <CommandInput
    placeholder="输入敏感命令..."
    multiline={false}
    className="border-yellow-600 bg-yellow-900/20"
    {...props}
  />
);

export default CommandInput;
