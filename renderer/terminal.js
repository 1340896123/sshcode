class Terminal {
  constructor() {
    this.output = document.getElementById('terminal-output');
    this.input = document.getElementById('terminal-input');
    this.prompt = document.getElementById('terminal-prompt');
    this.currentSession = null;
    this.commandHistory = [];
    this.historyIndex = -1;
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
        // TODO: 实现自动补全
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
}

// 创建全局终端实例
window.terminal = new Terminal();