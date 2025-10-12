import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Switch } from '../primitives/Switch';

/**
 * SecurityPanel组件 - 安全与隐私设置组件
 */
export function SecurityPanel({
  settings = {},
  onSettingsChange,
  className = '',
  ...props
}) {
  const [localSettings, setLocalSettings] = useState({
    autoExecuteCommands: false,
    requireConfirmation: true,
    dangerousCommands: ['rm -rf', 'dd if=', 'mkfs', 'format'],
    readOnlyMode: false,
    allowFileUpload: true,
    allowFileDownload: true,
    maxFileSize: 10,
    allowedFileTypes: ['.txt', '.js', '.json', '.md'],
    ...settings
  });

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleDangerousCommandChange = (index, value) => {
    const newCommands = [...localSettings.dangerousCommands];
    newCommands[index] = value;
    handleSettingChange('dangerousCommands', newCommands);
  };

  const addDangerousCommand = () => {
    handleSettingChange('dangerousCommands', [...localSettings.dangerousCommands, '']);
  };

  const removeDangerousCommand = (index) => {
    const newCommands = localSettings.dangerousCommands.filter((_, i) => i !== index);
    handleSettingChange('dangerousCommands', newCommands);
  };

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg p-4', className)} {...props}>
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Shield" size="sm" />
        <h3 className="text-sm font-medium text-gray-100">安全与隐私</h3>
      </div>

      <div className="space-y-4">
        {/* AI执行设置 */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-3">AI执行控制</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-100">自动执行命令</div>
                <div className="text-xs text-gray-500">允许AI自动执行建议的命令</div>
              </div>
              <Switch
                checked={localSettings.autoExecuteCommands}
                onChange={(checked) => handleSettingChange('autoExecuteCommands', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-100">需要确认</div>
                <div className="text-xs text-gray-500">执行危险命令前需要用户确认</div>
              </div>
              <Switch
                checked={localSettings.requireConfirmation}
                onChange={(checked) => handleSettingChange('requireConfirmation', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-100">只读模式</div>
                <div className="text-xs text-gray-500">禁止修改文件和系统设置</div>
              </div>
              <Switch
                checked={localSettings.readOnlyMode}
                onChange={(checked) => handleSettingChange('readOnlyMode', checked)}
              />
            </div>
          </div>
        </div>

        {/* 危险命令列表 */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-3">危险命令列表</h4>
          <div className="space-y-2">
            {localSettings.dangerousCommands.map((command, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => handleDangerousCommandChange(index, e.target.value)}
                  placeholder="输入危险命令模式"
                  className="flex-1 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                />
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => removeDangerousCommand(index)}
                >
                  <Icon name="X" size="xs" />
                </Button>
              </div>
            ))}
            <Button size="xs" variant="outline" onClick={addDangerousCommand}>
              <Icon name="Plus" size="xs" />
              添加命令
            </Button>
          </div>
        </div>

        {/* 文件传输设置 */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-3">文件传输</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-100">允许上传</div>
                <div className="text-xs text-gray-500">允许上传文件到服务器</div>
              </div>
              <Switch
                checked={localSettings.allowFileUpload}
                onChange={(checked) => handleSettingChange('allowFileUpload', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-100">允许下载</div>
                <div className="text-xs text-gray-500">允许从服务器下载文件</div>
              </div>
              <Switch
                checked={localSettings.allowFileDownload}
                onChange={(checked) => handleSettingChange('allowFileDownload', checked)}
              />
            </div>

            <div>
              <div className="text-sm text-gray-100 mb-2">最大文件大小 (MB)</div>
              <input
                type="number"
                value={localSettings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecurityPanel;
