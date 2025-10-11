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
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7
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

    // AI配置表单
    document.getElementById('ai-config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveAIConfig();
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

    // AI提供商切换
    document.getElementById('ai-provider').addEventListener('change', (e) => {
      this.updateAIProviderDefaults(e.target.value);
    });

    // 测试AI连接
    document.getElementById('btn-test-ai').addEventListener('click', () => {
      this.testAIConnection();
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

  updateAIProviderDefaults(provider) {
    const defaults = {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-sonnet-20240229'
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
    
    if (provider !== 'custom') {
      document.getElementById('ai-base-url').value = providerDefaults.baseUrl;
      document.getElementById('ai-model').value = providerDefaults.model;
    }
  }

  async saveAIConfig() {
    const aiConfig = {
      provider: document.getElementById('ai-provider').value,
      baseUrl: document.getElementById('ai-base-url').value.trim(),
      apiKey: document.getElementById('ai-api-key').value.trim(),
      model: document.getElementById('ai-model').value.trim(),
      maxTokens: parseInt(document.getElementById('ai-max-tokens').value) || 2000,
      temperature: parseFloat(document.getElementById('ai-temperature').value) || 0.7
    };

    // 验证必填字段
    if (!aiConfig.baseUrl) {
      this.showNotification('请填写Base URL', 'error');
      document.getElementById('ai-base-url').focus();
      return;
    }

    if (!aiConfig.apiKey) {
      this.showNotification('请填写API Key', 'error');
      document.getElementById('ai-api-key').focus();
      return;
    }

    if (!aiConfig.model) {
      this.showNotification('请填写模型名称', 'error');
      document.getElementById('ai-model').focus();
      return;
    }

    // 验证URL格式
    try {
      new URL(aiConfig.baseUrl);
    } catch (error) {
      this.showNotification('Base URL格式不正确', 'error');
      document.getElementById('ai-base-url').focus();
      return;
    }

    // 验证数值范围
    if (aiConfig.maxTokens < 1 || aiConfig.maxTokens > 32000) {
      this.showNotification('最大Token数必须在1-32000之间', 'error');
      document.getElementById('ai-max-tokens').focus();
      return;
    }

    if (aiConfig.temperature < 0 || aiConfig.temperature > 2) {
      this.showNotification('Temperature必须在0-2之间', 'error');
      document.getElementById('ai-temperature').focus();
      return;
    }

    this.config.ai = aiConfig;
    await this.saveConfig();
    this.showNotification('AI配置保存成功', 'success');
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

  async testAIConnection() {
    const aiConfig = {
      provider: document.getElementById('ai-provider').value,
      baseUrl: document.getElementById('ai-base-url').value.trim(),
      apiKey: document.getElementById('ai-api-key').value.trim(),
      model: document.getElementById('ai-model').value.trim()
    };

    if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
      this.showNotification('请先填写完整的AI配置信息', 'error');
      return;
    }

    try {
      this.showNotification('正在测试AI连接...', 'info');
      const result = await window.electronAPI.testAIConnection(aiConfig);
      
      if (result.success) {
        this.showNotification('AI连接测试成功！', 'success');
      } else {
        this.showNotification('AI连接测试失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('AI连接测试失败: ' + error.message, 'error');
    }
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
}

// 创建全局设置管理器实例
window.settingsManager = new SettingsManager();