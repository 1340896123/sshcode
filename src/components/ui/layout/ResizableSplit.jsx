import React, { forwardRef, useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../utils/clsx';

/**
 * ResizableSplit组件 - 可调整大小的分栏组件
 */
const ResizableSplit = forwardRef(({
  // 布局配置
  direction = 'horizontal', // 'horizontal' | 'vertical'
  defaultSizes = [50, 50], // 默认百分比
  minSizes = [10, 10], // 最小百分比
  maxSizes = [90, 90], // 最大百分比
  
  // 功能配置
  resizable = true,
  collapsible = false,
  showGutter = true,
  gutterSize = 8,
  gutterStyle = 'line', // 'line' | 'handle' | 'both'
  
  // 样式配置
  className = '',
  paneClassName = '',
  gutterClassName = '',
  
  // 子组件
  children,
  
  // 事件
  onResize,
  onResizeStart,
  onResizeEnd,
  
  ...props
}, ref) => {
  const [sizes, setSizes] = useState(defaultSizes);
  const [isResizing, setIsResizing] = useState(false);
  const [activeGutter, setActiveGutter] = useState(null);
  
  const containerRef = useRef(null);
  const gutterRefs = useRef([]);
  const startPos = useRef({ x: 0, y: 0 });
  const startSizes = useRef([]);

  // 获取子组件
  const panes = React.Children.toArray(children);

  // 处理鼠标按下
  const handleMouseDown = useCallback((e, gutterIndex) => {
    if (!resizable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setActiveGutter(gutterIndex);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSizes.current = [...sizes];
    
    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 触发开始事件
    if (onResizeStart) {
      onResizeStart(gutterIndex, sizes);
    }
    
    // 添加全局样式
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [resizable, direction, sizes, onResizeStart]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e) => {
    if (!isResizing || activeGutter === null) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const totalSize = direction === 'horizontal' ? rect.width : rect.height;
    
    // 计算移动距离
    const delta = direction === 'horizontal' 
      ? e.clientX - startPos.current.x 
      : e.clientY - startPos.current.y;
    
    // 计算新的尺寸
    const newSizes = [...startSizes.current];
    const deltaPercent = (delta / totalSize) * 100;
    
    // 调整相邻面板的尺寸
    newSizes[activeGutter] = Math.max(
      minSizes[activeGutter],
      Math.min(maxSizes[activeGutter], startSizes.current[activeGutter] + deltaPercent)
    );
    
    newSizes[activeGutter + 1] = Math.max(
      minSizes[activeGutter + 1],
      Math.min(maxSizes[activeGutter + 1], startSizes.current[activeGutter + 1] - deltaPercent)
    );
    
    // 确保总和为100%
    const total = newSizes.reduce((sum, size) => sum + size, 0);
    if (Math.abs(total - 100) > 0.1) {
      const diff = 100 - total;
      newSizes[activeGutter] += diff;
    }
    
    setSizes(newSizes);
    
    // 触发调整事件
    if (onResize) {
      onResize(newSizes, activeGutter);
    }
  }, [isResizing, activeGutter, direction, minSizes, maxSizes, onResize]);

  // 处理鼠标释放
  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;
    
    setIsResizing(false);
    setActiveGutter(null);
    
    // 移除全局事件监听
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // 恢复全局样式
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // 触发结束事件
    if (onResizeEnd) {
      onResizeEnd(sizes);
    }
  }, [isResizing, sizes, onResizeEnd, handleMouseMove]);

  // 处理双击折叠
  const handleDoubleClick = useCallback((gutterIndex) => {
    if (!collapsible) return;
    
    const newSizes = [...sizes];
    const leftSize = newSizes[gutterIndex];
    const rightSize = newSizes[gutterIndex + 1];
    
    // 如果左侧面板很小，展开它；否则折叠它
    if (leftSize < 20) {
      newSizes[gutterIndex] = 50;
      newSizes[gutterIndex + 1] = 50 - (newSizes.length - 2) * 0.1;
    } else {
      newSizes[gutterIndex] = 10;
      newSizes[gutterIndex + 1] = 90 - (newSizes.length - 2) * 0.1;
    }
    
    setSizes(newSizes);
  }, [collapsible, sizes]);

  // 清理事件监听
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  // 获取面板样式
  const getPaneStyle = (index) => {
    const style = {};
    
    if (direction === 'horizontal') {
      style.width = `${sizes[index]}%`;
      style.height = '100%';
    } else {
      style.width = '100%';
      style.height = `${sizes[index]}%`;
    }
    
    return style;
  };

  // 获取分隔条样式
  const getGutterClasses = (index) => {
    const baseClasses = cn(
      'flex-shrink-0',
      'transition-colors duration-200',
      'hover:bg-blue-100 dark:hover:bg-blue-900',
      'relative z-10',
      gutterClassName
    );

    const directionClasses = direction === 'horizontal'
      ? cn(
          'w-px cursor-col-resize',
          showGutter && gutterStyle !== 'handle' && 'bg-gray-300 dark:bg-gray-600'
        )
      : cn(
          'h-px cursor-row-resize',
          showGutter && gutterStyle !== 'handle' && 'bg-gray-300 dark:bg-gray-600'
        );

    const sizeClasses = direction === 'horizontal'
      ? `w-${gutterSize} hover:w-${Math.max(gutterSize, 4)}`
      : `h-${gutterSize} hover:h-${Math.max(gutterSize, 4)}`;

    const activeClasses = activeGutter === index && isResizing
      ? 'bg-blue-500 dark:bg-blue-400'
      : '';

    return cn(baseClasses, directionClasses, activeClasses);
  };

  // 渲染分隔条内容
  const renderGutterContent = (index) => {
    if (!showGutter || gutterStyle === 'line') return null;

    return (
      <div className={cn(
        'absolute inset-0 flex items-center justify-center',
        direction === 'horizontal' ? 'flex-col' : 'flex-row'
      )}>
        {gutterStyle === 'handle' && (
          <div className={cn(
            'bg-gray-400 dark:bg-gray-500 rounded-full',
            direction === 'horizontal' ? 'w-1 h-4' : 'w-4 h-1'
          )} />
        )}
        
        {gutterStyle === 'both' && (
          <div className={cn(
            'bg-gray-400 dark:bg-gray-500 rounded-full',
            direction === 'horizontal' ? 'w-1 h-4' : 'w-4 h-1'
          )} />
        )}
      </div>
    );
  };

  // 渲染面板和分隔条
  const renderContent = () => {
    const elements = [];
    
    panes.forEach((pane, index) => {
      // 添加面板
      elements.push(
        <div
          key={`pane-${index}`}
          className={cn(
            'flex-shrink-0 overflow-hidden',
            paneClassName
          )}
          style={getPaneStyle(index)}
        >
          {pane}
        </div>
      );
      
      // 添加分隔条（除了最后一个面板）
      if (index < panes.length - 1) {
        elements.push(
          <div
            key={`gutter-${index}`}
            ref={el => gutterRefs.current[index] = el}
            className={getGutterClasses(index)}
            style={{
              [direction === 'horizontal' ? 'width' : 'height']: `${gutterSize}px`,
              [direction === 'horizontal' ? 'height' : 'width']: '100%'
            }}
            onMouseDown={(e) => handleMouseDown(e, index)}
            onDoubleClick={() => handleDoubleClick(index)}
          >
            {renderGutterContent(index)}
          </div>
        );
      }
    });
    
    return elements;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex w-full h-full',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
      {...props}
    >
      {renderContent()}
    </div>
  );
});

