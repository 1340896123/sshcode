/**
 * AI服务工具模块
 */

import { executeAICommand } from './aiCommandExecutor.js';
import { useAIStore } from '../stores/ai.js';
import { emitEvent, EventTypes } from '@/utils/eventSystem.js';
import type {
  AIConfig,
  AIMessage,
  ToolCall,
  Connection,
  ParsedResponse,
  ValidationResult,
  TestResult,
  APIResponse
} from '@/types/index.js';

// AI Service specific types
export interface AIRequestData {
  model: string;
  messages: Array<{
    role: string;
    content: string;
    tool_calls?: ToolCall[];
  }>;
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: { command: { type: string; description: string } };
        required: string[];
      };
    };
  }>;
  max_tokens?: number;
  temperature?: number;
}

export interface AIResponseChoice {
  message: {
    content?: string;
    tool_calls?: ToolCall[];
    finish_reason?: string;
  };
  finish_reason?: string;
}

export interface ToolResult {
  tool_call_id: string;
  result: string;
}

/**
 * 获取AI配置
 */
export async function getAIConfig(): Promise<AIConfig> {
  try {
    // 从electron API获取配置
    if (window.electronAPI?.getConfig) {
      const config = await window.electronAPI.getConfig();
      if (config.aiChat && isConfigValid(config.aiChat)) {
        return config.aiChat;
      }
    }

    // 尝试从本地存储获取配置
    const localConfig = localStorage.getItem('ai-config');
    if (localConfig) {
      const parsedConfig = JSON.parse(localConfig);
      if (isConfigValid(parsedConfig)) {
        return parsedConfig;
      }
    }

    // 如果没有有效配置，抛出错误引导用户设置
    throw new Error('AI_CONFIG_NOT_SET');
  } catch (error) {
    if (error.message === 'AI_CONFIG_NOT_SET') {
      // 触发配置设置引导
      triggerConfigSetup();
      throw error;
    }
    console.error('获取AI配置失败:', error);
    throw new Error('AI配置获取失败，请检查设置');
  }
}

/**
 * 检查配置是否有效
 */
function isConfigValid(config: AIConfig): boolean {
  return (
    config &&
    config.baseUrl &&
    config.apiKey &&
    (config.model || config.customModel) &&
    config.baseUrl.trim() !== '' &&
    config.apiKey.trim() !== '' &&
    ((config.model && config.model.trim() !== '') ||
      (config.customModel && config.customModel.trim() !== ''))
  );
}

/**
 * 触发配置设置引导
 */
function triggerConfigSetup(): void {
  // 使用Pinia store设置配置状态
  const aiStore = useAIStore();
  aiStore.setConfigRequired('请先配置AI服务设置才能使用AI助手功能');

  // 发送配置需求事件
  emitEvent(EventTypes.AI_CONFIG_REQUIRED, {
    message: '请先配置AI服务设置才能使用AI助手功能',
    timestamp: Date.now()
  }, {});
}

/**
 * 获取操作系统信息
 */
async function getOSInfo(connection: Connection): Promise<string> {
  let osInfo = '未知系统';
  try {
    if (window.electronAPI && connection.status === 'connected') {
      const osResult = await window.electronAPI.sshExecute(
        connection.id,
        "uname -s 2>/dev/null || echo 'Unknown'"
      );
      if (osResult.output) {
        const osName = osResult.output.trim();
        // 获取更详细的系统信息
        const osVersionResult = await window.electronAPI.sshExecute(
          connection.id,
          "cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"' 2>/dev/null || uname -r 2>/dev/null || echo ''"
        );
        const osVersion = osVersionResult.output.trim();
        osInfo = osVersion ? `${osName} (${osVersion})` : osName;
      }
    }
  } catch (error) {
    console.log('获取操作系统信息失败，使用默认值:', error.message);
  }
  return osInfo;
}

/**
 * 构建工具定义
 */
