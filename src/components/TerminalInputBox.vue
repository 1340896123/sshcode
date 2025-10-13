<template>
  <div class="terminal-input-box" :class="{ 'focused': isFocused }">
    <!-- 输入框容器 -->
    <div class="input-container">
      <!-- 提示符 -->
      <div class="prompt-symbol">$</div>

      <!-- 主输入框 -->
      <input
        ref="commandInput"
        v-model="currentCommand"
        type="text"
        class="command-input"
        :placeholder="placeholder"
        @keydown="handleKeyDown"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        autocomplete="off"
        spellcheck="false"
      />

      <!-- 发送按钮 -->
      <button
        class="send-button"
        @click="executeCommand"
        :disabled="!currentCommand.trim()"
        title="执行命令 (Enter)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>

    <!-- 自动补全建议 -->
    <div
      v-show="showSuggestions && suggestions.length > 0"
      class="suggestions-dropdown"
      :style="{
        maxHeight: suggestions.length > 6 ? '240px' : 'auto',
        overflowY: suggestions.length > 6 ? 'auto' : 'visible'
      }"
    >
      <div class="suggestions-header">
        <span class="suggestions-title">{{ suggestionsTitle }}</span>
        <span class="suggestions-count">{{ suggestions.length }} 个建议</span>
      </div>

      <div
        v-for="(suggestion, index) in suggestions"
        :key="`${suggestion.command}-${index}`"
        :class="[
          'suggestion-item',
          {
            'active': index === selectedSuggestionIndex,
            'ai-suggestion': suggestion.type === 'ai',
            'local-suggestion': suggestion.type === 'local'
          }
        ]"
        @click="applySuggestion(suggestion)"
        @mouseenter="selectedSuggestionIndex = index"
      >
        <div class="suggestion-content">
          <span class="suggestion-icon">
            {{ suggestion.type === 'ai' ? '🤖' : '📋' }}
          </span>
          <div class="suggestion-text">
            <span class="command">{{ highlightMatch(suggestion.command) }}</span>
            <span class="description" v-if="suggestion.description">{{ suggestion.description }}</span>
          </div>
        </div>
        <div class="suggestion-meta" v-if="suggestion.confidence">
          <span class="confidence">{{ Math.round(suggestion.confidence * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- AI状态指示器 -->
    <div class="ai-status" v-if="showAIStatus">
      <div class="ai-loading" v-if="isAILoading">
        <div class="ai-spinner"></div>
        <span>AI思考中...</span>
      </div>
      <div class="ai-enabled" v-else-if="aiEnabled">
        <span class="ai-indicator active"></span>
        <span>AI补全已启用</span>
      </div>
      <div class="ai-disabled" v-else>
        <span class="ai-indicator"></span>
        <span>AI补全已禁用</span>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <div class="shortcuts-hint" v-if="showHints">
      <span class="hint-item">Tab 补全</span>
      <span class="hint-item">↑↓ 选择</span>
      <span class="hint-item">Esc 取消</span>
      <span class="hint-item">Ctrl+Space 显示建议</span>
      <span class="hint-item">F4 切换AI</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import aiCompletionService from '../utils/aiCompletionService.js'

// Props
const props = defineProps({
  connectionId: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: '输入命令...'
  },
  showHints: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['execute-command', 'show-notification'])

// 组件状态
const commandInput = ref(null)
const currentCommand = ref('')
const isFocused = ref(false)
const isComposing = ref(false)
const commandHistory = ref([])
const historyIndex = ref(-1)

// 补全相关状态
const showSuggestions = ref(false)
const suggestions = ref([])
const selectedSuggestionIndex = ref(0)
const aiEnabled = ref(true)
const isAILoading = ref(false)
const showAIStatus = ref(false)
const suggestionsTitle = ref('命令补全')
const debounceTimer = ref(null)

// 本地命令数据库
const localCommands = [
  // 文件操作
  { command: 'ls', description: 'List directory contents', type: 'local' },
  { command: 'ls -la', description: 'List all files including hidden ones', type: 'local' },
  { command: 'ls -lh', description: 'Display file sizes in human readable format', type: 'local' },
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
  { command: 'tree', description: 'Display directory structure in tree format', type: 'local' },

  // 系统信息
  { command: 'ps', description: 'Show running processes', type: 'local' },
  { command: 'ps aux', description: 'Show all running processes', type: 'local' },
  { command: 'top', description: 'Display system processes', type: 'local' },
  { command: 'htop', description: 'Interactive process viewer', type: 'local' },
  { command: 'kill', description: 'Terminate processes', type: 'local' },
  { command: 'df', description: 'Display disk usage', type: 'local' },
  { command: 'du', description: 'Display directory sizes', type: 'local' },
  { command: 'free', description: 'Display memory usage', type: 'local' },
  { command: 'uname', description: 'Display system information', type: 'local' },
  { command: 'sudo', description: 'Execute command as superuser', type: 'local' },
  { command: 'whoami', description: 'Display current user', type: 'local' },
  { command: 'id', description: 'Display user and group information', type: 'local' },

  // 网络工具
  { command: 'ping', description: 'Test network connectivity', type: 'local' },
  { command: 'curl', description: 'Transfer data from servers', type: 'local' },
  { command: 'wget', description: 'Download files from web', type: 'local' },
  { command: 'ssh', description: 'Connect to remote server', type: 'local' },
  { command: 'scp', description: 'Secure copy files remotely', type: 'local' },
  { command: 'netstat', description: 'Display network connections', type: 'local' },
  { command: 'ip addr', description: 'Show IP addresses', type: 'local' },
  { command: 'ifconfig', description: 'Configure network interfaces', type: 'local' },

  // Git 命令
  { command: 'git', description: 'Version control system', type: 'local' },
  { command: 'git status', description: 'Show working tree status', type: 'local' },
  { command: 'git add', description: 'Add files to staging area', type: 'local' },
  { command: 'git add .', description: 'Add all files to staging area', type: 'local' },
  { command: 'git commit', description: 'Record changes to repository', type: 'local' },
  { command: 'git commit -m', description: 'Commit with message', type: 'local' },
  { command: 'git push', description: 'Push changes to remote repository', type: 'local' },
  { command: 'git pull', description: 'Fetch from and merge with remote repository', type: 'local' },
  { command: 'git branch', description: 'List, create, or delete branches', type: 'local' },
  { command: 'git checkout', description: 'Switch branches or restore working tree files', type: 'local' },
  { command: 'git log', description: 'Show commit logs', type: 'local' },
  { command: 'git diff', description: 'Show changes between commits', type: 'local' },
  { command: 'git clone', description: 'Clone a repository', type: 'local' },

  // 包管理器
  { command: 'apt-get', description: 'Debian/Ubuntu package manager', type: 'local' },
  { command: 'apt-get update', description: 'Update package lists', type: 'local' },
  { command: 'apt-get install', description: 'Install packages', type: 'local' },
  { command: 'apt-get upgrade', description: 'Upgrade installed packages', type: 'local' },
  { command: 'yum', description: 'RHEL/CentOS package manager', type: 'local' },
  { command: 'yum install', description: 'Install packages with yum', type: 'local' },
  { command: 'dnf', description: 'Modern Fedora package manager', type: 'local' },
  { command: 'npm', description: 'Node.js package manager', type: 'local' },
  { command: 'npm install', description: 'Install npm packages', type: 'local' },
  { command: 'npm run', description: 'Run npm scripts', type: 'local' },
  { command: 'npm start', description: 'Start npm application', type: 'local' },
  { command: 'npm test', description: 'Run npm tests', type: 'local' },
  { command: 'pip', description: 'Python package manager', type: 'local' },
  { command: 'pip install', description: 'Install Python packages', type: 'local' },

  // 其他常用命令
  { command: 'clear', description: 'Clear terminal screen', type: 'local' },
  { command: 'history', description: 'Display command history', type: 'local' },
  { command: 'man', description: 'Display manual pages', type: 'local' },
  { command: 'vim', description: 'Text editor', type: 'local' },
  { command: 'vi', description: 'Text editor', type: 'local' },
  { command: 'nano', description: 'Text editor', type: 'local' },
  { command: 'exit', description: 'Exit shell', type: 'local' },
  { command: 'logout', description: 'Log out from current session', type: 'local' },
  { command: 'reboot', description: 'Reboot the system', type: 'local' },
  { command: 'shutdown', description: 'Shutdown the system', type: 'local' },
  { command: 'echo', description: 'Display a line of text', type: 'local' },
  { command: 'date', description: 'Display or set the system date and time', type: 'local' },
  { command: 'which', description: 'Locate a command', type: 'local' },
  { command: 'whereis', description: 'Locate the binary, source, and manual page files for a command', type: 'local' },
  { command: 'type', description: 'Display information about command type', type: 'local' }
]

// 智能补全方法
const filterSuggestions = async (input) => {
  console.log(`🔍 [TerminalInputBox] 开始过滤建议，输入: "${input}"`)

  if (!input || input.trim().length < 1) {
    suggestions.value = []
    showSuggestions.value = false
    console.log(`📝 [TerminalInputBox] 输入为空，隐藏建议`)
    return
  }

  const trimmedInput = input.trim().toLowerCase()
  console.log(`📝 [TerminalInputBox] 处理输入: "${trimmedInput}"`)

  // 本地命令匹配
  const localMatches = localCommands.filter(cmd =>
    cmd.command.toLowerCase().includes(trimmedInput)
  ).map(cmd => ({
    ...cmd,
    confidence: cmd.command.toLowerCase().startsWith(trimmedInput) ? 0.9 : 0.6
  }))

  console.log(`📋 [TerminalInputBox] 本地匹配结果: ${localMatches.length} 个`)

  // AI 建议获取
  let aiMatches = []
  if (aiEnabled.value && trimmedInput.length > 2) {
    try {
      isAILoading.value = true
      showAIStatus.value = true
      console.log(`🤖 [TerminalInputBox] 开始获取AI建议...`)

      const context = {
        currentDirectory: '', // 可以从父组件传递
        recentCommands: commandHistory.value.slice(-5),
        connectionId: props.connectionId
      }

      aiMatches = await aiCompletionService.getCommandSuggestions(trimmedInput, context)
      aiMatches = aiMatches.map(suggestion => ({
        ...suggestion,
        type: 'ai'
      }))

      console.log(`🤖 [TerminalInputBox] AI建议获取完成: ${aiMatches.length} 个`)
    } catch (error) {
      console.error('❌ [TerminalInputBox] 获取AI建议失败:', error)
    } finally {
      isAILoading.value = false
    }
  }

  // 合并和排序建议
  const allSuggestions = [...localMatches, ...aiMatches]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)

  suggestions.value = allSuggestions
  selectedSuggestionIndex.value = 0
  showSuggestions.value = allSuggestions.length > 0

  console.log(`✅ [TerminalInputBox] 建议处理完成: ${allSuggestions.length} 个，显示: ${showSuggestions.value}`)

  // 更新标题
  if (aiMatches.length > 0) {
    suggestionsTitle.value = '🤖 AI + 本地补全'
  } else {
    suggestionsTitle.value = '📋 本地补全'
  }
}

// 应用建议
const applySuggestion = (suggestion) => {
  console.log(`🎯 [TerminalInputBox] 应用建议: "${suggestion.command}"`)
  currentCommand.value = suggestion.command
  showSuggestions.value = false
  commandInput.value?.focus()
}

// 高亮匹配文本
const highlightMatch = (command) => {
  if (!currentCommand.value.trim()) return command

  const regex = new RegExp(`(${currentCommand.value.trim()})`, 'gi')
  return command.replace(regex, '<mark>$1</mark>')
}

// 导航建议
const navigateSuggestions = (direction) => {
  if (!showSuggestions.value || suggestions.value.length === 0) return

  if (direction === 'down') {
    selectedSuggestionIndex.value = (selectedSuggestionIndex.value + 1) % suggestions.value.length
  } else if (direction === 'up') {
    selectedSuggestionIndex.value = selectedSuggestionIndex.value === 0
      ? suggestions.value.length - 1
      : selectedSuggestionIndex.value - 1
  }
}

// 隐藏建议
const hideSuggestions = () => {
  showSuggestions.value = false
  selectedSuggestionIndex.value = 0
}

// 切换AI
const toggleAI = () => {
  aiEnabled.value = !aiEnabled.value
  showAIStatus.value = true
  setTimeout(() => {
    showAIStatus.value = false
  }, 2000)

  emit('show-notification', {
    type: 'info',
    message: aiEnabled.value ? 'AI补全已启用' : 'AI补全已禁用'
  })

  // 重新过滤建议
  if (currentCommand.value) {
    filterSuggestions(currentCommand.value)
  }
}

// 执行命令
const executeCommand = () => {
  const command = currentCommand.value.trim()
  if (!command) return

  console.log(`🚀 [TerminalInputBox] 执行命令: "${command}"`)

  // 添加到历史记录
  if (!commandHistory.value.includes(command)) {
    commandHistory.value.push(command)
    // 限制历史记录数量
    if (commandHistory.value.length > 100) {
      commandHistory.value = commandHistory.value.slice(-100)
    }
  }

  historyIndex.value = -1

  // 发送命令到父组件
  emit('execute-command', command)

  // 清空输入框
  currentCommand.value = ''
  hideSuggestions()
}

// 键盘事件处理
const handleKeyDown = (event) => {
  console.log(`⌨️ [TerminalInputBox] 键盘事件: ${event.key}, Ctrl: ${event.ctrlKey}, Alt: ${event.altKey}, Shift: ${event.shiftKey}`)

  // 处理组合键
  if (event.ctrlKey || event.altKey) {
    switch (event.key) {
      case ' ':
        // Ctrl+Space 显示/隐藏补全
        event.preventDefault()
        if (showSuggestions.value) {
          hideSuggestions()
        } else {
          filterSuggestions(currentCommand.value)
        }
        break

      case 'ArrowUp':
        // Ctrl+↑ 浏览历史
        event.preventDefault()
        navigateHistory('up')
        break

      case 'ArrowDown':
        // Ctrl+↓ 浏览历史
        event.preventDefault()
        navigateHistory('down')
        break
    }
    return
  }

  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      if (showSuggestions.value && suggestions.value.length > 0) {
        applySuggestion(suggestions.value[selectedSuggestionIndex.value])
      } else {
        executeCommand()
      }
      break

    case 'Tab':
      event.preventDefault()
      if (showSuggestions.value && suggestions.value.length > 0) {
        applySuggestion(suggestions.value[selectedSuggestionIndex.value])
      } else {
        filterSuggestions(currentCommand.value)
      }
      break

    case 'ArrowUp':
      event.preventDefault()
      if (showSuggestions.value) {
        navigateSuggestions('up')
      } else {
        navigateHistory('up')
      }
      break

    case 'ArrowDown':
      event.preventDefault()
      if (showSuggestions.value) {
        navigateSuggestions('down')
      } else {
        navigateHistory('down')
      }
      break

    case 'Escape':
      event.preventDefault()
      hideSuggestions()
      break

    case 'F4':
      event.preventDefault()
      toggleAI()
      break

    case 'l':
      if (event.ctrlKey) {
        event.preventDefault()
        // Ctrl+L 清空输入
        currentCommand.value = ''
        hideSuggestions()
      }
      break
  }
}

// 输入事件处理
const handleInput = () => {
  if (isComposing.value) return

  // 清除之前的定时器
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }

  // 设置新的定时器，延迟触发补全
  debounceTimer.value = setTimeout(() => {
    filterSuggestions(currentCommand.value)
  }, 300)
}

