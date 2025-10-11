class Terminal {
  constructor() {
    this.output = document.getElementById('terminal-output');
    this.input = document.getElementById('terminal-input');
    this.prompt = document.getElementById('terminal-prompt');
    this.currentSession = null;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.completionCache = new Map();
    this.init();
  }

  init() {
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // 监听会话连接事件
    window.addEventListener('sessionConnected', (e) => {
      this.onSessionConnected(e.detail);
    });

    // 清空终端按钮
    document.getElementById('btn-clear-terminal').addEventListener('click', () => {
      this.clear();
    });

    // 复制输出按钮
    document.getElementById('btn-copy-output').addEventListener('click', () => {
      this.copyOutput();
    });
  }

  handleKeyDown(e) {
    if (!this.currentSession) {
      return;
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.executeCommand();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.navigateHistory(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.navigateHistory(1);
        break;
      case 'Tab':
        e.preventDefault();
        this.handleTabCompletion();
        break;
    }
  }

  async executeCommand() {
    const command = this.input.value.trim();
    if (!command) return;

    // 添加到历史记录
    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;

    // 显示命令
    this.appendOutput(`${this.prompt.textContent}${command}`, 'command');
    
    // 清空输入
    this.input.value = '';

    try {
      // 执行命令
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        if (result.output) {
          this.appendOutput(result.output, 'output');
        }
        if (result.code !== 0) {
          this.appendOutput(`命令执行完成，退出码: ${result.code}`, 'warning');
        }
      } else {
        this.appendOutput(`错误: ${result.error}`, 'error');
      }
    } catch (error) {
      this.appendOutput(`执行失败: ${error.message}`, 'error');
    }

    // 滚动到底部
    this.scrollToBottom();
  }

  navigateHistory(direction) {
    if (this.commandHistory.length === 0) return;

    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length;
      this.input.value = '';
      return;
    }

    this.input.value = this.commandHistory[this.historyIndex];
  }

  appendOutput(text, className = '') {
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    this.output.appendChild(line);
  }

  clear() {
    this.output.innerHTML = '';
  }

  copyOutput() {
    const text = this.output.textContent;
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('终端输出已复制到剪贴板', 'success');
    }).catch(() => {
      this.showNotification('复制失败', 'error');
    });
  }

  scrollToBottom() {
    const terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
  }

  onSessionConnected(session) {
    this.currentSession = session;
    this.input.disabled = false;
    this.prompt.textContent = `${session.username}@${session.host}:$ `;
    this.appendOutput(`已连接到 ${session.username}@${session.host}:${session.port}`, 'success');
    this.appendOutput('欢迎使用SSH终端！', 'info');
    this.scrollToBottom();
    
    // 更新连接状态
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = `已连接: ${session.name || session.host}`;
    statusElement.classList.add('connected');
  }

  disconnect() {
    if (this.currentSession) {
      window.electronAPI.sshDisconnect(this.currentSession.id);
      this.currentSession = null;
      this.input.disabled = true;
      this.prompt.textContent = '$ ';
      this.appendOutput('连接已断开', 'warning');
      
      // 更新连接状态
      const statusElement = document.getElementById('connection-status');
      statusElement.textContent = '未连接';
      statusElement.classList.remove('connected');
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

  // 供AI调用的方法
  async executeCommandForAI(command, options = {}) {
    if (!this.currentSession) {
      return { success: false, error: '没有活动的SSH连接' };
    }

    const { silent = false, showInTerminal = true } = options;

    try {
      // 在终端中显示AI执行的命令
      if (showInTerminal) {
        this.appendOutput(`[AI执行] ${command}`, 'ai-command');
      }
      
      const result = await window.electronAPI.sshExecute(this.currentSession.id, command);
      
      if (result.success) {
        if (result.output && showInTerminal) {
          this.appendOutput(result.output, 'ai-output');
        }
        
        // 添加到命令历史
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // 记录AI执行的命令
        this.recordAICommand(command, result);
      } else {
        if (showInTerminal) {
          this.appendOutput(`[AI执行失败] ${result.error}`, 'error');
        }
      }
      
      if (!silent) {
        this.scrollToBottom();
      }
      
      return result;
    } catch (error) {
      if (showInTerminal) {
        this.appendOutput(`[AI执行失败] ${error.message}`, 'error');
        this.scrollToBottom();
      }
      return { success: false, error: error.message };
    }
  }

  recordAICommand(command, result) {
    // 记录AI执行的命令历史，用于后续分析
    if (!this.aiCommandHistory) {
      this.aiCommandHistory = [];
    }
    
    this.aiCommandHistory.push({
      command,
      result,
      timestamp: new Date().toISOString(),
      success: result.success
    });
    
    // 保持最近50条记录
    if (this.aiCommandHistory.length > 50) {
      this.aiCommandHistory.shift();
    }
  }

  getAICommandHistory() {
    return this.aiCommandHistory || [];
  }

  // 批量执行命令（用于复杂操作）
  async executeCommandsForAI(commands, options = {}) {
    const results = [];
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        const result = await this.executeCommandForAI(command, {
          ...options,
          showInTerminal: options.showEachStep !== false
        });
        
        results.push(result);
        
        // 如果命令失败且设置了停止执行，则中断
        if (!result.success && options.stopOnError) {
          break;
        }
        
        // 命令间延迟（如果设置了）
        if (options.delayBetweenCommands && i < commands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenCommands));
        }
        
      } catch (error) {
        results.push({ success: false, error: error.message });
        
        if (options.stopOnError) {
          break;
        }
      }
    }
    
    return results;
  }

  // 获取当前工作目录
  async getCurrentDirectory() {
    try {
      const result = await this.executeCommandForAI('pwd', { silent: true });
      return result.success ? result.output.trim() : null;
    } catch (error) {
      return null;
    }
  }

  // 获取用户信息
  async getCurrentUser() {
    try {
      const result = await this.executeCommandForAI('whoami', { silent: true });
      return result.success ? result.output.trim() : null;
    } catch (error) {
      return null;
    }
  }

  // 检查命令是否存在
  async commandExists(command) {
    try {
      const result = await this.executeCommandForAI(`which ${command}`, { silent: true });
      return result.success && result.output.trim() !== '';
    } catch (error) {
      return false;
    }
  }

  getCurrentSession() {
    return this.currentSession;
  }

  // 处理Tab补全
  async handleTabCompletion() {
    if (!this.currentSession) return;

    const currentValue = this.input.value;
    const cursorPosition = this.input.selectionStart;
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const textAfterCursor = currentValue.substring(cursorPosition);

    // 检查AI补全是否配置
    const aiConfig = window.settingsManager?.getCompletionAIConfig();
    const useAI = aiConfig && aiConfig.apiKey;

    if (useAI) {
      // 显示AI正在思考
      this.showAIThinking();
    }

    try {
      let completions = [];
      
      if (useAI) {
        // 使用AI进行智能补全
        completions = await this.getAICompletions(textBeforeCursor, currentValue);
      }

      if (completions.length === 0) {
        // 如果AI补全没有结果或未配置AI，使用传统补全
        await this.fallbackCompletion(textBeforeCursor, textAfterCursor);
        return;
      }

      if (completions.length === 1) {
        // 只有一个补全项，直接应用
        const completion = completions[0];
        const { lastArgStart } = this.parseCommandInput(textBeforeCursor);
        const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, completion, lastArgStart);
        this.input.value = newText;
        this.input.setSelectionRange(newText.length - textAfterCursor.length, newText.length - textAfterCursor.length);
      } else {
        // 多个补全项，显示所有可能的补全
        this.showCompletionSuggestions(completions, textBeforeCursor, textAfterCursor);
        
        // 如果有共同前缀，补全到共同前缀
        const commonPrefix = this.findCommonPrefix(completions);
        const { command, args, lastArgStart } = this.parseCommandInput(textBeforeCursor);
        const currentText = args[args.length - 1] || command;
        
        if (commonPrefix && currentText.length < commonPrefix.length) {
          const completion = { text: commonPrefix, type: 'partial' };
          const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, completion, lastArgStart);
          this.input.value = newText;
          this.input.setSelectionRange(newText.length - textAfterCursor.length, newText.length - textAfterCursor.length);
        }
      }
    } catch (error) {
      console.error('补全失败:', error);
      // 降级到传统补全
      await this.fallbackCompletion(textBeforeCursor, textAfterCursor);
    } finally {
      if (useAI) {
        this.hideAIThinking();
      }
    }
  }

  // 解析命令输入
  parseCommandInput(text) {
    const parts = text.trim().split(/\s+/);
    const command = parts[0] || '';
    const args = parts.slice(1);
    
    // 找到最后一个参数的开始位置
    let lastArgStart = text.length;
    if (args.length > 0) {
      const lastSpaceIndex = text.lastIndexOf(' ');
      lastArgStart = lastSpaceIndex + 1;
    }
    
    return { command, args, lastArgStart };
  }

  // 获取命令补全
  async getCommandCompletions(partialCommand) {
    const cacheKey = `commands_${partialCommand}`;
    if (this.completionCache.has(cacheKey)) {
      return this.completionCache.get(cacheKey);
    }

    // 常用Linux命令列表
    const commonCommands = [
      'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'touch',
      'cat', 'less', 'more', 'head', 'tail', 'grep', 'find', 'locate',
      'chmod', 'chown', 'chgrp', 'tar', 'gzip', 'gunzip', 'zip', 'unzip',
      'ps', 'top', 'htop', 'kill', 'killall', 'jobs', 'bg', 'fg',
      'df', 'du', 'free', 'uname', 'whoami', 'id', 'date', 'uptime',
      'ping', 'wget', 'curl', 'ssh', 'scp', 'rsync', 'netstat',
      'apt', 'apt-get', 'yum', 'dnf', 'pacman', 'pip', 'npm', 'yarn',
      'git', 'docker', 'kubectl', 'vim', 'nano', 'emacs', 'echo', 'printf',
      'export', 'env', 'set', 'unset', 'alias', 'unalias', 'history',
      'man', 'help', 'which', 'whereis', 'type', 'whatis'
    ];

    // 过滤匹配的命令
    let completions = commonCommands.filter(cmd => 
      cmd.startsWith(partialCommand.toLowerCase())
    ).map(cmd => ({ text: cmd, type: 'command' }));

    // 尝试从系统中获取可用命令
    try {
      const result = await this.executeCommandForAI('compgen -c', { silent: true, showInTerminal: false });
      if (result.success && result.output) {
        const systemCommands = result.output.split('\n')
          .filter(cmd => cmd.trim() && cmd.startsWith(partialCommand.toLowerCase()))
          .map(cmd => ({ text: cmd.trim(), type: 'command' }));
        
        // 合并并去重
        const allCommands = new Map();
        completions.forEach(cmd => allCommands.set(cmd.text, cmd));
        systemCommands.forEach(cmd => allCommands.set(cmd.text, cmd));
        completions = Array.from(allCommands.values());
      }
    } catch (error) {
      // 如果获取系统命令失败，使用内置列表
    }

    // 缓存结果
    this.completionCache.set(cacheKey, completions);
    return completions;
  }

  // 获取路径补全
  async getPathCompletions(partialPath) {
    if (!partialPath) {
      partialPath = '.';
    }

    try {
      // 获取目录内容
      const dir = partialPath.endsWith('/') ? partialPath : partialPath.substring(0, partialPath.lastIndexOf('/') + 1) || '.';
      const baseName = partialPath.endsWith('/') ? '' : partialPath.substring(partialPath.lastIndexOf('/') + 1);
      
      const result = await this.executeCommandForAI(`ls -la "${dir}"`, { silent: true, showInTerminal: false });
      
      if (!result.success || !result.output) {
        return [];
      }

      const completions = [];
      const lines = result.output.split('\n');
      
      for (const line of lines) {
        // 跳过总计行和空行
        if (line.startsWith('total') || !line.trim()) continue;
        
        const parts = line.trim().split(/\s+/);
        if (parts.length < 9) continue;
        
        const name = parts.slice(8).join(' ');
        const isDirectory = line.startsWith('d');
        
        if (name.startsWith(baseName)) {
          let completionText = name;
          if (isDirectory) {
            completionText += '/';
          }
          
          completions.push({
            text: completionText,
            type: isDirectory ? 'directory' : 'file',
            fullPath: dir === '.' ? name : dir + name
          });
        }
      }

      return completions;
    } catch (error) {
      console.error('路径补全失败:', error);
      return [];
    }
  }

  // 应用补全
  applyCompletion(textBeforeCursor, textAfterCursor, completion, lastArgStart) {
    if (completion.type === 'partial') {
      // 部分补全，只替换共同前缀部分
      return textBeforeCursor + completion.text.substring(textBeforeCursor.length - lastArgStart) + textAfterCursor;
    } else {
      // 完整补全
      const beforeLastArg = textBeforeCursor.substring(0, lastArgStart);
      return beforeLastArg + completion.text + textAfterCursor;
    }
  }

  // 找到共同前缀
  findCommonPrefix(completions) {
    if (completions.length === 0) return '';
    if (completions.length === 1) return completions[0].text;

    const first = completions[0].text;
    let prefix = '';
    
    for (let i = 0; i < first.length; i++) {
      const char = first[i];
      const allMatch = completions.every(comp => comp.text[i] === char);
      
      if (allMatch) {
        prefix += char;
      } else {
        break;
      }
    }
    
    return prefix;
  }

  // 显示补全建议
  showCompletionSuggestions(completions, textBeforeCursor, textAfterCursor) {
    // 创建补全建议容器
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'completion-suggestions';
    suggestionsDiv.style.cssText = `
      position: absolute;
      background: #1e1e1e;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 8px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      color: #d4d4d4;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      min-width: 300px;
    `;

    // 添加AI标识
    const aiHeader = document.createElement('div');
    aiHeader.className = 'ai-completion-header';
    aiHeader.style.cssText = `
      color: #4ec9b0;
      font-weight: bold;
      margin-bottom: 8px;
      padding: 4px 8px;
      background: rgba(78, 201, 176, 0.1);
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    aiHeader.innerHTML = `<span>🤖</span><span>AI 智能补全</span>`;
    suggestionsDiv.appendChild(aiHeader);

    // 按类型分组显示
    const grouped = this.groupCompletionsByType(completions);
    
    for (const [type, items] of Object.entries(grouped)) {
      if (items.length === 0) continue;
      
      const typeHeader = document.createElement('div');
      typeHeader.className = 'type-header';
      typeHeader.textContent = this.getTypeDisplayName(type);
      suggestionsDiv.appendChild(typeHeader);
      
      items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'completion-item';
        itemDiv.style.cssText = `
          padding: 6px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          border-radius: 3px;
          transition: background-color 0.2s ease;
        `;
        
        // 添加图标和文本
        const icon = this.getTypeIcon(item.type);
        const confidence = item.confidence ? ` (${Math.round(item.confidence * 100)}%)` : '';
        const description = item.description ? `<span class="completion-desc">${item.description}</span>` : '';
        
        itemDiv.innerHTML = `
          <span class="completion-icon">${icon}</span>
          <span class="completion-text">${item.text}${confidence}</span>
          ${description}
        `;
        
        itemDiv.addEventListener('mouseenter', () => {
          itemDiv.style.background = '#2d2d30';
        });
        
        itemDiv.addEventListener('mouseleave', () => {
          itemDiv.style.background = 'transparent';
        });
        
        itemDiv.addEventListener('click', () => {
          this.applySuggestion(item, textBeforeCursor, textAfterCursor);
          suggestionsDiv.remove();
        });
        
        suggestionsDiv.appendChild(itemDiv);
      });
    }

    // 定位建议框
    const terminalRect = this.input.getBoundingClientRect();
    suggestionsDiv.style.bottom = `${window.innerHeight - terminalRect.top + 5}px`;
    suggestionsDiv.style.left = `${terminalRect.left}px`;

    document.body.appendChild(suggestionsDiv);

    // 点击其他地方关闭建议框
    const closeHandler = (e) => {
      if (!suggestionsDiv.contains(e.target)) {
        suggestionsDiv.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);

    // ESC键关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        suggestionsDiv.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // 按类型分组补全项
  groupCompletionsByType(completions) {
    const grouped = {
      command: [],
      directory: [],
      file: []
    };
    
    completions.forEach(comp => {
      if (grouped[comp.type]) {
        grouped[comp.type].push(comp);
      } else {
        grouped.file.push(comp);
      }
    });
    
    return grouped;
  }

  // 获取类型显示名称
  getTypeDisplayName(type) {
    const names = {
      command: '命令',
      directory: '目录',
      file: '文件'
    };
    return names[type] || type;
  }

  // 获取类型图标
  getTypeIcon(type) {
    const icons = {
      command: '⚡',
      directory: '📁',
      file: '📄'
    };
    return icons[type] || '📄';
  }

  // 应用选中的建议
  applySuggestion(suggestion, textBeforeCursor, textAfterCursor) {
    if (!textBeforeCursor) {
      const currentValue = this.input.value;
      const cursorPosition = this.input.selectionStart;
      textBeforeCursor = currentValue.substring(0, cursorPosition);
      textAfterCursor = currentValue.substring(cursorPosition);
    }
    
    const { lastArgStart } = this.parseCommandInput(textBeforeCursor);
    const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, suggestion, lastArgStart);
    
    this.input.value = newText;
    this.input.focus();
    this.input.setSelectionRange(newText.length - textAfterCursor.length, newText.length - textAfterCursor.length);
  }

  // AI智能补全
  async getAICompletions(textBeforeCursor, fullText) {
    const aiConfig = window.settingsManager?.getCompletionAIConfig();
    if (!aiConfig || !aiConfig.apiKey) {
      throw new Error('AI补全未配置');
    }

    // 获取当前上下文信息
    const currentDir = await this.getCurrentDirectory();
    const currentUser = await this.getCurrentUser();
    const recentCommands = this.commandHistory.slice(-5); // 最近5条命令

    const systemPrompt = `你是一个Linux终端智能补全助手。请根据用户的输入和上下文提供准确的补全建议。

当前环境信息：
- 用户: ${currentUser || 'unknown'}
- 当前目录: ${currentDir || 'unknown'}
- 最近命令: ${recentCommands.join(', ')}

用户当前输入: "${textBeforeCursor}"

请分析用户意图并提供补全建议。返回JSON格式：
{
  "completions": [
    {
      "text": "补全文本",
      "type": "command|directory|file|argument",
      "description": "简短描述",
      "confidence": 0.9
    }
  ],
  "context": "上下文说明"
}

补全类型说明：
- command: Linux命令
- directory: 目录路径
- file: 文件路径  
- argument: 命令参数

请提供最多5个最相关的补全建议，按confidence降序排列。`;

    try {
      const response = await this.callAIAPI('', systemPrompt, aiConfig);
      
      // 解析AI响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiResult = JSON.parse(jsonMatch[0]);
        return aiResult.completions || [];
      }
      
      throw new Error('AI响应格式异常');
    } catch (error) {
      console.error('AI补全调用失败:', error);
      throw error;
    }
  }

  // 调用AI API
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
      }
    ];

    if (message) {
      messages.push({
        role: 'user',
        content: message
      });
    }

    const requestBody = {
      model: aiConfig.model,
      messages,
      max_tokens: aiConfig.maxTokens || 1000,
      temperature: aiConfig.temperature || 0.3
    };

    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AI API错误: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('AI响应格式异常');
    }
  }

  // 降级到传统补全
  async fallbackCompletion(textBeforeCursor, textAfterCursor) {
    const { command, args, lastArgStart } = this.parseCommandInput(textBeforeCursor);
    
    let completions = [];
    
    if (!command) {
      // 补全命令
      completions = await this.getCommandCompletions('');
    } else if (args.length === 0 || (args.length === 1 && !textBeforeCursor.endsWith(' '))) {
      // 补全第一个参数或命令本身
      if (textBeforeCursor.endsWith(' ') || lastArgStart === textBeforeCursor.length) {
        completions = await this.getCommandCompletions(command);
      } else {
        completions = await this.getPathCompletions(args[args.length - 1] || command);
      }
    } else {
      // 补全文件路径
      completions = await this.getPathCompletions(args[args.length - 1]);
    }

    if (completions.length > 0) {
      if (completions.length === 1) {
        const completion = completions[0];
        const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, completion, lastArgStart);
        this.input.value = newText;
        this.input.setSelectionRange(newText.length - textAfterCursor.length, newText.length - textAfterCursor.length);
      } else {
        this.showCompletionSuggestions(completions, textBeforeCursor, textAfterCursor);
      }
    }
  }

  // 显示AI思考状态
  showAIThinking() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'ai-thinking-indicator';
    thinkingDiv.innerHTML = `
      <div class="ai-thinking-content">
        <span class="ai-thinking-icon">🤖</span>
        <span class="ai-thinking-text">AI正在思考...</span>
      </div>
    `;
    
    const terminalRect = this.input.getBoundingClientRect();
    thinkingDiv.style.cssText = `
      position: absolute;
      bottom: ${window.innerHeight - terminalRect.top + 5}px;
      left: ${terminalRect.left}px;
      background: #2d2d30;
      border: 1px solid #007acc;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      color: #d4d4d4;
      z-index: 1001;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(thinkingDiv);
    this.aiThinkingIndicator = thinkingDiv;
  }

  // 隐藏AI思考状态
  hideAIThinking() {
    if (this.aiThinkingIndicator) {
      this.aiThinkingIndicator.remove();
      this.aiThinkingIndicator = null;
    }
  }
}

// 创建全局终端实例
window.terminal = new Terminal();