function buildTools(
  connection: Connection,
  osInfo: string
): Array<{
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: { command: { type: string; description: string } };
      required: string[];
    };
  };
}> {
  return [
    {
      type: 'function',
      function: {
        name: 'execute_command',
        description: `在远程服务器上执行命令并获取输出结果。执行环境：${connection.username}@${connection.host}:${connection.currentWorkingDirectory || `~${connection.username}`}，操作系统：${osInfo}`,
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: `要在 ${connection.host} (${osInfo}) 上执行的命令，当前工作目录：${connection.currentWorkingDirectory || `~${connection.username}`}`
            }
          },
          required: ['command']
        }
      }
    }
  ];
}

/**
 * 清理消息历史
 */
function cleanHistoryMessages(historyMessages: AIMessage[]): Array<{ role: string; content: string }> {
  return historyMessages
    .filter(msg => msg && msg.role && msg.content) // 过滤无效消息
    .filter(msg => msg.role !== 'system') // 确保没有系统消息在历史中
    .map(msg => ({
      role: msg.role,
      content: msg.content.trim() // 确保内容没有前后空白
    }))
    .filter(msg => msg.content.length > 0); // 过滤空内容消息
}

/**
 * 构建请求数据
 */
function buildRequestData(
  config: AIConfig,
  connection: Connection,
  message: string,
  historyMessages: AIMessage[],
  tools: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: { command: { type: string; description: string } };
        required: string[];
      };
    };
  }>
): AIRequestData {
  const cleanedHistoryMessages = cleanHistoryMessages(historyMessages);

  return {
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
  };
}

/**
 * 发送API请求
 */
async function sendAPIRequest(
  config: AIConfig,
  requestData: AIRequestData
): Promise<{ choices: AIResponseChoice[] }> {
  const response = await fetch(config.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const choice = data.choices[0];

  if (!choice) {
    throw new Error('API返回了无效的响应');
  }

  return data;
}

/**
 * 统一处理AI响应
 */
async function processAIResponse(
  choice: AIResponseChoice,
  requestData: AIRequestData,
  config: AIConfig,
  connection: Connection
): Promise<ParsedResponse> {
  // 处理工具调用
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    return await handleToolCalls(choice.message.tool_calls, requestData, config, connection);
  }

  // 处理普通文本响应
  if (choice.message.content) {
    let aiContent = choice.message.content;

    // 根据finish_reason进行特殊处理
    if (choice.finish_reason === 'length') {
      aiContent += '\n\n*(响应因长度限制被截断，可能不完整)*';
    } else if (choice.finish_reason === 'content_filter') {
      aiContent += '\n\n*(部分内容被安全过滤器阻止)*';
    }

    // 解析AI回复，提取命令建议
    return parseAIResponse(aiContent);
  }

  // 处理空内容响应
  return createFallbackResponse(choice.finish_reason);
}

/**
 * 调用AI API
 */
