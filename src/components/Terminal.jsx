import React, { useState, useEffect, useRef } from 'react';

function Terminal({ tabId, isConnected, sessionData, onExecuteCommand, onShowNotification }) {
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // 自动滚动到底部
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    // 连接成功时显示欢迎消息
    if (isConnected && sessionData) {
      appendOutput(`已连接到 ${sessionData.name || sessionData.host}`, 'success');
    }
  }, [isConnected, sessionData]);

  const appendOutput = (text, className = '') => {
    setOutput(prev => [...prev, { text, className, id: Date.now() }]);
  };

  const handleKeyDown = (e) => {
    if (!isConnected) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        executeCommand();
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateHistory(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateHistory(1);
        break;
      case 'Tab':
        e.preventDefault();
        // 简单的Tab补全逻辑
        handleTabCompletion();
        break;
    }
  };

  const executeCommand = async () => {
    const command = input.trim();
    if (!command) return;

    // 添加到历史记录
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // 显示命令
    appendOutput(`$ ${command}`, 'command');

    // 清空输入
    setInput('');

    try {
      const result = await onExecuteCommand(tabId, command);
      
      if (result.success) {
        if (result.output) {
          appendOutput(result.output, 'output');
        }
        if (result.code !== 0) {
          appendOutput(`命令执行失败，退出码: ${result.code}`, 'error');
        }
      } else {
        appendOutput(`错误: ${result.error}`, 'error');
      }
    } catch (error) {
      appendOutput(`执行命令时发生错误: ${error.message}`, 'error');
    }
  };

  const navigateHistory = (direction) => {
    if (commandHistory.length === 0) return;

    let newIndex;
    if (direction === -1) { // 向上
      newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
    } else { // 向下
      newIndex = Math.max(historyIndex - 1, -1);
    }

    setHistoryIndex(newIndex);

    if (newIndex === -1) {
      setInput('');
    } else {
      const command = commandHistory[commandHistory.length - 1 - newIndex];
      setInput(command);
    }
  };

  const handleTabCompletion = () => {
    // 简单的命令补全逻辑
    const commonCommands = [
      'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find',
      'chmod', 'chown', 'ps', 'kill', 'top', 'df', 'du', 'tar', 'ssh', 'scp',
      'git', 'npm', 'node', 'python', 'python3', 'pip', 'apt', 'yum', 'systemctl'
    ];
    
    const matches = commonCommands.filter(cmd => cmd.startsWith(input));
    
    if (matches.length === 1) {
      setInput(matches[0] + ' ');
    } else if (matches.length > 1) {
      appendOutput('可能的命令: ' + matches.join(', '), 'info');
    }
  };

  const clearTerminal = () => {
    setOutput([]);
    onShowNotification('终端已清空', 'info');
  };

  const copyOutput = () => {
    const text = output.map(item => item.text).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      onShowNotification('终端输出已复制到剪贴板', 'success');
    }).catch(() => {
      onShowNotification('复制失败', 'error');
    });
  };

  return (
    <section className="terminal-section" data-tab-id={tabId}>
      <div className="terminal-header">
        <h3>终端</h3>
        <div className="terminal-controls">
          <button className="btn btn-small btn-clear-terminal" onClick={clearTerminal}>
            清空
          </button>
          <button className="btn btn-small btn-copy-output" onClick={copyOutput}>
            复制
          </button>
        </div>
      </div>
      <div className="terminal" data-tab-id={tabId}>
        <div className="terminal-output" ref={outputRef}>
          {output.map(item => (
            <div key={item.id} className={item.className}>
              {item.text}
            </div>
          ))}
        </div>
        <div className="terminal-input-line">
          <span className="terminal-prompt" data-tab-id={tabId}>$ </span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令..."
            disabled={!isConnected}
          />
        </div>
      </div>
    </section>
  );
}

export default Terminal;