ResizableSplit.displayName = 'ResizableSplit';

/**
 * SplitPane组件 - 简化的双面板分栏
 */
export const SplitPane = forwardRef(({
  direction = 'horizontal',
  defaultSplit = 50,
  minSize = 10,
  maxSize = 90,
  left,
  right,
  className = '',
  onResize,
  ...props
}, ref) => {
  return (
    <ResizableSplit
      ref={ref}
      direction={direction}
      defaultSizes={[defaultSplit, 100 - defaultSplit]}
      minSizes={[minSize, 100 - maxSize]}
      maxSizes={[maxSize, 100 - minSize]}
      className={className}
      onResize={onResize}
      {...props}
    >
      {left}
      {right}
    </ResizableSplit>
  );
});

SplitPane.displayName = 'SplitPane';

/**
 * ThreePaneSplit组件 - 三面板分栏
 */
export const ThreePaneSplit = forwardRef(({
  direction = 'horizontal',
  defaultSizes = [25, 50, 25],
  minSizes = [10, 20, 10],
  maxSizes = [40, 60, 40],
  left,
  center,
  right,
  className = '',
  onResize,
  ...props
}, ref) => {
  return (
    <ResizableSplit
      ref={ref}
      direction={direction}
      defaultSizes={defaultSizes}
      minSizes={minSizes}
      maxSizes={maxSizes}
      className={className}
      onResize={onResize}
      {...props}
    >
      {left}
      {center}
      {right}
    </ResizableSplit>
  );
});

ThreePaneSplit.displayName = 'ThreePaneSplit';

/**
 * FileExplorerSplit组件 - 文件管理器专用分栏
 */
export const FileExplorerSplit = forwardRef(({
  leftPanel,
  centerPanel,
  rightPanel,
  defaultSizes = [20, 50, 30],
  onResize,
  className = '',
  ...props
}, ref) => {
  return (
    <ThreePaneSplit
      ref={ref}
      direction="horizontal"
      defaultSizes={defaultSizes}
      minSizes={[15, 30, 15]}
      maxSizes={[30, 70, 50]}
      left={leftPanel}
      center={centerPanel}
      right={rightPanel}
      onResize={onResize}
      className={className}
      gutterSize={6}
      gutterStyle="line"
      {...props}
    />
  );
});

FileExplorerSplit.displayName = 'FileExplorerSplit';

/**
 * TerminalSplit组件 - 终端专用分栏
 */
export const TerminalSplit = forwardRef(({
  main,
  sidebar,
  defaultSplit = 70,
  onResize,
  className = '',
  ...props
}, ref) => {
  return (
    <SplitPane
      ref={ref}
      direction="horizontal"
      defaultSplit={defaultSplit}
      minSize={50}
      maxSize={85}
      left={main}
      right={sidebar}
      onResize={onResize}
      className={className}
      gutterSize={4}
      gutterStyle="both"
      collapsible={true}
      {...props}
    />
  );
});

TerminalSplit.displayName = 'TerminalSplit';

export default ResizableSplit;
