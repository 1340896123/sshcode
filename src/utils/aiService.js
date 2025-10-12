/**
 * AI服务工具模块
 */

/**
 * 获取AI配置
 */
export async function getAIConfig() {
  try {
    // 尝试从electron API获取配置
    if (window.electronAPI?.getConfig) {
      const config = await window.electronAPI.getConfig()
      if (config.aiChat && isConfigValid(config.aiChat)) {
        return config.aiChat
      }
    }
    
    // 尝试从本地存储获取配置
    const localConfig = localStorage.getItem('ai-config')
    if (localConfig) {
      const parsedConfig = JSON.parse(localConfig)
      if (isConfigValid(parsedConfig)) {
        return parsedConfig
      }
    }
    
    // 如果没有有效配置，抛出错误引导用户设置
    throw new Error('AI_CONFIG_NOT_SET')
    
  } catch (error) {
    if (error.message === 'AI_CONFIG_NOT_SET') {
      // 触发配置设置引导
      triggerConfigSetup()
      throw error
    }
    console.error('获取AI配置失败:', error)
    throw new Error('AI配置获取失败，请检查设置')
  }
}

/**
 * 检查配置是否有效
 */
function isConfigValid(config) {
  return config && 
         config.baseUrl && 
         config.apiKey && 
         (config.model || config.customModel) &&
         config.baseUrl.trim() !== '' &&
         config.apiKey.trim() !== '' &&
         (config.model && config.model.trim() !== '' || config.customModel && config.customModel.trim() !== '')
}

/**
 * 触发配置设置引导
 */
function triggerConfigSetup() {
  // 触发全局事件，通知组件显示设置引导
  window.dispatchEvent(new CustomEvent('ai-config-required', {
    detail: {
      message: '请先配置AI服务设置才能使用AI助手功能'
    }
  }))
}

/**
 * 调用AI API
 */
export async function callAIAPI(message, historyMessages, connection) {
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
    model: config.customModel || config.model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(connection)
      },
      ...historyMessages.map(msg => ({
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

  try {
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
      return await handleToolCalls(choice.message.tool_calls, requestData, config, connection)
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

/**
 * 构建系统提示词
 */
function buildSystemPrompt(connection) {
  return `你是一个专业的SSH远程管理助手，正在通过SSH连接帮助用户管理服务器 ${connection.host}。

**当前连接环境：**
- 主机地址: ${connection.host}
- 端口: ${connection.port || 22}
- 登录用户: ${connection.username}
- 认证方式: ${connection.authType === 'key' ? 'SSH密钥认证' : '密码认证'}
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
- 命令执行环境为 ${connection.username}@${connection.host}
- 请优先使用execute_command工具获取实时数据而非依赖记忆
- 分析结果时要结合实际的系统环境

请根据用户的实际需求，使用execute_command工具获取准确的系统信息并提供专业的建议。`
}

/**
 * 处理工具调用
 */
async function handleToolCalls(toolCalls, requestData, config, connection) {
  const toolResults = []
  
  for (const toolCall of toolCalls) {
    if (toolCall.function.name === 'execute_command') {
      try {
        const args = JSON.parse(toolCall.function.arguments)
        const result = await executeTerminalCommand(args.command, connection?.id)
        
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
    const followUpResponse = await fetch(config.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.customModel || config.model,
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

/**
 * 执行终端命令
 */
export async function executeTerminalCommand(command, connectionId) {
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
        connectionId: connectionId || window.currentConnectionId
      }
    }))
    
    // 设置超时
    setTimeout(() => {
      window.removeEventListener('terminal-command-result', handleCommandResult)
      reject(new Error('命令执行超时'))
    }, 30000) // 30秒超时
  })
}

/**
 * 解析AI响应，提取命令建议
 */
export function parseAIResponse(content) {
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

/**
 * 验证AI配置
 */
export function validateAIConfig(config) {
  if (!config) {
    return { valid: false, error: '配置不能为空' }
  }

  if (!config.baseUrl) {
    return { valid: false, error: 'API基础URL不能为空' }
  }

  if (!config.apiKey) {
    return { valid: false, error: 'API密钥不能为空' }
  }

  if (!config.model && !config.customModel) {
    return { valid: false, error: '模型名称不能为空' }
  }

  if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 32000)) {
    return { valid: false, error: '最大令牌数必须在1-32000之间' }
  }

  if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
    return { valid: false, error: '温度值必须在0-2之间' }
  }

  return { valid: true }
}

/**
 * 测试AI连接
 */
export async function testAIConnection(config) {
  try {
    const validation = validateAIConfig(config)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const testRequest = {
      model: config.customModel || config.model,
      messages: [
        {
          role: 'user',
          content: '测试连接'
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    }

    const response = await fetch(config.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(testRequest)
    })

    if (!response.ok) {
      throw new Error(`连接测试失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return { success: true, data }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}
