class AIChat {
  constructor() {
    this.messagesContainer = document.getElementById('chat-messages');
    this.input = document.getElementById('chat-input');
    this.sendButton = document.getElementById('btn-send-message');
    this.currentSession = null;
    this.commandHistory = [];
    this.isProcessing = false;
    this.init();
  }

  init() {
    // 发送按钮事件
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // 输入框事件
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // 清空聊天按钮
    document.getElementById('btn-clear-chat').addEventListener('click', () => {
      this.clearChat();
    });

    // AI设置按钮
    document.getElementById('btn-ai-settings').addEventListener('click', () => {
      this.showAISettings();
    });

    // 监听会话连接事件
    window.addEventListener('sessionConnected', (e) => {
      this.onSessionConnected(e.detail);
    });
  }

  onSessionConnected(session) {
    this.currentSession = session;
    this.addMessage('system', `已连接到 ${session.username}@${session.host}，我现在可以帮您执行命令了！`);
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message) return;

    // 添加用户消息
    this.addMessage('user', message);
    
    // 清空输入框
    this.input.value = '';
    
    // 显示AI正在思考
    this.showTyping();

    try {
      // 模拟AI响应（实际应用中这里应该调用真实的AI API）
      const response = await this.processMessage(message);
      this.hideTyping();
      this.addMessage('ai', response);
    } catch (error) {
      this.hideTyping();
      this.addMessage('ai', '抱歉，处理您的请求时出现错误: ' + error.message);
    }

