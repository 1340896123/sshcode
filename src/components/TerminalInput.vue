<template>
  <div class="terminal-input-overlay" :class="{ visible: isVisible }">
    <!-- 自动补全建议 -->
    <div class="autocomplete-container" v-show="showAutocomplete">
      <div class="autocomplete-header">
        <span class="autocomplete-title">命令补全</span>
        <span class="autocomplete-hint">Tab 或 ↑↓ 选择</span>
      </div>
      <div
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion.command"
        :class="['suggestion-item', {
          'active': index === selectedIndex,
          'ai-suggestion': suggestion.type === 'ai',
          'local-suggestion': suggestion.type === 'local'
        }]"
        @click="selectSuggestion(suggestion)"
      >
        <div class="suggestion-content">
          <span class="suggestion-icon">
            {{ suggestion.type === 'ai' ? '🤖' : '📋' }}
          </span>
          <div class="suggestion-text">
            <span class="command">{{ suggestion.command }}</span>
            <span class="description" v-if="suggestion.description">{{ suggestion.description }}</span>
          </div>
        </div>
        <div class="suggestion-meta" v-if="suggestion.confidence">
          <span class="confidence">{{ Math.round(suggestion.confidence * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- 输入框容器 -->
    <div class="input-container">
      <div class="prompt">{{ prompt }}</div>
      <div class="input-wrapper">
        <input
          ref="inputRef"
          v-model="currentInput"
          type="text"
          class="terminal-input"
          :placeholder="placeholder"
          @keydown="handleKeyDown"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          spellcheck="false"
          autocomplete="off"
        />

        <!-- AI 加载指示器 -->
        <div class="ai-indicator" v-show="isAILoading">
          <div class="ai-spinner"></div>
          <span>AI思考中...</span>
        </div>

        <!-- 输入模式指示器 -->
        <div class="mode-indicator" v-if="mode">
          <span class="mode-badge" :class="mode">{{ modeText }}</span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="input-controls">
        <button
          class="control-btn"
          @click="executeCommand"
          :disabled="!currentInput.trim() || isExecuting"
          title="执行命令 (Enter)"
        >
          <span v-if="!isExecuting">▶</span>
          <span v-else class="loading">⟳</span>
        </button>
        <button
          class="control-btn"
          @click="clearInput"
          title="清空输入 (Esc)"
        >
          ✕
        </button>
        <button
          class="control-btn ai-toggle"
          @click="toggleAICompletion"
          :class="{ active: aiEnabled }"
          :title="aiEnabled ? '禁用AI补全' : '启用AI补全'"
        >
          🤖
        </button>
      </div>
    </div>

    <!-- 历史记录建议 -->
    <div class="history-container" v-show="showHistory && commandHistory.length > 0">
      <div class="history-header">
        <span class="history-title">命令历史</span>
        <span class="history-hint">↑↓ 浏览</span>
      </div>
      <div
        v-for="(cmd, index) in recentHistory"
        :key="index"
        :class="['history-item', { active: historyIndex === index }]"
        @click="selectHistory(cmd)"
      >
        <span class="history-command">{{ cmd }}</span>
        <span class="history-time">{{ getHistoryTime(index) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import aiCompletionService from '../utils/aiCompletionService.js'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  connectionId: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    default: '$'
  },
  placeholder: {
    type: String,
    default: '输入命令或使用 AI 补全...'
  }
})

const emit = defineEmits([
  'execute-command',
  'hide-input',
  'show-notification'
])

// 基础状态
const inputRef = ref(null)
const currentInput = ref('')
const isVisible = ref(false)
const isExecuting = ref(false)

// 自动补全状态
const showAutocomplete = ref(false)
const selectedIndex = ref(0)
const filteredSuggestions = ref([])

// AI 补全状态
const aiEnabled = ref(true)
const isAILoading = ref(false)
const aiSuggestions = ref([])

// 历史记录状态
const commandHistory = ref([])
const showHistory = ref(false)
const historyIndex = ref(-1)

// 输入模式
const mode = ref('') // 'ai', 'normal', ''

// 本地命令数据库 (复用 TerminalAutocomplete 的数据)
const localCommands = [
  // 文件操作
  { command: 'ls', description: 'List directory contents', type: 'local' },
  { command: 'ls -la', description: 'List all files including hidden ones', type: 'local' },
  { command: 'cd', description: 'Change directory', type: 'local' },
  { command: 'pwd', description: 'Print working directory', type: 'local' },
  { command: 'mkdir', description: 'Create directory', type: 'local' },
  { command: 'rm', description: 'Remove files or directories', type: 'local' },
  { command: 'rm -rf', description: 'Force remove directory and contents', type: 'local' },
  { command: 'cp', description: 'Copy files or directories', type: 'local' },
  { command: 'mv', description: 'Move/rename files or directories', type: 'local' },
  { command: 'touch', description: 'Create empty file or update timestamp', type: 'local' },
  { command: 'cat', description: 'Display file contents', type: 'local' },
  { command: 'less', description: 'View file contents page by page', type: 'local' },
  { command: 'head', description: 'Display first lines of file', type: 'local' },
  { command: 'tail', description: 'Display last lines of file', type: 'local' },
  { command: 'tail -f', description: 'Follow file content in real-time', type: 'local' },
  { command: 'find', description: 'Search for files', type: 'local' },
  { command: 'grep', description: 'Search text patterns', type: 'local' },
  { command: 'chmod', description: 'Change file permissions', type: 'local' },
  { command: 'chown', description: 'Change file owner', type: 'local' },

  // 系统信息
  { command: 'ps', description: 'Show running processes', type: 'local' },
  { command: 'ps aux', description: 'Show all running processes', type: 'local' },
  { command: 'top', description: 'Display system processes', type: 'local' },
  { command: 'htop', description: 'Interactive process viewer', type: 'local' },
  { command: 'kill', description: 'Terminate processes', type: 'local' },
  { command: 'killall', description: 'Kill processes by name', type: 'local' },
  { command: 'df', description: 'Display disk usage', type: 'local' },
  { command: 'du', description: 'Display directory sizes', type: 'local' },
  { command: 'free', description: 'Display memory usage', type: 'local' },
  { command: 'uname', description: 'Display system information', type: 'local' },
  { command: 'uname -a', description: 'Display all system information', type: 'local' },
  { command: 'uptime', description: 'Show system uptime', type: 'local' },
  { command: 'sudo', description: 'Execute command as superuser', type: 'local' },

  // 网络工具
  { command: 'ping', description: 'Test network connectivity', type: 'local' },
  { command: 'curl', description: 'Transfer data from servers', type: 'local' },
  { command: 'wget', description: 'Download files from web', type: 'local' },
  { command: 'ssh', description: 'Connect to remote server', type: 'local' },
  { command: 'scp', description: 'Secure copy files remotely', type: 'local' },
  { command: 'netstat', description: 'Display network connections', type: 'local' },
  { command: 'ifconfig', description: 'Configure network interfaces', type: 'local' },
  { command: 'ip addr', description: 'Show IP addresses', type: 'local' },

  // Git 命令
  { command: 'git', description: 'Version control system', type: 'local' },
  { command: 'git status', description: 'Show working tree status', type: 'local' },
  { command: 'git add', description: 'Add files to staging area', type: 'local' },
  { command: 'git commit', description: 'Record changes to repository', type: 'local' },
  { command: 'git push', description: 'Push changes to remote repository', type: 'local' },
  { command: 'git pull', description: 'Fetch from and merge with remote repository', type: 'local' },
  { command: 'git branch', description: 'List, create, or delete branches', type: 'local' },
  { command: 'git checkout', description: 'Switch branches or restore working tree files', type: 'local' },
  { command: 'git log', description: 'Show commit logs', type: 'local' },
  { command: 'git diff', description: 'Show changes between commits', type: 'local' },
  { command: 'git merge', description: 'Join branches together', type: 'local' },
  { command: 'git clone', description: 'Clone repository into new directory', type: 'local' },

  // 包管理器
  { command: 'apt-get', description: 'Debian/Ubuntu package manager', type: 'local' },
  { command: 'apt-get update', description: 'Update package lists', type: 'local' },
  { command: 'apt-get install', description: 'Install packages', type: 'local' },
  { command: 'yum', description: 'RHEL/CentOS package manager', type: 'local' },
  { command: 'npm', description: 'Node.js package manager', type: 'local' },
  { command: 'npm install', description: 'Install npm packages', type: 'local' },
  { command: 'npm run', description: 'Run npm scripts', type: 'local' },
  { command: 'pip', description: 'Python package manager', type: 'local' },
  { command: 'pip install', description: 'Install Python packages', type: 'local' },

  // 文本处理
  { command: 'echo', description: 'Display message', type: 'local' },
  { command: 'sed', description: 'Stream editor for filtering and transforming text', type: 'local' },
  { command: 'awk', description: 'Pattern scanning and processing language', type: 'local' },
  { command: 'sort', description: 'Sort lines of text files', type: 'local' },
  { command: 'uniq', description: 'Remove duplicate lines', type: 'local' },
  { command: 'wc', description: 'Word count', type: 'local' },

  // 系统服务
  { command: 'systemctl', description: 'Control systemd services', type: 'local' },
  { command: 'systemctl start', description: 'Start a service', type: 'local' },
  { command: 'systemctl stop', description: 'Stop a service', type: 'local' },
  { command: 'systemctl restart', description: 'Restart a service', type: 'local' },
  { command: 'systemctl status', description: 'Show service status', type: 'local' },
  { command: 'journalctl', description: 'Query systemd journal logs', type: 'local' },

  // 其他常用命令
  { command: 'clear', description: 'Clear terminal screen', type: 'local' },
  { command: 'history', description: 'Display command history', type: 'local' },
  { command: 'man', description: 'Display manual pages', type: 'local' },
  { command: 'vim', description: 'Text editor', type: 'local' },
  { command: 'vi', description: 'Text editor', type: 'local' },
  { command: 'nano', description: 'Text editor', type: 'local' },
  { command: 'exit', description: 'Exit shell', type: 'local' }
]

// 计算属性
const recentHistory = computed(() => {
  return commandHistory.value.slice(-10).reverse()
})

const modeText = computed(() => {
  switch (mode.value) {
    case 'ai': return 'AI'
    case 'normal': return '普通'
    default: return ''
  }
})

// 方法
const show = () => {
  isVisible.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const hide = () => {
  isVisible.value = false
  showAutocomplete.value = false
  showHistory.value = false
  currentInput.value = ''
  emit('hide-input')
}

const focus = () => {
  inputRef.value?.focus()
}

// 过滤建议
const filterSuggestions = async (input) => {
  if (!input || input.trim().length < 1) {
    filteredSuggestions.value = []
    showAutocomplete.value = false
    return
  }

  const trimmedInput = input.trim().toLowerCase()

  // 本地命令匹配
  const localMatches = localCommands.filter(cmd =>
    cmd.command.toLowerCase().includes(trimmedInput)
  ).map(cmd => ({
    ...cmd,
    confidence: cmd.command.toLowerCase().startsWith(trimmedInput) ? 0.9 : 0.6
  }))

  // AI 建议获取
  let aiMatches = []
  if (aiEnabled.value && trimmedInput.length > 2) {
    aiMatches = await getAISuggestions(trimmedInput)
  }

  // 合并和排序建议
  const allSuggestions = [...localMatches, ...aiMatches]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)

  filteredSuggestions.value = allSuggestions
  selectedIndex.value = 0
  showAutocomplete.value = allSuggestions.length > 0
}

// AI 补全建议获取
const getAISuggestions = async (input) => {
  if (!aiEnabled.value) return []

  try {
    isAILoading.value = true

    // 构建上下文信息
    const context = {
      currentDirectory: '', // 可以从父组件传入当前目录
      recentCommands: commandHistory.value.slice(-5),
      connectionId: props.connectionId
    }

    // 调用AI补全服务
    const suggestions = await aiCompletionService.getCommandSuggestions(input, context)

    return suggestions.map(suggestion => ({
      ...suggestion,
      type: 'ai'
    }))
  } catch (error) {
    console.error('获取AI建议失败:', error)
    emit('show-notification', {
      type: 'error',
      message: 'AI补全功能暂时不可用'
    })
    return []
  } finally {
    isAILoading.value = false
  }
}

// 选择建议
const selectSuggestion = (suggestion) => {
  currentInput.value = suggestion.command
  showAutocomplete.value = false
  selectedIndex.value = 0
  focus()
}

// 选择历史记录
const selectHistory = (cmd) => {
  currentInput.value = cmd
  showHistory.value = false
  historyIndex.value = -1
  focus()
}

// 执行命令
const executeCommand = async () => {
  const command = currentInput.value.trim()
  if (!command) return

  isExecuting.value = true

  // 添加到历史记录
  if (!commandHistory.value.includes(command)) {
    commandHistory.value.push(command)
    // 限制历史记录数量
    if (commandHistory.value.length > 100) {
      commandHistory.value = commandHistory.value.slice(-100)
    }
  }

  // 发送执行事件
  emit('execute-command', command)

  // 清空输入
  currentInput.value = ''
  showAutocomplete.value = false
  showHistory.value = false
  historyIndex.value = -1

  isExecuting.value = false
  focus()
}

// 清空输入
const clearInput = () => {
  currentInput.value = ''
  showAutocomplete.value = false
  showHistory.value = false
  historyIndex.value = -1
  focus()
}

// 切换AI补全
const toggleAICompletion = () => {
  aiEnabled.value = !aiEnabled.value
  emit('show-notification', {
    type: 'info',
    message: aiEnabled.value ? 'AI补全已启用' : 'AI补全已禁用'
  })

  // 重新过滤建议
  if (currentInput.value) {
    filterSuggestions(currentInput.value)
  }
}

// 获取历史记录时间
const getHistoryTime = (index) => {
  // 这里可以存储和显示实际的时间戳
  return '最近'
}

// 事件处理
const handleInput = (event) => {
  showHistory.value = false
  historyIndex.value = -1

  if (event.target.value) {
    filterSuggestions(event.target.value)
  } else {
    showAutocomplete.value = false
  }
}

const handleKeyDown = async (event) => {
  const key = event.key

  // 自动补全导航
  if (showAutocomplete.value && filteredSuggestions.value.length > 0) {
    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedIndex.value = (selectedIndex.value + 1) % filteredSuggestions.value.length
        return

      case 'ArrowUp':
        event.preventDefault()
        selectedIndex.value = selectedIndex.value === 0
          ? filteredSuggestions.value.length - 1
          : selectedIndex.value - 1
        return

      case 'Tab':
        event.preventDefault()
        if (filteredSuggestions.value.length > 0) {
          selectSuggestion(filteredSuggestions.value[selectedIndex.value])
        }
        return

      case 'Enter':
        event.preventDefault()
        selectSuggestion(filteredSuggestions.value[selectedIndex.value])
        return

      case 'Escape':
        event.preventDefault()
        showAutocomplete.value = false
        selectedIndex.value = 0
        return
    }
  }

  // 历史记录导航
  if (showHistory.value || key === 'ArrowUp') {
    switch (key) {
      case 'ArrowUp':
        event.preventDefault()
        if (!showHistory.value) {
          showHistory.value = true
          historyIndex.value = 0
        } else {
          historyIndex.value = Math.min(historyIndex.value + 1, recentHistory.value.length - 1)
          selectHistory(recentHistory.value[historyIndex.value])
        }
        return

      case 'ArrowDown':
        event.preventDefault()
        if (showHistory.value) {
          historyIndex.value = Math.max(historyIndex.value - 1, -1)
          if (historyIndex.value === -1) {
            currentInput.value = ''
          } else {
            selectHistory(recentHistory.value[historyIndex.value])
          }
        }
        return
    }
  }

  // 普通按键处理
  switch (key) {
    case 'Enter':
      event.preventDefault()
      if (!event.shiftKey) {
        executeCommand()
      }
      break

    case 'Escape':
      event.preventDefault()
      if (showAutocomplete.value || showHistory.value) {
        showAutocomplete.value = false
        showHistory.value = false
        selectedIndex.value = 0
        historyIndex.value = -1
      } else {
        hide()
      }
      break

    case 'Tab':
      if (!showAutocomplete.value) {
        event.preventDefault()
        // 手动触发自动补全
        if (currentInput.value) {
          filterSuggestions(currentInput.value)
        }
      }
      break

    case 'F1':
      event.preventDefault()
      mode.value = mode.value === 'ai' ? '' : 'ai'
      break

    case 'F2':
      event.preventDefault()
      toggleAICompletion()
      break
  }
}

const handleFocus = () => {
  mode.value = aiEnabled.value ? 'ai' : 'normal'
}

const handleBlur = () => {
  // 延迟隐藏，允许点击建议项
  setTimeout(() => {
    if (document.activeElement !== inputRef.value) {
      showAutocomplete.value = false
      showHistory.value = false
      mode.value = ''
    }
  }, 200)
}

// 组件挂载时初始化AI服务
onMounted(async () => {
  try {
    await aiCompletionService.initialize()
  } catch (error) {
    console.warn('AI completion service initialization failed:', error)
  }
})

// 监听器
watch(() => props.isVisible, (visible) => {
  isVisible.value = visible
  if (visible) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

// 暴露方法
defineExpose({
  show,
  hide,
  focus,
  clear: clearInput,
  getContextualSuggestions: () => aiCompletionService.getContextualSuggestions({
    currentDirectory: '',
    recentCommands: commandHistory.value.slice(-5),
    connectionId: props.connectionId
  })
})
</script>

<style lang="scss" scoped>
.terminal-input-overlay {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  z-index: 10000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;

  &.visible {
    opacity: 1;
    visibility: visible;
  }
}

// 自动补全容器
.autocomplete-container {
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid #444;
  border-radius: 8px 8px 0 0;
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  margin-bottom: 2px;
  max-height: 240px;
  overflow-y: auto;

  .autocomplete-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid #444;

    .autocomplete-title {
      color: #74c0fc;
      font-size: 12px;
      font-weight: 600;
    }

    .autocomplete-hint {
      color: #868e96;
      font-size: 11px;
    }
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover,
    &.active {
      background: rgba(116, 192, 252, 0.1);
    }

    &.ai-suggestion {
      border-left: 3px solid #0066cc;
    }

    &.local-suggestion {
      border-left: 3px solid #51cf66;
    }

    .suggestion-content {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;

      .suggestion-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }

      .suggestion-text {
        flex: 1;

        .command {
          display: block;
          color: #fff;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 2px;
        }

        .description {
          display: block;
          color: #868e96;
          font-size: 11px;
          line-height: 1.3;
        }
      }
    }

    .suggestion-meta {
      .confidence {
        background: rgba(116, 192, 252, 0.2);
        color: #74c0fc;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
    }
  }
}

// 历史记录容器
.history-container {
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid #444;
  border-radius: 0 0 8px 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin-top: 2px;
  max-height: 180px;
  overflow-y: auto;

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid #444;

    .history-title {
      color: #f06595;
      font-size: 12px;
      font-weight: 600;
    }

    .history-hint {
      color: #868e96;
      font-size: 11px;
    }
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover,
    &.active {
      background: rgba(240, 101, 149, 0.1);
    }

    .history-command {
      color: #fff;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      flex: 1;
    }

    .history-time {
      color: #868e96;
      font-size: 10px;
      margin-left: 10px;
    }
  }
}

// 输入容器
.input-container {
  display: flex;
  align-items: center;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

  .prompt {
    color: #74c0fc;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    font-weight: bold;
    margin-right: 12px;
    white-space: nowrap;
  }

  .input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;

    .terminal-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #fff;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      outline: none;
      padding: 8px 0;

      &::placeholder {
        color: #868e96;
      }
    }

    .ai-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 12px;
      color: #74c0fc;
      font-size: 12px;

      .ai-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(116, 192, 252, 0.3);
        border-top: 2px solid #74c0fc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    .mode-indicator {
      margin-left: 12px;

      .mode-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        text-transform: uppercase;

        &.ai {
          background: rgba(116, 192, 252, 0.2);
          color: #74c0fc;
        }

        &.normal {
          background: rgba(81, 207, 102, 0.2);
          color: #51cf66;
        }
      }
    }
  }

  .input-controls {
    display: flex;
    gap: 8px;
    margin-left: 12px;

    .control-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.ai-toggle {
        &.active {
          background: rgba(116, 192, 252, 0.3);
          color: #74c0fc;
        }
      }

      .loading {
        animation: spin 1s linear infinite;
      }
    }
  }
}

// 动画
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 自定义滚动条
.autocomplete-container,
.history-container {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;

    &:hover {
      background: #777;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .terminal-input-overlay {
    width: 95%;
    bottom: 10px;
  }

  .input-container {
    padding: 10px;

    .prompt {
      font-size: 12px;
      margin-right: 8px;
    }

    .terminal-input {
      font-size: 12px;
    }

    .input-controls {
      gap: 6px;

      .control-btn {
        width: 28px;
        height: 28px;
        font-size: 11px;
      }
    }
  }

  .suggestion-item,
  .history-item {
    padding: 8px 10px;
  }
}
</style>