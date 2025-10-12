import React, { forwardRef } from 'react';
import ResizableSplit from './ResizableSplit';

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

export default SplitPane;