    this.scrollToBottom();
  }

  async processMessage(message) {
    // 获取AI配置
    const aiConfig = window.settingsManager?.getAIConfig();
    if (!aiConfig || !aiConfig.apiKey) {
      return '请先在设置中配置AI模型信息（API Key、Base URL等）才能使用智能对话功能。';
    }

    try {
      // 检查是否包含命令执行请求
      const commandPatterns = [
        /执行\s*(命令|command)[:\s]*(.+)/i,
        /运行\s*(命令|command)[:\s]*(.+)/i,
        /(ls|pwd|cd|cat|grep|find|ps|top|df|du|mkdir|rm|cp|mv|chmod|chown|apt|yum|npm|pip|git|docker|kubectl)\s*.*/i
      ];

      let commandToExecute = null;
      
      for (const pattern of commandPatterns) {
        const match = message.match(pattern);
        if (match) {
          commandToExecute = match[2] || match[0];
          break;
        }
      }

      // 构建系统提示词
      let systemPrompt = `你是一个SSH助手，可以帮助用户执行命令和管理文件。`;
      
      if (this.currentSession) {
        systemPrompt += `当前已连接到 ${this.currentSession.username}@${this.currentSession.host}:${this.currentSession.port}。`;
      } else {
        systemPrompt += `当前没有SSH连接。`;
      }

      if (commandToExecute) {
        systemPrompt += `用户要求执行命令: ${commandToExecute}。请先分析这个命令的安全性，然后执行并返回结果。如果是危险命令，请提醒用户。`;
      } else if (message.includes('文件') || message.includes('目录') || message.includes('folder')) {
        systemPrompt += `用户询问文件相关操作。你可以建议合适的命令来帮助用户。`;
      } else if (message.includes('系统') || message.includes('信息') || message.includes('system')) {
        systemPrompt += `用户询问系统信息。你可以建议获取系统信息的命令。`;
      }

      // 调用真实AI API
      const response = await this.callAIAPI(message, systemPrompt, aiConfig);
      
      // 如果AI返回了要执行的命令，执行它
      if (commandToExecute && response.includes('执行命令')) {
        const commandResult = await this.executeCommand(commandToExecute);
        return `${response}\n\n${commandResult}`;
      }
      
      return response;

    } catch (error) {
      console.error('AI处理失败:', error);
      
      // 降级到本地处理
      if (message.includes('执行') || message.includes('运行')) {
        return await this.executeCommand(message);
      }
      
      return `AI服务暂时不可用: ${error.message}\n\n您可以尝试直接输入命令，我会尽力帮助您执行。`;
    }
  }

  async callAIAPI(message, systemPrompt, aiConfig) {
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

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: message
      }
    ];

    const requestBody = {
      model: aiConfig.model,
      messages,
      max_tokens: aiConfig.maxTokens || 2000,
      temperature: aiConfig.temperature || 0.7
    };

    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API错误: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('AI响应格式异常');
    }
  }

  async executeCommand(command) {
    if (!this.currentSession) {
      return '请先连接SSH服务器才能执行命令。';
    }

    try {
      const result = await window.terminal.executeCommandForAI(command);
      
      if (result.success) {
        let response = `✅ 命令执行成功: \`${command}\`\n\n`;
        if (result.output) {
          response += '```\n' + result.output + '\n```';
        }
        return response;
      } else {
        return `❌ 命令执行失败: \`${command}\`\n\n错误: ${result.error}`;
      }
    } catch (error) {
      return `❌ 执行命令时出错: ${error.message}`;
    }
  }

  async handleFileRequest(message) {
    if (!this.currentSession) {
      return '请先连接SSH服务器才能查看文件信息。';
    }

    try {
      if (message.includes('当前目录') || message.includes('pwd')) {
        const result = await window.terminal.executeCommandForAI('pwd');
        if (result.success) {
          return `📁 当前工作目录: ${result.output.trim()}`;
        }
      }

      if (message.includes('列出文件') || message.includes('ls')) {
        const result = await window.terminal.executeCommandForAI('ls -la');
        if (result.success) {
          return `📋 当前目录文件列表:\n\n\`\`\`\n${result.output}\n\`\`\``;
        }
      }

      return '我可以帮您执行文件相关的命令，比如:\n• "列出文件" 或 "ls"\n• "当前目录" 或 "pwd"\n• "执行命令 mkdir test"';
    } catch (error) {
      return '处理文件请求时出错: ' + error.message;
    }
  }

  async getSystemInfo() {
    if (!this.currentSession) {
      return '请先连接SSH服务器才能获取系统信息。';
    }

    try {
      const commands = [
        { name: '操作系统', cmd: 'uname -a' },
        { name: '磁盘使用', cmd: 'df -h' },
        { name: '内存使用', cmd: 'free -h' },
        { name: '系统负载', cmd: 'uptime' }
      ];

      let response = '🖥️ 系统信息:\n\n';
      
      for (const { name, cmd } of commands) {
        try {
          const result = await window.terminal.executeCommandForAI(cmd);
          if (result.success) {
            response += `**${name}:**\n\`\`\`\n${result.output.trim()}\n\`\`\`\n\n`;
          }
        } catch (error) {
          response += `**${name}:** 获取失败\n\n`;
        }
      }

      return response;
    } catch (error) {
      return '获取系统信息时出错: ' + error.message;
    }
  }

  generateDefaultResponse(message) {
    const aiConfig = window.settingsManager?.getAIConfig();
    
    if (!aiConfig || !aiConfig.apiKey) {
      return `🤖 AI助手未配置

请在设置中配置AI模型信息：
1. 点击右上角的"设置"按钮
2. 选择"AI配置"标签
3. 填写API提供商、Base URL、API Key和模型名称
4. 保存配置后即可使用智能对话功能

在配置完成前，您可以：
• 直接输入Linux命令执行
• 使用文件浏览器管理文件
• 查看系统信息`;
    }

    const responses = [
      '我是您的SSH助手，可以帮您:\n• 执行命令（如：执行命令 ls -la）\n• 查看文件和目录\n• 获取系统信息\n• 管理文件操作',
      
      '您可以这样问我:\n• "执行命令 pwd"\n• "列出当前目录的文件"\n• "显示系统信息"\n• "创建一个名为test的目录"',
      
      '我支持各种Linux/Unix命令，包括文件操作、系统管理、网络工具等。请告诉我您需要什么帮助？',
      
      '我可以直接在SSH服务器上执行命令并返回结果。试试说"执行命令"加上您想运行的命令。'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // 处理Markdown格式
    if (content.includes('```')) {
      contentDiv.innerHTML = this.formatMarkdown(content);
    } else {
      contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(contentDiv);
    
    // 添加时间戳
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString();
    messageDiv.appendChild(timeDiv);
    
    this.messagesContainer.appendChild(messageDiv);
  }

  formatMarkdown(text) {
    // 简单的Markdown格式化
    return text
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/✅/g, '✅')
      .replace(/❌/g, '❌')
      .replace(/📁/g, '📁')
      .replace(/📋/g, '📋')
      .replace(/🖥️/g, '🖥️')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai-message typing-indicator';
    typingDiv.innerHTML = `
      <div class="message-content">
        <span class="typing-dots">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTyping() {
    const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  clearChat() {
    this.messagesContainer.innerHTML = `
      <div class="chat-message ai-message">
        <div class="message-content">
          聊天记录已清空。有什么可以帮助您的吗？
        </div>
      </div>
    `;
  }

  showAISettings() {
    // TODO: 实现AI设置界面
    this.showNotification('AI设置功能开发中...', 'info');
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
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