class Terminal {
  constructor() {
    this.terminals = new Map(); // 存储每个标签页的终端状态
    this.currentTabId = null;
    this.autoCompletionEnabled = true;
    this.init();
  }

  // 获取当前标签页的终端状态
  getCurrentTerminal() {
    if (!this.currentTabId) {
      this.currentTabId = window.tabManager?.getActiveTabId();
    }
    return this.terminals.get(this.currentTabId);
  }

  // 获取或创建终端状态
  getOrCreateTerminal(tabId) {
    if (!this.terminals.has(tabId)) {
      this.terminals.set(tabId, {
        output: document.querySelector(`.terminal-output[data-tab-id="${tabId}"]`),
        input: document.querySelector(`.terminal-input[data-tab-id="${tabId}"]`),
        prompt: document.querySelector(`.terminal-prompt[data-tab-id="${tabId}"]`),
        currentSession: null,
        commandHistory: [],
        historyIndex: -1,
        completionCache: new Map(),
        aiCompletionCache: new Map(),
        completionSuggestions: [],
        selectedSuggestionIndex: -1,
        isCompletionVisible: false,
        completionPreview: null,
        aiCompletionTimeout: null,
        lastCompletionRequest: null,
        inputTimeout: null,
        lastInputValue: ''
      });
    }
    return this.terminals.get(tabId);
  }

  init() {
    // 监听标签页切换事件
    window.addEventListener('tabSwitch', (e) => {
      this.currentTabId = e.detail.tabId;
    });

    // 使用事件委托处理所有终端相关事件
    this.setupEventDelegation();
    
    // 监听会话连接事件
    window.addEventListener('sessionConnected', (e) => {
      this.onSessionConnected(e.detail);
    });
  }

