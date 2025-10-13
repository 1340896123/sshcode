/**
 * AI服务工具模块
 */

import { executeAICommand } from './aiCommandExecutor.js'

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

  // 构建请求 - 确保消息历史的正确性
  const cleanedHistoryMessages = historyMessages
    .filter(msg => msg && msg.role && msg.content) // 过滤无效消息
    .filter(msg => msg.role !== 'system') // 确保没有系统消息在历史中
    .map(msg => ({
      role: msg.role,
      content: msg.content.trim() // 确保内容没有前后空白
    }))
    .filter(msg => msg.content.length > 0) // 过滤空内容消息

  const requestData = {
    model: config.customModel || config.model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(connection)
      },
      ...cleanedHistoryMessages,
      {
        role: 'user',
        content: message.trim()
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
  let currentMessages = [...requestData.messages]
  let iterationCount = 0
  const maxIterations = 10 // 防止无限循环

  while (iterationCount < maxIterations) {
    iterationCount++
    console.log(`🔄 [AI-DEBUG] 工具调用迭代 ${iterationCount}`)

    const toolResults = []

    for (const toolCall of toolCalls) {
      if (toolCall.function.name === 'execute_command') {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          console.log(`🔧 [AI-DEBUG] 执行命令:`, args.command)

          const result = await executeTerminalCommand(args.command, connection?.id)
          console.log(`✅ [AI-DEBUG] 命令执行完成，结果长度:`, result.length)

          toolResults.push({
            tool_call_id: toolCall.id,
            result: result
          })
        } catch (error) {
          console.error(`❌ [AI-DEBUG] 命令执行失败:`, error)
          toolResults.push({
            tool_call_id: toolCall.id,
            result: `命令执行失败: ${error.message}`
          })
        }
      }
    }

    // 构建包含工具结果的消息
    const messagesWithToolResults = [
      ...currentMessages,
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
          messages: messagesWithToolResults,
          max_tokens: config.maxTokens,
          temperature: config.temperature
        })
      })

      if (!followUpResponse.ok) {
        throw new Error(`后续API请求失败: ${followUpResponse.status} ${followUpResponse.statusText}`)
      }

      const followUpData = await followUpResponse.json()
      console.log(`🔍 [AI-DEBUG] API响应数据:`, {
        status: followUpResponse.status,
        hasChoices: followUpData.choices && followUpData.choices.length > 0,
        choicesCount: followUpData.choices?.length || 0,
        usage: followUpData.usage
      })

      const choice = followUpData.choices[0]

      if (!choice) {
        console.error(`❌ [AI-DEBUG] API响应中没有choices字段`)
        throw new Error('API返回了无效的响应：缺少choices字段')
      }

      console.log(`🎯 [AI-DEBUG] AI响应详情:`, {
        hasMessage: !!choice.message,
        hasToolCalls: !!(choice.message?.tool_calls),
        toolCallsCount: choice.message?.tool_calls?.length || 0,
        hasContent: !!choice.message?.content,
        contentLength: choice.message?.content?.length || 0,
        finishReason: choice.finish_reason
      })

      // 如果AI又调用了工具，继续循环
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        console.log(`🔄 [AI-DEBUG] AI发起新的工具调用，继续处理`)
        toolCalls = choice.message.tool_calls
        currentMessages = messagesWithToolResults
        continue
      }

      // 检查AI响应的完整性
      if (!choice.message) {
        console.error(`❌ [AI-DEBUG] AI响应中没有message字段`)
        return {
          content: 'AI返回了无效的响应格式：缺少消息内容',
          actions: null
        }
      }

      // 如果AI返回了最终回复，结束循环
      let finalContent = choice.message.content

      // 处理各种可能的响应情况
      if (!finalContent) {
        console.warn(`⚠️ [AI-DEBUG] AI返回了空的内容字段，检查其他可能的信息`)

        // 尝试从finish_reason推断状态
        if (choice.finish_reason === 'stop') {
          finalContent = '命令已执行完成，但AI没有提供额外说明。'
        } else if (choice.finish_reason === 'length') {
          finalContent = '命令已执行完成，但响应因长度限制被截断。'
        } else if (choice.finish_reason === 'content_filter') {
          finalContent = '命令已执行完成，但内容被安全过滤器阻止。'
        } else {
          finalContent = '命令已执行完成，但AI没有返回具体的分析结果。'
        }

        console.log(`🔧 [AI-DEBUG] 根据finish_reason生成默认回复:`, choice.finish_reason)
      }

      console.log(`✅ [AI-DEBUG] 获得最终回复，内容长度:`, finalContent.length)

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

  // 达到最大迭代次数，强制返回
  console.error(`⚠️ [AI-DEBUG] 达到最大工具调用迭代次数 (${maxIterations})，强制停止`)
  return {
    content: '抱歉，处理过程中遇到了过多的工具调用，已停止处理。请简化您的请求。',
    actions: null
  }
}

/**
 * 执行终端命令
 */
export async function executeTerminalCommand(command, connectionId) {
  try {
    // 使用AI命令执行器，能够等待命令完成并获取真实输出
    return await executeAICommand(command, connectionId);
  } catch (error) {
    console.error('AI命令执行失败:', error);
    throw error;
  }
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
