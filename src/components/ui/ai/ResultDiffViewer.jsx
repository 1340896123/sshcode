import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';

/**
 * ResultDiffViewer组件 - 结果差异查看器组件
 */
export function ResultDiffViewer({
  before = '',
  after = '',
  onConfirm,
  onCancel,
  className = '',
  ...props
}) {
  const [viewMode, setViewMode] = useState('split'); // split|unified

  return (
    <div className={clsx('bg-gray-900 border border-gray-700 rounded-lg', className)} {...props}>
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Icon name="GitCompare" size="sm" />
          <span className="text-sm font-medium text-gray-100">更改预览</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant={viewMode === 'split' ? 'solid' : 'ghost'} onClick={() => setViewMode('split')}>
            分割
          </Button>
          <Button size="xs" variant={viewMode === 'unified' ? 'solid' : 'ghost'} onClick={() => setViewMode('unified')}>
            统一
          </Button>
        </div>
      </div>
      
      <div className={clsx('p-4', viewMode === 'split' ? 'grid grid-cols-2 gap-4' : '')}>
        {viewMode === 'split' ? (
          <>
            <div>
              <div className="text-xs text-gray-500 mb-2">更改前</div>
              <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {before || '(空)'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-2">更改后</div>
              <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {after || '(空)'}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 font-mono whitespace-pre-wrap">
            {/* 简单的差异显示 */}
            {after}
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 p-3 border-t border-gray-700">
        <Button size="sm" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" onClick={onConfirm}>
          确认更改
        </Button>
      </div>
    </div>
  );
}

export default ResultDiffViewer;
