import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

const threePaneLayoutVariants = cva(
  'flex h-full bg-slate-900',
  {
    variants: {
      orientation: {
        horizontal: 'flex-row',
        vertical: 'flex-col',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }
);

const paneVariants = cva(
  'relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-slate-800 border-slate-700',
        file: 'bg-slate-850 border-slate-700',
        terminal: 'bg-black border-slate-700',
        ai: 'bg-slate-800/50 border-slate-700',
      },
      resizable: {
        true: 'resize-able',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      resizable: true,
    },
  }
);

const resizerVariants = cva(
  'absolute bg-slate-600 hover:bg-blue-500 transition-colors cursor-',
  {
    variants: {
      orientation: {
        vertical: 'w-1 h-full cursor-col-resize',
        horizontal: 'h-1 w-full cursor-row-resize',
      },
      position: {
        left: 'left-0 top-0',
        right: 'right-0 top-0',
        top: 'top-0 left-0',
        bottom: 'bottom-0 left-0',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
      position: 'right',
    },
  }
);

export const ThreePaneLayout = forwardRef((
  {
    className,
    orientation = 'horizontal',
    defaultSizes = [30, 40, 30],
    minSizes = [20, 20, 20],
    maxSizes = [60, 60, 60],
    showResizers = true,
    collapsible = true,
    onResize,
    onPaneToggle,
    children,
    ...props
  },
  ref
) => {
  const [sizes, setSizes] = useState(defaultSizes);
  const [collapsedPanes, setCollapsedPanes] = useState([false, false, false]);
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizer, setActiveResizer] = useState(null);
  const containerRef = useRef(null);
  const startPos = useRef(0);
  const startSizes = useRef([]);

  const panes = React.Children.toArray(children);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentPos = orientation === 'horizontal' 
        ? e.clientX - rect.left 
        : e.clientY - rect.top;
      
      const delta = currentPos - startPos.current;
      const containerSize = orientation === 'horizontal' 
        ? rect.width 
        : rect.height;

      const newSizes = [...startSizes.current];
      
      if (activeResizer === 0) {
        // 调整第一个和第二个面板
        const deltaPercent = (delta / containerSize) * 100;
        newSizes[0] = Math.max(minSizes[0], Math.min(maxSizes[0], startSizes.current[0] + deltaPercent));
        newSizes[1] = Math.max(minSizes[1], Math.min(maxSizes[1], startSizes.current[1] - deltaPercent));
      } else if (activeResizer === 1) {
        // 调整第二个和第三个面板
        const deltaPercent = (delta / containerSize) * 100;
        newSizes[1] = Math.max(minSizes[1], Math.min(maxSizes[1], startSizes.current[1] + deltaPercent));
        newSizes[2] = Math.max(minSizes[2], Math.min(maxSizes[2], startSizes.current[2] - deltaPercent));
      }

      setSizes(newSizes);
      onResize?.(newSizes);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveResizer(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, activeResizer, orientation, minSizes, maxSizes, onResize]);

  const handleResizerMouseDown = (e, resizerIndex) => {
    e.preventDefault();
    setIsResizing(true);
    setActiveResizer(resizerIndex);
    startPos.current = orientation === 'horizontal' ? e.clientX : e.clientY;
    startSizes.current = [...sizes];
  };

  const togglePane = (paneIndex) => {
    const newCollapsedPanes = [...collapsedPanes];
    newCollapsedPanes[paneIndex] = !newCollapsedPanes[paneIndex];
    setCollapsedPanes(newCollapsedPanes);
    onPaneToggle?.(paneIndex, newCollapsedPanes[paneIndex]);
  };

  const getPaneStyle = (index) => {
    if (collapsedPanes[index]) {
      return {
        flex: '0 0 0px',
        overflow: 'hidden',
      };
    }

    return {
      flex: `0 0 ${sizes[index]}%`,
      minWidth: `${minSizes[index]}%`,
      maxWidth: `${maxSizes[index]}%`,
    };
  };

  const getPaneVariant = (index) => {
    const variants = ['file', 'terminal', 'ai'];
    return variants[index] || 'default';
  };

  const renderPane = (pane, index) => {
    const isCollapsed = collapsedPanes[index];
    const variant = getPaneVariant(index);
    
    return (
      <div
        key={index}
        className={clsx(
          paneVariants({ variant, resizable: showResizers }),
          !isCollapsed && 'border-r',
          index === 2 && 'border-r-0'
        )}
        style={getPaneStyle(index)}
      >
        {/* 面板头部 */}
        {!isCollapsed && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              {pane.props.icon && (
                <Icon name={pane.props.icon} className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-medium text-slate-300">
                {pane.props.title || `面板 ${index + 1}`}
              </span>
            </div>
            
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => togglePane(index)}
                aria-label={`切换${pane.props.title || '面板'}显示`}
              >
                <Icon name="Minimize2" className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* 面板内容 */}
        <div className="flex-1 overflow-hidden">
          {pane}
        </div>

        {/* 折叠状态下的快速恢复按钮 */}
        {isCollapsed && collapsible && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePane(index)}
              className="flex flex-col items-center space-y-1"
            >
              <Icon name={pane.props.icon || 'Maximize2'} className="w-4 h-4" />
              <span className="text-xs text-slate-400">
                {pane.props.title || `面板 ${index + 1}`}
              </span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderResizer = (index) => {
    if (!showResizers) return null;
    if (collapsedPanes[index] || collapsedPanes[index + 1]) return null;

    return (
      <div
        key={`resizer-${index}`}
        className={clsx(
          resizerVariants({ 
            orientation: orientation === 'horizontal' ? 'vertical' : 'horizontal',
            position: orientation === 'horizontal' ? 'right' : 'bottom'
          }),
          isResizing && activeResizer === index && 'bg-blue-500'
        )}
        onMouseDown={(e) => handleResizerMouseDown(e, index)}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={clsx(threePaneLayoutVariants({ orientation, className }))}
      {...props}
    >
      {/* 第一个面板 */}
      {renderPane(panes[0], 0)}
      
      {/* 第一个调整器 */}
      {renderResizer(0)}
      
      {/* 第二个面板 */}
      {renderPane(panes[1], 1)}
      
      {/* 第二个调整器 */}
      {renderResizer(1)}
      
      {/* 第三个面板 */}
      {renderPane(panes[2], 2)}
    </div>
  );
});

ThreePaneLayout.displayName = 'ThreePaneLayout';

// 面板组件
export const Pane = forwardRef((
  { 
    className,
    title,
    icon,
    children,
    ...props 
  },
  ref
) => {
  return (
    <div
      ref={ref}
      className={clsx('flex flex-col h-full', className)}
      {...props}
    >
      {children}
    </div>
  );
});

Pane.displayName = 'Pane';

// 预定义的面板配置
export const FilePane = (props) => (
  <Pane title="文件管理" icon="Folder" {...props} />
);

export const TerminalPane = (props) => (
  <Pane title="终端" icon="Terminal" {...props} />
);

export const AIPane = (props) => (
  <Pane title="AI 助手" icon="Bot" {...props} />
);

// 使用示例组件
export const DefaultThreePaneLayout = (props) => (
  <ThreePaneLayout {...props}>
    <FilePane>
      {/* 文件管理内容 */}
      <div className="p-4 text-slate-400">
        文件管理面板
      </div>
    </FilePane>
    
    <TerminalPane>
      {/* 终端内容 */}
      <div className="p-4 text-green-400 font-mono">
        <div>$ welcome to terminal</div>
        <div>$ _</div>
      </div>
    </TerminalPane>
    
    <AIPane>
      {/* AI 助手内容 */}
      <div className="p-4 text-slate-400">
        AI 助手面板
      </div>
    </AIPane>
  </ThreePaneLayout>
);
