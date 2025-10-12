import React, { forwardRef } from 'react';
import SplitPane from './SplitPane';

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

export default TerminalSplit;
