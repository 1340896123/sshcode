import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';

/**
 * PromptTemplatePicker组件 - 提示词模板选择器组件
 */
export function PromptTemplatePicker({
  templates = [],
  selectedTemplate = '',
  onSelect,
  onEdit,
  onCreate,
  className = '',
  ...props
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg', className)} {...props}>
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Icon name="FileText" size="sm" />
          <span className="text-sm font-medium text-gray-100">提示词模板</span>
          <Button size="xs" variant="ghost" onClick={() => setExpanded(!expanded)}>
            <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size="sm" />
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-3 space-y-3">
          <Input
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={setSearchQuery}
            prefix={<Icon name="Search" size="xs" />}
            size="sm"
          />
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className={clsx(
                  'p-2 rounded cursor-pointer text-sm',
                  'hover:bg-gray-700 transition-colors',
                  selectedTemplate === template.id && 'bg-blue-600/20 border border-blue-500'
                )}
                onClick={() => onSelect?.(template)}
              >
                <div className="font-medium text-gray-100">{template.name}</div>
                <div className="text-xs text-gray-500">{template.description}</div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button size="xs" onClick={onCreate}>
              <Icon name="Plus" size="xs" />
              新建
            </Button>
            {selectedTemplate && (
              <Button size="xs" variant="outline" onClick={onEdit}>
                <Icon name="Edit" size="xs" />
                编辑
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PromptTemplatePicker;
