import React, { forwardRef, useEffect, useMemo, useState, useCallback } from 'react';
import { cn } from '../utils/clsx';
import ResizableSplit from './ResizableSplit';

/**
 * ThreePaneSplit —— 以 ResizableSplit 为核心的三栏包装
 * - PointerEvents + rAF 由 ResizableSplit 统一处理（稳定）
 * - 百分比尺寸直接写到元素 style，避免 setState 抖动
 * - 本地存储：仅在 onResizeEnd 时保存
 */
const ThreePaneSplit = forwardRef(({
  direction = 'horizontal',
  defaultSizes = [30, 40, 30],
  minSizes = [15, 25, 15],
  maxSizes = [50, 60, 50],

  left,
  center,
  right,

  // 透传给 ResizableSplit 的能力
  resizable = true,
  collapsible = true,
  showGutter = true,
  gutterSize = 6,
  gutterStyle = 'both',

  storageKey = 'three-pane-sizes',
  enableStorage = true,

  className = '',
  leftClassName = '',
  centerClassName = '',
  rightClassName = '',
  gutterClassName = '',

  onResize,
  onResizeStart,
  onResizeEnd,
  onPaneCollapse, // （保留签名，若有自定义需求可在外层处理）
  onPaneExpand,   // （保留签名）
  ...props
}, ref) => {
  // 仅用于“设置初始默认值”，实际拖动由 ResizableSplit 内部维护
  const [initialSizes, setInitialSizes] = useState(defaultSizes);

  // 启动时优先加载本地存储的值
  useEffect(() => {
    if (!enableStorage || !storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) && parsed.length === 3 &&
          parsed.every(n => typeof n === 'number')
        ) {
          setInitialSizes(parsed);
        }
      }
    } catch (err) {
      console.warn('ThreePaneSplit: load sizes failed ->', err);
    }
    // 只在初次挂载读取一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panes = useMemo(() => ([
    <div key="left" className={cn('h-full w-full overflow-hidden', leftClassName)}>{left}</div>,
    <div key="center" className={cn('h-full w-full overflow-hidden', centerClassName)}>{center}</div>,
    <div key="right" className={cn('h-full w-full overflow-hidden', rightClassName)}>{right}</div>,
  ]), [left, center, right, leftClassName, centerClassName, rightClassName]);

  const handleResize = useCallback((sizes, gutterIdx) => {
    onResize?.(sizes, gutterIdx);
  }, [onResize]);

  const handleResizeStart = useCallback((gutterIdx, sizes) => {
    onResizeStart?.(gutterIdx, sizes);
  }, [onResizeStart]);

  const handleResizeEnd = useCallback((sizes) => {
    // 落盘
    if (enableStorage && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(sizes));
      } catch (err) {
        console.warn('ThreePaneSplit: save sizes failed ->', err);
      }
    }
    onResizeEnd?.(sizes);
  }, [enableStorage, storageKey, onResizeEnd]);

  return (
    <ResizableSplit
      ref={ref}
      direction={direction}
      defaultSizes={initialSizes}
      minSizes={minSizes}
      maxSizes={maxSizes}
      resizable={resizable}
      collapsible={collapsible}
      showGutter={showGutter}
      gutterSize={gutterSize}
      gutterStyle={gutterStyle}
      className={cn('w-full h-full flex', className)}
      gutterClassName={gutterClassName}
      onResize={handleResize}
      onResizeStart={handleResizeStart}
      onResizeEnd={handleResizeEnd}
      {...props}
    >
      {panes}
    </ResizableSplit>
  );
});

ThreePaneSplit.displayName = 'ThreePaneSplit';

export default ThreePaneSplit;
