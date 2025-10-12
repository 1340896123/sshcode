import React, { useState } from 'react';
import { clsx } from '../utils/clsx';
import { Icon } from '../primitives/Icon';
import { Button } from '../primitives/Button';
import { Switch } from '../primitives/Switch';
import { Input } from '../primitives/Input';
import { Select } from '../primitives/Select';

/**
 * ProxySettings组件 - 代理与网络设置组件
 */
export function ProxySettings({
  settings = {},
  onSettingsChange,
  onTestConnection,
  className = '',
  ...props
}) {
  const [localSettings, setLocalSettings] = useState({
    enabled: false,
    type: 'http',
    host: '',
    port: 8080,
    username: '',
    password: '',
    timeout: 30,
    retryAttempts: 3,
    bypassList: ['localhost', '127.0.0.1'],
    ...settings
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // 模拟测试连接
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3; // 70% 成功率
      
      setTestResult({
        success,
        message: success ? '代理连接成功' : '代理连接失败，请检查设置',
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '连接测试出错',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setTesting(false);
    }
  };

  const addBypassItem = () => {
    handleSettingChange('bypassList', [...localSettings.bypassList, '']);
  };

  const removeBypassItem = (index) => {
    const newList = localSettings.bypassList.filter((_, i) => i !== index);
    handleSettingChange('bypassList', newList);
  };

  const updateBypassItem = (index, value) => {
    const newList = [...localSettings.bypassList];
    newList[index] = value;
    handleSettingChange('bypassList', newList);
  };

  const proxyTypes = [
    { value: 'http', label: 'HTTP' },
    { value: 'https', label: 'HTTPS' },
    { value: 'socks4', label: 'SOCKS4' },
    { value: 'socks5', label: 'SOCKS5' }
  ];

  return (
    <div className={clsx('bg-gray-800 border border-gray-700 rounded-lg p-4', className)} {...props}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon name="Globe" size="sm" />
          <h3 className="text-sm font-medium text-gray-100">代理与网络</h3>
        </div>
        <div className="flex gap-2">
          <Button size="xs" variant="outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? '测试中...' : '测试连接'}
          </Button>
        </div>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div className={clsx(
          'p-2 rounded text-xs mb-4',
          testResult.success ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        )}>
          {testResult.message} ({testResult.timestamp})
        </div>
      )}

      <div className="space-y-4">
        {/* 代理开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-100">启用代理</div>
            <div className="text-xs text-gray-500">通过代理服务器连接SSH</div>
          </div>
          <Switch
            checked={localSettings.enabled}
            onChange={(checked) => handleSettingChange('enabled', checked)}
          />
        </div>

        {localSettings.enabled && (
          <>
            {/* 代理类型 */}
            <div>
              <label className="block text-sm text-gray-100 mb-2">代理类型</label>
              <Select
                value={localSettings.type}
                onChange={(value) => handleSettingChange('type', value)}
                options={proxyTypes}
                size="sm"
              />
            </div>

            {/* 代理服务器 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-100 mb-2">主机地址</label>
                <Input
                  value={localSettings.host}
                  onChange={(value) => handleSettingChange('host', value)}
                  placeholder="proxy.example.com"
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-100 mb-2">端口</label>
                <Input
                  type="number"
                  value={localSettings.port}
                  onChange={(value) => handleSettingChange('port', parseInt(value) || 0)}
                  placeholder="8080"
                  size="sm"
                />
              </div>
            </div>

            {/* 认证信息 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={!!localSettings.username}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      handleSettingChange('username', '');
                      handleSettingChange('password', '');
                    }
                  }}
                  className="rounded border-gray-600 bg-gray-900 text-blue-600"
                />
                <label className="text-sm text-gray-100">使用认证</label>
              </div>
              
              {localSettings.username && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={localSettings.username}
                    onChange={(value) => handleSettingChange('username', value)}
                    placeholder="用户名"
                    size="sm"
                  />
                  <Input
                    type="password"
                    value={localSettings.password}
                    onChange={(value) => handleSettingChange('password', value)}
                    placeholder="密码"
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* 连接设置 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-100 mb-2">超时时间 (秒)</label>
                <Input
                  type="number"
                  value={localSettings.timeout}
                  onChange={(value) => handleSettingChange('timeout', parseInt(value) || 0)}
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-100 mb-2">重试次数</label>
                <Input
                  type="number"
                  value={localSettings.retryAttempts}
                  onChange={(value) => handleSettingChange('retryAttempts', parseInt(value) || 0)}
                  size="sm"
                />
              </div>
            </div>

            {/* 绕过列表 */}
            <div>
              <label className="block text-sm text-gray-100 mb-2">绕过地址</label>
              <div className="space-y-2">
                {localSettings.bypassList.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(value) => updateBypassItem(index, value)}
                      placeholder="域名或IP地址"
                      size="sm"
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => removeBypassItem(index)}
                    >
                      <Icon name="X" size="xs" />
                    </Button>
                  </div>
                ))}
                <Button size="xs" variant="outline" onClick={addBypassItem}>
                  <Icon name="Plus" size="xs" />
                  添加地址
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProxySettings;
