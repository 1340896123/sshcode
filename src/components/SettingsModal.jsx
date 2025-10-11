import React, { useState } from 'react';

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
      onShowNotification('配置已保存', 'success');
    } catch (error) {
      onShowNotification('保存配置失败', 'error');
    }
  };

  const handleTestConnection = async (type) => {
    try {
      // 这里应该调用实际的测试连接API
      onShowNotification('连接测试成功', 'success');
    } catch (error) {
      onShowNotification('连接测试失败', 'error');
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
    onShowNotification('已复制聊天配置到补全配置', 'success');
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
    onShowNotification('已复制补全配置到聊天配置', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>应用设置</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="settings-tabs">
            <button 
              className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              🤖 AI配置
            </button>
            <button 
              className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              ⚙️ 通用设置
            </button>
            <button 
              className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
              onClick={() => setActiveTab('terminal')}
            >
              💻 终端设置
            </button>
            <button 
              className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              🔒 安全设置
            </button>
          </div>

          {/* AI配置标签页 */}
          {activeTab === 'ai' && (
            <div className="tab-content active">
              <h3>AI模型配置</h3>
              
              {/* AI聊天配置 */}
              <div className="ai-config-section">
                <h4>💬 AI聊天配置</h4>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('ai-chat'); }}>
                  <div className="form-group">
                    <label htmlFor="chat-provider">AI提供商:</label>
                    <select
                      id="chat-provider"
                      value={aiConfig.chatProvider}
                      onChange={(e) => handleAiConfigChange('chatProvider', e.target.value)}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="ollama">Ollama (本地)</option>
                      <option value="custom">自定义API</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="chat-base-url">Base URL:</label>
                    <input
                      type="url"
                      id="chat-base-url"
                      value={aiConfig.chatBaseUrl}
                      onChange={(e) => handleAiConfigChange('chatBaseUrl', e.target.value)}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="chat-api-key">API Key:</label>
                    <input
                      type="password"
                      id="chat-api-key"
                      value={aiConfig.chatApiKey}
                      onChange={(e) => handleAiConfigChange('chatApiKey', e.target.value)}
                      placeholder="输入您的API密钥"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="chat-model">模型名称:</label>
                    <input
                      type="text"
                      id="chat-model"
                      value={aiConfig.chatModel}
                      onChange={(e) => handleAiConfigChange('chatModel', e.target.value)}
                      placeholder="gpt-4, claude-3-sonnet, etc."
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="chat-max-tokens">最大Token数:</label>
                      <input
                        type="number"
                        id="chat-max-tokens"
                        value={aiConfig.chatMaxTokens}
                        onChange={(e) => handleAiConfigChange('chatMaxTokens', parseInt(e.target.value))}
                        min="100"
                        max="8000"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="chat-temperature">Temperature (0-1):</label>
                      <input
                        type="number"
                        id="chat-temperature"
                        value={aiConfig.chatTemperature}
                        onChange={(e) => handleAiConfigChange('chatTemperature', parseFloat(e.target.value))}
                        min="0"
                        max="1"
                        step="0.1"
                      />
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      💾 保存聊天配置
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleTestConnection('chat')}
                    >
                      🧪 测试连接
                    </button>
                  </div>
                </form>
              </div>

              {/* 快速配置 */}
              <div className="ai-config-section">
                <h4>⚙️ 快速配置</h4>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={aiConfig.syncConfig}
                      onChange={(e) => handleAiConfigChange('syncConfig', e.target.checked)}
                    />
                    同步聊天和补全配置
                  </label>
                  <small style={{ color: '#969696', display: 'block', marginTop: '4px' }}>
                    勾选后，修改聊天配置时会自动同步到补全配置
                  </small>
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={copyChatToCompletion}
                  >
                    📋 聊天配置 → 补全配置
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={copyCompletionToChat}
                  >
                    📋 补全配置 → 聊天配置
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 通用设置标签页 */}
          {activeTab === 'general' && (
            <div className="tab-content active">
              <h3>通用设置</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('general'); }}>
                <div className="form-group">
                  <label htmlFor="app-language">界面语言:</label>
                  <select
                    id="app-language"
                    value={generalConfig.appLanguage}
                    onChange={(e) => handleGeneralConfigChange('appLanguage', e.target.value)}
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="app-theme">主题:</label>
                  <select
                    id="app-theme"
                    value={generalConfig.appTheme}
                    onChange={(e) => handleGeneralConfigChange('appTheme', e.target.value)}
                  >
                    <option value="dark">深色主题</option>
                    <option value="light">浅色主题</option>
                    <option value="auto">跟随系统</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={generalConfig.autoSaveSessions}
                      onChange={(e) => handleGeneralConfigChange('autoSaveSessions', e.target.checked)}
                    />
                    自动保存会话
                  </label>
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={generalConfig.checkUpdates}
                      onChange={(e) => handleGeneralConfigChange('checkUpdates', e.target.checked)}
                    />
                    启动时检查更新
                  </label>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    💾 保存设置
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 终端设置标签页 */}
          {activeTab === 'terminal' && (
            <div className="tab-content active">
              <h3>终端设置</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('terminal'); }}>
                <div className="form-group">
                  <label htmlFor="terminal-font">字体:</label>
                  <select
                    id="terminal-font"
                    value={terminalConfig.terminalFont}
                    onChange={(e) => handleTerminalConfigChange('terminalFont', e.target.value)}
                  >
                    <option value="Consolas">Consolas</option>
                    <option value="Monaco">Monaco</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="terminal-font-size">字体大小:</label>
                  <input
                    type="number"
                    id="terminal-font-size"
                    value={terminalConfig.terminalFontSize}
                    onChange={(e) => handleTerminalConfigChange('terminalFontSize', parseInt(e.target.value))}
                    min="10"
                    max="24"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={terminalConfig.terminalBell}
                      onChange={(e) => handleTerminalConfigChange('terminalBell', e.target.checked)}
                    />
                    启用终端铃声
                  </label>
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={terminalConfig.terminalCursorBlink}
                      onChange={(e) => handleTerminalConfigChange('terminalCursorBlink', e.target.checked)}
                    />
                    光标闪烁
                  </label>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    💾 保存设置
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 安全设置标签页 */}
          {activeTab === 'security' && (
            <div className="tab-content active">
              <h3>安全设置</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig('security'); }}>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={securityConfig.encryptPasswords}
                      onChange={(e) => handleSecurityConfigChange('encryptPasswords', e.target.checked)}
                    />
                    加密存储密码
                  </label>
                </div>
                
                <div className="form-group">
                  <label htmlFor="session-timeout">会话超时时间 (分钟):</label>
                  <input
                    type="number"
                    id="session-timeout"
                    value={securityConfig.sessionTimeout}
                    onChange={(e) => handleSecurityConfigChange('sessionTimeout', parseInt(e.target.value))}
                    min="5"
                    max="480"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={securityConfig.confirmDangerousCommands}
                      onChange={(e) => handleSecurityConfigChange('confirmDangerousCommands', e.target.checked)}
                    />
                    危险命令确认
                  </label>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    💾 保存设置
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
