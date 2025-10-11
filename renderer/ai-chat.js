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

    // 输入框内容变化事件（用于命令建议）
    this.input.addEventListener('input', (e) => {
      this.handleInputChange(e.target.value);
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

    // 初始化命令建议
    this.initializeCommandSuggestions();
    
    // 添加快速命令按钮
    this.addQuickCommandButtons();
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
    if (this.isProcessing) {
      this.addMessage('system', '正在处理上一个请求，请稍候...');
      return;
    }

    this.isProcessing = true;

    try {
      // 获取AI配置
      const aiConfig = window.settingsManager?.getAIConfig();
      if (!aiConfig || !aiConfig.apiKey) {
        this.isProcessing = false;
        return '请先在设置中配置AI模型信息（API Key、Base URL等）才能使用智能对话功能。';
      }

      // 检查SSH连接状态
      if (!this.currentSession) {
        this.isProcessing = false;
        return '请先连接SSH服务器才能执行命令。点击"会话管理"创建并连接SSH会话。';
      }

      // 解析用户意图和命令
      const intent = await this.parseUserIntent(message, aiConfig);
      
      if (intent.type === 'execute_command') {
        return await this.handleCommandExecution(intent, aiConfig);
      } else if (intent.type === 'file_operation') {
        return await this.handleFileOperation(intent, aiConfig);
      } else if (intent.type === 'system_info') {
        return await this.handleSystemInfo(intent, aiConfig);
      } else {
        // 普通对话
        return await this.handleGeneralChat(message, aiConfig);
      }

    } catch (error) {
      console.error('AI处理失败:', error);
      this.isProcessing = false;
      return `处理请求时出错: ${error.message}\n\n您可以尝试直接输入命令，如 "ls -la" 或 "pwd"。`;
    } finally {
      this.isProcessing = false;
    }
  }

  async parseUserIntent(message, aiConfig) {
    // 使用AI解析用户意图
    const systemPrompt = `你是一个SSH助手，需要解析用户的意图。请分析用户消息并返回JSON格式的意图分析。

当前连接信息: ${this.currentSession.username}@${this.currentSession.host}:${this.currentSession.port}

可能的意图类型:
1. "execute_command" - 用户想要执行具体命令
2. "file_operation" - 用户想要进行文件操作
3. "system_info" - 用户想要获取系统信息
4. "general_chat" - 普通对话

请返回JSON格式:
{
  "type": "意图类型",
  "command": "要执行的命令（如果有）",
  "description": "意图描述",
  "confidence": 0.9
}

用户消息: "${message}"`;

    try {
      const response = await this.callAIAPI(message, systemPrompt, aiConfig);
      
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('意图解析失败:', error);
    }

    // 降级到本地解析
    return this.parseIntentLocally(message);
  }

  parseIntentLocally(message) {
    const lowerMessage = message.toLowerCase();
    
    // 命令执行模式
    const commandPatterns = [
      /执行\s*(命令|command)?[:\s]*(.+)/i,
      /运行\s*(命令|command)?[:\s]*(.+)/i,
      /^(ls|pwd|cd|cat|grep|find|ps|top|df|du|mkdir|rm|cp|mv|chmod|chown|apt|yum|npm|pip|git|docker|kubectl|wget|curl|tail|head|sort|uniq|wc|whoami|id|uname|date|uptime|free|mount|umount|tar|zip|unzip|ssh|scp|rsync)\s*.*/i
    ];

    for (const pattern of commandPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'execute_command',
          command: match[2] || match[0],
          description: `执行命令: ${match[2] || match[0]}`,
          confidence: 0.8
        };
      }
    }

    // 文件操作
    if (lowerMessage.includes('文件') || lowerMessage.includes('目录') || lowerMessage.includes('folder')) {
      return {
        type: 'file_operation',
        command: null,
        description: '文件操作请求',
        confidence: 0.7
      };
    }

    // 系统信息
    if (lowerMessage.includes('系统') || lowerMessage.includes('信息') || lowerMessage.includes('system')) {
      return {
        type: 'system_info',
        command: null,
        description: '系统信息查询',
        confidence: 0.7
      };
    }

    // 默认为普通对话
    return {
      type: 'general_chat',
      command: null,
      description: '普通对话',
      confidence: 0.5
    };
  }

  async handleCommandExecution(intent, aiConfig) {
    const command = intent.command.trim();
    
    // 检查危险命令
    const dangerCheck = this.checkDangerousCommand(command);
    if (dangerCheck.isDangerous) {
      const confirmation = await this.requestUserConfirmation(
        `⚠️ 检测到潜在危险命令: ${command}\n\n${dangerCheck.reason}\n\n确定要执行吗？`
      );
      
      if (!confirmation) {
        return '❌ 用户取消了危险命令的执行。';
      }
    }

    // 在终端中显示AI正在执行的命令
    this.addTerminalMessage(`[AI执行] ${command}`, 'ai-command');

    try {
      // 执行命令
      const result = await window.terminal.executeCommandForAI(command);
      
      if (result.success) {
        // 格式化输出
        const formattedOutput = this.formatCommandOutput(command, result.output, result.code);
        
        // 请求AI分析结果
        const analysis = await this.analyzeCommandResult(command, result.output, aiConfig);
        
        return `✅ 命令执行完成\n\n${formattedOutput}\n\n🤖 **AI分析:**\n${analysis}`;
      } else {
        return `❌ 命令执行失败: ${result.error}`;
      }
    } catch (error) {
      return `❌ 执行命令时出错: ${error.message}`;
    }
  }

  async handleFileOperation(intent, aiConfig) {
    const systemPrompt = `用户想要进行文件操作。当前目录信息未知，请建议合适的Linux命令来帮助用户。

请提供具体的命令建议，例如：
- 列出文件: ls -la
- 查看当前目录: pwd
- 创建目录: mkdir dirname
- 删除文件: rm filename
- 复制文件: cp source dest
- 移动文件: mv source dest

用户消息: "${intent.description}"`;

    const response = await this.callAIAPI(intent.description, systemPrompt, aiConfig);
    return `📁 **文件操作建议:**\n\n${response}`;
  }

  async handleSystemInfo(intent, aiConfig) {
    const commands = [
      { name: '系统信息', cmd: 'uname -a' },
      { name: '磁盘使用', cmd: 'df -h' },
      { name: '内存使用', cmd: 'free -h' },
      { name: '系统负载', cmd: 'uptime' },
      { name: '当前用户', cmd: 'whoami' }
    ];

    let response = '🖥️ **系统信息:**\n\n';
    
    for (const { name, cmd } of commands) {
      try {
        this.addTerminalMessage(`[AI执行] ${cmd}`, 'ai-command');
        const result = await window.terminal.executeCommandForAI(cmd);
        
        if (result.success && result.output) {
          response += `**${name}:**\n\`\`\`\n${result.output.trim()}\n\`\`\`\n\n`;
        }
      } catch (error) {
        response += `**${name}:** 获取失败\n\n`;
      }
    }

    // 请求AI分析系统状态
    const analysisPrompt = `基于以上系统信息，请分析系统状态并提供简要总结。`;
    const analysis = await this.callAIAPI(analysisPrompt, '', aiConfig);
    
    response += `🤖 **AI分析:**\n${analysis}`;
    
    return response;
  }

  async handleGeneralChat(message, aiConfig) {
    const systemPrompt = `你是一个SSH助手，当前已连接到 ${this.currentSession.username}@${this.currentSession.host}:${this.currentSession.port}。

你可以帮助用户:
1. 执行Linux命令
2. 管理文件和目录
3. 获取系统信息
4. 提供技术建议

如果用户想要执行命令，请明确告诉用户你会执行命令并显示结果。

用户消息: "${message}"`;

    return await this.callAIAPI(message, systemPrompt, aiConfig);
  }

  async analyzeCommandResult(command, output, aiConfig) {
    const systemPrompt = `请分析以下命令的执行结果，提供简洁有用的解释和建议。

命令: ${command}
退出码: ${exitCode || '未知'}
输出: ${output}

请提供:
1. 结果解释
2. 如果有错误，说明原因
3. 相关建议

保持回答简洁实用。`;

    try {
      return await this.callAIAPI('请分析命令结果', systemPrompt, aiConfig);
    } catch (error) {
      return '命令结果分析暂时不可用。';
    }
  }

  formatCommandOutput(command, output, exitCode) {
    let formatted = `**命令:** \`${command}\`\n`;
    
    if (exitCode !== undefined) {
      formatted += `**退出码:** ${exitCode}\n`;
    }
    
    if (output) {
      formatted += `**输出:**\n\`\`\`\n${output}\n\`\`\``;
    } else {
      formatted += `**输出:** (无输出)`;
    }
    
    return formatted;
  }

  checkDangerousCommand(command) {
    const dangerousPatterns = [
      { pattern: /rm\s+-rf\s+\//, reason: '删除根目录下的所有文件' },
      { pattern: /rm\s+-rf\s+.*\*/, reason: '使用通配符递归删除，可能误删重要文件' },
      { pattern: /dd\s+if=/, reason: 'dd命令可能覆盖整个磁盘' },
      { pattern: /mkfs\./, reason: '格式化文件系统' },
      { pattern: /fdisk/, reason: '磁盘分区操作' },
      { pattern: /shutdown\s+/, reason: '关机操作' },
      { pattern: /reboot/, reason: '重启操作' },
      { pattern: /halt\s+/, reason: '停机操作' },
      { pattern: /poweroff\s+/, reason: '关机操作' },
      { pattern: />\s*\/dev\/sd[a-z]/, reason: '直接写入硬盘设备' },
      { pattern: /chmod\s+-R\s+777/, reason: '设置全局可写权限，存在安全风险' }
    ];

    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(command)) {
        return { isDangerous: true, reason };
      }
    }

    return { isDangerous: false };
  }

  async requestUserConfirmation(message) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal confirmation-modal';
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>⚠️ 危险命令确认</h3>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger" id="confirm-execute">确定执行</button>
            <button class="btn btn-secondary" id="cancel-execute">取消</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const confirmBtn = modal.querySelector('#confirm-execute');
      const cancelBtn = modal.querySelector('#cancel-execute');

      const cleanup = () => {
        modal.remove();
      };

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      // ESC键取消
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escHandler);
          cleanup();
          resolve(false);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  addTerminalMessage(message, className = '') {
    if (window.terminal) {
      window.terminal.appendOutput(message, className);
      window.terminal.scrollToBottom();
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

  initializeCommandSuggestions() {
    this.commonCommands = [
      { command: 'ls -la', description: '列出当前目录详细信息' },
      { command: 'pwd', description: '显示当前工作目录' },
      { command: 'whoami', description: '显示当前用户' },
      { command: 'df -h', description: '显示磁盘使用情况' },
      { command: 'free -h', description: '显示内存使用情况' },
      { command: 'ps aux', description: '显示进程列表' },
      { command: 'top', description: '显示系统资源使用情况' },
      { command: 'uname -a', description: '显示系统信息' },
      { command: 'cat filename', description: '查看文件内容' },
      { command: 'grep pattern file', description: '搜索文件内容' },
      { command: 'find . -name pattern', description: '查找文件' },
      { command: 'chmod 755 file', description: '修改文件权限' },
      { command: 'mkdir dirname', description: '创建目录' },
      { command: 'rm -rf dirname', description: '删除目录' },
      { command: 'cp source dest', description: '复制文件' },
      { command: 'mv source dest', description: '移动/重命名文件' }
    ];
  }

  handleInputChange(value) {
    // 简单的命令建议逻辑
    if (value.length > 2 && !this.isProcessing) {
      this.showCommandSuggestions(value);
    } else {
      this.hideCommandSuggestions();
    }
  }

  showCommandSuggestions(query) {
    // 移除已存在的建议
    this.hideCommandSuggestions();

    const suggestions = this.commonCommands.filter(cmd => 
      cmd.command.includes(query.toLowerCase()) || 
      cmd.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    if (suggestions.length === 0) return;

    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'command-suggestions';
    suggestionsContainer.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
    `;

    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'command-suggestion';
      item.innerHTML = `
        <div class="command">${suggestion.command}</div>
        <div class="description">${suggestion.description}</div>
      `;
      
      item.addEventListener('click', () => {
        this.input.value = suggestion.command;
        this.hideCommandSuggestions();
        this.input.focus();
      });

      suggestionsContainer.appendChild(item);
    });

    this.input.parentElement.style.position = 'relative';
    this.input.parentElement.appendChild(suggestionsContainer);
  }

  hideCommandSuggestions() {
    const existing = this.input.parentElement.querySelector('.command-suggestions');
    if (existing) {
      existing.remove();
    }
  }

  showProcessingStatus() {
    const status = document.createElement('div');
    status.className = 'ai-status processing';
    status.textContent = 'AI正在处理...';
    status.id = 'ai-processing-status';
    
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
      chatHeader.appendChild(status);
    }
  }

  hideProcessingStatus() {
    const status = document.getElementById('ai-processing-status');
    if (status) {
      status.remove();
    }
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isProcessing) return;

    // 添加用户消息
    this.addMessage('user', message);
    
    // 清空输入框
    this.input.value = '';
    this.hideCommandSuggestions();
    
    // 显示处理状态
    this.showProcessingStatus();
    this.showTyping();

    try {
      // 处理消息
      const response = await this.processMessage(message);
      this.hideTyping();
      this.addMessage('ai', response);
    } catch (error) {
      this.hideTyping();
      this.addMessage('ai', '处理请求时出现错误: ' + error.message);
    } finally {
      this.hideProcessingStatus();
      this.scrollToBottom();
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

  // 添加快速命令按钮
  addQuickCommandButtons() {
    const quickCommands = [
      { icon: '📁', command: 'ls -la', tooltip: '列出文件' },
      { icon: '📍', command: 'pwd', tooltip: '当前目录' },
      { icon: '💾', command: 'df -h', tooltip: '磁盘使用' },
      { icon: '🧠', command: 'free -h', tooltip: '内存使用' }
    ];

    const container = document.createElement('div');
    container.className = 'quick-commands';
    container.style.cssText = `
      display: flex;
      gap: 5px;
      padding: 10px;
      border-top: 1px solid #3e3e42;
    `;

    quickCommands.forEach(({ icon, command, tooltip }) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.innerHTML = icon;
      btn.title = tooltip;
      btn.addEventListener('click', () => {
        this.input.value = command;
        this.input.focus();
      });
      container.appendChild(btn);
    });

    const chatInputContainer = document.querySelector('.chat-input-container');
    if (chatInputContainer) {
      chatInputContainer.insertBefore(container, chatInputContainer.firstChild);
    }
  }
}

// 创建全局AI聊天实例
window.aiChat = new AIChat();