export async function callAIAPI(
  message: string,
  historyMessages: AIMessage[],
  connection: Connection
): Promise<ParsedResponse> {
  try {
    const config = await getAIConfig();
    const osInfo = await getOSInfo(connection);
    const tools = buildTools(connection, osInfo);
    const requestData = buildRequestData(config, connection, message, historyMessages, tools);
    const responseData = await sendAPIRequest(config, requestData);

    return await processAIResponse(responseData.choices[0], requestData, config, connection);
  } catch (error) {
    console.error('AI API调用失败:', error);
    throw error;
  }
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(connection: Connection): string {
  return `你是一个专业的SSH远程管理助手，正在通过SSH连接帮助用户管理服务器 ${connection.host}。

**当前连接环境：**
- 主机地址: ${connection.host}
- 端口: ${connection.port || 22}
- 登录用户: ${connection.username}
- 认证方式: ${connection.authType === 'key' ? 'SSH密钥认证' : '密码认证'}
- 连接状态: SSH已建立
- 当前工作目录: ${connection.currentWorkingDirectory || `~${connection.username}`}

**你的核心职责：**
1. **实时系统监控**: 通过execute_command工具获取真实的系统状态信息
2. **智能问题诊断**: 基于实际命令输出分析系统问题并提供解决方案
3. **安全操作指导**: 推荐安全的Linux命令，避免危险操作
4. **性能优化建议**: 根据系统资源使用情况提供优化建议

**系统环境信息获取：**
- **当前工作目录**: \`pwd\` - 获取当前完整路径
- **系统基本信息**: \`uname -a\`, \`cat /etc/os-release\`, \`hostname\`
- **用户信息**: \`whoami\`, \`id\`, \`groups\`
- **资源使用情况**: \`free -h\`, \`df -h\`, \`top -bn1\`, \`htop\`
- **进程管理**: \`ps aux\`, \`systemctl status\`, \`journalctl -n 20\`
- **网络状态**: \`netstat -tulpn\`, \`ss -tulpn\`, \`ip addr show\`, \`ping -c 3 8.8.8.8\`
- **磁盘和文件**: \`ls -la\`, \`du -sh *\`, \`find . -name "*.log" -mtime -7\`
- **系统负载**: \`uptime\`, \`w\`, \`iostat 1 3\`

**execute_command工具使用说明：**
- 此工具直接在SSH连接的远程服务器上执行命令
- 命令执行环境: ${connection.username}@${connection.host}:${connection.currentWorkingDirectory || `~${connection.username}`}
- 所有命令都在真实的服务器环境中运行
- 返回的是实际的命令输出结果

**重要提醒：**
- 每次分析前先使用 \`pwd\` 确认当前工作目录
- 优先使用execute_command工具获取实时数据，不要依赖记忆或假设
- 分析结果时必须结合实际的系统环境和当前目录
- 推荐命令时要考虑当前用户的权限 level
- 对于需要sudo权限的操作，要明确提醒用户

**安全准则：**
- 避免推荐危险的系统命令（如rm -rf /、dd if=/dev/zero等）
- 文件操作前建议先备份或确认路径
- 网络操作时考虑防火墙和安全策略

请根据用户的实际需求，使用execute_command工具获取准确的系统信息，基于真实的命令输出提供专业的建议和解决方案。`;
}

/**
 * 构建包含工具结果的消息
 */
function buildMessagesWithToolResults(
  currentMessages: Array<{ role: string; content: string; tool_calls?: ToolCall[] }>,
  toolCalls: ToolCall[],
  toolResults: ToolResult[]
): Array<{ role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }> {
  return [
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
  ];
}

/**
 * 处理工具调用结果
 */
function processToolCallResult(choice: AIResponseChoice): ParsedResponse {
  // 检查AI响应的完整性
  if (!choice.message) {
    console.error('AI响应中没有message字段');
    return {
      content: 'AI返回了无效的响应格式：缺少消息内容',
      actions: null
    };
  }

  // 如果AI返回了最终回复，结束循环
  let finalContent = choice.message.content;

  // 处理各种可能的响应情况
  if (!finalContent || finalContent.trim() === '') {
    finalContent = generateCommandCompletionMessage(choice.finish_reason);
  } else {
    // 对于有内容的情况，根据finish_reason添加提示
    finalContent = appendFinishReasonNotice(finalContent, choice.finish_reason);
  }

  return {
    content: finalContent,
    actions: null // AI已经执行了命令，不需要额外的操作按钮
  };
}

/**
 * 处理工具调用
 */
async function handleToolCalls(
  toolCalls: ToolCall[],
  requestData: AIRequestData,
  config: AIConfig,
  connection: Connection
): Promise<ParsedResponse> {
  let currentMessages = [...requestData.messages];
  let iterationCount = 0;
  const maxIterations = 10; // 防止无限循环

  while (iterationCount < maxIterations) {
    iterationCount++;

    const toolResults = [];

    for (const toolCall of toolCalls) {
      if (toolCall.function.name === 'execute_command') {
        try {
          const args: { command: string } = JSON.parse(toolCall.function.arguments);

          // 发送工具调用开始事件，让UI显示正在执行
          emitEvent(EventTypes.AI_COMMAND_START, {
            commandId: toolCall.id,
            connectionId: connection.id,
            timestamp: Date.now()
          }, {});

          // 使用Pinia store记录工具调用开始
          const aiStore = useAIStore();
          aiStore.startToolCall({
            id: toolCall.id,
            command: args.command,
            connectionId: connection.id
          });

          const result = await executeTerminalCommand(args.command, connection?.id, toolCall.id);

          // 使用Pinia store记录工具调用完成
          aiStore.completeToolCall({
            id: toolCall.id,
            result: result
          });

          // 发送工具调用完成事件，让UI显示结果
          emitEvent(EventTypes.AI_COMMAND_COMPLETE, {
            commandId: toolCall.id,
            connectionId: connection.id,
            result: result,
            timestamp: Date.now()
          }, {});

          toolResults.push({
            tool_call_id: toolCall.id,
            result: result
          });
        } catch (error) {
          console.error('命令执行失败:', error);

          // 使用Pinia store记录工具调用失败
          const aiStore = useAIStore();
          aiStore.errorToolCall({
            id: toolCall.id,
            error: error.message
          });

          // 发送工具调用错误事件，让UI显示错误
          emitEvent(EventTypes.AI_COMMAND_ERROR, {
            commandId: toolCall.id,
            connectionId: connection.id,
            error: error.message,
            timestamp: Date.now()
          }, {});

          toolResults.push({
            tool_call_id: toolCall.id,
            result: `命令执行失败: ${error.message}`
          });
        }
      }
    }

    // 构建包含工具结果的消息
    const messagesWithToolResults = buildMessagesWithToolResults(
      currentMessages,
      toolCalls,
      toolResults
    );

    try {
      // 构建后续请求数据
      const followUpRequestData = {
        model: config.customModel || config.model,
        messages: messagesWithToolResults,
        max_tokens: config.maxTokens,
        temperature: config.temperature
      };

      // 发送后续API请求
      const followUpResponseData = await sendAPIRequest(config, followUpRequestData);
      const choice = followUpResponseData.choices[0];

      // 如果AI又调用了工具，继续循环
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        toolCalls = choice.message.tool_calls;
        currentMessages = messagesWithToolResults;
        continue;
      }

      // 处理最终的AI响应
      return processToolCallResult(choice);
    } catch (error) {
      console.error('工具调用后续处理失败:', error);
      return {
        content: `命令已执行，但处理结果时出现错误：${error.message}`,
        actions: null
      };
    }
  }

  // 达到最大迭代次数，强制返回
  console.error(`达到最大工具调用迭代次数 (${maxIterations})，强制停止`);
  return {
    content: '抱歉，处理过程中遇到了过多的工具调用，已停止处理。请简化您的请求。',
    actions: null
  };
}

