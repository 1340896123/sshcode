import React, { useState } from 'react';
import { Button } from './ui/primitives/Button';
import { Input } from './ui/primitives/Input';
import { Modal } from './ui/feedback/Modal';
import { Select } from './ui/primitives/Select';
import Tabs, { Tab, TabPanel } from './ui/layout/Tabs';
import { Switch } from './ui/primitives/Switch';

function SettingsModal({ isOpen, onClose, onShowNotification }) {
  const [activeTab, setActiveTab] = useState('ai');
  const [aiConfig, setAiConfig] = useState({
    chatProvider: 'openai',
    chatBaseUrl: 'https://api.openai.com/v1',
    chatApiKey: '',
    chatModel: 'gpt-4',
    chatMaxTokens: 2000,
    chatTemperature: 0.7,
    completionProvider: 'openai',
    completionBaseUrl: 'https://api.openai.com/v1',
    completionApiKey: '',
    completionModel: 'gpt-3.5-turbo',
    completionMaxTokens: 1000,
    completionTemperature: 0.3,
    syncConfig: false
  });

  const [generalConfig, setGeneralConfig] = useState({
    appLanguage: 'zh-CN',
    appTheme: 'dark',
    autoSaveSessions: true,
    checkUpdates: false
  });

  const [terminalConfig, setTerminalConfig] = useState({
    terminalFont: 'Consolas',
    terminalFontSize: 14,
    terminalBell: false,
    terminalCursorBlink: true
  });

  const [securityConfig, setSecurityConfig] = useState({
    encryptPasswords: true,
    sessionTimeout: 30,
    confirmDangerousCommands: true
  });

  const handleAiConfigChange = (field, value) => {
    setAiConfig(prev => ({ ...prev, [field]: value }));
    
    // 如果启用了同步配置
    if (aiConfig.syncConfig) {
      if (field.startsWith('chat')) {
        const completionField = field.replace('chat', 'completion');
        setAiConfig(prev => ({ ...prev, [completionField]: value }));
      } else if (field.startsWith('completion')) {
        const chatField = field.replace('completion', 'chat');
        setAiConfig(prev => ({ ...prev, [chatField]: value }));
      }
    }
  };

  const handleGeneralConfigChange = (field, value) => {
    setGeneralConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTerminalConfigChange = (field, value) => {
    setTerminalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityConfigChange = (field, value) => {
    setSecurityConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async (configType) => {
    try {
      // 这里应该调用实际的保存配置API
      onShowNotification.success('配置已保存');
    } catch (error) {
      onShowNotification.error('保存配置失败');
    }
  };

  const handleTestConnection = async (type) => {
    try {
      // 这里应该调用实际的测试连接API
      onShowNotification.success('连接测试成功');
    } catch (error) {
      onShowNotification.error('连接测试失败');
    }
  };

  const copyChatToCompletion = () => {
    setAiConfig(prev => ({
      ...prev,
      completionProvider: prev.chatProvider,
      completionBaseUrl: prev.chatBaseUrl,
      completionApiKey: prev.chatApiKey,
      completionModel: prev.chatModel,
      completionMaxTokens: prev.chatMaxTokens,
      completionTemperature: prev.chatTemperature
    }));
    onShowNotification.success('已复制聊天配置到补全配置');
  };

  const copyCompletionToChat = () => {
    setAiConfig(prev => ({
      ...prev,
      chatProvider: prev.completionProvider,
      chatBaseUrl: prev.completionBaseUrl,
      chatApiKey: prev.completionApiKey,
      chatModel: prev.completionModel,
      chatMaxTokens: prev.completionMaxTokens,
      chatTemperature: prev.completionTemperature
    }));
    onShowNotification.success('已复制补全配置到聊天配置');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="应用设置"
      size="large"
    >
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <Tab value="ai" label="🤖 AI配置" />
        <Tab value="general" label="⚙️ 通用设置" />
        <Tab value="terminal" label="💻 终端设置" />
        <Tab value="security" label="🔒 安全设置" />

        <TabPanel value="ai">
          <h3>AI模型配置</h3>
          
          {/* AI聊天配置 */}
          <div className="ai-config-section">
            <h4>💬 AI聊天配置</h4>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('ai-chat'); }}>
              <div className="form-group">
                <label htmlFor="chat-provider">AI提供商:</label>
                <Select
                  id="chat-provider"
                  value={aiConfig.chatProvider}
                  onChange={(e) => handleAiConfigChange('chatProvider', e.target.value)}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="ollama">Ollama (本地)</option>
                  <option value="custom">自定义API</option>
                </Select>
              </div>
              
              <div className="form-group">
                <label htmlFor="chat-base-url">Base URL:</label>
                <Input
                  id="chat-base-url"
                  type="url"
                  value={aiConfig.chatBaseUrl}
                  onChange={(e) => handleAiConfigChange('chatBaseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="chat-api-key">API Key:</label>
                <Input
                  id="chat-api-key"
                  type="password"
                  value={aiConfig.chatApiKey}
                  onChange={(e) => handleAiConfigChange('chatApiKey', e.target.value)}
                  placeholder="输入您的API密钥"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="chat-model">模型名称:</label>
                <Input
                  id="chat-model"
                  value={aiConfig.chatModel}
                  onChange={(e) => handleAiConfigChange('chatModel', e.target.value)}
                  placeholder="gpt-4, claude-3-sonnet, etc."
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="chat-max-tokens">最大Token数:</label>
                  <Input
                    id="chat-max-tokens"
                    type="number"
                    value={aiConfig.chatMaxTokens}
                    onChange={(e) => handleAiConfigChange('chatMaxTokens', parseInt(e.target.value))}
                    min="100"
                    max="8000"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="chat-temperature">Temperature (0-1):</label>
                  <Input
                    id="chat-temperature"
                    type="number"
                    value={aiConfig.chatTemperature}
                    onChange={(e) => handleAiConfigChange('chatTemperature', parseFloat(e.target.value))}
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <Button type="submit">
                  💾 保存聊天配置
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => handleTestConnection('chat')}
                >
                  🧪 测试连接
                </Button>
              </div>
            </form>
          </div>

          {/* 快速配置 */}
          <div className="ai-config-section">
            <h4>⚙️ 快速配置</h4>
            <div className="form-group">
              <Switch
                checked={aiConfig.syncConfig}
                onChange={(checked) => handleAiConfigChange('syncConfig', checked)}
                label="同步聊天和补全配置"
              />
              <small style={{ color: '#969696', display: 'block', marginTop: '4px' }}>
                勾选后，修改聊天配置时会自动同步到补全配置
              </small>
            </div>
            <div className="form-actions">
              <Button 
                variant="secondary"
                onClick={copyChatToCompletion}
              >
                📋 聊天配置 → 补全配置
              </Button>
              <Button 
                variant="secondary"
                onClick={copyCompletionToChat}
              >
                📋 补全配置 → 聊天配置
              </Button>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="general">
          <h3>通用设置</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('general'); }}>
            <div className="form-group">
              <label htmlFor="app-language">界面语言:</label>
              <Select
                id="app-language"
                value={generalConfig.appLanguage}
                onChange={(e) => handleGeneralConfigChange('appLanguage', e.target.value)}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </Select>
            </div>
            
            <div className="form-group">
              <label htmlFor="app-theme">主题:</label>
              <Select
                id="app-theme"
                value={generalConfig.appTheme}
                onChange={(e) => handleGeneralConfigChange('appTheme', e.target.value)}
              >
                <option value="dark">深色主题</option>
                <option value="light">浅色主题</option>
                <option value="auto">跟随系统</option>
              </Select>
            </div>
            
            <div className="form-group">
              <Switch
                checked={generalConfig.autoSaveSessions}
                onChange={(checked) => handleGeneralConfigChange('autoSaveSessions', checked)}
                label="自动保存会话"
              />
            </div>
            
            <div className="form-group">
              <Switch
                checked={generalConfig.checkUpdates}
                onChange={(checked) => handleGeneralConfigChange('checkUpdates', checked)}
                label="启动时检查更新"
              />
            </div>
            
            <div className="form-actions">
              <Button type="submit">
                💾 保存设置
              </Button>
            </div>
          </form>
        </TabPanel>

        <TabPanel value="terminal">
          <h3>终端设置</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('terminal'); }}>
            <div className="form-group">
              <label htmlFor="terminal-font">字体:</label>
              <Select
                id="terminal-font"
                value={terminalConfig.terminalFont}
                onChange={(e) => handleTerminalConfigChange('terminalFont', e.target.value)}
              >
                <option value="Consolas">Consolas</option>
                <option value="Monaco">Monaco</option>
                <option value="Courier New">Courier New</option>
              </Select>
            </div>
            
            <div className="form-group">
              <label htmlFor="terminal-font-size">字体大小:</label>
              <Input
                id="terminal-font-size"
                type="number"
                value={terminalConfig.terminalFontSize}
                onChange={(e) => handleTerminalConfigChange('terminalFontSize', parseInt(e.target.value))}
                min="10"
                max="24"
              />
            </div>
            
            <div className="form-group">
              <Switch
                checked={terminalConfig.terminalBell}
                onChange={(checked) => handleTerminalConfigChange('terminalBell', checked)}
                label="启用终端铃声"
              />
            </div>
            
            <div className="form-group">
              <Switch
                checked={terminalConfig.terminalCursorBlink}
                onChange={(checked) => handleTerminalConfigChange('terminalCursorBlink', checked)}
                label="光标闪烁"
              />
            </div>
            
            <div className="form-actions">
              <Button type="submit">
                💾 保存设置
              </Button>
            </div>
          </form>
        </TabPanel>

        <TabPanel value="security">
          <h3>安全设置</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('security'); }}>
            <div className="form-group">
              <Switch
                checked={securityConfig.encryptPasswords}
                onChange={(checked) => handleSecurityConfigChange('encryptPasswords', checked)}
                label="加密存储密码"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="session-timeout">会话超时时间 (分钟):</label>
              <Input
                id="session-timeout"
                type="number"
                value={securityConfig.sessionTimeout}
                onChange={(e) => handleSecurityConfigChange('sessionTimeout', parseInt(e.target.value))}
                min="5"
                max="480"
              />
            </div>
            
            <div className="form-group">
              <Switch
                checked={securityConfig.confirmDangerousCommands}
                onChange={(checked) => handleSecurityConfigChange('confirmDangerousCommands', checked)}
                label="危险命令确认"
              />
            </div>
            
            <div className="form-actions">
              <Button type="submit">
                💾 保存设置
              </Button>
            </div>
          </form>
        </TabPanel>
      </Tabs>
    </Modal>
  );
}

export default SettingsModal;
