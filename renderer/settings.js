class SettingsManager {
  constructor() {
    this.config = {};
    this.init();
  }

  async init() {
    await this.loadConfig();
    this.setupEventListeners();
    this.renderSettings();
  }

  async loadConfig() {
    try {
      // 检查electronAPI是否可用
      if (window.electronAPI && window.electronAPI.getConfig) {
        this.config = await window.electronAPI.getConfig();
      } else {
        console.warn('electronAPI不可用，使用默认配置');
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      this.config = this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      ai: {
        chat: {
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-4',
          maxTokens: 2000,
          temperature: 0.7
        },
        completion: {
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-3.5-turbo',
          maxTokens: 1000,
          temperature: 0.3
        },
        syncConfig: false
      },
      general: {
        language: 'zh-CN',
        theme: 'dark',
        autoSaveSessions: true,
        checkUpdates: true
      },
      terminal: {
        font: 'Consolas',
        fontSize: 14,
        bell: false,
        cursorBlink: true
      },
      security: {
        encryptPasswords: false,
        sessionTimeout: 30,
        confirmDangerousCommands: true
      }
    };
  }

  setupEventListeners() {
    // 设置按钮
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.showSettingsModal();
    });

    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // AI聊天配置表单
    document.getElementById('ai-chat-config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveChatAIConfig();
    });

    // AI补全配置表单
    document.getElementById('ai-completion-config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCompletionAIConfig();
    });

    // 测试连接按钮
    document.getElementById('btn-test-chat').addEventListener('click', () => {
      this.testAIConnection('chat');
    });

    document.getElementById('btn-test-completion').addEventListener('click', () => {
      this.testAIConnection('completion');
    });

    // 快速配置按钮
    document.getElementById('btn-copy-chat-to-completion').addEventListener('click', () => {
      this.copyConfig('chat', 'completion');
    });

    document.getElementById('btn-copy-completion-to-chat').addEventListener('click', () => {
      this.copyConfig('completion', 'chat');
    });

    // 同步配置复选框
    document.getElementById('sync-config').addEventListener('change', (e) => {
      this.config.ai.syncConfig = e.target.checked;
      this.saveConfig();
    });

    // 通用设置表单
    document.getElementById('general-config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveGeneralConfig();
    });

    // 终端设置表单
    document.getElementById('terminal-config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTerminalConfig();
    });

    // 安全设置表单
    document.getElementById('security-config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSecurityConfig();
    });

    // AI聊天提供商切换
    document.getElementById('chat-provider').addEventListener('change', (e) => {
      this.updateAIProviderDefaults(e.target.value, 'chat');
    });

    // AI补全提供商切换
    document.getElementById('completion-provider').addEventListener('change', (e) => {
      this.updateAIProviderDefaults(e.target.value, 'completion');
    });

    // 关闭模态框
    document.querySelectorAll('#settings-modal .modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideSettingsModal();
      });
    });
  }

  showSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'block';
    this.renderSettings();
  }

  hideSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
  }

  switchTab(tabName) {
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新标签内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  renderSettings() {
    this.renderAIConfig();
    this.renderGeneralConfig();
    this.renderTerminalConfig();
    this.renderSecurityConfig();
  }

  renderAIConfig() {
    const ai = this.config.ai || {};
    document.getElementById('ai-provider').value = ai.provider || 'openai';
    document.getElementById('ai-base-url').value = ai.baseUrl || '';
    document.getElementById('ai-api-key').value = ai.apiKey || '';
    document.getElementById('ai-model').value = ai.model || '';
    document.getElementById('ai-max-tokens').value = ai.maxTokens || 2000;
    document.getElementById('ai-temperature').value = ai.temperature || 0.7;
  }

  renderGeneralConfig() {
    const general = this.config.general || {};
    document.getElementById('app-language').value = general.language || 'zh-CN';
    document.getElementById('app-theme').value = general.theme || 'dark';
    document.getElementById('auto-save-sessions').checked = general.autoSaveSessions !== false;
    document.getElementById('check-updates').checked = general.checkUpdates !== false;
  }

  renderTerminalConfig() {
    const terminal = this.config.terminal || {};
    document.getElementById('terminal-font').value = terminal.font || 'Consolas';
    document.getElementById('terminal-font-size').value = terminal.fontSize || 14;
    document.getElementById('terminal-bell').checked = terminal.bell === true;
    document.getElementById('terminal-cursor-blink').checked = terminal.cursorBlink !== false;
  }

  renderSecurityConfig() {
    const security = this.config.security || {};
    document.getElementById('encrypt-passwords').checked = security.encryptPasswords === true;
    document.getElementById('session-timeout').value = security.sessionTimeout || 30;
    document.getElementById('confirm-dangerous-commands').checked = security.confirmDangerousCommands !== false;
  }

  renderAIConfig() {
    const ai = this.config.ai || {};
    
    // 渲染聊天配置
    this.renderAISection('chat', ai.chat || {});
    
    // 渲染补全配置
    this.renderAISection('completion', ai.completion || {});
    
    // 渲染同步配置
    document.getElementById('sync-config').checked = ai.syncConfig === true;
  }

  renderAISection(type, config) {
    const prefix = type === 'chat' ? 'chat' : 'completion';
    
    document.getElementById(`${prefix}-provider`).value = config.provider || 'openai';
    document.getElementById(`${prefix}-base-url`).value = config.baseUrl || '';
    document.getElementById(`${prefix}-api-key`).value = config.apiKey || '';
    document.getElementById(`${prefix}-model`).value = config.model || '';
    document.getElementById(`${prefix}-max-tokens`).value = config.maxTokens || (type === 'chat' ? 2000 : 1000);
    document.getElementById(`${prefix}-temperature`).value = config.temperature || (type === 'chat' ? 0.7 : 0.3);
  }

  updateAIProviderDefaults(provider, type) {
    const defaults = {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: type === 'chat' ? 'gpt-4' : 'gpt-3.5-turbo'
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        model: type === 'chat' ? 'claude-3-sonnet-20240229' : 'claude-3-haiku-20240307'
      },
      ollama: {
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama2'
      },
      custom: {
        baseUrl: '',
        model: ''
      }
    };

    const providerDefaults = defaults[provider] || defaults.custom;
    const prefix = type === 'chat' ? 'chat' : 'completion';
    
    if (provider !== 'custom') {
      document.getElementById(`${prefix}-base-url`).value = providerDefaults.baseUrl;
      document.getElementById(`${prefix}-model`).value = providerDefaults.model;
    }
  }

  async saveChatAIConfig() {
    const chatConfig = await this.saveAISection('chat');
    if (chatConfig) {
      this.config.ai.chat = chatConfig;
      
      // 如果开启同步，同步到补全配置
      if (this.config.ai.syncConfig) {
        this.config.ai.completion = { ...chatConfig };
        this.renderAISection('completion', chatConfig);
      }
      
      await this.saveConfig();
      this.showNotification('AI聊天配置已保存', 'success');
    }
  }

  async saveCompletionAIConfig() {
    const completionConfig = await this.saveAISection('completion');
    if (completionConfig) {
      this.config.ai.completion = completionConfig;
      
      // 如果开启同步，同步到聊天配置
      if (this.config.ai.syncConfig) {
        this.config.ai.chat = { ...completionConfig };
        this.renderAISection('chat', completionConfig);
      }
      
      await this.saveConfig();
      this.showNotification('AI补全配置已保存', 'success');
    }
  }

  async saveAISection(type) {
    const prefix = type === 'chat' ? 'chat' : 'completion';
    
    const config = {
      provider: document.getElementById(`${prefix}-provider`).value,
      baseUrl: document.getElementById(`${prefix}-base-url`).value.trim(),
      apiKey: document.getElementById(`${prefix}-api-key`).value.trim(),
      model: document.getElementById(`${prefix}-model`).value.trim(),
      maxTokens: parseInt(document.getElementById(`${prefix}-max-tokens`).value) || (type === 'chat' ? 2000 : 1000),
      temperature: parseFloat(document.getElementById(`${prefix}-temperature`).value) || (type === 'chat' ? 0.7 : 0.3)
    };

    // 验证必填字段
    if (!config.baseUrl) {
      this.showNotification('请填写Base URL', 'error');
      document.getElementById(`${prefix}-base-url`).focus();
      return null;
    }

    if (!config.apiKey) {
      this.showNotification('请填写API Key', 'error');
      document.getElementById(`${prefix}-api-key`).focus();
      return null;
    }

    if (!config.model) {
      this.showNotification('请填写模型名称', 'error');
      document.getElementById(`${prefix}-model`).focus();
      return null;
    }

    // 验证URL格式
    try {
      new URL(config.baseUrl);
    } catch {
      this.showNotification('Base URL格式不正确', 'error');
      document.getElementById(`${prefix}-base-url`).focus();
      return null;
    }

    return config;
  }

  async saveGeneralConfig() {
    this.config.general = {
      language: document.getElementById('app-language').value,
      theme: document.getElementById('app-theme').value,
      autoSaveSessions: document.getElementById('auto-save-sessions').checked,
      checkUpdates: document.getElementById('check-updates').checked
    };

    await this.saveConfig();
    this.showNotification('通用设置保存成功', 'success');
    this.applyTheme(this.config.general.theme);
  }

  async saveTerminalConfig() {
    this.config.terminal = {
      font: document.getElementById('terminal-font').value,
      fontSize: parseInt(document.getElementById('terminal-font-size').value) || 14,
      bell: document.getElementById('terminal-bell').checked,
      cursorBlink: document.getElementById('terminal-cursor-blink').checked
    };

    await this.saveConfig();
    this.showNotification('终端设置保存成功', 'success');
    this.applyTerminalSettings();
  }

  async saveSecurityConfig() {
    this.config.security = {
      encryptPasswords: document.getElementById('encrypt-passwords').checked,
      sessionTimeout: parseInt(document.getElementById('session-timeout').value) || 30,
      confirmDangerousCommands: document.getElementById('confirm-dangerous-commands').checked
    };

    await this.saveConfig();
    this.showNotification('安全设置保存成功', 'success');
  }

  async saveConfig() {
    try {
      const result = await window.electronAPI.saveConfig(this.config);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      this.showNotification('保存配置失败: ' + error.message, 'error');
      throw error;
    }
  }

  applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }

  applyTerminalSettings() {
    const terminal = document.getElementById('terminal');
    if (terminal && this.config.terminal) {
      terminal.style.fontFamily = this.config.terminal.font;
      terminal.style.fontSize = this.config.terminal.fontSize + 'px';
    }
  }

  async testAIConnection(type) {
    const prefix = type === 'chat' ? 'chat' : 'completion';
    const configName = type === 'chat' ? '聊天' : '补全';
    
    const aiConfig = {
      provider: document.getElementById(`${prefix}-provider`).value,
      baseUrl: document.getElementById(`${prefix}-base-url`).value.trim(),
      apiKey: document.getElementById(`${prefix}-api-key`).value.trim(),
      model: document.getElementById(`${prefix}-model`).value.trim()
    };

    if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
      this.showNotification(`请先填写完整的AI${configName}配置信息`, 'error');
      return;
    }

    try {
      this.showNotification(`正在测试AI${configName}连接...`, 'info');
      const result = await window.electronAPI.testAIConnection(aiConfig);
      
      if (result.success) {
        this.showNotification(`AI${configName}连接测试成功！`, 'success');
      } else {
        this.showNotification(`AI${configName}连接测试失败: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`AI${configName}连接测试失败: ${error.message}`, 'error');
    }
  }

  copyConfig(fromType, toType) {
    const fromPrefix = fromType === 'chat' ? 'chat' : 'completion';
    const toPrefix = toType === 'chat' ? 'chat' : 'completion';
    const fromName = fromType === 'chat' ? '聊天' : '补全';
    const toName = toType === 'chat' ? '聊天' : '补全';

    const config = {
      provider: document.getElementById(`${fromPrefix}-provider`).value,
      baseUrl: document.getElementById(`${fromPrefix}-base-url`).value,
      apiKey: document.getElementById(`${fromPrefix}-api-key`).value,
      model: document.getElementById(`${fromPrefix}-model`).value,
      maxTokens: document.getElementById(`${fromPrefix}-max-tokens`).value,
      temperature: document.getElementById(`${fromPrefix}-temperature`).value
    };

    // 复制配置到目标表单
    document.getElementById(`${toPrefix}-provider`).value = config.provider;
    document.getElementById(`${toPrefix}-base-url`).value = config.baseUrl;
    document.getElementById(`${toPrefix}-api-key`).value = config.apiKey;
    document.getElementById(`${toPrefix}-model`).value = config.model;
    document.getElementById(`${toPrefix}-max-tokens`).value = config.maxTokens;
    document.getElementById(`${toPrefix}-temperature`).value = config.temperature;

    this.showNotification(`已将${fromName}配置复制到${toName}配置`, 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  getConfig() {
    return this.config;
  }

  getAIConfig() {
    return this.config.ai || {};
  }

  getChatAIConfig() {
    return this.config.ai?.chat || {};
  }

  getCompletionAIConfig() {
    return this.config.ai?.completion || {};
  }
}

// 创建全局设置管理器实例
window.settingsManager = new SettingsManager();