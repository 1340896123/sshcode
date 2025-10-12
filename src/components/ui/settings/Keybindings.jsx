import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';

/**
 * Keybindings组件 - 键位设置组件
 */
export function Keybindings({
  keybindings = [],
  onKeybindingChange,
  onReset,
  className = '',
  ...props
}) {
  const [editingKey, setEditingKey] = useState(null);
  const [tempKey, setTempKey] = useState('');

  const defaultKeybindings = [
    { id: 'new_session', name: '新建会话', category: '会话', default: 'Ctrl+N' },
    { id: 'close_session', name: '关闭会话', category: '会话', default: 'Ctrl+W' },
    { id: 'switch_session', name: '切换会话', category: '会话', default: 'Ctrl+Tab' },
    { id: 'send_message', name: '发送消息', category: '聊天', default: 'Enter' },
    { id: 'multiline_input', name: '多行输入', category: '聊天', default: 'Shift+Enter' },
    { id: 'clear_terminal', name: '清屏', category: '终端', default: 'Ctrl+L' },
    { id: 'copy', name: '复制', category: '通用', default: 'Ctrl+C' },
    { id: 'paste', name: '粘贴', category: '通用', default: 'Ctrl+V' },
  ];

  const handleEditKey = (keybinding) => {
    setEditingKey(keybinding.id);
    setTempKey(keybinding.key || keybinding.default);
  };

  const handleSaveKey = () => {
    if (editingKey && tempKey) {
      onKeybindingChange?.(editingKey, tempKey);
    }
    setEditingKey(null);
    setTempKey('');
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setTempKey('');
  };

  const handleKeyDown = (e) => {
    e.preventDefault();
    
    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Cmd');
    
    if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    
    setTempKey(keys.join('+'));
  };

  const categories = [...new Set(defaultKeybindings.map(k => k.category))];

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg p-4', className)} {...props}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon name="Keyboard" size="sm" />
          <h3 className="text-sm font-medium text-gray-100">快捷键设置</h3>
        </div>
        <Button size="xs" variant="outline" onClick={onReset}>
          重置默认
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map(category => (
          <div key={category}>
            <h4 className="text-xs font-medium text-gray-400 mb-2">{category}</h4>
            <div className="space-y-2">
              {defaultKeybindings
                .filter(k => k.category === category)
                .map(keybinding => {
                  const currentKey = keybindings.find(k => k.id === keybinding.id)?.key || keybinding.default;
                  const isEditing = editingKey === keybinding.id;

                  return (
                    <div key={keybinding.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-700">
                      <span className="text-sm text-gray-300">{keybinding.name}</span>
                      
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={tempKey}
                            onChange={setTempKey}
                            onKeyDown={handleKeyDown}
                            placeholder="按下快捷键"
                            size="sm"
                            className="w-32"
                          />
                          <Button size="xs" onClick={handleSaveKey}>保存</Button>
                          <Button size="xs" variant="outline" onClick={handleCancelEdit}>取消</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-900 rounded text-xs text-gray-300">
                            {currentKey}
                          </code>
                          <Button size="xs" variant="ghost" onClick={() => handleEditKey(keybinding)}>
                            <Icon name="Edit" size="xs" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Keybindings;
