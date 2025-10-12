import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../utils/clsx';
import { Icon } from './Icon';

/**
 * Combobox组件 - 增强版下拉选择器，支持搜索、键盘导航、多选等功能
 */
const Combobox = forwardRef(({
  options = [],
  value,
  onChange,
  placeholder = '请选择或输入...',
  searchable = true,
  clearable = true,
  multiSelect = false,
  creatable = false,
  disabled = false,
  loading = false,
  error = false,
  errorMessage,
  size = 'md',
  className = '',
  containerClassName = '',
  dropdownClassName = '',
  optionClassName = '',
  onCreateOption,
  renderOption,
  renderValue,
  renderPrefix,
  renderSuffix,
  maxVisibleOptions = 8,
  noOptionsText = '无选项',
  noResultsText = '无匹配结果',
  createOptionText = '创建 "{value}"',
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [inputValue, setInputValue] = useState('');
  
  const comboboxRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // 获取选中的选项
  const selectedOptions = multiSelect 
    ? options.filter(option => value?.includes(option.value))
    : options.find(option => option.value === value);

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 检查是否可以创建新选项
  const canCreateNew = creatable && 
    searchTerm && 
    !options.some(option => 
      option.label.toLowerCase() === searchTerm.toLowerCase()
    );

  // 处理选项选择
  const handleSelect = useCallback((option) => {
    if (multiSelect) {
      const newValue = value?.includes(option.value)
        ? value.filter(v => v !== option.value)
        : [...(value || []), option.value];
      
      if (onChange) {
        onChange(newValue);
      }
    } else {
      if (onChange) {
        onChange(option.value);
      }
      setIsOpen(false);
      setSearchTerm('');
    }
    
    setHighlightedIndex(-1);
    if (!multiSelect) {
      inputRef.current?.blur();
    }
  }, [multiSelect, value, onChange]);

  // 处理创建新选项
  const handleCreateOption = useCallback(() => {
    if (!canCreateNew) return;
    
    const newOption = {
      value: searchTerm,
      label: searchTerm,
      isNew: true
    };
    
    if (onCreateOption) {
      onCreateOption(newOption);
    }
    
    handleSelect(newOption);
  }, [canCreateNew, searchTerm, onCreateOption, handleSelect]);

  // 处理清空
  const handleClear = useCallback((e) => {
    e?.stopPropagation();
    
    if (multiSelect) {
      if (onChange) onChange([]);
    } else {
      if (onChange) onChange('');
    }
    
    setSearchTerm('');
    setInputValue('');
    setHighlightedIndex(-1);
  }, [multiSelect, onChange]);

  // 键盘导航
  const handleKeyDown = useCallback((e) => {
    if (disabled) return;

    const totalOptions = filteredOptions.length + (canCreateNew ? 1 : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < totalOptions - 1 ? prev + 1 : 0
          );
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : totalOptions - 1);
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0) {
            if (canCreateNew && highlightedIndex === filteredOptions.length) {
              handleCreateOption();
            } else if (filteredOptions[highlightedIndex]) {
              handleSelect(filteredOptions[highlightedIndex]);
            }
          } else if (canCreateNew) {
            handleCreateOption();
          }
        } else {
          setIsOpen(true);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
        
      case 'Backspace':
        if (!searchTerm && multiSelect && value?.length > 0) {
          // 删除最后一个选中的选项
          const lastValue = value[value.length - 1];
          const lastOption = options.find(opt => opt.value === lastValue);
          if (lastOption) {
            handleSelect(lastOption);
          }
        }
        break;
        
      case 'Tab':
        if (isOpen) {
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
        }
        break;
    }
  }, [disabled, isOpen, highlightedIndex, filteredOptions, canCreateNew, multiSelect, value, options, handleSelect, handleCreateOption]);

  // 处理输入变化
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setInputValue(newValue);
    
    if (!isOpen) {
      setIsOpen(true);
    }
    
    setHighlightedIndex(-1);
  }, [isOpen]);

  // 处理焦点
  const handleFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 滚动到高亮选项
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.querySelector('[data-highlighted="true"]');
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, highlightedIndex]);

  // 获取尺寸样式
  const getSizeClasses = () => {
    const sizes = {
      sm: {
        container: 'h-8 px-2 py-1 text-sm',
        input: 'text-sm',
        icon: 'w-4 h-4',
        tag: 'text-xs px-1.5 py-0.5'
      },
      md: {
        container: 'h-10 px-3 py-2 text-base',
        input: 'text-base',
        icon: 'w-5 h-5',
        tag: 'text-sm px-2 py-1'
      },
      lg: {
        container: 'h-12 px-4 py-3 text-lg',
        input: 'text-lg',
        icon: 'w-6 h-6',
        tag: 'text-base px-3 py-1.5'
      }
    };

    return sizes[size] || sizes.md;
  };

  const sizeClasses = getSizeClasses();

  // 渲染选中值
  const renderSelectedValue = () => {
    if (renderValue) {
      return renderValue(multiSelect ? selectedOptions : selectedOptions);
    }

    if (multiSelect) {
      return (
        <div className="flex flex-wrap items-center gap-1">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className={cn(
                'inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded',
                sizeClasses.tag
              )}
            >
              {option.label}
              <button
                type="button"
                className="hover:text-blue-600 dark:hover:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option);
                }}
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
          {!selectedOptions.length && !searchTerm && (
            <span className="text-gray-500 dark:text-gray-400">
              {placeholder}
            </span>
          )}
        </div>
      );
    }

    return (
      <span className={cn('truncate', !selectedOptions && !searchTerm && 'text-gray-500 dark:text-gray-400')}>
        {searchTerm || (selectedOptions ? selectedOptions.label : placeholder)}
      </span>
    );
  };

  // 渲染选项
  const renderOptionItem = (option, index) => {
    const isSelected = multiSelect 
      ? value?.includes(option.value)
      : value === option.value;
    const isHighlighted = index === highlightedIndex;

    if (renderOption) {
      return renderOption(option, { isSelected, isHighlighted });
    }

    return (
      <div
        key={option.value}
        data-highlighted={isHighlighted}
        className={cn(
          'px-3 py-2 cursor-pointer transition-colors',
          'flex items-center justify-between',
          isSelected && 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
          !isSelected && isHighlighted && 'bg-gray-100 dark:bg-gray-700',
          !isSelected && !isHighlighted && 'hover:bg-gray-50 dark:hover:bg-gray-800',
          option.disabled && 'opacity-50 cursor-not-allowed',
          optionClassName
        )}
        onClick={() => !option.disabled && handleSelect(option)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {multiSelect && (
            <div className={cn(
              'w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center',
              isSelected 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 dark:border-gray-600'
            )}>
              {isSelected && <Icon name="Check" size={12} />}
            </div>
          )}
          
          <span className="truncate">{option.label}</span>
          
          {option.isNew && (
            <span className="text-xs text-green-600 dark:text-green-400">新建</span>
          )}
        </div>
        
        {option.description && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {option.description}
          </span>
        )}
      </div>
    );
  };

  const containerClasses = cn(
    'relative',
    containerClassName
  );

  const inputClasses = cn(
    'w-full border rounded-md bg-white dark:bg-gray-800',
    'text-gray-900 dark:text-gray-100',
    'border-gray-300 dark:border-gray-600',
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800',
    'focus:outline-none transition-colors',
    error && 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800',
    disabled && 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed',
    sizeClasses.container,
    className
  );

  const dropdownClasses = cn(
    'absolute z-50 w-full mt-1 bg-white dark:bg-gray-800',
    'border border-gray-200 dark:border-gray-600 rounded-md shadow-lg',
    'max-h-60 overflow-auto',
    dropdownClassName
  );

  return (
    <div ref={comboboxRef} className={containerClasses}>
      <div className={cn(
        'relative flex items-center',
        multiSelect && 'min-h-[40px] h-auto py-1'
      )}>
        {/* 前缀 */}
        {renderPrefix && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {renderPrefix()}
          </div>
        )}
        
        {/* 输入区域 */}
        <div className="flex-1 flex items-center min-w-0">
          {multiSelect ? (
            <div className="flex flex-wrap items-center gap-1 w-full">
              {renderSelectedValue()}
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                disabled={disabled}
                className={cn(
                  'flex-1 min-w-[60px] border-none outline-none bg-transparent',
                  sizeClasses.input,
                  'placeholder-gray-500 dark:placeholder-gray-400'
                )}
                placeholder={selectedOptions.length === 0 ? placeholder : ''}
              />
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm || (selectedOptions ? selectedOptions.label : '')}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              disabled={disabled}
              className={cn(
                'w-full border-none outline-none bg-transparent',
                sizeClasses.input,
                'placeholder-gray-500 dark:placeholder-gray-400'
              )}
              placeholder={placeholder}
            />
          )}
        </div>
        
        {/* 后缀 */}
        <div className="flex items-center gap-1">
          {loading && <Icon name="Loader2" className={cn('animate-spin', sizeClasses.icon)} />}
          
          {clearable && (multiSelect ? value?.length > 0 : value) && !disabled && (
            <button
              type="button"
              className={cn(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'transition-colors',
                sizeClasses.icon
              )}
              onClick={handleClear}
            >
              <Icon name="X" />
            </button>
          )}
          
          <Icon
            name={isOpen ? 'ChevronUp' : 'ChevronDown'}
            className={cn(
              'text-gray-400 transition-transform',
              isOpen && 'rotate-180',
              sizeClasses.icon
            )}
          />
        </div>
      </div>
      
      {/* 错误消息 */}
      {error && errorMessage && (
        <div className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}
      
      {/* 下拉选项 */}
      {isOpen && (
        <div ref={dropdownRef} className={dropdownClasses}>
          {filteredOptions.length === 0 && !canCreateNew ? (
            <div className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm ? noResultsText : noOptionsText}
            </div>
          ) : (
            <div>
              {filteredOptions.map((option, index) => renderOptionItem(option, index))}
              
              {canCreateNew && (
                <div
                  data-highlighted={highlightedIndex === filteredOptions.length}
                  className={cn(
                    'px-3 py-2 cursor-pointer transition-colors',
                    'flex items-center gap-2',
                    highlightedIndex === filteredOptions.length && 'bg-gray-100 dark:bg-gray-700',
                    'hover:bg-gray-50 dark:hover:bg-gray-800',
                    'text-green-600 dark:text-green-400'
                  )}
                  onClick={handleCreateOption}
                >
                  <Icon name="Plus" size={16} />
                  <span>
                    {createOptionText.replace('{value}', searchTerm)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

Combobox.displayName = 'Combobox';

export default Combobox;

// 预设变体
export const SearchableSelect = (props) => (
  <Combobox searchable={true} {...props} />
);

export const CreatableSelect = (props) => (
  <Combobox creatable={true} {...props} />
);

export const MultiSelectCombobox = (props) => (
  <Combobox multiSelect={true} {...props} />
);

export const TagSelect = (props) => (
  <Combobox 
    multiSelect={true} 
    creatable={true}
    placeholder="选择或创建标签..."
    {...props} 
  />
);
