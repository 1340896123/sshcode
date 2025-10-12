<template>
  <div class="ai-assistant">
    <!-- AI助手界面 -->
    <div class="ai-interface">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="ai-info">
          <div class="ai-avatar">🤖</div>
          <div class="ai-details">
            <h3>AI助手</h3>
            <span class="ai-status" :class="{ connected: isConnected }">
              {{ isConnected ? '在线' : '离线' }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="clearChat" title="清空对话">
            🗑️
          </button>
          <button class="action-btn" @click="exportChat" title="导出对话">
            📥
          </button>
        </div>
      </div>

      <!-- 聊天消息区域 -->
      <div class="chat-messages" ref="messagesContainer">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="welcome-section">
          <div class="welcome-content">
            <h4>👋 您好！我是您的SSH远程管理助手</h4>
            <p>我已连接到 <strong>{{ connection.host }}</strong> ({{ connection.username }}@{{ connection.host }})</p>
            <p>我可以帮助您：</p>
            <ul class="capabilities-list">
              <li>🖥️ 实时系统监控和性能分析</li>
              <li>📁 远程文件管理和操作</li>
              <li>🔍 进程管理和服务状态检查</li>
              <li>📊 系统日志分析和故障排查</li>
              <li>🌐 网络配置和连接诊断</li>
              <li>⚡ 安全的命令执行和自动化</li>
            </ul>
            <p class="welcome-tip">💡 所有命令都通过真实的SSH连接执行，我会根据实际系统状态提供专业建议！</p>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else class="messages-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div class="message-avatar">
              <span v-if="message.role === 'user'">👤</span>
              <span v-else>🤖</span>
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(message.content)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              
              <!-- AI消息的操作按钮 -->
              <div v-if="message.role === 'assistant' && message.actions" class="message-actions">
                <button
                  v-for="action in message.actions"
                  :key="action.id"
                  class="action-button"
                  :class="action.type"
                  @click="executeAction(action)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 正在输入指示器 -->
        <div v-if="isProcessing" class="typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>AI正在思考...</span>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input">
        <div class="input-container">
          <textarea
            ref="messageInput"
            v-model="userInput"
            @keydown="handleKeyDown"
            @input="adjustTextareaHeight"
            placeholder="输入您的问题或命令..."
            class="message-textarea"
            rows="1"
            :disabled="isProcessing"
          ></textarea>
          <button
            class="send-button"
            @click="sendMessage"
            :disabled="!userInput.trim() || isProcessing"
          >
            <span v-if="isProcessing">⏳</span>
            <span v-else>📤</span>
          </button>
        </div>
        
        <!-- 快捷操作 -->
        <div class="quick-actions">
          <button
            class="quick-btn"
            @click="insertQuickCommand('查看系统信息')"
            title="查看系统信息"
          >
            🔍 系统信息
          </button>
          <button
            class="quick-btn"
            @click="insertQuickCommand('检查磁盘使用')"
            title="检查磁盘使用"
          >
            💾 磁盘使用
          </button>
          <button
            class="quick-btn"
            @click="insertQuickCommand('查看运行进程')"
            title="查看运行进程"
          >
            ⚡ 运行进程
          </button>
          <button
            class="quick-btn"
            @click="insertQuickCommand('分析日志文件')"
            title="分析日志文件"
          >
            📊 日志分析
          </button>
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
  emits: ['show-notification', 'execute-command'],
  setup(props, { emit }) {
    // 状态管理
    const messages = ref([])
    const userInput = ref('')
    const isProcessing = ref(false)
    const isConnected = ref(true)
    const messageIdCounter = ref(0)

    // 引用
    const messagesContainer = ref(null)
    const messageInput = ref(null)

    // AI响应模板
    const aiResponses = {
      '查看系统信息': {
        content: `我来帮您查看系统信息：

**系统基本信息**
\`\`\`bash
uname -a
\`\`\`

**系统发行版信息**
\`\`\`bash
lsb_release -a
\`\`\`

**内存使用情况**
\`\`\`bash
free -h
\`\`\`

**磁盘使用情况**
\`\`\`bash
df -h
\`\`\`

**系统负载**
\`\`\`bash
uptime
\`\`\``,
        actions: [
          {
            id: 'sysinfo',
            type: 'command',
            label: '⚡ 执行系统信息命令',
            command: 'uname -a && lsb_release -a && free -h && df -h && uptime'
          }
        ]
      },
      '检查磁盘使用': {
        content: `让我帮您检查磁盘使用情况：

**查看整体磁盘使用**
\`\`\`bash
df -h
\`\`\`

**查看当前目录磁盘使用详情**
\`\`\`bash
du -h --max-depth=1 .
\`\`\`

**查找占用空间最大的目录**
\`\`\`bash
du -h / | sort -rh | head -10
\`\`\``,
        actions: [
          {
            id: 'diskusage',
            type: 'command',
            label: '💾 检查磁盘使用情况',
            command: 'df -h && du -h --max-depth=1 .'
          }
        ]
      },
      '查看运行进程': {
        content: `我来帮您查看正在运行的进程：

**查看所有进程**
\`\`\`bash
ps aux
\`\`\`

**按CPU使用率排序（前10个）**
\`\`\`bash
ps aux --sort=-%cpu | head -10
\`\`\`

**按内存使用率排序（前10个）**
\`\`\`bash
ps aux --sort=-%mem | head -10
\`\`\`

**实时监控进程**
\`\`\`bash
top
\`\`\``,
        actions: [
          {
            id: 'processes',
            type: 'command',
            label: '⚡ 查看进程状态',
            command: 'ps aux --sort=-%cpu | head -10 && ps aux --sort=-%mem | head -10'
          }
        ]
      },
      '分析日志文件': {
        content: `我可以帮您分析日志文件。请告诉我您想分析哪个日志文件？

**常见日志文件位置：**
- \`/var/log/syslog\` - 系统日志
- \`/var/log/auth.log\` - 认证日志
- \`/var/log/apache2/access.log\` - Apache访问日志
- \`/var/log/nginx/access.log\` - Nginx访问日志

**常用日志分析命令：**

**查看最新日志**
\`\`\`bash
tail -f /var/log/syslog
\`\`\`

**搜索错误信息**
\`\`\`bash
grep -i error /var/log/syslog
\`\`\`

**统计日志行数**
\`\`\`bash
wc -l /var/log/syslog
\`\`\``,
        actions: [
          {
            id: 'logs',
            type: 'command',
            label: '📊 查看系统日志',
            command: 'tail -20 /var/log/syslog'
          }
        ]
      }
    }

    // 初始化
    onMounted(() => {
      // 聚焦输入框
      nextTick(() => {
        messageInput.value?.focus()
      })

      // 监听外部添加文本事件
      window.addEventListener('add-to-ai-assistant', handleExternalText)
    })

    onUnmounted(() => {
      window.removeEventListener('add-to-ai-assistant', handleExternalText)
    })

    // 处理外部文本输入
    const handleExternalText = (event) => {
      if (event.detail && event.detail.text && event.detail.connectionId === props.connectionId) {
        const text = event.detail.text.trim()
        if (text) {
          userInput.value = text
          nextTick(() => {
            messageInput.value?.focus()
            // 可选：自动发送消息
            // sendMessage()
          })
        }
      }
    }

    // 发送消息
    const sendMessage = async () => {
      const message = userInput.value.trim()
      if (!message || isProcessing.value) return

      // 添加用户消息
      addMessage('user', message)

      // 清空输入框
      userInput.value = ''
      isProcessing.value = true

      // 滚动到底部
      await nextTick()
      scrollToBottom()

      try {
        // 调用真实AI API
        const response = await callAI(message)
        addMessage('assistant', response.content, response.actions)

      } catch (error) {
        console.error('AI API调用失败:', error)
        addMessage('assistant', `抱歉，处理您的请求时出现错误：${error.message}`)
      } finally {
        isProcessing.value = false
        await nextTick()
        scrollToBottom()
      }
    }

    // 添加消息
    const addMessage = (role, content, actions = null) => {
      const message = {
        id: ++messageIdCounter.value,
        role,
        content,
        timestamp: new Date(),
        actions
      }
      messages.value.push(message)
    }

    // 生成AI响应
    const generateAIResponse = (userMessage) => {
      const lowerMessage = userMessage.toLowerCase()

      // 检查预定义响应
      for (const [key, response] of Object.entries(aiResponses)) {
        if (lowerMessage.includes(key.toLowerCase())) {
          return response
        }
      }

      // 检查是否是命令请求
      if (lowerMessage.includes('执行') || lowerMessage.includes('运行') || lowerMessage.includes('command')) {
        return {
          content: `我理解您想要执行命令。请告诉我您想执行什么命令？

**示例命令：**
- \`ls -la\` - 列出文件详情
- \`ps aux\` - 查看进程
- \`df -h\` - 查看磁盘使用
- \`top\` - 系统监控

如果您有具体的命令需求，请直接告诉我，我会帮您执行。`,
          actions: [
            {
              id: 'custom-command',
              type: 'prompt',
              label: '📝 输入自定义命令',
              prompt: '请输入您想要执行的命令：'
            }
          ]
        }
      }

      // 检查是否是文件操作请求
      if (lowerMessage.includes('文件') || lowerMessage.includes('目录') || lowerMessage.includes('folder')) {
        return {
          content: `我可以帮您进行文件和目录操作：

**常用文件操作：**
- \`ls -la\` - 列出当前目录文件
- \`pwd\` - 显示当前目录
- \`cd /path\` - 切换目录
- \`cat filename\` - 查看文件内容
- \`grep "pattern" file\` - 搜索文件内容
- \`find . -name "*.log"\` - 查找文件

请告诉我您想进行什么文件操作？`,
          actions: [
            {
              id: 'file-ops',
              type: 'command',
              label: '📁 列出当前目录',
              command: 'ls -la'
            }
          ]
        }
      }

      // 检查是否是网络相关请求
      if (lowerMessage.includes('网络') || lowerMessage.includes('network') || lowerMessage.includes('连接')) {
        return {
          content: `我可以帮您进行网络诊断和配置：

**网络诊断命令：**
- \`ping google.com\` - 测试网络连通性
- \`netstat -tulpn\` - 查看网络连接
- \`ss -tulpn\` - 查看套接字状态
- \`ip addr show\` - 查看网络接口
- \`ip route show\` - 查看路由表

请告诉我您遇到的具体网络问题？`,
          actions: [
            {
              id: 'network-test',
              type: 'command',
              label: '🌐 测试网络连通性',
              command: 'ping -c 4 8.8.8.8'
            }
          ]
        }
      }

      // 默认响应
      return {
        content: `我收到了您的消息："${userMessage}"

作为您的AI助手，我可以帮助您：

🖥️ **系统管理**
- 查看系统信息和状态
- 监控系统资源使用
- 管理进程和服务

📁 **文件操作**
- 浏览和搜索文件
- 分析文件内容
- 管理目录结构

🌐 **网络管理**
- 网络连接诊断
- 配置网络设置
- 监控网络状态

📊 **数据分析**
- 分析日志文件
- 处理系统数据
- 生成报告

请告诉我您具体需要什么帮助，我会提供相应的解决方案和命令建议！`,
        actions: [
          {
            id: 'help-sysinfo',
            type: 'command',
            label: '🔍 查看系统信息',
            command: 'uname -a && free -h && df -h'
          },
          {
            id: 'help-processes',
            type: 'command',
            label: '⚡ 查看进程状态',
            command: 'ps aux --sort=-%cpu | head -10'
          }
        ]
      }
    }

    // 执行操作
    const executeAction = (action) => {
      if (action.type === 'command' && action.command) {
        // 直接执行命令，无需确认
        emit('execute-command', action.command)
        
        // 添加执行确认消息
        addMessage('assistant', `正在执行命令: \`${action.command}\``)
        
      } else if (action.type === 'prompt' && action.prompt) {
        // 添加提示消息到输入框
        userInput.value = action.prompt
        messageInput.value?.focus()
      }
    }

    // 快捷命令插入
    const insertQuickCommand = (command) => {
      userInput.value = command
      messageInput.value?.focus()
    }

    // 清空聊天
    const clearChat = () => {
      messages.value = []
      emit('show-notification', '对话已清空', 'success')
    }

    // 导出聊天
    const exportChat = () => {
      const chatContent = messages.value.map(msg => {
        const time = formatTime(msg.timestamp)
        const role = msg.role === 'user' ? '用户' : 'AI助手'
        return `[${time}] ${role}: ${msg.content.replace(/<[^>]*>/g, '')}`
      }).join('\n\n')

      const blob = new Blob([chatContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-chat-${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)

      emit('show-notification', '对话已导出', 'success')
    }

    // 键盘事件处理
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        if (event.shiftKey) {
          // Shift+Enter 换行
          return
        } else {
          // Enter 发送消息
          event.preventDefault()
          sendMessage()
        }
      }
    }

    // 自动调整文本框高度
    const adjustTextareaHeight = () => {
      const textarea = messageInput.value
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      }
    }

    // 滚动到底部
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 格式化消息内容
    const formatMessage = (content) => {
      return content
        .replace(/```([^`]+)```/g, '<pre class="code-block">$1</pre>')
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    }

    // 调用真实AI API
    const callAI = async (message) => {
      try {
        // 获取配置
        const config = await getAIConfig()
        
        // 构建工具定义
        const tools = [
          {
            type: 'function',
            function: {
              name: 'execute_command',
              description: '在终端中执行Linux命令并获取输出结果',
              parameters: {
                type: 'object',
                properties: {
                  command: {
                    type: 'string',
                    description: '要执行的Linux命令'
                  }
                },
                required: ['command']
              }
            }
          }
        ]

        // 构建请求
        const requestData = {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: `你是一个专业的SSH远程管理助手，正在通过SSH连接帮助用户管理服务器 ${props.connection.host}。

**当前连接环境：**
- 主机地址: ${props.connection.host}
- 端口: ${props.connection.port || 22}
- 登录用户: ${props.connection.username}
- 认证方式: ${props.connection.authType === 'key' ? 'SSH密钥认证' : '密码认证'}
- 连接状态: SSH已建立

**你的核心职责：**
1. **实时系统监控**: 通过execute_command工具获取真实的系统状态信息
2. **智能问题诊断**: 基于实际命令输出分析系统问题并提供解决方案
3. **安全操作指导**: 推荐安全的Linux命令，避免危险操作
4. **性能优化建议**: 根据系统资源使用情况提供优化建议

**常用系统信息获取命令：**
- 系统基本信息: \`uname -a\`, \`cat /etc/os-release\`
- 资源使用情况: \`free -h\`, \`df -h\`, \`top -bn1\`
- 进程管理: \`ps aux\`, \`systemctl status\`
- 网络状态: \`netstat -tulpn\`, \`ss -tulpn\`, \`ip addr\`
- 日志分析: \`journalctl -n 50\`, \`tail -f /var/log/syslog\`

**重要提醒：**
- 所有命令都通过真实的SSH连接执行
- 命令执行环境为 ${props.connection.username}@${props.connection.host}
- 请优先使用execute_command工具获取实时数据而非依赖记忆
- 分析结果时要结合实际的系统环境

请根据用户的实际需求，使用execute_command工具获取准确的系统信息并提供专业的建议。`
            },
            ...messages.value.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: message
            }
          ],
          tools,
          max_tokens: config.maxTokens,
          temperature: config.temperature
        }

        // 发送请求
        const response = await fetch(config.baseUrl + '/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(requestData)
        })

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const choice = data.choices[0]
        
        if (!choice) {
          throw new Error('API返回了无效的响应')
        }

        // 处理工具调用
        if (choice.message.tool_calls) {
          return await handleToolCalls(choice.message.tool_calls, requestData)
        }

        const aiContent = choice.message.content || '抱歉，我没有收到有效的回复。'
        
        // 解析AI回复，提取命令建议
        const parsedResponse = parseAIResponse(aiContent)
        
        return parsedResponse

      } catch (error) {
        console.error('AI API调用失败:', error)
        throw error
      }
    }

    // 处理工具调用
    const handleToolCalls = async (toolCalls, requestData) => {
      const toolResults = []
      
      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'execute_command') {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            const result = await executeTerminalCommand(args.command)
            
            toolResults.push({
              tool_call_id: toolCall.id,
              result: result
            })
          } catch (error) {
            toolResults.push({
              tool_call_id: toolCall.id,
              result: `命令执行失败: ${error.message}`
            })
          }
        }
      }

      // 发送工具结果回AI
      const followUpMessages = [
        ...requestData.messages,
        {
          role: 'assistant',
          content: null,
          tool_calls: toolCalls
        },
        ...toolResults.map(result => ({
          role: 'tool',
          tool_call_id: result.tool_call_id,
          content: result.result
        }))
      ]

      try {
        const config = await getAIConfig()
        
        const followUpResponse = await fetch(config.baseUrl + '/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: followUpMessages,
            max_tokens: config.maxTokens,
            temperature: config.temperature
          })
        })

        if (!followUpResponse.ok) {
          throw new Error(`后续API请求失败: ${followUpResponse.status} ${followUpResponse.statusText}`)
        }

        const followUpData = await followUpResponse.json()
        const finalContent = followUpData.choices[0]?.message?.content || '抱歉，处理命令结果时出现问题。'

        return {
          content: finalContent,
          actions: null // AI已经执行了命令，不需要额外的操作按钮
        }

      } catch (error) {
        console.error('工具调用后续处理失败:', error)
        return {
          content: `命令已执行，但处理结果时出现错误：${error.message}`,
          actions: null
        }
      }
    }

    // 执行终端命令
    const executeTerminalCommand = async (command) => {
      return new Promise((resolve, reject) => {
        // 创建一个临时的命令执行事件
        const commandId = `ai-cmd-${Date.now()}`
        
        // 监听命令执行结果
        const handleCommandResult = (event) => {
          if (event.detail && event.detail.commandId === commandId) {
            window.removeEventListener('terminal-command-result', handleCommandResult)
            
            if (event.detail.success) {
              resolve(event.detail.output)
            } else {
              reject(new Error(event.detail.error || '命令执行失败'))
            }
          }
        }
        
        window.addEventListener('terminal-command-result', handleCommandResult)
        
        // 发送命令执行请求
        window.dispatchEvent(new CustomEvent('execute-terminal-command', {
          detail: {
            commandId,
            command,
            connectionId: props.connectionId
          }
        }))
        
        // 设置超时
        setTimeout(() => {
          window.removeEventListener('terminal-command-result', handleCommandResult)
          reject(new Error('命令执行超时'))
        }, 30000) // 30秒超时
      })
    }

    // 获取AI配置
    const getAIConfig = async () => {
      // 默认配置
      const defaultConfig = {
        provider: 'custom',
        baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        apiKey: '6d5b19eba3494d30ab20bc5749ef7e75.HPYVMdF5RSfW61YX',
        model: 'glm-4.5',
        maxTokens: 8000,
        temperature: 0.7
      }

      try {
        // 尝试从electron API获取配置
        if (window.electronAPI && window.electronAPI.getConfig) {
          const config = await window.electronAPI.getConfig()
          return config.aiChat || defaultConfig
        }
        
        // 尝试从本地存储获取配置
        const localConfig = localStorage.getItem('ai-config')
        if (localConfig) {
          return { ...defaultConfig, ...JSON.parse(localConfig) }
        }
        
        return defaultConfig
      } catch (error) {
        console.warn('获取AI配置失败，使用默认配置:', error)
        return defaultConfig
      }
    }

    // 解析AI响应，提取命令建议
    const parseAIResponse = (content) => {
      // 查找代码块中的命令
      const codeBlockRegex = /```(?:bash|shell)?\s*([\s\S]*?)```/g
      const codeBlocks = []
      let match

      while ((match = codeBlockRegex.exec(content)) !== null) {
        codeBlocks.push({
          command: match[1].trim(),
          type: 'command'
        })
      }

      // 查找行内代码
      const inlineCodeRegex = /`([^`]+)`/g
      const inlineCodes = []
      
      while ((match = inlineCodeRegex.exec(content)) !== null) {
        const code = match[1].trim()
        // 只包含简单的命令，排除说明文字
        if (code.includes(' ') && !code.includes('示例') && !code.includes('说明')) {
          inlineCodes.push({
            command: code,
            type: 'command'
          })
        }
      }

      // 去重并生成操作按钮
      const uniqueCommands = [...new Map([...codeBlocks, ...inlineCodes].map(cmd => [cmd.command, cmd])).values()]
      
      const actions = uniqueCommands.slice(0, 5).map((cmd, index) => ({
        id: `cmd-${index}`,
        type: 'command',
        label: `⚡ 执行: ${cmd.command.length > 30 ? cmd.command.substring(0, 30) + '...' : cmd.command}`,
        command: cmd.command
      }))

      return {
        content,
        actions: actions.length > 0 ? actions : null
      }
    }

    // 添加外部文本（供其他组件调用）
    const addUserInput = (text) => {
      if (text && text.trim()) {
        userInput.value = text.trim()
        nextTick(() => {
          messageInput.value?.focus()
        })
      }
    }

    // 监听连接变化
    watch(() => props.connectionId, () => {
      clearChat()
    })

    return {
      messages,
      userInput,
      isProcessing,
      isConnected,
      messagesContainer,
      messageInput,
      sendMessage,
      executeAction,
      insertQuickCommand,
      clearChat,
      exportChat,
      handleKeyDown,
      adjustTextareaHeight,
      formatTime,
      formatMessage,
      addUserInput
    }
  }
}
</script>

<style lang="scss" scoped>
.ai-assistant {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.ai-interface {
  height: 100%;
  display: flex;
  flex-direction: column;
}

// 聊天头部
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
}

.ai-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 40px;
  height: 40px;
  background: #3a3a3a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.ai-details h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.ai-status {
  font-size: 12px;
  color: #888;
  
  &.connected {
    color: #4ade80;
  }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 6px;
  color: #b0b0b0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: #4a4a4a;
    color: #ffffff;
  }
}

// 聊天消息区域
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
}

.welcome-section {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.welcome-content {
  text-align: center;
  max-width: 500px;
  
  h4 {
    margin: 0 0 16px 0;
    font-size: 20px;
    color: #ffffff;
  }
  
  p {
    margin: 0 0 12px 0;
    color: #b0b0b0;
    line-height: 1.5;
  }
}

.capabilities-list {
  list-style: none;
  padding: 0;
  margin: 20px 0;
  text-align: left;
  
  li {
    padding: 8px 0;
    color: #b0b0b0;
    border-bottom: 1px solid #2a2a2a;
    
    &:last-child {
      border-bottom: none;
    }
  }
}

.welcome-tip {
  font-style: italic;
  color: #4ade80 !important;
  margin-top: 24px !important;
}

// 消息列表
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
  
  &.user {
    align-self: flex-end;
    flex-direction: row-reverse;
    
    .message-content {
      background: #3b82f6;
      color: #ffffff;
    }
  }
  
  &.assistant {
    align-self: flex-start;
    
    .message-content {
      background: #2a2a2a;
      color: #e0e0e0;
    }
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  background: #3a3a3a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  border-radius: 12px;
  padding: 12px 16px;
  position: relative;
}

.message-text {
  line-height: 1.5;
  word-wrap: break-word;
  
  :deep(.code-block) {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 12px;
    margin: 8px 0;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    white-space: pre-wrap;
    overflow-x: auto;
  }
  
  :deep(.inline-code) {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 6px;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.action-button {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  &.command {
    background: #4ade80;
    color: #000000;
    border-color: #4ade80;
    
    &:hover {
      background: #22c55e;
    }
  }
}

// 正在输入指示器
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  color: #888;
  font-size: 14px;
}

.typing-dots {
  display: flex;
  gap: 4px;
  
  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #888;
    animation: typing 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
}

// 输入区域
.chat-input {
  border-top: 1px solid #3a3a3a;
  background: #2a2a2a;
}

.input-container {
  display: flex;
  gap: 12px;
  padding: 16px;
  align-items: flex-end;
}

.message-textarea {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 12px;
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  min-height: 40px;
  max-height: 120px;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: #666;
  }
}

.send-button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #2563eb;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 快捷操作
.quick-actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
  flex-wrap: wrap;
}

.quick-btn {
  padding: 6px 12px;
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 6px;
  color: #b0b0b0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #4a4a4a;
    color: #ffffff;
  }
}

// 动画
@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

// 滚动条样式
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 3px;
  
  &:hover {
    background: #5a5a5a;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
  }
  
  .chat-messages {
    padding: 16px;
  }
  
  .message {
    max-width: 90%;
  }
  
  .input-container {
    padding: 12px;
  }
  
  .quick-actions {
    padding: 0 12px 12px;
  }
  
  .quick-btn {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>
