import React, { forwardRef, useRef, useLayoutEffect, useMemo } from 'react';
import { cn } from '../utils/clsx';

/** ResizableSplit (PointerEvents + rAF + stable refs) */
const ResizableSplit = forwardRef(({
  direction = 'horizontal',
  defaultSizes = [50, 50],
  minSizes = [10, 10],
  maxSizes = [90, 90],
  resizable = true,
  collapsible = false,
  showGutter = true,
  gutterSize = 8,
  gutterStyle = 'line',
  className = '',
  paneClassName = '',
  gutterClassName = '',
  children,
  onResize,
  onResizeStart,
  onResizeEnd,
  ...props
}, ref) => {
  // --- refs & state mirrors ---
  const containerRef = useRef(null);
  const sizesRef = useRef([...defaultSizes]);     // 仅内部维护；外部如需受控可扩展
  const startSizesRef = useRef([]);
  const startPosRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef({ width: 0, height: 0 });
  const activeGutterRef = useRef(null);
  const isResizingRef = useRef(false);
  const rafRef = useRef(0);

  const panes = useMemo(() => React.Children.toArray(children), [children]);
  const isHoriz = direction === 'horizontal';

  // --- helpers ---
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const applySizes = (nextSizes, fromGutterIdx) => {
    sizesRef.current = nextSizes;
    if (typeof onResize === 'function') onResize(nextSizes, fromGutterIdx);
    // 直接操作 style，避免每步 setState 造成重排；渲染层依赖百分比即可
    const el = containerRef.current;
    if (!el) return;
    // children: pane,gutter,pane,gutter...
    let paneIndex = 0;
    for (let i = 0; i < el.children.length; i++) {
      const node = el.children[i];
      const isGutter = node.dataset.gutter === '1';
      if (!isGutter) {
        if (isHoriz) {
          node.style.width = `${nextSizes[paneIndex]}%`;
          node.style.height = '100%';
        } else {
          node.style.height = `${nextSizes[paneIndex]}%`;
          node.style.width = '100%';
        }
        paneIndex++;
      }
    }
  };

  const startResize = (e, gutterIndex) => {
    if (!resizable) return;
    // Pointer capture 让事件不丢
    e.currentTarget.setPointerCapture?.(e.pointerId);
    isResizingRef.current = true;
    activeGutterRef.current = gutterIndex;

    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizesRef.current = [...sizesRef.current];

    const rect = containerRef.current?.getBoundingClientRect();
    rectRef.current = { width: rect?.width || 1, height: rect?.height || 1 };

    document.body.classList.add('rsz--resizing');
    if (typeof onResizeStart === 'function') onResizeStart(gutterIndex, sizesRef.current);
  };

  const endResize = () => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    activeGutterRef.current = null;
    document.body.classList.remove('rsz--resizing');
    cancelAnimationFrame(rafRef.current);
    if (typeof onResizeEnd === 'function') onResizeEnd(sizesRef.current);
  };

  const scheduleMove = (clientX, clientY) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!isResizingRef.current) return;
      const idx = activeGutterRef.current;
      if (idx == null) return;

      const total = isHoriz ? rectRef.current.width : rectRef.current.height;
      const deltaPx = isHoriz
        ? (clientX - startPosRef.current.x)
        : (clientY - startPosRef.current.y);
      const deltaPct = (deltaPx / (total || 1)) * 100;

      const next = [...startSizesRef.current];
      // 左(上)面板
      const a0 = clamp(
        startSizesRef.current[idx] + deltaPct,
        minSizes[idx],
        maxSizes[idx]
      );
      // 右(下)面板镜像
      const a1 = clamp(
        startSizesRef.current[idx + 1] - deltaPct,
        minSizes[idx + 1],
        maxSizes[idx + 1]
      );

      // 使用镜像分配，保持两块之和稳定，避免总和回补抖动
      const sumPair = a0 + a1;
      const basePair = startSizesRef.current[idx] + startSizesRef.current[idx + 1];
      const scale = basePair > 0 ? (basePair / sumPair) : 1;

      next[idx] = a0 * scale;
      next[idx + 1] = a1 * scale;

      applySizes(next, idx);
    });
  };

  // 全局指针移动/结束（绑定在容器上更稳，也可兜底绑定 window）
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerMove = (e) => {
      if (!isResizingRef.current) return;
      scheduleMove(e.clientX, e.clientY);
    };

    const onPointerUp = () => endResize();
    const onPointerCancel = () => endResize();

    el.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      el.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      document.body.classList.remove('rsz--resizing');
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 初始应用默认尺寸（避免首帧闪烁）
  useLayoutEffect(() => {
    applySizes([...defaultSizes], null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHoriz, gutterSize, panes.length]);

  const gutterBase =
    'relative z-10 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
    (isHoriz ? 'cursor-col-resize' : 'cursor-row-resize');

  const renderGutter = (i) => (
    <div
      key={`gutter-${i}`}
      role="separator"
      aria-orientation={isHoriz ? 'vertical' : 'horizontal'}
      tabIndex={0}
      data-gutter="1"
      className={cn(
        gutterBase,
        'transition-[background,border-color] duration-150',
        gutterClassName,
        showGutter && 'before:absolute before:inset-0 before:pointer-events-none',
      )}
      style={{
        [isHoriz ? 'width' : 'height']: `${gutterSize}px`,
        [isHoriz ? 'height' : 'width']: '100%',
        touchAction: 'none',          // 关键：禁用浏览器手势滚动
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      onPointerDown={(e) => startResize(e, i)}
      onDoubleClick={() => {
        if (!collapsible) return;
        const next = [...sizesRef.current];
        const left = next[i], right = next[i + 1];
        // 简洁折叠/展开策略
        if (left < 15) { next[i] = 30; next[i + 1] = left + right - 30; }
        else { next[i] = 10; next[i + 1] = left + right - 10; }
        applySizes(next, i);
      }}
      onKeyDown={(e) => {
        // 键盘微调，无障碍
        if (!resizable) return;
        const step = (e.shiftKey ? 5 : 1) * (isHoriz ? 1 : 1);
        const next = [...sizesRef.current];
        if (isHoriz ? (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
          : (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          const dir = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
          const a0 = clamp(next[i] + dir * step, minSizes[i], maxSizes[i]);
          const a1 = clamp(next[i + 1] - dir * step, minSizes[i + 1], maxSizes[i + 1]);
          const sumPair = a0 + a1;
          const basePair = next[i] + next[i + 1];
          const scale = basePair > 0 ? (basePair / sumPair) : 1;
          next[i] = a0 * scale; next[i + 1] = a1 * scale;
          applySizes(next, i);
          e.preventDefault();
        }
      }}
    >
      {/* 视觉把手 */}
      {showGutter && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            isHoriz ? 'flex-col' : 'flex-row'
          )}
        >
          <div className={cn(
            'rounded-full opacity-70',
            isHoriz ? 'w-1 h-4' : 'w-4 h-1',
          )} />
        </div>
      )}
    </div>
  );

  const renderPane = (child, i) => (
    <div
      key={`pane-${i}`}
      className={cn('overflow-hidden', paneClassName)}
      style={{
        [isHoriz ? 'width' : 'height']: `${sizesRef.current[i]}%`,
        [isHoriz ? 'height' : 'width']: '100%'
      }}
    >
      {child}
    </div>
  );

  const content = [];
  panes.forEach((p, i) => {
    content.push(renderPane(p, i));
    if (i < panes.length - 1) content.push(renderGutter(i));
  });

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        'flex w-full h-full',
        isHoriz ? 'flex-row' : 'flex-col',
        className
      )}
      {...props}
    >
      {content}
    </div>
  );
});

ResizableSplit.displayName = 'ResizableSplit';
export default ResizableSplit;