  setupEventDelegation() {
    // 终端输入事件
    document.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('terminal-input')) {
        const tabId = e.target.dataset.tabId;
        this.currentTabId = tabId;
        this.handleKeyDown(e, tabId);
      }
    });

    // 终端输入事件
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('terminal-input')) {
        const tabId = e.target.dataset.tabId;
        this.currentTabId = tabId;
        this.handleInput(e, tabId);
      }
    });

    // 清空终端按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-clear-terminal')) {
        const tabId = e.target.dataset.tabId;
        this.clear(tabId);
      }
    });

    // 复制输出按钮
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-copy-output')) {
        const tabId = e.target.dataset.tabId;
        this.copyOutput(tabId);
      }
    });
  }

  handleInput(e, tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    const currentValue = e.target.value;
    
    // 清除之前的输入超时
    if (terminal.inputTimeout) {
      clearTimeout(terminal.inputTimeout);
      terminal.inputTimeout = null;
    }
    
    // 如果输入为空，隐藏补全
    if (!currentValue.trim()) {
      this.hideCompletionSuggestions(terminal);
      terminal.lastInputValue = currentValue;
      return;
    }
    
    // 防抖处理，避免频繁触发补全
    terminal.inputTimeout = setTimeout(() => {
      this.handleAutoCompletion(currentValue, tabId);
    }, 200); // 200ms防抖延迟
    
    terminal.lastInputValue = currentValue;
  }

  handleKeyDown(e, tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    if (!terminal.currentSession) {
      return;
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.executeCommand(tabId);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.navigateHistory(-1, tabId);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.navigateHistory(1, tabId);
        break;
      case 'Tab':
        e.preventDefault();
        this.handleTabCompletion(tabId);
        break;
      case 'Escape':
        this.hideCompletionSuggestions(terminal);
        break;
    }
  }

  async executeCommand(tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    const command = terminal.input.value.trim();
    
    if (!command) return;

    // 添加到历史记录
    terminal.commandHistory.push(command);
    terminal.historyIndex = -1;

    // 显示命令
    this.appendOutput(`$ ${command}`, 'command', tabId);

    // 清空输入
    terminal.input.value = '';
    this.hideCompletionSuggestions(terminal);

    try {
      const result = await window.electronAPI.sshExecute(terminal.currentSession.id, command);
      
      if (result.success) {
        if (result.output) {
          this.appendOutput(result.output, 'output', tabId);
        }
        if (result.code !== 0) {
          this.appendOutput(`命令执行失败，退出码: ${result.code}`, 'error', tabId);
        }
      } else {
        this.appendOutput(`错误: ${result.error}`, 'error', tabId);
      }
    } catch (error) {
      this.appendOutput(`执行命令时发生错误: ${error.message}`, 'error', tabId);
    }

    this.scrollToBottom(tabId);
  }

  navigateHistory(direction, tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    
    if (terminal.commandHistory.length === 0) return;

    if (direction === -1) { // 向上
      if (terminal.historyIndex < terminal.commandHistory.length - 1) {
        terminal.historyIndex++;
      }
    } else { // 向下
      if (terminal.historyIndex > -1) {
        terminal.historyIndex--;
      }
    }

    if (terminal.historyIndex === -1) {
      terminal.input.value = '';
    } else {
      terminal.input.value = terminal.commandHistory[terminal.commandHistory.length - 1 - terminal.historyIndex];
    }
  }

  handleTabCompletion(tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    const currentText = terminal.input.value;
    
    // 简单的文件路径补全
    if (currentText.includes(' ')) {
      const parts = currentText.split(' ');
      const lastPart = parts[parts.length - 1];
      
      if (lastPart.startsWith('/')) {
        this.completePath(lastPart, tabId);
      }
    } else {
      // 命令补全
      this.completeCommand(currentText, tabId);
    }
  }

  async completePath(path, tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    
    try {
      const dir = path.substring(0, path.lastIndexOf('/')) || '/';
      const prefix = path.substring(path.lastIndexOf('/') + 1);
      
      const result = await window.electronAPI.getFileList(terminal.currentSession.id, dir);
      
      if (result.success) {
        const matches = result.files
          .filter(file => file.name.startsWith(prefix))
          .map(file => ({
            name: file.name,
            type: file.type === 'd' ? 'directory' : 'file'
          }));
        
        if (matches.length === 1) {
          const completion = matches[0];
          const newPath = path.substring(0, path.lastIndexOf('/') + 1) + completion.name;
          if (completion.type === 'directory') {
            terminal.input.value = newPath + '/';
          } else {
            terminal.input.value = newPath + ' ';
          }
        } else if (matches.length > 1) {
          this.showCompletionSuggestions(matches, tabId);
        }
      }
    } catch (error) {
      console.error('路径补全失败:', error);
    }
  }

  completeCommand(command, tabId) {
    const commonCommands = [
      'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find',
      'chmod', 'chown', 'ps', 'kill', 'top', 'df', 'du', 'tar', 'ssh', 'scp',
      'git', 'npm', 'node', 'python', 'python3', 'pip', 'apt', 'yum', 'systemctl'
    ];
    
    const matches = commonCommands.filter(cmd => cmd.startsWith(command));
    
    if (matches.length === 1) {
      const terminal = this.getOrCreateTerminal(tabId);
      terminal.input.value = matches[0] + ' ';
    } else if (matches.length > 1) {
      this.showCompletionSuggestions(matches.map(cmd => ({ name: cmd, type: 'command' })), tabId);
    }
  }

  showCompletionSuggestions(suggestions, tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    
    // 移除已存在的建议列表
    this.hideCompletionSuggestions(terminal);

    if (suggestions.length === 0) return;

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'completion-suggestions';
    suggestionsDiv.style.cssText = `
      position: absolute;
      background: #2d2d30;
      border: 1px solid #3e3e42;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      font-family: 'Consolas', monospace;
      font-size: 12px;
    `;

    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'completion-item';
      item.textContent = suggestion.name;
      item.style.cssText = `
        padding: 4px 8px;
        cursor: pointer;
        color: #d4d4d4;
      `;
      
      if (suggestion.type === 'directory') {
        item.textContent += '/';
      }
      
      item.addEventListener('click', () => {
        const terminal = this.getOrCreateTerminal(tabId);
        const currentText = terminal.input.value;
        const lastSpace = currentText.lastIndexOf(' ');
        const prefix = lastSpace >= 0 ? currentText.substring(0, lastSpace + 1) : '';
        terminal.input.value = prefix + suggestion.name + (suggestion.type === 'directory' ? '/' : ' ');
        this.hideCompletionSuggestions(terminal);
        terminal.input.focus();
      });

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#3e3e42';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });

      suggestionsDiv.appendChild(item);
    });

    // 定位建议列表
    const inputRect = terminal.input.getBoundingClientRect();
    suggestionsDiv.style.top = (inputRect.bottom + 2) + 'px';
    suggestionsDiv.style.left = inputRect.left + 'px';
    suggestionsDiv.style.width = inputRect.width + 'px';

    document.body.appendChild(suggestionsDiv);
    terminal.completionSuggestions = suggestionsDiv;
    terminal.isCompletionVisible = true;

    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', function hideSuggestions(e) {
        if (!suggestionsDiv.contains(e.target)) {
          suggestionsDiv.remove();
          terminal.isCompletionVisible = false;
          document.removeEventListener('click', hideSuggestions);
        }
      });
    }, 100);
  }

  hideCompletionSuggestions(terminal) {
    if (terminal.completionSuggestions) {
      terminal.completionSuggestions.remove();
      terminal.completionSuggestions = null;
      terminal.isCompletionVisible = false;
    }
  }

  appendOutput(text, className = '', tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    if (!terminal.output) return;

    const div = document.createElement('div');
    div.className = className;
    div.textContent = text;
    terminal.output.appendChild(div);
    this.scrollToBottom(tabId);
  }

  clear(tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    if (terminal.output) {
      terminal.output.innerHTML = '';
    }
  }

  copyOutput(tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    if (terminal.output) {
      const text = terminal.output.textContent;
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('终端输出已复制到剪贴板', 'success');
      }).catch(() => {
        this.showNotification('复制失败', 'error');
      });
    }
  }

  scrollToBottom(tabId) {
    const terminal = this.getOrCreateTerminal(tabId);
    if (terminal.output) {
      terminal.output.scrollTop = terminal.output.scrollHeight;
    }
  }

  onSessionConnected(session, tabId = null) {
    if (tabId) {
      const terminal = this.getOrCreateTerminal(tabId);
      terminal.currentSession = session;
      terminal.input.disabled = false;
      this.appendOutput(`已连接到 ${session.name || session.host}`, 'success', tabId);
    } else {
      // 兼容旧版本，更新当前标签页
      const currentTabId = window.tabManager?.getActiveTabId();
      if (currentTabId) {
        this.onSessionConnected(session, currentTabId);
      }
    }
  }

  handleAutoCompletion(currentValue, tabId) {
    // 简化的自动补全逻辑
    if (currentValue.includes(' ')) {
      const parts = currentValue.split(' ');
      const lastPart = parts[parts.length - 1];
      if (lastPart.startsWith('/')) {
        this.completePath(lastPart, tabId);
      }
    } else {
      this.completeCommand(currentValue, tabId);
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

// 创建终端实例
window.terminal = new Terminal();