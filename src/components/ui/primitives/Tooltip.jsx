import React, { useState, useRef, useEffect } from 'react';

/**
 * 气泡提示组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 触发提示的子元素
 * @param {string} props.content - 提示内容
 * @param {string} props.position - 提示位置: 'top' | 'bottom' | 'left' | 'right'
 * @param {string} props.variant - 提示变体: 'dark' | 'light'
 * @param {boolean} props.disabled - 是否禁用提示
 * @param {number} props.delay - 显示延迟时间（毫秒）
 * @param {string} props.className - 额外的CSS类名
 */
function Tooltip({
  children,
  content,
  position = 'top',
  variant = 'dark',
  disabled = false,
  delay = 300,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + scrollX + 8;
        break;
    }

    // 确保提示框不会超出视窗边界
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 0) left = 8;
    if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width - 8;
    if (top < 0) top = 8;
    if (top + tooltipRect.height > viewportHeight) top = viewportHeight - tooltipRect.height - 8;

    setTooltipPosition({ top, left });
  };

  const showTooltip = () => {
    if (disabled || !content) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // 在下一帧计算位置，确保tooltip已经渲染
      requestAnimationFrame(calculatePosition);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'dark':
        return 'bg-[#1e1e1e] text-[#d4d4d4] border border-[#3e3e42]';
      case 'light':
        return 'bg-[#ffffff] text-[#1e1e1e] border border-[#d4d4d4]';
      default:
        return 'bg-[#1e1e1e] text-[#d4d4d4] border border-[#3e3e42]';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full';
      case 'bottom':
        return 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full';
      case 'left':
        return 'right-0 top-1/2 transform -translate-y-1/2 translate-x-full';
      case 'right':
        return 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-full';
      default:
        return 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>

      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-2 py-1 text-xs rounded shadow-lg pointer-events-none transition-opacity duration-200 ${getVariantClasses()} ${className}`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            opacity: isVisible ? 1 : 0
          }}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
            style={{
              borderColor: variant === 'dark' 
                ? 'transparent transparent #1e1e1e transparent'
                : 'transparent transparent #ffffff transparent',
              [position === 'top' ? 'borderTopColor' : 
               position === 'bottom' ? 'borderBottomColor' :
               position === 'left' ? 'borderLeftColor' : 'borderRightColor']: variant === 'dark' 
                ? '#1e1e1e' : '#ffffff'
            }}
          />
        </div>
      )}
    </div>
  );
}

// 命名导出和默认导出
export { Tooltip };
export default Tooltip;
