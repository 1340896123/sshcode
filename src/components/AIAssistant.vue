<template>
  <div class="ai-assistant ai-assistant-component">
    <!-- AI助手工具栏 -->
    <div class="ai-toolbar">
      <div class="toolbar-left">
        <div class="ai-status" :class="{ connected: aiConnected, connecting: aiConnecting }">
          <span class="status-dot"></span>
          <span class="status-text">{{ aiStatusText }}</span>
        </div>
      </div>

      <div class="toolbar-right">
        <button class="toolbar-btn" @click="clearChat" title="清空聊天">
          🗑️
        </button>
        <button class="toolbar-btn" @click="exportChat" title="导出聊天">
          📥
        </button>
        <button class="toolbar-btn" @click="toggleSettings" title="设置">
          ⚙️
        </button>
      </div>
    </div>

    <!-- 聊天消息区域 -->
    <div class="chat-container" ref="chatContainer">
      <div v-if="messages.length === 0" class="welcome-message">
        <div class="welcome-icon">🤖</div>
        <h3>AI 助手</h3>
        <p>我可以帮助您管理服务器、执行命令、分析文件等</p>
        <div class="suggested-questions">
          <div class="suggestion-title">试试问这些：</div>
          <div class="suggestion-list">
            <button class="suggestion-btn" @click="sendSuggestedMessage('查看系统信息')">
              🔍 查看系统信息
            </button>
            <button class="suggestion-btn" @click="sendSuggestedMessage('检查磁盘使用情况')">
              💾 检查磁盘使用情况
            </button>
            <button class="suggestion-btn" @click="sendSuggestedMessage('列出正在运行的进程')">
              ⚡ 列出正在运行的进程
            </button>
            <button class="suggestion-btn" @click="sendSuggestedMessage('帮我分析日志文件')">
              📊 帮我分析日志文件
            </button>
          </div>
        </div>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }"
        >
          <div class="message-avatar">
            <span v-if="message.role === 'user'">👤</span>
            <span v-else>🤖</span>
          </div>

          <div class="message-content">
            <div class="message-header">
              <span class="message-role">{{ message.role === 'user' ? '您' : 'AI助手' }}</span>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>

            <div class="message-text" v-html="formatMessage(message.content)"></div>

            <!-- AI消息的操作按钮 -->
            <div v-if="message.role === 'assistant'" class="message-actions">
              <button
                v-if="message.suggestedCommand"
                class="action-btn command-btn"
                @click="executeSuggestedCommand(message.suggestedCommand)"
                title="执行此命令"
              >
                ⚡ 执行命令
              </button>
              <button class="action-btn" @click="copyMessage(message.content)" title="复制">
                📋
              </button>
              <button class="action-btn" @click="regenerateResponse(message)" title="重新生成">
                🔄
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 正在输入指示器 -->
      <div v-if="isTyping" class="typing-indicator">
        <div class="typing-avatar">🤖</div>
        <div class="typing-content">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">AI正在思考...</span>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-container">
      <div class="input-toolbar">
        <button
          class="tool-btn"
          @click="insertCommandTemplate"
          title="插入命令模板"
        >
          ⌨️
        </button>
        <button
          class="tool-btn"
          @click="attachFile"
          title="附加文件"
        >
          📎
        </button>
        <button
          class="tool-btn"
          @click="toggleTerminalAccess"
          :class="{ active: terminalAccessEnabled }"
          title="终端访问"
        >
          💻
        </button>
      </div>

      <div class="input-wrapper">
        <textarea
          ref="messageInput"
          v-model="currentMessage"
          @keydown="handleKeyDown"
          @input="handleInput"
          placeholder="输入您的问题或命令..."
          class="message-input"
          rows="1"
          :disabled="!aiConnected || isTyping"
        ></textarea>
        <button
          class="send-btn"
          @click="sendMessage"
          :disabled="!currentMessage.trim() || !aiConnected || isTyping"
          title="发送消息 (Ctrl+Enter)"
        >
          <span v-if="isTyping">⏳</span>
          <span v-else>📤</span>
        </button>
      </div>

      <div class="input-info">
        <span v-if="currentMessage.length > 0" class="char-count">
          {{ currentMessage.length }} / 4000
        </span>
        <span v-if="terminalAccessEnabled" class="terminal-indicator">
          💻 终端访问已启用
        </span>
      </div>
    </div>

    <!-- 命令模板选择器 -->
    <div v-if="commandTemplateModal.show" class="modal-overlay" @click="closeCommandTemplateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>选择命令模板</h3>
          <button class="close-btn" @click="closeCommandTemplateModal">×</button>
        </div>
        <div class="modal-body">
          <div class="template-categories">
            <div
              v-for="category in commandCategories"
              :key="category.name"
              class="template-category"
            >
              <h4>{{ category.name }}</h4>
              <div class="template-list">
                <div
                  v-for="template in category.templates"
                  :key="template.name"
                  class="template-item"
                  @click="selectCommandTemplate(template)"
                >
                  <div class="template-name">{{ template.name }}</div>
                  <div class="template-description">{{ template.description }}</div>
                  <div class="template-command">{{ template.command }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置面板 -->
    <div v-if="settingsModal.show" class="modal-overlay" @click="closeSettingsModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>AI助手设置</h3>
          <button class="close-btn" @click="closeSettingsModal">×</button>
        </div>
        <div class="modal-body">
          <div class="setting-group">
            <label>AI模型</label>
            <select v-model="aiSettings.model" class="setting-select">
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="glm-4">GLM-4</option>
            </select>
          </div>

          <div class="setting-group">
            <label>响应温度</label>
            <input
              type="range"
              v-model="aiSettings.temperature"
              min="0"
              max="1"
              step="0.1"
              class="setting-range"
            />
            <span class="range-value">{{ aiSettings.temperature }}</span>
          </div>

          <div class="setting-group">
            <label>最大令牌数</label>
            <input
              type="number"
              v-model="aiSettings.maxTokens"
              min="100"
              max="4000"
              step="100"
              class="setting-input"
            />
          </div>

          <div class="setting-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="aiSettings.autoExecute"
              />
              自动执行安全的AI建议命令
            </label>
          </div>

          <div class="setting-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="aiSettings.showContext"
              />
              在聊天中显示系统上下文信息
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="primary-btn" @click="saveSettings">保存设置</button>
          <button class="secondary-btn" @click="closeSettingsModal">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

export default {
  name: 'AIAssistant',
  props: {
    connectionId: {
      type: String,
      required: true
    },
    connection: {
      type: Object,
      required: true
    }
  },
  emits: ['show-notification', 'execute-command', 'get-system-info'],
  setup(props, { emit }) {
    // 状态管理
    const messages = ref([])
    const currentMessage = ref('')
    const isTyping = ref(false)
    const aiConnected = ref(false)
    const aiConnecting = ref(false)
    const terminalAccessEnabled = ref(false)
    const messageIdCounter = ref(0)

    // AI设置
    const aiSettings = reactive({
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      autoExecute: false,
      showContext: true
    })

    // 模态框状态
    const commandTemplateModal = reactive({
      show: false
    })

    const settingsModal = reactive({
      show: false
    })

    // 引用
    const chatContainer = ref(null)
    const messageInput = ref(null)

    // 计算属性
    const aiStatusText = computed(() => {
      if (aiConnecting.value) return '连接中...'
      if (aiConnected.value) return '已连接'
      return '未连接'
    })

    // 命令模板
    const commandCategories = ref([
      {
        name: '系统信息',
        templates: [
          { name: '查看系统信息', description: '获取系统基本信息', command: 'uname -a && lsb_release -a' },
          { name: '查看内存使用', description: '检查内存使用情况', command: 'free -h' },
          { name: '查看磁盘使用', description: '检查磁盘空间使用', command: 'df -h' },
          { name: '查看CPU信息', description: '获取CPU详细信息', command: 'cat /proc/cpuinfo | grep "model name" | head -1' },
          { name: '系统负载', description: '查看系统负载', command: 'uptime' }
        ]
      },
      {
        name: '进程管理',
        templates: [
          { name: '列出所有进程', description: '查看所有运行进程', command: 'ps aux' },
          { name: '查看CPU占用', description: '按CPU使用率排序进程', command: 'ps aux --sort=-%cpu | head -10' },
          { name: '查看内存占用', description: '按内存使用率排序进程', command: 'ps aux --sort=-%mem | head -10' },
          { name: '查找进程', description: '搜索特定进程', command: 'ps aux | grep' },
          { name: '杀死进程', description: '终止指定进程', command: 'kill -9' }
        ]
      },
      {
        name: '网络管理',
        templates: [
          { name: '查看网络连接', description: '显示网络连接状态', command: 'netstat -tulpn' },
          { name: '查看端口占用', description: '检查端口使用情况', command: 'ss -tulpn' },
          { name: '网络配置', description: '查看网络接口配置', command: 'ip addr show' },
          { name: '测试网络连通性', description: 'ping测试网络连接', command: 'ping -c 4' },
          { name: '查看路由表', description: '显示系统路由信息', command: 'ip route show' }
        ]
      },
      {
        name: '文件操作',
        templates: [
          { name: '查找文件', description: '在文件系统中搜索文件', command: 'find' },
          { name: '文件权限', description: '查看文件权限信息', command: 'ls -la' },
          { name: '磁盘使用分析', description: '分析目录磁盘使用', command: 'du -h --max-depth=1' },
          { name: '文件内容搜索', description: '在文件中搜索文本', command: 'grep -r' },
          { name: '压缩解压', description: '压缩和解压文件', command: 'tar -czf' }
        ]
      },
      {
        name: '日志分析',
        templates: [
          { name: '系统日志', description: '查看系统日志', command: 'tail -f /var/log/syslog' },
          { name: '错误日志', description: '查看系统错误日志', command: 'tail -f /var/log/errors' },
          { name: '访问日志', description: '查看Web访问日志', command: 'tail -f /var/log/access.log' },
          { name: '日志搜索', description: '在日志中搜索关键词', command: 'grep' },
          { name: '日志统计', description: '统计日志文件信息', command: 'wc -l' }
        ]
      }
    ])

    // 初始化AI连接
    const initializeAI = async () => {
      try {
        aiConnecting.value = true

        if (window.electronAPI) {
          const config = await window.electronAPI.getConfig()
          if (config.ai && config.ai.apiKey) {
            // 测试AI连接
            const result = await window.electronAPI.testAIConnection(config.ai)
            if (result.success) {
              aiConnected.value = true
              emit('show-notification', 'AI助手已连接', 'success')
            } else {
              emit('show-notification', `AI连接失败: ${result.error}`, 'error')
            }
          } else {
            emit('show-notification', '请先在设置中配置AI API密钥', 'warning')
          }
        } else {
          // 开发模式模拟连接成功
          setTimeout(() => {
            aiConnected.value = true
            emit('show-notification', 'AI助手已连接 (开发模式)', 'success')
          }, 1000)
        }
      } catch (error) {
        emit('show-notification', `AI初始化失败: ${error.message}`, 'error')
      } finally {
        aiConnecting.value = false
      }
    }

    // 发送消息
    const sendMessage = async () => {
      const message = currentMessage.value.trim()
      if (!message || !aiConnected.value || isTyping.value) return

      // 添加用户消息
      const userMessage = {
        id: ++messageIdCounter.value,
        role: 'user',
        content: message,
        timestamp: new Date()
      }
      messages.value.push(userMessage)

      currentMessage.value = ''
      isTyping.value = true

      // 滚动到底部
      await nextTick()
      scrollToBottom()

      try {
        // 准备发送给AI的上下文
        const context = prepareAIContext(message)

        // 发送到AI
        const aiResponse = await sendToAI(context)

        // 添加AI响应
        const assistantMessage = {
          id: ++messageIdCounter.value,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          suggestedCommand: aiResponse.suggestedCommand
        }
        messages.value.push(assistantMessage)

        // 自动执行安全命令
        if (aiResponse.suggestedCommand && aiSettings.autoExecute && isSafeCommand(aiResponse.suggestedCommand)) {
          setTimeout(() => {
            executeSuggestedCommand(aiResponse.suggestedCommand)
          }, 1000)
        }

      } catch (error) {
        const errorMessage = {
          id: ++messageIdCounter.value,
          role: 'assistant',
          content: `抱歉，处理您的请求时出现错误: ${error.message}`,
          timestamp: new Date()
        }
        messages.value.push(errorMessage)
        emit('show-notification', 'AI响应失败', 'error')
      } finally {
        isTyping.value = false
        await nextTick()
        scrollToBottom()
      }
    }

    // 准备AI上下文
    const prepareAIContext = (userMessage) => {
      const context = {
        message: userMessage,
        connection: {
          host: props.connection.host,
          username: props.connection.username,
          platform: 'linux' // 假设是Linux系统
        },
        terminalAccess: terminalAccessEnabled.value,
        systemInfo: aiSettings.showContext ? getSystemContext() : null,
        recentCommands: getRecentCommands(),
        settings: {
          model: aiSettings.model,
          temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens
        }
      }

      return context
    }

    // 获取系统上下文
    const getSystemContext = () => {
      return {
        workingDirectory: '/home/' + props.connection.username,
        availableCommands: ['ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'ps', 'top', 'df', 'free'],
        systemInfo: 'Linux系统'
      }
    }

    // 获取最近命令
    const getRecentCommands = () => {
      // 从消息历史中提取最近的命令
      return messages.value
        .filter(m => m.role === 'assistant' && m.suggestedCommand)
        .slice(-5)
        .map(m => m.suggestedCommand)
    }

    // 发送到AI
    const sendToAI = async (context) => {
      if (window.electronAPI) {
        // 实际AI API调用
        try {
          const config = await window.electronAPI.getConfig()
          const aiConfig = { ...config.ai, ...context.settings }

          // 构建prompt
          const prompt = buildAIPrompt(context)

          // 这里应该调用实际的AI API
          // 暂时返回模拟响应
          return generateMockResponse(context.message)
        } catch (error) {
          throw new Error('AI API调用失败: ' + error.message)
        }
      } else {
        // 开发模式返回模拟响应
        return generateMockResponse(context.message)
      }
    }

    // 构建AI prompt
    const buildAIPrompt = (context) => {
      let prompt = `你是一个Linux系统管理助手，正在帮助用户管理服务器 ${context.connection.host}。

用户: ${context.connection.username}
系统: ${context.connection.platform}
终端访问: ${context.terminalAccess ? '已启用' : '未启用'}

用户消息: ${context.message}

`
      if (context.systemInfo) {
        prompt += `当前工作目录: ${context.systemInfo.workingDirectory}
可用命令: ${context.systemInfo.availableCommands.join(', ')}

`
      }

      if (context.recentCommands.length > 0) {
        prompt += `最近执行的命令:
${context.recentCommands.map(cmd => `- ${cmd}`).join('\n')}

`
      }

      prompt += `请提供有用的回答。如果建议执行命令，请确保命令安全且相关。如果用户需要执行系统命令且已启用终端访问，请提供具体的命令建议。`

      return prompt
    }

    // 生成模拟响应
    const generateMockResponse = (userMessage) => {
      const responses = {
        '查看系统信息': {
          content: '我可以帮您查看系统信息。让我为您执行一些常用的系统信息命令：\n\n```bash\nuname -a\nlsb_release -a\nfree -h\ndf -h\n```\n\n这些命令会显示系统内核版本、发行版信息、内存使用情况和磁盘空间。如果您想执行这些命令，我可以帮您运行它们。',
          suggestedCommand: 'uname -a && lsb_release -a && free -h && df -h'
        },
        '检查磁盘使用情况': {
          content: '我来帮您检查磁盘使用情况。建议使用以下命令：\n\n```bash\n# 查看整体磁盘使用情况\ndf -h\n\n# 查看当前目录的磁盘使用详情\ndu -h --max-depth=1 .\n\n# 查看系统中占用空间最大的目录\ndu -h / | sort -rh | head -10\n```',
          suggestedCommand: 'df -h && du -h --max-depth=1 .'
        },
        '列出正在运行的进程': {
          content: '我可以帮您查看系统中正在运行的进程。这里有几个有用的命令：\n\n```bash\n# 查看所有进程\nps aux\n\n# 按CPU使用率排序，显示前10个进程\nps aux --sort=-%cpu | head -10\n\n# 按内存使用率排序，显示前10个进程\nps aux --sort=-%mem | head -10\n\n# 实时监控进程\ntop\n```',
          suggestedCommand: 'ps aux --sort=-%cpu | head -10'
        },
        '帮我分析日志文件': {
          content: '我可以帮您分析日志文件。请告诉我您想分析哪个日志文件？通常的日志文件位置包括：\n\n- `/var/log/syslog` - 系统日志\n- `/var/log/auth.log` - 认证日志\n- `/var/log/apache2/access.log` - Apache访问日志\n- `/var/log/nginx/access.log` - Nginx访问日志\n\n您可以使用以下命令查看日志：\n\n```bash\n# 查看最新的日志行\ntail -f /var/log/syslog\n\n# 搜索特定关键词\ngrep "error" /var/log/syslog\n\n# 统计日志行数\nwc -l /var/log/syslog\n```',
          suggestedCommand: 'tail -20 /var/log/syslog'
        }
      }

      // 查找匹配的响应
      for (const [key, response] of Object.entries(responses)) {
        if (userMessage.toLowerCase().includes(key.toLowerCase())) {
          return response
        }
      }

      // 默认响应
      return {
        content: `我收到了您的消息："${userMessage}"。作为您的Linux系统助手，我可以帮您：\n\n🔍 **系统监控** - 查看系统状态、资源使用情况\n⚡ **进程管理** - 管理运行中的进程和服务\n💾 **文件操作** - 文件搜索、权限管理、磁盘分析\n🌐 **网络管理** - 网络配置、连接状态监控\n📊 **日志分析** - 系统日志分析和问题诊断\n\n请告诉我您需要什么帮助，我会提供具体的命令建议和操作指导。`,
        suggestedCommand: null
      }
    }

    // 执行建议的命令
    const executeSuggestedCommand = (command) => {
      if (command && terminalAccessEnabled.value) {
        emit('execute-command', command)

        // 添加命令执行消息
        const commandMessage = {
          id: ++messageIdCounter.value,
          role: 'assistant',
          content: `正在执行命令: \`${command}\``,
          timestamp: new Date()
        }
        messages.value.push(commandMessage)

        nextTick(() => scrollToBottom())
      } else if (!terminalAccessEnabled.value) {
        emit('show-notification', '请先启用终端访问', 'warning')
      }
    }

    // 检查命令是否安全
    const isSafeCommand = (command) => {
      const dangerousCommands = [
        'rm -rf', 'dd if=', 'mkfs', 'fdisk', 'format',
        'shutdown', 'reboot', 'halt', 'poweroff',
        'chmod 777', 'chown root', 'sudo rm',
        'mv /dev/null', '> /dev/sda'
      ]

      return !dangerousCommands.some(dangerous => command.includes(dangerous))
    }

    // 工具函数
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const formatMessage = (content) => {
      // 简单的markdown格式化
      return content
        .replace(/```([^`]+)```/g, '<pre class="code-block">$1</pre>')
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    }

    const scrollToBottom = () => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
      }
    }

    // 事件处理
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          sendMessage()
        }
      }
    }

    const handleInput = () => {
      // 自动调整textarea高度
      const textarea = messageInput.value
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      }
    }

    // 建议问题
    const sendSuggestedMessage = (message) => {
      currentMessage.value = message
      sendMessage()
    }

    // 清空聊天
    const clearChat = () => {
      messages.value = []
      emit('show-notification', '聊天记录已清空', 'success')
    }

    // 导出聊天
    const exportChat = () => {
      const chatContent = messages.value.map(msg => {
        const time = formatTime(msg.timestamp)
        const role = msg.role === 'user' ? '您' : 'AI助手'
        return `[${time}] ${role}: ${msg.content}`
      }).join('\n\n')

      const blob = new Blob([chatContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-chat-${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)

      emit('show-notification', '聊天记录已导出', 'success')
    }

    // 复制消息
    const copyMessage = async (content) => {
      try {
        await navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''))
        emit('show-notification', '已复制到剪贴板', 'success')
      } catch (error) {
        emit('show-notification', '复制失败', 'error')
      }
    }

    // 重新生成响应
    const regenerateResponse = async (message) => {
      const index = messages.value.findIndex(m => m.id === message.id)
      if (index > 0 && messages.value[index - 1].role === 'user') {
        const userMessage = messages.value[index - 1]

        // 删除原AI响应
        messages.value.splice(index, 1)

        // 重新发送用户消息
        currentMessage.value = userMessage.content
        await sendMessage()
      }
    }

    // 命令模板相关
    const insertCommandTemplate = () => {
      commandTemplateModal.show = true
    }

    const closeCommandTemplateModal = () => {
      commandTemplateModal.show = false
    }

    const selectCommandTemplate = (template) => {
      currentMessage.value = template.description + '\n\n请帮我执行: ' + template.command
      closeCommandTemplateModal()
      messageInput.value?.focus()
    }

    // 文件附件
    const attachFile = () => {
      emit('show-notification', '文件附件功能正在开发中', 'info')
    }

    // 终端访问切换
    const toggleTerminalAccess = () => {
      terminalAccessEnabled.value = !terminalAccessEnabled.value
      const status = terminalAccessEnabled.value ? '已启用' : '已禁用'
      emit('show-notification', `终端访问${status}`, 'success')
    }

    // 设置相关
    const toggleSettings = () => {
      settingsModal.show = true
    }

    const closeSettingsModal = () => {
      settingsModal.show = false
    }

    const saveSettings = () => {
      // 保存设置到本地存储或配置文件
      localStorage.setItem('ai-assistant-settings', JSON.stringify(aiSettings))
      emit('show-notification', '设置已保存', 'success')
      closeSettingsModal()
    }

    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('ai-assistant-settings')
        if (saved) {
          Object.assign(aiSettings, JSON.parse(saved))
        }
      } catch (error) {
        console.error('加载AI设置失败:', error)
      }
    }

    const handleClickOutside = (event) => {
      // 处理点击外部事件
    }

    // 添加外部文本到AI助手
    const addUserInput = (text) => {
      if (text && text.trim()) {
        currentMessage.value = text.trim()

        // 聚焦到输入框
        nextTick(() => {
          messageInput.value?.focus()
        })

        // 可选：自动发送消息
        // sendMessage()
      }
    }

    // 监听连接变化
    watch(() => props.connectionId, (newId) => {
      if (newId) {
        // 连接变化时可以重新初始化或清理状态
        clearChat()
      }
    })

    // 监听全局事件（用于接收来自终端的文本）
    const handleAddToAIEvent = (event) => {
      if (event.detail && event.detail.text && event.detail.connectionId === props.connectionId) {
        addUserInput(event.detail.text)
      }
    }

    onMounted(() => {
      // ... 现有的onMounted代码 ...
      window.addEventListener('add-to-ai-assistant', handleAddToAIEvent)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
      window.removeEventListener('add-to-ai-assistant', handleAddToAIEvent)
    })

    return {
      messages,
      currentMessage,
      isTyping,
      aiConnected,
      aiConnecting,
      terminalAccessEnabled,
      aiStatusText,
      commandTemplateModal,
      settingsModal,
      commandCategories,
      aiSettings,
      chatContainer,
      messageInput,
      sendMessage,
      sendSuggestedMessage,
      clearChat,
      exportChat,
      copyMessage,
      regenerateResponse,
      executeSuggestedCommand,
      insertCommandTemplate,
      closeCommandTemplateModal,
      selectCommandTemplate,
      attachFile,
      toggleTerminalAccess,
      toggleSettings,
      closeSettingsModal,
      saveSettings,
      addUserInput,
      handleKeyDown,
      handleInput,
      formatTime,
      formatMessage
    }
  }
}
</script>

<style lang="scss" scoped>
.ai-assistant {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: color(bg-primary);
  overflow: hidden;
}

// 工具栏样式
.ai-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(sm) spacing(md);
  background: color(bg-secondary);
  border-bottom: 1px solid color(border);
  min-height: 48px;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: spacing(xs);
  font-size: font-size(sm);
  color: color(text-secondary);

  &.connecting {
    .status-dot {
      background: color(warning);
      animation: pulse 1.5s infinite;
    }
  }

  &.connected {
    .status-dot {
      background: color(success);
    }
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: color(text-muted);
}

.toolbar-right {
  display: flex;
  gap: spacing(xs);
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border: 1px solid color(border);
  background: color(bg-tertiary);
  color: color(text-secondary);
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all transition(fast) ease;

  &:hover {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }
}

// 聊天容器样式
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: spacing(md);
  display: flex;
  flex-direction: column;
}

.welcome-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: color(text-muted);
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: spacing(lg);
}

.welcome-message h3 {
  margin: 0 0 spacing(sm) 0;
  font-size: font-size(xl);
  color: color(text-primary);
}

.suggested-questions {
  margin-top: spacing(xl);
  max-width: 500px;
}

.suggestion-title {
  font-size: font-size(sm);
  color: color(text-secondary);
  margin-bottom: spacing(md);
}

.suggestion-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: spacing(sm);
}

.suggestion-btn {
  padding: spacing(sm) spacing(md);
  background: color(bg-secondary);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  color: color(text-primary);
  cursor: pointer;
  transition: all transition(fast) ease;
  text-align: left;

  &:hover {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }
}

// 消息列表样式
.messages-list {
  display: flex;
  flex-direction: column;
  gap: spacing(md);
}

.message {
  display: flex;
  gap: spacing(sm);
  max-width: 80%;

  &.user-message {
    align-self: flex-end;
    flex-direction: row-reverse;

    .message-content {
      background: color(primary);
      color: color(white);
    }

    .message-avatar {
      background: color(bg-tertiary);
    }
  }

  &.ai-message {
    align-self: flex-start;

    .message-content {
      background: color(bg-secondary);
      color: color(text-primary);
    }

    .message-avatar {
      background: color(bg-tertiary);
    }
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  border-radius: border-radius(lg);
  padding: spacing(sm) spacing(md);
  position: relative;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: spacing(xs);
  font-size: font-size(xs);
  opacity: 0.8;
}

.message-role {
  font-weight: font-weight(medium);
}

.message-time {
  opacity: 0.7;
}

.message-text {
  line-height: line-height(relaxed);
  word-wrap: break-word;

  :deep(.code-block) {
    background: rgba(0, 0, 0, 0.2);
    border-radius: border-radius(sm);
    padding: spacing(sm);
    margin: spacing(xs) 0;
    font-family: font-family(mono);
    font-size: font-size(sm);
    white-space: pre-wrap;
  }

  :deep(.inline-code) {
    background: rgba(0, 0, 0, 0.1);
    border-radius: border-radius(xs);
    padding: 2px 4px;
    font-family: font-family(mono);
    font-size: font-size(sm);
  }
}

.message-actions {
  display: flex;
  gap: spacing(xs);
  margin-top: spacing(sm);
  opacity: 0;
  transition: opacity transition(fast) ease;

  .message-content:hover & {
    opacity: 1;
  }
}

.action-btn {
  padding: spacing(xs) spacing(sm);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: border-radius(sm);
  color: inherit;
  font-size: font-size(xs);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &.command-btn {
    background: color(success);
    color: color(white);
    border-color: color(success);

    &:hover {
      background: color(success-light);
    }
  }
}

// 输入指示器
.typing-indicator {
  display: flex;
  gap: spacing(sm);
  padding: spacing(sm) spacing(md);
  align-items: center;
}

.typing-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: color(bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.typing-content {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  background: color(bg-secondary);
  border-radius: border-radius(lg);
  padding: spacing(sm) spacing(md);
}

.typing-dots {
  display: flex;
  gap: 4px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: color(text-muted);
    animation: typing 1.4s infinite ease-in-out;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
}

.typing-text {
  font-size: font-size(sm);
  color: color(text-muted);
}

// 输入区域样式
.input-container {
  border-top: 1px solid color(border);
  background: color(bg-secondary);
}

.input-toolbar {
  display: flex;
  gap: spacing(xs);
  padding: spacing(xs) spacing(md);
  border-bottom: 1px solid color(border);
}

.tool-btn {
  width: 32px;
  height: 32px;
  border: 1px solid color(border);
  background: color(bg-tertiary);
  color: color(text-secondary);
  border-radius: border-radius(sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all transition(fast) ease;

  &:hover {
    background: color(bg-primary);
    color: color(text-primary);
  }

  &.active {
    background: color(primary);
    color: color(white);
    border-color: color(primary);
  }
}

.input-wrapper {
  display: flex;
  gap: spacing(sm);
  padding: spacing(sm) spacing(md);
  align-items: flex-end;
}

.message-input {
  flex: 1;
  background: color(bg-primary);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  padding: spacing(sm);
  color: color(text-primary);
  font-size: font-size(base);
  line-height: line-height(normal);
  resize: none;
  min-height: 40px;
  max-height: 120px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: color(primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: border-radius(md);
  background: color(primary);
  color: color(white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all transition(fast) ease;

  &:hover:not(:disabled) {
    background: color(primary-light);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.input-info {
  display: flex;
  justify-content: space-between;
  padding: 0 spacing(md) spacing(sm);
  font-size: font-size(xs);
  color: color(text-muted);
}

.char-count {
  opacity: 0.7;
}

.terminal-indicator {
  color: color(success);
  font-weight: font-weight(medium);
}

// 模态框样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: z-index(modal);
  padding: spacing(lg);
}

.modal-content {
  background: color(surface);
  border-radius: border-radius(lg);
  box-shadow: shadow(xl);
  max-width: 600px;
  max-height: 80vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: spacing(lg);
  border-bottom: 1px solid color(border);
}

.modal-header h3 {
  margin: 0;
  font-size: font-size(xl);
  color: color(text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: color(text-muted);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: border-radius(full);
  transition: all transition(fast) ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: color(text-primary);
  }
}

.modal-body {
  flex: 1;
  padding: spacing(lg);
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: spacing(sm);
  justify-content: flex-end;
  padding: spacing(lg);
  border-top: 1px solid color(border);
}

// 模板选择器样式
.template-categories {
  display: flex;
  flex-direction: column;
  gap: spacing(lg);
}

.template-category h4 {
  margin: 0 0 spacing(md) 0;
  font-size: font-size(lg);
  color: color(text-primary);
  border-bottom: 1px solid color(border);
  padding-bottom: spacing(sm);
}

.template-list {
  display: grid;
  gap: spacing(sm);
}

.template-item {
  padding: spacing(md);
  background: color(bg-secondary);
  border: 1px solid color(border);
  border-radius: border-radius(md);
  cursor: pointer;
  transition: all transition(fast) ease;

  &:hover {
    background: color(bg-tertiary);
    border-color: color(primary);
  }
}

.template-name {
  font-size: font-size(base);
  font-weight: font-weight(medium);
  color: color(text-primary);
  margin-bottom: spacing(xs);
}

.template-description {
  font-size: font-size(sm);
  color: color(text-secondary);
  margin-bottom: spacing(xs);
}

.template-command {
  font-size: font-size(xs);
  color: color(text-muted);
  font-family: font-family(mono);
  background: color(bg-primary);
  padding: spacing(xs);
  border-radius: border-radius(sm);
}

// 设置样式
.setting-group {
  margin-bottom: spacing(lg);
}

.setting-group label {
  display: block;
  margin-bottom: spacing(sm);
  font-size: font-size(base);
  font-weight: font-weight(medium);
  color: color(text-primary);
}

.setting-select,
.setting-input {
  width: 100%;
  padding: spacing(sm);
  background: color(bg-primary);
  border: 1px solid color(border);
  border-radius: border-radius(sm);
  color: color(text-primary);
  font-size: font-size(base);

  &:focus {
    outline: none;
    border-color: color(primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
}

.setting-range {
  width: 100%;
  margin-bottom: spacing(xs);
}

.range-value {
  font-size: font-size(sm);
  color: color(text-muted);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: spacing(sm);
  cursor: pointer;
  font-size: font-size(base);
  color: color(text-primary);

  input[type="checkbox"] {
    accent-color: color(primary);
  }
}

.primary-btn,
.secondary-btn {
  padding: spacing(sm) spacing(lg);
  border-radius: border-radius(sm);
  font-size: font-size(base);
  cursor: pointer;
  transition: all transition(fast) ease;
}

.primary-btn {
  background: color(primary);
  color: color(white);
  border: none;

  &:hover {
    background: color(primary-light);
  }
}

.secondary-btn {
  background: color(bg-tertiary);
  color: color(text-secondary);
  border: 1px solid color(border);

  &:hover {
    background: color(bg-secondary);
    color: color(text-primary);
  }
}

// 动画
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .ai-toolbar {
    padding: spacing(xs) spacing(sm);
  }

  .chat-container {
    padding: spacing(sm);
  }

  .message {
    max-width: 90%;
  }

  .suggestion-list {
    grid-template-columns: 1fr;
  }

  .modal-content {
    max-height: 90vh;
  }

  .input-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .send-btn {
    width: 100%;
    margin-top: spacing(sm);
  }
}
</style>