// 焦点事件处理
const handleFocus = () => {
  isFocused.value = true
  // 如果有输入内容，显示建议
  if (currentCommand.value.trim()) {
    filterSuggestions(currentCommand.value)
  }
}

const handleBlur = () => {
  isFocused.value = false
  // 延迟隐藏建议，以便点击建议项目
  setTimeout(() => {
    hideSuggestions()
  }, 200)
}

// 输入法事件处理
const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
  handleInput()
}

// 历史记录导航
const navigateHistory = (direction) => {
  if (commandHistory.value.length === 0) return

  if (direction === 'up') {
    if (historyIndex.value === -1) {
      // 开始浏览历史，保存当前输入
      historyIndex.value = commandHistory.value.length - 1
    } else if (historyIndex.value > 0) {
      historyIndex.value--
    } else {
      return // 已经是最早的历史记录
    }
  } else if (direction === 'down') {
    if (historyIndex.value === -1) return

    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++
    } else {
      // 回到当前输入
      historyIndex.value = -1
      currentCommand.value = ''
      return
    }
  }

  if (historyIndex.value >= 0 && historyIndex.value < commandHistory.value.length) {
    currentCommand.value = commandHistory.value[historyIndex.value]
  }
}

// 点击外部隐藏建议
const handleClickOutside = (event) => {
  if (!event.target.closest('.terminal-input-box')) {
    hideSuggestions()
  }
}

