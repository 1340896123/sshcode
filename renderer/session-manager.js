class SessionManager {
  constructor() {
    this.sessions = [];
    this.currentSession = null;
    this.filteredSessions = [];
    this.init();
  }

  async init() {
    await this.loadSessions();
    this.renderSessions();
    this.setupEventListeners();
  }

  async loadSessions() {
    try {
      this.sessions = await window.electronAPI.getSessions();
      this.filteredSessions = [...this.sessions];
    } catch (error) {
      console.error('加载会话失败:', error);
      this.showNotification('加载会话失败: ' + error.message, 'error');
    }
  }

  renderSessions() {
    const container = document.getElementById('sessions-list');
    if (!container) return;

    if (this.filteredSessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>暂无SSH会话</p>
          <p>点击"新建会话"开始添加</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
    // 按分组显示会话
    const groups = this.groupSessions(this.filteredSessions);
    
    Object.keys(groups).forEach(groupName => {
      if (groupName !== 'undefined' && groups[groupName].length > 0) {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'session-group-header';
        groupHeader.innerHTML = `<h4>${this.getGroupDisplayName(groupName)}</h4>`;
        container.appendChild(groupHeader);
      }
      
      groups[groupName].forEach(session => {
        const sessionItem = this.createSessionItem(session);
        container.appendChild(sessionItem);
      });
    });

    this.attachSessionEventListeners();
  }

  groupSessions(sessions) {
    const groups = {};
    sessions.forEach(session => {
      const group = session.group || 'default';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(session);
    });
    return groups;
  }

  getGroupDisplayName(group) {
    const groupNames = {
      'default': '默认分组',
      'production': '生产环境',
      'development': '开发环境',
      'testing': '测试环境'
    };
    return groupNames[group] || group;
  }

  createSessionItem(session) {
    const sessionItem = document.createElement('div');
    sessionItem.className = `session-item ${this.currentSession?.id === session.id ? 'connected' : ''}`;
    sessionItem.dataset.sessionId = session.id;
    
    const isConnected = this.currentSession?.id === session.id;
    
    sessionItem.innerHTML = `
      <div class="session-status ${isConnected ? 'connected' : ''}"></div>
      <div class="session-info">
        <div class="session-name">${session.name || session.host}</div>
        <div class="session-details">${session.username}@${session.host}:${session.port || 22}</div>
        ${session.description ? `<div class="session-description">${session.description}</div>` : ''}
        ${session.group ? `<span class="session-group">${this.getGroupDisplayName(session.group)}</span>` : ''}
      </div>
      <div class="session-actions">
        <button class="btn btn-small btn-connect" data-id="${session.id}" ${isConnected ? 'disabled' : ''}>
          ${isConnected ? '已连接' : '连接'}
        </button>
        <button class="btn btn-small btn-secondary btn-edit" data-id="${session.id}">编辑</button>
        <button class="btn btn-small btn-danger btn-delete" data-id="${session.id}">删除</button>
      </div>
    `;
    
    return sessionItem;
  }

  setupEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('session-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterSessions(e.target.value);
      });
    }

    // 新建会话按钮
    const addBtn = document.getElementById('btn-add-session');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showSessionForm();
      });
    }

    // 导入导出按钮
    document.getElementById('btn-import-sessions')?.addEventListener('click', () => {
      this.importSessions();
    });

    document.getElementById('btn-export-sessions')?.addEventListener('click', () => {
      this.exportSessions();
    });

    // 会话表单
    const sessionForm = document.getElementById('session-form');
    if (sessionForm) {
      sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSessionFormSubmit();
      });
    }

    // 认证方式切换
    const authTypeSelect = document.getElementById('session-auth-type');
    if (authTypeSelect) {
      authTypeSelect.addEventListener('change', (e) => {
        this.toggleAuthFields(e.target.value);
      });
    }

    // 测试连接按钮
    document.getElementById('btn-test-connection')?.addEventListener('click', () => {
      this.testConnection();
    });

    // 取消按钮
    document.getElementById('btn-cancel-session')?.addEventListener('click', () => {
      this.hideSessionForm();
    });
  }

  attachSessionEventListeners() {
    document.querySelectorAll('.btn-connect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sessionId = e.target.dataset.id;
        this.connectSession(sessionId);
      });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sessionId = e.target.dataset.id;
        this.editSession(sessionId);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sessionId = e.target.dataset.id;
        this.deleteSession(sessionId);
      });
    });
  }

  filterSessions(searchTerm) {
    if (!searchTerm) {
      this.filteredSessions = [...this.sessions];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredSessions = this.sessions.filter(session => 
        (session.name && session.name.toLowerCase().includes(term)) ||
        session.host.toLowerCase().includes(term) ||
        session.username.toLowerCase().includes(term) ||
        (session.description && session.description.toLowerCase().includes(term))
      );
    }
    this.renderSessions();
  }

  toggleAuthFields(authType) {
    const passwordGroup = document.getElementById('password-group');
    const keyGroup = document.getElementById('key-group');
    
    if (authType === 'key') {
      passwordGroup.style.display = 'none';
      keyGroup.style.display = 'block';
    } else {
      passwordGroup.style.display = 'block';
      keyGroup.style.display = 'none';
    }
  }

  showSessionForm(session = null) {
    const modal = document.getElementById('session-form-modal');
    const form = document.getElementById('session-form');
    const title = document.getElementById('session-form-title');
    
    if (session) {
      title.textContent = '编辑SSH会话';
      document.getElementById('session-id').value = session.id;
      document.getElementById('session-name').value = session.name || '';
      document.getElementById('session-group').value = session.group || '';
      document.getElementById('session-host').value = session.host;
      document.getElementById('session-port').value = session.port || 22;
      document.getElementById('session-username').value = session.username;
      document.getElementById('session-auth-type').value = session.authType || 'password';
      document.getElementById('session-password').value = session.password || '';
      document.getElementById('session-key-path').value = session.keyPath || '';
      document.getElementById('session-description').value = session.description || '';
      
      this.toggleAuthFields(session.authType || 'password');
    } else {
      title.textContent = '新建SSH会话';
      form.reset();
      document.getElementById('session-id').value = '';
      document.getElementById('session-port').value = 22;
      this.toggleAuthFields('password');
    }
    
    modal.style.display = 'block';
  }

  async handleSessionFormSubmit() {
    const formData = {
      id: document.getElementById('session-id').value,
      name: document.getElementById('session-name').value.trim(),
      group: document.getElementById('session-group').value,
      host: document.getElementById('session-host').value.trim(),
      port: parseInt(document.getElementById('session-port').value) || 22,
      username: document.getElementById('session-username').value.trim(),
      authType: document.getElementById('session-auth-type').value,
      password: document.getElementById('session-password').value,
      keyPath: document.getElementById('session-key-path').value.trim(),
      description: document.getElementById('session-description').value.trim()
    };

    // 验证必填字段
    if (!formData.host || !formData.username) {
      this.showNotification('请填写主机地址和用户名', 'error');
      return;
    }

    // 处理SSH密钥认证
    if (formData.authType === 'key' && formData.keyPath) {
      try {
        // 在渲染进程中无法直接读取文件，需要通过主进程
        const result = await window.electronAPI.readSSHKey(formData.keyPath);
        if (result.success) {
          formData.privateKey = result.keyContent;
        } else {
          this.showNotification('无法读取私钥文件: ' + result.error, 'error');
          return;
        }
      } catch (error) {
        this.showNotification('私钥文件处理失败: ' + error.message, 'error');
        return;
      }
    }

    await this.saveSession(formData);
  }

  async saveSession(sessionData) {
    try {
      const result = await window.electronAPI.saveSession(sessionData);
      if (result.success) {
        await this.loadSessions();
        this.renderSessions();
        this.hideSessionForm();
        this.showNotification('会话保存成功', 'success');
      } else {
        this.showNotification('保存失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('保存失败: ' + error.message, 'error');
    }
  }

  async deleteSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    const sessionName = session?.name || session?.host || '未知会话';
    
    if (!confirm(`确定要删除会话 "${sessionName}" 吗？此操作不可撤销。`)) return;

    try {
      const result = await window.electronAPI.deleteSession(sessionId);
      if (result.success) {
        // 如果删除的是当前连接的会话，断开连接
        if (this.currentSession?.id === sessionId) {
          this.disconnectCurrentSession();
        }
        
        await this.loadSessions();
        this.renderSessions();
        this.showNotification('会话删除成功', 'success');
      } else {
        this.showNotification('删除失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('删除失败: ' + error.message, 'error');
    }
  }

  async testConnection() {
    const formData = {
      host: document.getElementById('session-host').value.trim(),
      port: parseInt(document.getElementById('session-port').value) || 22,
      username: document.getElementById('session-username').value.trim(),
      authType: document.getElementById('session-auth-type').value,
      password: document.getElementById('session-password').value,
      keyPath: document.getElementById('session-key-path').value.trim()
    };

    // 验证必填字段
    if (!formData.host) {
      this.showNotification('请填写主机地址', 'error');
      document.getElementById('session-host').focus();
      return;
    }

    if (!formData.username) {
      this.showNotification('请填写用户名', 'error');
      document.getElementById('session-username').focus();
      return;
    }

    // 验证主机地址格式
    if (!this.isValidHost(formData.host)) {
      this.showNotification('主机地址格式不正确', 'error');
      document.getElementById('session-host').focus();
      return;
    }

    // 验证端口范围
    if (formData.port < 1 || formData.port > 65535) {
      this.showNotification('端口必须在1-65535范围内', 'error');
      document.getElementById('session-port').focus();
      return;
    }

    // 验证认证信息
    if (formData.authType === 'password' && !formData.password) {
      this.showNotification('请填写密码', 'error');
      document.getElementById('session-password').focus();
      return;
    }

    if (formData.authType === 'key' && !formData.keyPath) {
      this.showNotification('请填写私钥文件路径', 'error');
      document.getElementById('session-key-path').focus();
      return;
    }

    try {
      this.showNotification('正在测试连接...', 'info');
      
      // 处理SSH密钥认证
      const connectionConfig = { ...formData };
      if (formData.authType === 'key' && formData.keyPath) {
        const result = await window.electronAPI.readSSHKey(formData.keyPath);
        if (result.success) {
          connectionConfig.privateKey = result.keyContent;
        } else {
          this.showNotification('无法读取私钥文件: ' + result.error, 'error');
          return;
        }
      }
      
      const testSessionId = 'test-' + Date.now();
      const result = await window.electronAPI.sshConnect({ ...connectionConfig, id: testSessionId });
      
      if (result.success) {
        this.showNotification('连接测试成功！', 'success');
        // 立即断开测试连接
        await window.electronAPI.sshDisconnect(testSessionId);
      } else {
        this.showNotification('连接测试失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('连接测试失败: ' + error.message, 'error');
    }
  }

  isValidHost(host) {
    // IPv4地址验证
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(host)) {
      const parts = host.split('.');
      return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    }
    
    // 域名验证
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(host) && host.length <= 253;
  }

  async connectSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;

    // 如果已有连接，先断开
    if (this.currentSession) {
      await this.disconnectCurrentSession();
    }

    try {
      this.showNotification('正在连接...', 'info');
      
      // 处理SSH密钥认证
      const connectionConfig = { ...session };
      if (session.authType === 'key' && session.keyPath) {
        const result = await window.electronAPI.readSSHKey(session.keyPath);
        if (result.success) {
          connectionConfig.privateKey = result.keyContent;
        } else {
          this.showNotification('无法读取私钥文件: ' + result.error, 'error');
          return;
        }
      }
      
      const result = await window.electronAPI.sshConnect(connectionConfig);
      
      if (result.success) {
        this.currentSession = session;
        this.showNotification(`已连接到 ${session.name || session.host}`, 'success');
        this.renderSessions(); // 更新UI显示连接状态
        this.onSessionConnected(session);
      } else {
        this.showNotification('连接失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('连接失败: ' + error.message, 'error');
    }
  }

  async disconnectCurrentSession() {
    if (this.currentSession) {
      try {
        await window.electronAPI.sshDisconnect(this.currentSession.id);
        this.currentSession = null;
        this.renderSessions();
        this.showNotification('连接已断开', 'info');
      } catch (error) {
        console.error('断开连接失败:', error);
      }
    }
  }

  editSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      this.showSessionForm(session);
    }
  }

  hideSessionForm() {
    document.getElementById('session-form-modal').style.display = 'none';
  }

  importSessions() {
    // TODO: 实现会话导入功能
    this.showNotification('会话导入功能开发中...', 'info');
  }

  exportSessions() {
    // TODO: 实现会话导出功能
    this.showNotification('会话导出功能开发中...', 'info');
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

  onSessionConnected(session) {
    // 触发连接成功事件，其他模块可以监听
    window.dispatchEvent(new CustomEvent('sessionConnected', { detail: session }));
  }

  getCurrentSession() {
    return this.currentSession;
  }
}

// 导出供其他模块使用
window.sessionManager = new SessionManager();