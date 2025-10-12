import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { cn } from '../utils/clsx';
import { createVariants } from '../utils/cva';
import Icon from './Icon';

/**
 * Select组件 - 下拉选择器，支持搜索和键盘导航
 */
const selectVariants = createVariants(
  'relative w-full rounded-md border border-gray-600 bg-gray-800 text-gray-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
  {
    size: {
      sm: 'h-8 px-2 py-1 text-xs',
      md: 'h-10 px-3 py-2 text-sm',
      lg: 'h-12 px-4 py-3 text-base'
    },
    variant: {
      default: '',
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
      warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500'
    }
  },
  {
    size: 'md',
    variant: 'default'
  }
);

const Select = forwardRef(({
  options = [],
  value,
  onChange,
  placeholder = '请选择...',
  searchable = false,
  clearable = false,
  disabled = false,
  loading = false,
  size,
  variant,
  className,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef(null);
  const inputRef = useRef(null);

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取选中的选项
  const selectedOption = options.find(option => option.value === value);

  // 处理选项选择
  const handleSelect = (option) => {
    if (onChange) {
      onChange(option.value);
    }
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  // 处理清空
  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
    setSearchTerm('');
  };

  // 键盘导航
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 自动聚焦搜索框
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  return (
    <div ref={selectRef} className="relative">
      <button
        ref={ref}
        type="button"
        className={cn(
          selectVariants({ size, variant }),
          'flex items-center justify-between cursor-pointer',
          disabled && 'cursor-not-allowed',
          className
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        {...props}
      >
        <span className={cn('truncate', !selectedOption && 'text-gray-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {loading && <Icon name="Loader2" size={16} className="animate-spin" />}
          {clearable && value && !disabled && (
            <Icon
              name="X"
              size={16}
              className="text-gray-400 hover:text-gray-200"
              onClick={handleClear}
            />
          )}
          <Icon
            name={isOpen ? 'ChevronUp' : 'ChevronDown'}
            size={16}
            className={cn(
              'transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-gray-700">
              <input
                ref={inputRef}
                type="text"
                className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 text-center">
              {searchTerm ? '无匹配结果' : '无选项'}
            </div>
          ) : (
            <ul className="py-1">
              {filteredOptions.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-gray-700 focus:bg-gray-700 focus:outline-none',
                      option.value === value && 'bg-blue-600 text-white',
                      index === highlightedIndex && 'bg-gray-700',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !option.disabled && handleSelect(option)}
                    disabled={option.disabled}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-gray-400">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

/**
 * 多选Select组件
 */
export const MultiSelect = forwardRef(({
  options = [],
  value = [],
  onChange,
  placeholder = '请选择...',
  searchable = false,
  disabled = false,
  loading = false,
  size,
  variant,
  className,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取选中的选项
  const selectedOptions = options.filter(option => value.includes(option.value));

  // 处理选项选择
  const handleSelect = (option) => {
    const newValue = value.includes(option.value)
      ? value.filter(v => v !== option.value)
      : [...value, option.value];
    
    if (onChange) {
      onChange(newValue);
    }
  };

  // 处理清空
  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange([]);
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={selectRef} className="relative">
      <button
        ref={ref}
        type="button"
        className={cn(
          selectVariants({ size, variant }),
          'h-auto min-h-[40px] cursor-pointer',
          disabled && 'cursor-not-allowed',
          className
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        {...props}
      >
        <div className="flex flex-wrap items-center gap-1 min-h-[20px]">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selectedOptions.map(option => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded"
              >
                {option.label}
                <Icon
                  name="X"
                  size={12}
                  className="cursor-pointer hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                />
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {loading && <Icon name="Loader2" size={16} className="animate-spin" />}
          {value.length > 0 && !disabled && (
            <Icon
              name="X"
              size={16}
              className="text-gray-400 hover:text-gray-200"
              onClick={handleClear}
            />
          )}
          <Icon
            name={isOpen ? 'ChevronUp' : 'ChevronDown'}
            size={16}
            className={cn(
              'transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-gray-700">
              <input
                type="text"
                className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 text-center">
              {searchTerm ? '无匹配结果' : '无选项'}
            </div>
          ) : (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-gray-700 focus:bg-gray-700 focus:outline-none flex items-center gap-2',
                      value.includes(option.value) && 'bg-blue-600 text-white',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !option.disabled && handleSelect(option)}
                    disabled={option.disabled}
                  >
                    <div className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center',
                      value.includes(option.value)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-400'
                    )}>
                      {value.includes(option.value) && (
                        <Icon name="Check" size={12} />
                      )}
                    </div>
                    <span>{option.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

MultiSelect.displayName = 'MultiSelect';

// 命名导出和默认导出
export { Select };
export default Select;