// 初始化
onMounted(async () => {
  console.log('✅ [TerminalInputBox] 组件初始化')

  // 初始化AI服务
  try {
    await aiCompletionService.initialize()
    console.log('✅ [TerminalInputBox] AI completion service initialized')
  } catch (error) {
    console.warn('⚠️ [TerminalInputBox] AI completion service initialization failed:', error)
    aiEnabled.value = false
  }

  // 添加全局点击事件监听
  document.addEventListener('click', handleClickOutside)

  // 聚焦输入框
  nextTick(() => {
    commandInput.value?.focus()
  })
})

// 清理
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
})

// 暴露方法给父组件
defineExpose({
  focus: () => commandInput.value?.focus(),
  clear: () => {
    currentCommand.value = ''
    hideSuggestions()
  },
  executeCommand
})
</script>

<style lang="scss" scoped>
.terminal-input-box {
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;

  &.focused {
    .input-container {
      border-color: #74c0fc;
      box-shadow: 0 0 0 2px rgba(116, 192, 252, 0.2);
    }
  }
}

.input-container {
  display: flex;
  align-items: center;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 4px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #666;
    background: #2d2d2d;
  }
}

.prompt-symbol {
  color: #74c0fc;
  font-weight: bold;
  font-size: 14px;
  padding: 0 8px;
  user-select: none;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  padding: 8px 4px;
  line-height: 1.4;

  &::placeholder {
    color: #868e96;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.send-button {
  background: #74c0fc;
  border: none;
  border-radius: 6px;
  color: #000;
  padding: 8px 12px;
  margin: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: #91a7ff;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #555;
    color: #868e96;
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid #555;
  border-radius: 8px;
  margin-top: 4px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;

  .suggestions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid #444;

    .suggestions-title {
      color: #74c0fc;
      font-size: 12px;
      font-weight: 600;
    }

    .suggestions-count {
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

          :deep(mark) {
            background: rgba(116, 192, 252, 0.3);
            color: #74c0fc;
            padding: 1px 2px;
            border-radius: 2px;
          }
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

.ai-status {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 10px;
  backdrop-filter: blur(10px);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  animation: fadeIn 0.3s ease;

  .ai-loading {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #74c0fc;

    .ai-spinner {
      width: 10px;
      height: 10px;
      border: 2px solid rgba(116, 192, 252, 0.3);
      border-top: 2px solid #74c0fc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .ai-enabled {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #51cf66;

    .ai-indicator.active {
      background: #51cf66;
      box-shadow: 0 0 4px #51cf66;
    }
  }

  .ai-disabled {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #868e96;

    .ai-indicator {
      background: #868e96;
    }
  }

  .ai-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
}

.shortcuts-hint {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-size: 11px;
  color: #868e96;
  flex-wrap: wrap;

  .hint-item {
    display: flex;
    align-items: center;
    gap: 4px;

    &::before {
      content: '•';
      color: #74c0fc;
    }
  }
}

// 动画
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 滚动条样式
.suggestions-dropdown::-webkit-scrollbar {
  width: 6px;
}

.suggestions-dropdown::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.suggestions-dropdown::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;

  &:hover {
    background: #777;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .terminal-input-box {
    margin: 0 8px;
  }

  .input-container {
    padding: 3px;
  }

  .prompt-symbol {
    padding: 0 6px;
    font-size: 13px;
  }

  .command-input {
    font-size: 13px;
    padding: 6px 3px;
  }

  .send-button {
    padding: 6px 8px;
    margin: 3px;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  .suggestions-dropdown {
    .suggestion-item {
      padding: 8px 10px;

      .suggestion-text {
        .command {
          font-size: 12px;
        }

        .description {
          font-size: 10px;
        }
      }
    }
  }

  .shortcuts-hint {
    gap: 8px;
    font-size: 10px;
    padding: 6px 8px;

    .hint-item {
      white-space: nowrap;
    }
  }

  .ai-status {
    top: -35px;
    padding: 4px 8px;
    font-size: 11px;
  }
}
</style>