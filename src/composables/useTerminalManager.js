import { ref, nextTick } from 'vue'

export function useTerminalManager(activeConnections, activeTabId, emit, ansiConvert) {
  const autocompleteRefs = ref([])

  // 执行SSH命令
  const executeCommand = async (connection) => {
    const command = connection.currentCommand.trim()
    if (!command) return

    const commandLine = `${connection.username}@${connection.host}:~$ ${command}`

    // 添加命令到输出
    addTerminalOutput(connection, {
      type: 'command',
      content: commandLine,
      timestamp: new Date()
    })

    connection.currentCommand = ''
    connection.lastActivity = new Date()

    try {
      if (window.electronAPI && connection.status === 'connected') {
        const result = await window.electronAPI.sshExecute(connection.id, command)

        if (result.success) {
          addTerminalOutput(connection, {
            type: 'output',
            content: result.output,
            timestamp: new Date()
          })
        } else {
          addTerminalOutput(connection, {
            type: 'error',
            content: `命令执行失败: ${result.error}`,
            timestamp: new Date()
          })
        }
      } else {
        // 开发模式模拟命令执行
        setTimeout(() => {
          const output = simulateCommandOutput(command)
          addTerminalOutput(connection, {
            type: 'output',
            content: output,
            timestamp: new Date()
          })
        }, 500)
      }
    } catch (error) {
      addTerminalOutput(connection, {
        type: 'error',
        content: `命令执行异常: ${error.message}`,
        timestamp: new Date()
      })
    }

    // 滚动到底部
    await nextTick()
    scrollToBottom(connection.id)
  }

  // 模拟命令输出
  const simulateCommandOutput = (command) => {
    const outputs = {
      'ls': 'Desktop  Documents  Downloads  Music  Pictures  Public  Templates  Videos',
      'pwd': '/home/user',
      'whoami': 'user',
      'date': new Date().toString(),
      'uname -a': 'Linux hostname 5.15.0-generic #1 SMP Ubuntu 5.15.0-52-generic x86_64 GNU/Linux',
      'df -h': `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   15G   33G  32% /
tmpfs           3.9G     0  3.9G   0% /dev/shm
tmpfs           1.6G  1.2M  1.6G   1% /run
/dev/sdb1       100G   20G   75G  21% /data`,
      'free -h': `              total        used        free      shared  buff/cache   available
Mem:          7.8Gi       2.1Gi       4.2Gi       1.0MiB       1.5Gi       5.3Gi
Swap:         2.0Gi          0B       2.0Gi`
    }

    return outputs[command] || `${command}: command executed successfully (development mode)`
  }

  // 添加终端输出
  const addTerminalOutput = (connection, line) => {
    // 处理ANSI转义序列
    if (line.type === 'output' || line.type === 'error') {
      try {
        // 检查是否包含清屏命令的ANSI序列
        if (line.content.includes('\x1b[2J') || line.content.includes('\x1b[H')) {
          // 清空终端输出
          connection.terminalOutput = []
          // 添加一个简单的清屏标记
          line = {
            type: 'info',
            content: '--- 终端已清空 ---',
            timestamp: new Date()
          }
        } else {
          // 转换ANSI转义序列为HTML
          const processedContent = ansiConvert.toHtml(line.content)
          line = {
            ...line,
            content: processedContent,
            isHtml: true
          }
        }
      } catch (error) {
        // 如果转换失败，保持原始内容
        console.warn('ANSI转换失败:', error)
      }
    }

    connection.terminalOutput.push(line)

    // 限制输出历史记录
    if (connection.terminalOutput.length > 1000) {
      connection.terminalOutput = connection.terminalOutput.slice(-500)
    }
  }

  // 滚动到底部
  const scrollToBottom = (connectionId) => {
    nextTick(() => {
      const terminal = document.querySelector(`[ref="terminal-${connectionId}"]`)
      if (terminal) {
        terminal.scrollTop = terminal.scrollHeight
      }
    })
  }

  // 清空终端
  const clearTerminal = (connectionId) => {
    const connection = activeConnections.value.find(c => c.id === connectionId)
    if (connection) {
      connection.terminalOutput = []
      addTerminalOutput(connection, {
        type: 'info',
        content: '终端已清空',
        timestamp: new Date()
      })
    }
  }

  // 复制终端内容
  const copyTerminalContent = async (connectionId) => {
    const connection = activeConnections.value.find(c => c.id === connectionId)
    if (connection) {
      const content = connection.terminalOutput
        .map(line => line.content)
        .join('\n')

      try {
        await navigator.clipboard.writeText(content)
        emit('show-notification', '终端内容已复制到剪贴板', 'success')
      } catch (error) {
        emit('show-notification', '复制失败', 'error')
      }
    }
  }

  // Tab补全 - 与自动补全组件集成
  const handleTabCompletion = (connection) => {
    // 找到对应的自动补全组件
    const autocompleteRef = autocompleteRefs.value[connection.id]

    if (autocompleteRef && 
        autocompleteRef.filteredSuggestions && 
        autocompleteRef.filteredSuggestions.value && 
        autocompleteRef.filteredSuggestions.value.length > 0) {
      // 如果有建议项，选择第一个建议项
      const firstSuggestion = autocompleteRef.filteredSuggestions.value[0]
      handleAutocompleteSelect(firstSuggestion.command)
    } else {
      // 如果没有建议项，隐藏自动补全
      connection.showAutocomplete = false
    }
  }

  // 设置自动补全组件引用
  const setAutocompleteRef = (connectionId, el) => {
    if (el && connectionId) {
      autocompleteRefs.value[connectionId] = el
    }
  }

  // 终端输入框事件处理
  const handleTerminalKeydown = (event, connection) => {
    // 处理Tab键自动补全
    if (event.key === 'Tab') {
      event.preventDefault()
      handleTabCompletion(connection)
      return
    }

    // 如果自动补全组件可见，优先委托给自动补全组件处理上下箭头键和Enter键
    if (connection.showAutocomplete && (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter' || event.key === 'Escape')) {
      // 找到对应的自动补全组件
      const autocompleteRef = autocompleteRefs.value[connection.id]

      if (autocompleteRef && autocompleteRef.handleKeyDown && autocompleteRef.handleKeyDown(event)) {
        // 如果自动补全组件处理了该事件，阻止默认行为并返回
        event.preventDefault()
        event.stopPropagation()
        return
      }

      // 如果补全组件存在但没有处理该事件，仍然阻止默认行为
      if (autocompleteRef) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
    }

    // 处理其他按键事件
    switch (event.key) {
      case 'Enter':
        // 只有在没有显示补全时才执行命令
        if (connection.currentCommand.trim()) {
          executeCommand(connection)
        }
        break
      case 'Escape':
        connection.showAutocomplete = false
        break
    }
  }

  const handleTerminalInput = (connection) => {
    // 显示自动补全建议（如果输入内容不为空）
    connection.showAutocomplete = connection.currentCommand.trim().length > 0
  }

  const handleTerminalFocus = (connection) => {
    // 获得焦点时显示自动补全（如果有输入内容）
    connection.showAutocomplete = connection.currentCommand.trim().length > 0
  }

  const handleTerminalBlur = (connection) => {
    // 延迟隐藏自动补全，以便处理点击事件
    setTimeout(() => {
      connection.showAutocomplete = false
    }, 200)
  }

  // 自动补全选择处理
  const handleAutocompleteSelect = (command) => {
    const connection = activeConnections.value.find(c => c.id === activeTabId.value)
    if (connection) {
      connection.currentCommand = command
      connection.showAutocomplete = false

      // 聚焦回输入框
      nextTick(() => {
        const inputElement = document.querySelector(`[ref="input-${connection.id}"]`)
        if (inputElement) {
          inputElement.focus()
        }
      })
    }
  }

  // 自动补全隐藏处理
  const handleAutocompleteHide = () => {
    const connection = activeConnections.value.find(c => c.id === activeTabId.value)
    if (connection) {
      connection.showAutocomplete = false
    }
  }

  return {
    // 方法
    executeCommand,
    clearTerminal,
    copyTerminalContent,
    handleTerminalKeydown,
    handleTerminalInput,
    handleTerminalFocus,
    handleTerminalBlur,
    handleAutocompleteSelect,
    handleAutocompleteHide,
    setAutocompleteRef,
    addTerminalOutput,
    scrollToBottom
  }
}
