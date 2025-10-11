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

    // 监听窗口大小改变，重新定位预览
    window.addEventListener('resize', () => {
      this.terminals.forEach(terminal => {
        if (terminal.completionPreview) {
          this.hideCompletionPreview(terminal);
        }
      });
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

    // 终端右键事件
    document.addEventListener('contextmenu', (e) => {
      if (e.target.classList.contains('terminal-input')) {
        e.preventDefault();
        const tabId = e.target.dataset.tabId;
        this.currentTabId = tabId;
        this.handleRightClick(tabId);
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
    
    // 清除之前的AI补全超时
    if (terminal.aiCompletionTimeout) {
      clearTimeout(terminal.aiCompletionTimeout);
      terminal.aiCompletionTimeout = null;
    }
    
    // 如果输入为空，隐藏补全
    if (!currentValue.trim()) {
      this.hideCompletionSuggestions(terminal);
      this.hideCompletionPreview(terminal);
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

    // 如果补全建议可见，处理导航键和确认键
    if (terminal.isCompletionVisible) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.navigateCompletionSuggestions(-1, tabId);
          return;
        case 'ArrowDown':
          e.preventDefault();
          this.navigateCompletionSuggestions(1);
          return;
        case 'Enter':
          e.preventDefault();
          // Enter键确认选中的补全建议
          if (this.selectedSuggestionIndex >= 0) {
            this.selectCurrentSuggestion();
          } else {
            // 没有选中建议时，执行命令
            this.executeCommand();
          }
          return;
        case 'Escape':
          e.preventDefault();
          this.hideCompletionSuggestions();
          return;
        case 'Tab':
          e.preventDefault();
          // Tab键现在只用于触发AI补全
          this.handleTabCompletion();
          return;
      }
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
        // Tab键触发AI补全
        this.handleTabCompletion();
        break;
      case 'Escape':
        // ESC键隐藏补全建议
        if (this.isCompletionVisible) {
          e.preventDefault();
          this.hideCompletionSuggestions();
        }
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
    // 如果补全建议可见，先隐藏补全再处理历史导航
    if (this.isCompletionVisible) {
      this.hideCompletionSuggestions();
    }
    
    if (this.commandHistory.length === 0) return;

    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length;
      this.input.value = '';
      return;
    }

    const historyValue = this.commandHistory[this.historyIndex];
    this.input.value = historyValue;
    this.lastInputValue = historyValue;
    
    // 历史导航后不触发自动补全，避免干扰
    this.autoCompletionEnabled = false;
    setTimeout(() => {
      this.autoCompletionEnabled = true;
    }, 500);
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

  // 处理右键确认
  handleRightClick() {
    if (this.isCompletionVisible && this.selectedSuggestionIndex >= 0) {
      // 右键确认选中的补全建议
      this.selectCurrentSuggestion();
    } else if (this.isCompletionVisible && this.completionSuggestions.length > 0) {
      // 如果没有选中项但有建议列表，选中第一个
      this.selectedSuggestionIndex = 0;
      this.updateSuggestionSelection();
      this.selectCurrentSuggestion();
    }
  }

  // 处理自动补全（输入时触发）
  async handleAutoCompletion(currentValue) {
    if (!this.currentSession || !this.autoCompletionEnabled) {
      return;
    }

    const cursorPosition = this.input.selectionStart;
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const textAfterCursor = currentValue.substring(cursorPosition);

    try {
      // 获取传统补全
      const traditionalCompletions = await this.getTraditionalCompletions(textBeforeCursor);
      
      if (traditionalCompletions.length > 0) {
        // 显示传统补全建议
        this.showCompletionSuggestions(traditionalCompletions, textBeforeCursor, textAfterCursor, { 
          type: 'traditional',
          autoMode: true 
        });
        
        // 如果只有一个补全项，自动预览
        if (traditionalCompletions.length === 1) {
          this.previewSuggestion(traditionalCompletions[0]);
        }
      } else {
        // 没有传统补全，隐藏建议
        this.hideCompletionSuggestions();
      }
    } catch (error) {
      console.error('自动补全失败:', error);
      this.hideCompletionSuggestions();
    }
  }

  // 处理Tab补全（现在主要用于AI补全触发）
  async handleTabCompletion() {
    if (!this.currentSession) return;

    const currentValue = this.input.value;
    const cursorPosition = this.input.selectionStart;
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const textAfterCursor = currentValue.substring(cursorPosition);

    // 检查AI补全是否配置
    const aiConfig = window.settingsManager?.getCompletionAIConfig();
    const useAI = aiConfig && aiConfig.apiKey;

    if (!useAI) {
      // 如果没有配置AI补全，显示提示
      this.showNotification('AI补全未配置，请在设置中配置API密钥', 'info');
      return;
    }

    // 如果已经有补全建议可见，Tab键用于触发AI增强
    if (this.isCompletionVisible) {
      // 显示AI正在思考的提示
      this.showAIUpdatingIndicator();
      
      // 获取当前传统补全结果
      const traditionalCompletions = [...this.completionSuggestions];
      
      // 异步获取AI补全并更新显示
      this.getAICompletionsAsync(textBeforeCursor, currentValue, traditionalCompletions)
        .catch(error => {
          console.error('AI补全失败:', error);
          this.hideAIUpdatingIndicator();
        });
    } else {
      // 没有可见补全时，直接获取AI补全
      this.showAIThinking();
      
      try {
        const aiCompletions = await this.getAICompletions(textBeforeCursor, currentValue);
        
        if (aiCompletions.length > 0) {
          if (aiCompletions.length === 1) {
            const completion = aiCompletions[0];
            const { lastArgStart } = this.parseCommandInput(textBeforeCursor);
            const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, completion, lastArgStart);
            this.input.value = newText;
            this.input.setSelectionRange(newText.length - textAfterCursor.length, newText.length - textAfterCursor.length);
          } else {
            this.showCompletionSuggestions(aiCompletions, textBeforeCursor, textAfterCursor, { type: 'ai' });
            
            const commonPrefix = this.findCommonPrefix(aiCompletions);
            const { args, lastArgStart } = this.parseCommandInput(textBeforeCursor);
            const currentText = args[args.length - 1] || textBeforeCursor.trim();
            
            if (commonPrefix && currentText.length < commonPrefix.length) {
              const completion = { text: commonPrefix, type: 'partial' };
              const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, completion, lastArgStart);
              this.input.value = newText;
              this.input.setSelectionRange(newText.length - textAfterCursor.length, newText.length - textAfterCursor.length);
            }
          }
        } else {
          this.showNotification('AI没有找到相关补全建议', 'info');
        }
      } catch (error) {
        console.error('AI补全失败:', error);
        this.showNotification('AI补全失败: ' + error.message, 'error');
      } finally {
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
    let lastArgStart = 0; // 默认从开始位置替换
    if (args.length > 0) {
      const lastSpaceIndex = text.lastIndexOf(' ');
      lastArgStart = lastSpaceIndex + 1;
    } else if (command) {
      // 如果只有命令，光标在命令末尾，我们应该从命令开始位置替换
      // 这样可以完全替换命令而不是追加
      lastArgStart = 0;
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

    // 过滤匹配的命令，排除完全匹配的当前输入
    let completions = commonCommands.filter(cmd => 
      cmd.startsWith(partialCommand.toLowerCase()) && cmd !== partialCommand.toLowerCase()
    ).map(cmd => ({ text: cmd, type: 'command' }));

    // 尝试从系统中获取可用命令
    try {
      const result = await this.executeCommandForAI('compgen -c', { silent: true, showInTerminal: false });
      if (result.success && result.output) {
        const systemCommands = result.output.split('\n')
          .filter(cmd => cmd.trim() && cmd.startsWith(partialCommand.toLowerCase()) && cmd.trim() !== partialCommand.toLowerCase())
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
    // 对于命令补全，我们需要特殊处理
    if (completion.type === 'command') {
      const { args } = this.parseCommandInput(textBeforeCursor);
      
      // 如果只有命令没有参数，或者正在补全第一个参数位置，完全替换命令
      if (args.length === 0) {
        return completion.text + textAfterCursor;
      }
    }
    
    // 对于其他类型的补全（文件、目录等）或命令的参数补全，正常处理
    const beforeLastArg = textBeforeCursor.substring(0, lastArgStart);
    return beforeLastArg + completion.text + textAfterCursor;
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
  showCompletionSuggestions(completions, textBeforeCursor, textAfterCursor, options = {}) {
    // 先隐藏已存在的建议
    this.hideCompletionSuggestions();
    
    // 保存补全数据
    this.completionSuggestions = completions;
    this.isCompletionVisible = true;
    this.selectedSuggestionIndex = -1;
    
    // 保存当前输入状态作为原始状态
    const currentValue = this.input.value;
    const cursorPosition = this.input.selectionStart;
    this.originalInputValue = currentValue;
    this.originalCursorPosition = cursorPosition;
    
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

    // 添加头部信息
    const header = this.createCompletionHeader(options);
    if (header) {
      suggestionsDiv.appendChild(header);
    }

    // 按来源和类型分组显示
    const grouped = this.groupCompletionsBySourceAndType(completions);
    let itemIndex = 0;
    
    for (const [source, types] of Object.entries(grouped)) {
      if (Object.keys(types).length === 0) continue;
      
      // 添加来源标题
      const sourceHeader = document.createElement('div');
      sourceHeader.className = 'source-header';
      sourceHeader.style.cssText = `
        font-size: 11px;
        font-weight: bold;
        color: ${this.getSourceColor(source)};
        margin: 8px 0 4px 0;
        padding: 2px 6px;
        background: ${this.getSourceBackground(source)};
        border-radius: 2px;
      `;
      sourceHeader.textContent = this.getSourceDisplayName(source, options);
      suggestionsDiv.appendChild(sourceHeader);
      
      // 按类型显示补全项
      for (const [, items] of Object.entries(types)) {
        if (items.length === 0) continue;
        
        items.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'completion-item';
          itemDiv.dataset.index = itemIndex++;
          itemDiv.dataset.source = item.source || 'traditional';
          itemDiv.style.cssText = `
            padding: 6px 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            border-radius: 3px;
            transition: all 0.2s ease;
            border-left: 3px solid ${this.getSourceBorderColor(item.source || 'traditional')};
          `;
          
          // 添加图标和文本
          const icon = this.getTypeIcon(item.type);
          const sourceIcon = this.getSourceIcon(item.source);
          const confidence = item.confidence ? ` (${Math.round(item.confidence * 100)}%)` : '';
          const description = item.description ? `<span class="completion-desc" style="color: #969696; font-size: 10px; margin-left: 8px;">${item.description}</span>` : '';
          
          itemDiv.innerHTML = `
            <span class="completion-source-icon" style="margin-right: 4px; font-size: 10px;">${sourceIcon}</span>
            <span class="completion-icon">${icon}</span>
            <span class="completion-text" style="flex: 1;">${item.text}${confidence}</span>
            ${description}
          `;
          
          // 鼠标事件
          itemDiv.addEventListener('mouseenter', () => {
            if (!itemDiv.classList.contains('selected')) {
              itemDiv.style.background = '#2d2d30';
            }
            // 更新选中索引
            this.selectedSuggestionIndex = parseInt(itemDiv.dataset.index);
            this.updateSuggestionSelection();
            // 先恢复原始输入，再预览新建议
            this.restoreOriginalInput();
            this.previewSuggestion(item);
          });
          
          itemDiv.addEventListener('mouseleave', () => {
            if (!itemDiv.classList.contains('selected')) {
              itemDiv.style.background = 'transparent';
            }
          });
          
          itemDiv.addEventListener('click', () => {
            this.applySuggestion(item, textBeforeCursor, textAfterCursor);
            this.hideCompletionSuggestions(true);
          });
          
          suggestionsDiv.appendChild(itemDiv);
        });
      }
    }

    // 定位建议框
    const terminalRect = this.input.getBoundingClientRect();
    suggestionsDiv.style.bottom = `${window.innerHeight - terminalRect.top + 5}px`;
    suggestionsDiv.style.left = `${terminalRect.left}px`;

    document.body.appendChild(suggestionsDiv);

    // 点击其他地方关闭建议框
    const closeHandler = (e) => {
      if (!suggestionsDiv.contains(e.target) && e.target !== this.input) {
        this.hideCompletionSuggestions();
        document.removeEventListener('click', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  // 创建补全头部
  createCompletionHeader(options) {
    const header = document.createElement('div');
    header.className = 'completion-header';
    
    let headerContent = '';
    let headerStyle = `
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 8px; 
      padding: 4px 8px; 
      border-radius: 3px;
      font-size: 10px;
    `;
    
    if (options.autoMode) {
      // 自动模式下的头部
      headerStyle += ' background: rgba(108, 108, 108, 0.05);';
      headerContent = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>⚡</span>
          <span style="color: #969696;">自动补全</span>
        </div>
        <div style="color: #969696;">
          ↑↓选择 Enter/右键确认 Tab获取AI ESC取消
        </div>
      `;
    } else if (options.type === 'traditional') {
      headerStyle += ' background: rgba(108, 108, 108, 0.1);';
      headerContent = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>⚡</span>
          <span style="color: #969696;">传统补全</span>
        </div>
        <div style="color: #969696;">
          ↑↓选择 Enter/右键确认 ESC取消
        </div>
      `;
    } else if (options.type === 'ai') {
      headerStyle += ' background: rgba(78, 201, 176, 0.1);';
      headerContent = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>🤖</span>
          <span style="color: #4ec9b0;">AI 智能补全</span>
        </div>
        <div style="color: #969696;">
          ↑↓选择 Enter/右键确认 ESC取消
        </div>
      `;
    } else if (options.type === 'mixed') {
      headerStyle += ' background: linear-gradient(90deg, rgba(108, 108, 108, 0.1), rgba(78, 201, 176, 0.1));';
      headerContent = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>⚡🤖</span>
          <span style="color: #d4d4d4;">混合补全</span>
          <span style="color: #969696;">(传统: ${options.traditionalCount}, AI: ${options.aiCount})</span>
        </div>
        <div style="color: #969696;">
          ↑↓选择 Enter/右键确认 ESC取消
        </div>
      `;
    } else {
      return null; // 默认情况不显示头部
    }
    
    header.innerHTML = headerContent;
    header.style.cssText = headerStyle;
    return header;
  }

  // 按来源和类型分组补全项
  groupCompletionsBySourceAndType(completions) {
    const grouped = {};
    
    completions.forEach(comp => {
      const source = comp.source || 'traditional';
      const type = comp.type || 'file';
      
      if (!grouped[source]) {
        grouped[source] = {};
      }
      
      if (!grouped[source][type]) {
        grouped[source][type] = [];
      }
      
      grouped[source][type].push(comp);
    });
    
    return grouped;
  }

  // 获取来源显示名称
  getSourceDisplayName(source) {
    const names = {
      traditional: '传统补全',
      ai: 'AI智能补全',
      mixed: '混合补全'
    };
    return names[source] || source;
  }

  // 获取来源颜色
  getSourceColor(source) {
    const colors = {
      traditional: '#969696',
      ai: '#4ec9b0',
      mixed: '#d4d4d4'
    };
    return colors[source] || '#d4d4d4';
  }

  // 获取来源背景色
  getSourceBackground(source) {
    const backgrounds = {
      traditional: 'rgba(108, 108, 108, 0.1)',
      ai: 'rgba(78, 201, 176, 0.1)',
      mixed: 'linear-gradient(90deg, rgba(108, 108, 108, 0.1), rgba(78, 201, 176, 0.1))'
    };
    return backgrounds[source] || 'rgba(212, 212, 212, 0.1)';
  }

  // 获取来源边框颜色
  getSourceBorderColor(source) {
    const colors = {
      traditional: '#6c6c6c',
      ai: '#4ec9b0',
      mixed: '#007acc'
    };
    return colors[source] || '#6c6c6c';
  }

  // 获取来源图标
  getSourceIcon(source) {
    const icons = {
      traditional: '⚡',
      ai: '🤖',
      mixed: '⚡🤖'
    };
    return icons[source] || '⚡';
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
  getTypeDisplayName(typeName) {
    const names = {
      command: '命令',
      directory: '目录',
      file: '文件'
    };
    return names[typeName] || typeName;
  }

  // 获取类型图标
  getTypeIcon(typeName) {
    const icons = {
      command: '⚡',
      directory: '📁',
      file: '📄'
    };
    return icons[typeName] || '📄';
  }

  // 应用选中的建议
  applySuggestion(suggestion, textBeforeCursor, textAfterCursor) {
    // 如果没有提供文本上下文，使用当前输入状态
    if (!textBeforeCursor || textAfterCursor === undefined) {
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

  // 导航补全建议
  navigateCompletionSuggestions(direction) {
    if (!this.isCompletionVisible || this.completionSuggestions.length === 0) {
      return;
    }

    // 更新选中索引
    this.selectedSuggestionIndex += direction;
    
    // 循环导航
    if (this.selectedSuggestionIndex < 0) {
      this.selectedSuggestionIndex = this.completionSuggestions.length - 1;
    } else if (this.selectedSuggestionIndex >= this.completionSuggestions.length) {
      this.selectedSuggestionIndex = 0;
    }

    // 更新UI显示
    this.updateSuggestionSelection();
    
    // 预览选中的建议
    this.previewSuggestion(this.completionSuggestions[this.selectedSuggestionIndex]);
  }

  // 更新建议选中状态
  updateSuggestionSelection() {
    const suggestionsContainer = document.querySelector('.completion-suggestions');
    if (!suggestionsContainer) return;

    const items = suggestionsContainer.querySelectorAll('.completion-item');
    
    items.forEach((item, index) => {
      if (index === this.selectedSuggestionIndex) {
        item.classList.add('selected');
        item.style.background = '#007acc';
        item.style.color = 'white';
        // 确保选中项可见
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
        item.style.background = '';
        item.style.color = '';
      }
    });
  }

  // 预览建议（不应用，只显示）
  previewSuggestion(suggestion) {
    // 始终基于原始输入值进行预览
    if (this.originalInputValue === undefined || this.originalCursorPosition === undefined) {
      return;
    }
    
    const cursorPosition = this.originalCursorPosition;
    const textBeforeCursor = this.originalInputValue.substring(0, cursorPosition);
    const textAfterCursor = this.originalInputValue.substring(cursorPosition);
    
    const { lastArgStart } = this.parseCommandInput(textBeforeCursor);
    const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, suggestion, lastArgStart);
    
    // 显示预览，用灰色显示补全部分
    this.showCompletionPreview(textBeforeCursor, textAfterCursor, newText);
  }

  // 选择当前建议
  selectCurrentSuggestion() {
    if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.completionSuggestions.length) {
      const suggestion = this.completionSuggestions[this.selectedSuggestionIndex];
      
      // 始终使用原始输入状态来避免重复
      if (this.originalInputValue !== undefined && this.originalCursorPosition !== undefined) {
        const textBeforeCursor = this.originalInputValue.substring(0, this.originalCursorPosition);
        const textAfterCursor = this.originalInputValue.substring(this.originalCursorPosition);
        
        // 应用选中的建议
        this.applySuggestion(suggestion, textBeforeCursor, textAfterCursor);
      } else {
        // 降级处理：使用当前输入状态
        const cursorPosition = this.input.selectionStart;
        const textBeforeCursor = this.input.value.substring(0, cursorPosition);
        const textAfterCursor = this.input.value.substring(cursorPosition);
        this.applySuggestion(suggestion, textBeforeCursor, textAfterCursor);
      }
      
      // 隐藏补全建议和预览，但不恢复原始输入
      this.hideCompletionSuggestions(true);
    }
  }

  // 恢复原始输入
  restoreOriginalInput() {
    if (this.originalInputValue !== undefined) {
      this.input.value = this.originalInputValue;
      this.input.setSelectionRange(this.originalCursorPosition, this.originalCursorPosition);
    }
    // 隐藏预览
    this.hideCompletionPreview();
  }

  // 隐藏补全建议
  hideCompletionSuggestions(keepInput = false) {
    const suggestionsContainer = document.querySelector('.completion-suggestions');
    if (suggestionsContainer) {
      suggestionsContainer.remove();
    }
    
    // 隐藏补全预览
    this.hideCompletionPreview();
    
    this.isCompletionVisible = false;
    this.completionSuggestions = [];
    this.selectedSuggestionIndex = -1;
    
    // 恢复原始输入值（如果有）- 除非指定保持输入
    if (!keepInput && this.originalInputValue !== undefined) {
      this.restoreOriginalInput();
    }
    
    // 清理原始输入状态
    this.originalInputValue = undefined;
    this.originalCursorPosition = undefined;
  }

  // AI智能补全
  async getAICompletions(textBeforeCursor, fullText) {
    // 检查缓存
    const cacheKey = `${textBeforeCursor}_${fullText}`;
    if (this.aiCompletionCache.has(cacheKey)) {
      const cached = this.aiCompletionCache.get(cacheKey);
      // 缓存有效期5分钟
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.completions;
      } else {
        this.aiCompletionCache.delete(cacheKey);
      }
    }

    const aiConfig = window.settingsManager?.getCompletionAIConfig();
    if (!aiConfig || !aiConfig.apiKey) {
      throw new Error('AI补全未配置');
    }

    // 防抖处理，避免频繁请求
    const requestId = Date.now();
    this.lastCompletionRequest = requestId;
    
    try {
      // 获取当前上下文信息
      const currentDir = await this.getCurrentDirectory();
      const currentUser = await this.getCurrentUser();
      const recentCommands = this.commandHistory.slice(-5); // 最近5条命令

      const systemPrompt = `你是一个Linux终端智能补全助手。请根据用户的输入和上下文提供准确的补全建议。

当前环境信息：
- 用户: ${currentUser || 'unknown'}
- 当前目录: ${currentDir || 'unknown'}
- 最近命令: ${recentCommands.join(', ')}

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

      // 将用户输入作为用户消息传递
      const userMessage = `用户输入: "${textBeforeCursor}"\n\n请为这个输入提供智能补全建议。`;
      const response = await this.callAIAPI(userMessage, systemPrompt, aiConfig);
      
      // 检查请求是否仍然有效
      if (this.lastCompletionRequest !== requestId) {
        throw new Error('请求已过期');
      }
      
      // 解析AI响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiResult = JSON.parse(jsonMatch[0]);
        const completions = aiResult.completions || [];
        
        // 缓存结果
        this.aiCompletionCache.set(cacheKey, {
          completions,
          timestamp: Date.now()
        });
        
        // 限制缓存大小
        if (this.aiCompletionCache.size > 50) {
          const firstKey = this.aiCompletionCache.keys().next().value;
          this.aiCompletionCache.delete(firstKey);
        }
        
        return completions;
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

  // 获取传统补全
  async getTraditionalCompletions(textBeforeCursor) {
    const { command, args } = this.parseCommandInput(textBeforeCursor);
    
    let completions = [];
    
    if (!command) {
      // 补全命令
      completions = await this.getCommandCompletions('');
    } else if (args.length === 0) {
      // 只有命令，没有参数，补全命令
      completions = await this.getCommandCompletions(command);
    } else if (args.length === 1 && !textBeforeCursor.endsWith(' ')) {
      // 一个参数但没有空格结尾，可能是命令补全或参数补全
      // 先尝试命令补全
      const commandCompletions = await this.getCommandCompletions(command);
      if (commandCompletions.length > 0) {
        completions = commandCompletions;
      } else {
        // 如果没有命令补全，尝试文件路径补全
        completions = await this.getPathCompletions(args[0]);
      }
    } else {
      // 补全文件路径
      completions = await this.getPathCompletions(args[args.length - 1]);
    }

    return completions;
  }

  // 异步获取AI补全并更新显示
  async getAICompletionsAsync(textBeforeCursor, fullText, traditionalCompletions) {
    try {
      const aiCompletions = await this.getAICompletions(textBeforeCursor, fullText);
      
      // 隐藏AI更新提示
      this.hideAIUpdatingIndicator();
      
      if (aiCompletions.length > 0) {
        // 合并传统补全和AI补全，去重并排序
        const mergedCompletions = this.mergeCompletions(traditionalCompletions, aiCompletions);
        
        // 更新补全建议显示
        const currentValue = this.input.value;
        const cursorPosition = this.input.selectionStart;
        const currentTextBeforeCursor = currentValue.substring(0, cursorPosition);
        const currentTextAfterCursor = currentValue.substring(cursorPosition);
        
        // 检查用户输入是否发生变化
        if (currentTextBeforeCursor === textBeforeCursor) {
          // 用户输入没有变化，更新补全建议
          this.showCompletionSuggestions(mergedCompletions, currentTextBeforeCursor, currentTextAfterCursor, { 
            type: 'mixed', 
            traditionalCount: traditionalCompletions.length,
            aiCount: aiCompletions.length
          });
        }
      }
    } catch (error) {
      console.error('AI异步补全失败:', error);
      this.hideAIUpdatingIndicator();
    }
  }

  // 合并传统补全和AI补全
  mergeCompletions(traditionalCompletions, aiCompletions) {
    const merged = new Map();
    
    // 先添加传统补全，标记来源
    traditionalCompletions.forEach(comp => {
      merged.set(comp.text, { ...comp, source: 'traditional' });
    });
    
    // 添加AI补全，如果已存在则更新为混合来源
    aiCompletions.forEach(comp => {
      if (merged.has(comp.text)) {
        merged.set(comp.text, { ...merged.get(comp.text), source: 'mixed', aiData: comp });
      } else {
        merged.set(comp.text, { ...comp, source: 'ai' });
      }
    });
    
    // 转换为数组并排序：传统补全在前，AI补全在后，混合补全优先
    return Array.from(merged.values()).sort((a, b) => {
      const priority = { mixed: 0, traditional: 1, ai: 2 };
      return priority[a.source] - priority[b.source];
    });
  }

  // 降级到传统补全
  async fallbackCompletion(textBeforeCursor, textAfterCursor) {
    const completions = await this.getTraditionalCompletions(textBeforeCursor);
    const { lastArgStart } = this.parseCommandInput(textBeforeCursor);

    if (completions.length > 0) {
      if (completions.length === 1) {
        const completion = completions[0];
        const newText = this.applyCompletion(textBeforeCursor, textAfterCursor, completion, lastArgStart);
        this.input.value = newText;
        this.input.setSelectionRange(newText.length - textAfterCursor.length, newText.length - textAfterCursor.length);
      } else {
        this.showCompletionSuggestions(completions, textBeforeCursor, textAfterCursor, { type: 'traditional' });
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

  // 显示AI更新指示器
  showAIUpdatingIndicator() {
    // 如果补全建议框存在，在其中添加更新提示
    const suggestionsContainer = document.querySelector('.completion-suggestions');
    if (suggestionsContainer) {
      const updatingDiv = document.createElement('div');
      updatingDiv.className = 'ai-updating-indicator';
      updatingDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(78, 201, 176, 0.1); border-radius: 3px; margin-top: 8px;">
          <span style="font-size: 10px;">🤖</span>
          <span style="font-size: 10px; color: #4ec9b0;">AI正在获取智能补全...</span>
        </div>
      `;
      
      // 插入到建议框的末尾
      suggestionsContainer.appendChild(updatingDiv);
      this.aiUpdatingIndicator = updatingDiv;
    }
  }

  // 隐藏AI更新指示器
  hideAIUpdatingIndicator() {
    if (this.aiUpdatingIndicator) {
      this.aiUpdatingIndicator.remove();
      this.aiUpdatingIndicator = null;
    }
  }

  // 显示补全预览
  showCompletionPreview(originalText, textAfterCursor, completedText) {
    // 移除已存在的预览
    this.hideCompletionPreview();
    
    // 简化差异计算：找到原始文本在补全文本中的位置
    let originalPart = originalText;
    let completionPart = '';
    
    if (completedText.startsWith(originalText)) {
      // 如果补全文本以原始文本开头，补全部分就是剩余的部分
      originalPart = originalText;
      completionPart = completedText.substring(originalText.length);
    } else {
      // 否则，完全替换
      originalPart = '';
      completionPart = completedText;
    }
    
    // 创建预览元素
    const previewDiv = document.createElement('div');
    previewDiv.className = 'completion-preview';
    
    // 获取输入框的位置和样式
    const inputRect = this.input.getBoundingClientRect();
    const inputStyle = window.getComputedStyle(this.input);
    
    // 设置预览元素样式，完全覆盖输入框
    previewDiv.style.cssText = `
      position: fixed;
      left: ${inputRect.left}px;
      top: ${inputRect.top}px;
      width: ${inputRect.width}px;
      height: ${inputRect.height}px;
      background: transparent;
      font-family: ${inputStyle.fontFamily};
      font-size: ${inputStyle.fontSize};
      font-weight: ${inputStyle.fontWeight};
      font-style: ${inputStyle.fontStyle};
      padding: ${inputStyle.padding};
      padding-left: ${inputStyle.paddingLeft};
      padding-right: ${inputStyle.paddingRight};
      padding-top: ${inputStyle.paddingTop};
      padding-bottom: ${inputStyle.paddingBottom};
      border: none;
      outline: none;
      pointer-events: none;
      white-space: pre;
      overflow: hidden;
      z-index: 10000;
      box-sizing: border-box;
      text-align: left;
      line-height: ${inputStyle.lineHeight};
      letter-spacing: ${inputStyle.letterSpacing};
      display: flex;
      align-items: center;
    `;
    
    // 创建内部HTML结构
    previewDiv.innerHTML = `
      <span style="color: #d4d4d4;">${this.escapeHtml(originalPart)}</span>
      <span style="color: #969696;">${this.escapeHtml(completionPart)}</span>
      <span style="color: #d4d4d4;">${this.escapeHtml(textAfterCursor)}</span>
    `;
    
    document.body.appendChild(previewDiv);
    this.completionPreview = previewDiv;
    
    // 保持输入框显示原始文本
    this.input.value = originalText;
    this.input.focus();
    
    // 调试信息
    console.log('Preview created:', {
      originalText,
      completedText,
      originalPart,
      completionPart,
      textAfterCursor
    });
  }

  // 隐藏补全预览
  hideCompletionPreview() {
    if (this.completionPreview) {
      this.completionPreview.remove();
      this.completionPreview = null;
    }
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 清理资源
  cleanup() {
    // 清理所有超时
    if (this.aiCompletionTimeout) {
      clearTimeout(this.aiCompletionTimeout);
      this.aiCompletionTimeout = null;
    }
    
    if (this.inputTimeout) {
      clearTimeout(this.inputTimeout);
      this.inputTimeout = null;
    }
    
    // 隐藏所有提示
    this.hideCompletionSuggestions();
    this.hideAIThinking();
    this.hideAIUpdatingIndicator();
    this.hideCompletionPreview();
    
    // 清理缓存
    this.completionCache.clear();
    this.aiCompletionCache.clear();
  }

  // 清理过期的AI补全缓存
  cleanupAICache() {
    const now = Date.now();
    const expireTime = 5 * 60 * 1000; // 5分钟
    
    for (const [key, value] of this.aiCompletionCache.entries()) {
      if (now - value.timestamp > expireTime) {
        this.aiCompletionCache.delete(key);
      }
    }
  }
}

// 创建全局终端实例
window.terminal = new Terminal();