/**
 * 执行终端命令
 */
export async function executeTerminalCommand(
  command: string,
  connectionId: string,
  toolCallId?: string
): Promise<string> {
  try {
    // 使用AI命令执行器，能够等待命令完成并获取真实输出
    // 如果有toolCallId，则传递给AI命令执行器，确保使用相同的ID
    return await executeAICommand(command, connectionId, { toolCallId });
  } catch (error) {
    console.error('AI命令执行失败:', error);
    throw error;
  }
}

/**
 * 解析AI响应，提取命令建议
 */
export function parseAIResponse(content: string): ParsedResponse {
  // 查找代码块中的命令
  const codeBlockRegex = /```(?:bash|shell)?\s*([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      command: match[1].trim(),
      type: 'command'
    });
  }

  // 查找行内代码
  const inlineCodeRegex = /`([^`]+)`/g;
  const inlineCodes = [];

  while ((match = inlineCodeRegex.exec(content)) !== null) {
    const code = match[1].trim();
    // 只包含简单的命令，排除说明文字
    if (code.includes(' ') && !code.includes('示例') && !code.includes('说明')) {
      inlineCodes.push({
        command: code,
        type: 'command'
      });
    }
  }

  // 去重并生成操作按钮
  const uniqueCommands = [
    ...new Map([...codeBlocks, ...inlineCodes].map(cmd => [cmd.command, cmd])).values()
  ];

  const actions = uniqueCommands.slice(0, 5).map((cmd, index) => ({
    id: `cmd-${index}`,
    type: 'command',
    label: `⚡ 执行: ${cmd.command.length > 30 ? cmd.command.substring(0, 30) + '...' : cmd.command}`,
    command: cmd.command
  }));

  return {
    content,
    actions: actions.length > 0 ? actions : null
  };
}

/**
 * 验证AI配置
 */
export function validateAIConfig(config: AIConfig): ValidationResult {
  if (!config) {
    return { valid: false, error: '配置不能为空' };
  }

  if (!config.baseUrl) {
    return { valid: false, error: 'API基础URL不能为空' };
  }

  if (!config.apiKey) {
    return { valid: false, error: 'API密钥不能为空' };
  }

  if (!config.model && !config.customModel) {
    return { valid: false, error: '模型名称不能为空' };
  }

  if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 32000)) {
    return { valid: false, error: '最大令牌数必须在1-32000之间' };
  }

  if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
    return { valid: false, error: '温度值必须在0-2之间' };
  }

  return { valid: true };
}

