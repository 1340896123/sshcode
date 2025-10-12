import React, { forwardRef } from 'react';
import ThreePaneSplit from './ThreePaneSplit';

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
      gutterStyle="both"
      {...props}
    />
  );
});

FileExplorerSplit.displayName = 'FileExplorerSplit';

export default FileExplorerSplit;
