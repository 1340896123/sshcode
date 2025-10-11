class AIChat {
  constructor() {
    this.chats = new Map(); // 存储每个标签页的聊天状态
    this.currentTabId = null;
    this.init();
  }

  // 获取当前标签页的聊天状态
  getCurrentChat() {
    if (!this.currentTabId) {
      this.currentTabId = window.tabManager?.getActiveTabId();
    }
    return this.chats.get(this.currentTabId);
  }

  // 获取或创建聊天状态
  getOrCreateChat(tabId) {
    if (!this.chats.has(tabId)) {
      this.chats.set(tabId, {
        messagesContainer: document.querySelector(`.chat-messages[data-tab-id="${tabId}"]`),
        inputElement: document.querySelector(`.chat-input[data-tab-id="${tabId}"]`),
        sendButton: document.querySelector(`.btn-send-message[data-tab-id="${tabId}"]`),
        currentSession: null,
        messages: []
      });
    }
    return this.chats.get(tabId);
  }

  init() {
    // 监听标签页切换事件
    window.addEventListener('tabSwitch', (e) => {
      this.currentTabId = e.detail.tabId;
    });

    // 使用事件委托处理所有聊天相关事件
    this.setupEventDelegation();
    
    // 监听会话连接事件
    window.addEventListener('sessionConnected', (e) => {
      this.onSessionConnected(e.detail);
    });
  }

  setupEventDelegation() {
    // 发送消息按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-send-message')) {
        const tabId = e.target.dataset.tabId;
        this.sendMessage(tabId);
      }
    });

    // 清空聊天按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-clear-chat')) {
        const tabId = e.target.dataset.tabId;
        this.clearChat(tabId);
      }
    });

    // AI设置按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-ai-settings')) {
        // 打开AI设置模态框
        document.getElementById('settings-modal').style.display = 'block';
        // 切换到AI配置标签
        document.querySelector('[data-tab="ai"]').click();
      }
    });

    // 聊天输入框事件
    document.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('chat-input')) {
        const tabId = e.target.dataset.tabId;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage(tabId);
        }
      }
    });
  }

  async sendMessage(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const chat = this.getOrCreateChat(tabId);
    const message = chat.inputElement.value.trim();
    
    if (!message) return;

    // 添加用户消息
    this.addMessage('user', message, tabId);
    chat.inputElement.value = '';

    // 禁用发送按钮
    chat.sendButton.disabled = true;
    chat.sendButton.textContent = '发送中...';

    try {
      // 获取AI配置
      const config = await window.electronAPI.getConfig();
      const aiConfig = config.ai;

      if (!aiConfig.apiKey) {
        this.addMessage('ai', '请先在设置中配置AI API密钥', tabId);
        return;
      }

      // 构建请求
      const response = await this.callAI(message, aiConfig, chat.currentSession);
      
      if (response.success) {
        this.addMessage('ai', response.message, tabId);
      } else {
        this.addMessage('ai', `AI响应错误: ${response.error}`, tabId);
      }
    } catch (error) {
      this.addMessage('ai', `发送消息时发生错误: ${error.message}`, tabId);
    } finally {
      // 恢复发送按钮
      chat.sendButton.disabled = false;
      chat.sendButton.textContent = '发送';
    }
  }

  async callAI(message, aiConfig, session) {
    try {
      // 构建系统提示词
      const systemPrompt = this.buildSystemPrompt(session);
      
      // 构建请求头
      const headers = {
        'Content-Type': 'application/json'
      };

      if (aiConfig.provider === 'openai') {
        headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      } else if (aiConfig.provider === 'anthropic') {
        headers['x-api-key'] = aiConfig.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      }

      // 构建请求体
      const requestBody = {
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: aiConfig.maxTokens || 2000,
        temperature: aiConfig.temperature || 0.7
      };

      // 发送请求
      const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        return {
          success: true,
          message: data.choices[0].message.content
        };
      } else {
        return {
          success: false,
          error: 'AI响应格式异常'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  buildSystemPrompt(session) {
    let prompt = `你是一个SSH助手，帮助用户管理远程服务器和执行命令。`;

    if (session) {
      prompt += `\n\n当前连接信息：
- 服务器：${session.name || session.host}
- 主机地址：${session.host}
- 端口：${session.port}
- 用户名：${session.username}`;
    }

    prompt += `\n\n你的能力包括：
1. 执行SSH命令并解释结果
2. 文件管理操作
3. 系统信息查询
4. 故障排查建议
5. 安全最佳实践指导

请根据用户的需求提供准确、有用的帮助。如果需要执行危险操作，请提醒用户注意风险。`;

    return prompt;
  }

  addMessage(role, content, tabId) {
    const chat = this.getOrCreateChat(tabId);
    if (!chat.messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // 处理代码块
    content = this.formatMessage(content);
    contentDiv.innerHTML = content;

    messageDiv.appendChild(contentDiv);
    chat.messagesContainer.appendChild(messageDiv);

    // 滚动到底部
    chat.messagesContainer.scrollTop = chat.messagesContainer.scrollHeight;

    // 保存到消息历史
    chat.messages.push({ role, content, timestamp: new Date() });
  }

  formatMessage(content) {
    // 转义HTML
    content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 处理代码块
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });
    
    // 处理行内代码
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 处理换行
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }

  clearChat(tabId = null) {
    if (!tabId) {
      tabId = this.currentTabId || window.tabManager?.getActiveTabId();
    }
    
    const chat = this.getOrCreateChat(tabId);
    if (chat.messagesContainer) {
      chat.messagesContainer.innerHTML = `
        <div class="chat-message ai-message">
          <div class="message-content">
            您好！我是AI助手，可以帮助您执行命令和管理文件。请告诉我您需要什么帮助？
          </div>
        </div>
      `;
      chat.messages = [];
    }
  }

  onSessionConnected(session, tabId = null) {
    if (tabId) {
      const chat = this.getOrCreateChat(tabId);
      chat.currentSession = session;
      
      // 添加连接成功消息
      this.addMessage('ai', 
        `已连接到服务器 ${session.name || session.host}。我现在可以帮您执行命令和管理文件了。`, 
        tabId
      );
    } else {
      // 兼容旧版本，更新当前标签页
      const currentTabId = window.tabManager?.getActiveTabId();
      if (currentTabId) {
        this.onSessionConnected(session, currentTabId);
      }
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
}

// 创建AI聊天实例
window.aiChat = new AIChat();