/**
 * 创建fallback响应
 */
function createFallbackResponse(finishReason: string): ParsedResponse {
  const fallbackMessages = {
    stop: '对话已完成，但我没有生成具体内容。请重新提问。',
    length: '回复因长度限制被截断，请尝试更简单的问题或让我分步回答。',
    content_filter: '回复内容被安全过滤器阻止。请尝试用其他方式表述您的问题。',
    tool_calls: '检测到工具调用请求但处理失败。请重试或检查命令格式。',
    function_call: '函数调用请求处理失败。请重试或检查参数格式。'
  };

  const fallbackContent =
    fallbackMessages[finishReason] ||
    `AI响应异常 (finish_reason: ${finishReason})。请重试或联系技术支持。`;

  return {
    content: fallbackContent,
    actions: null
  };
}

/**
 * 生成命令完成消息
 */
function generateCommandCompletionMessage(finishReason: string): string {
  const completionMessages = {
    stop: '命令已执行完成，但AI没有提供额外说明。',
    length: '命令已执行完成，但响应因长度限制被截断。如果需要更详细的分析，请让我分步处理。',
    content_filter: '命令已执行完成，但部分分析内容被安全过滤器阻止。请尝试用其他方式询问。',
    tool_calls: '命令执行完成，但AI可能需要执行更多操作。请让我知道是否需要继续。',
    function_call: '函数调用已完成，但AI没有提供分析结果。'
  };

  return (
    completionMessages[finishReason] ||
    `命令已执行完成，但AI响应异常 (finish_reason: ${finishReason})。`
  );
}

/**
 * 为响应内容添加finish_reason提示
 */
function appendFinishReasonNotice(content: string, finishReason: string): string {
  const notices = {
    length: '\n\n*(响应因长度限制被截断，可能不完整。如果需要更详细的分析，请让我分步处理)*',
    content_filter: '\n\n*(部分内容被安全过滤器阻止。请尝试用其他方式表述问题)*',
    tool_calls: '\n\n*(AI可能需要执行更多操作来完成此任务)*',
    function_call: '\n\n*(AI可能需要执行更多函数调用来完成此任务)*'
  };

  // 对于正常停止或其他状态，不需要添加提示
  if (finishReason === 'stop' || !notices[finishReason]) {
    return content;
  }

  return content + notices[finishReason];
}
