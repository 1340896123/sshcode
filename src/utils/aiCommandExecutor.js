/**
 * AI命令执行器
 * 专门用于AI工具调用的命令执行，能够等待命令完成并获取输出
 */

class AICommandExecutor {
  constructor() {
    this.pendingCommands = new Map() // 存储待执行的命令
    this.commandBuffers = new Map() // 存储命令输出缓冲区
    this.commandTimeout = 60000 // 60秒超时，给AI命令更多执行时间
  }

  /**
   * 执行命令并等待结果
   */
  async executeCommand(command, connectionId) {
    const commandId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    return new Promise(async (resolve, reject) => {
      // 检查连接状态
      console.log(`🔍 [AI-DEBUG] 开始执行AI命令:`, {
        connectionId,
        command,
        commandId,
        pendingCommandsCount: this.pendingCommands.size
      });

      // 存储命令信息
      this.pendingCommands.set(commandId, {
        command,
        connectionId,
        resolve,
        reject,
        startTime: Date.now(),
        output: []
      })

      // 设置输出缓冲区
      this.commandBuffers.set(commandId, [])

      // 设置超时
      const timeoutId = setTimeout(() => {
        console.error(`⏰ [AI-DEBUG] AI命令执行超时:`, {
          commandId,
          command,
          connectionId,
          executionTime: Date.now() - this.pendingCommands.get(commandId)?.startTime
        });
        this.cleanupCommand(commandId)
        reject(new Error(`AI命令执行超时 (${this.commandTimeout}ms): ${command}`))
      }, this.commandTimeout)

      // 保存超时ID
      this.pendingCommands.get(commandId).timeoutId = timeoutId

      try {
        // 检查SSH Shell是否可用
        if (!window.electronAPI?.sshShellWrite) {
          throw new Error('SSH Shell API不可用，请检查Electron主进程连接')
        }

        console.log(`🔍 [AI-DEBUG] 准备发送AI命令:`, {
          connectionId,
          command,
          commandId,
          fullCommand: command + '\r'
        });

        // 在命令真正开始执行前触发工具调用开始事件
        window.dispatchEvent(new CustomEvent('ai-tool-call-start', {
          detail: {
            command: command,
            toolCallId: commandId
          }
        }));

        // 确保命令不包含多余的换行符，避免双重换行
        const cleanCommand = command.replace(/\r?\n$/, '');
        // 使用\r而不是\r\n，避免额外的换行
        const result = await window.electronAPI.sshShellWrite(connectionId, cleanCommand + '\r')
        console.log(`📤 [AI-DEBUG] SSH Shell写入结果:`, result);

        if (!result.success) {
          throw new Error(result.error || 'SSH Shell写入失败')
        }

        console.log(`✅ [AI-DEBUG] AI命令已成功发送:`, {
          command,
          commandId,
          connectionId
        })

      } catch (error) {
        console.error(`❌ [AI-DEBUG] AI命令发送失败:`, {
          connectionId,
          command,
          commandId,
          error: error.message,
          errorStack: error.stack
        });
        this.cleanupCommand(commandId)
        reject(new Error(`AI命令发送失败: ${error.message}`))
      }
    })
  }

  /**
   * 处理终端数据输出
   */
  handleTerminalData(connectionId, data) {
    console.log(`🔍 [AI-DEBUG] 收到终端数据:`, {
      connectionId,
      dataLength: data.length,
      dataPreview: data.toString().substring(0, 100),
      pendingCommands: Array.from(this.pendingCommands.keys())
    });

    // 查找该连接的所有待执行命令
    for (const [commandId, commandInfo] of this.pendingCommands.entries()) {
      if (commandInfo.connectionId === connectionId) {
        console.log(`🔍 [AI-DEBUG] 匹配到AI命令:`, {
          commandId,
          command: commandInfo.command,
          pendingCommandsCount: this.pendingCommands.size
        });

        // 添加到输出缓冲区
        const buffer = this.commandBuffers.get(commandId)
        if (buffer) {
          buffer.push(data)
          commandInfo.output.push(data)

          console.log(`📊 [AI-DEBUG] 命令输出缓冲区:`, {
            commandId,
            bufferSize: buffer.length,
            totalOutput: commandInfo.output.length,
            latestOutput: data.toString().trim().substring(0, 200)
          });

          // 检查命令是否完成（通过提示符检测）
          const isComplete = this.isCommandComplete(data, commandInfo.output);
          console.log(`🎯 [AI-DEBUG] 命令完成检测:`, {
            commandId,
            isComplete,
            latestData: data.toString().trim(),
            outputEnd: commandInfo.output.join('').slice(-200)
          });

          if (isComplete) {
            console.log(`✅ [AI-DEBUG] 命令完成，准备返回结果: ${commandId}`);
            this.completeCommand(commandId)
          }
        }
      }
    }
  }

  /**
   * 判断命令是否完成
   */
  isCommandComplete(latestData, allOutput) {
    // 清理ANSI转义序列以获得纯文本
    const cleanData = (data) => data.replace(/\x1b\[[0-9;]*[mGKHJABCFMPQRSUVWSTfhjlqurwxwzy]|\x1b\[[0-9]*[ABCDHIJKLMPRSTUVWXYZ]|\x1b\[[0-9]*n/g, '')

    const output = allOutput.join('')
    const cleanOutput = cleanData(output)
    const cleanLatestData = cleanData(latestData)
    const outputEnd = cleanOutput.slice(-500) // 增加检查范围到500字符

    // 检测常见的命令完成标志 - 支持Linux和Windows，处理ANSI转义序列
    const patterns = [
      {
        name: '标准Shell提示符',
        regex: /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+:[~\/][a-zA-Z0-9._\/-]*[$#]\s*$/
      },
      {
        name: 'root提示符',
        regex: /root@[a-zA-Z0-9._-]+:[~\/][a-zA-Z0-9._\/-]*[#]\s*$/
      },
      {
        name: '普通用户提示符',
        regex: /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+:[~\/][a-zA-Z0-9._\/-]*[$]\s*$/
      },
      {
        name: 'Windows命令提示符',
        regex: /[a-zA-Z0-9._-]+@[a-zA-Z0-9]+ [A-Z]:[\\\/][a-zA-Z0-9._\\\/-]*[>$]\s*$/
      },
      {
        name: 'Windows命令提示符带ANSI',
        regex: /[a-zA-Z0-9._-]+@[a-zA-Z0-9]+ [A-Z]:[\\\/][a-zA-Z0-9._\\\/-]*[>]\x1b\[\d+X?\s*$/
      },
      {
        name: 'Windows命令提示符简化',
        regex: /[A-Z]:[\\\/][a-zA-Z0-9._\\\/-]*[>$]\s*$/
      },
      {
        name: '简单提示符',
        regex: /[$#>]\s*$/
      },
      {
        name: '明确完成信息',
        regex: /Command completed/i
      },
      {
        name: '退出码',
        regex: /Exit code: \d+/i
      }
    ]

    console.log(`🔍 [AI-DEBUG] 命令完成检测分析:`, {
      outputLength: output.length,
      outputEnd: outputEnd.trim(),
      latestData: latestData.trim(),
      cleanOutputEnd: cleanOutput.trim(),
      cleanLatestData: cleanLatestData.trim(),
      patterns: patterns.map(p => ({
        name: p.name,
        match: p.regex.test(cleanLatestData) || p.regex.test(cleanOutput)
      }))
    });

    // 检查是否包含命令执行结果的迹象
    const hasCommandResult = output.length > latestData.length + 10 // 输出比最新数据多
    const hasPrompt = patterns.some(pattern =>
      pattern.regex.test(cleanLatestData) || pattern.regex.test(cleanOutput)
    );

    // 特殊处理：如果有错误信息并且包含提示符，也认为完成
    const hasErrorAndPrompt = /不是内部或外部命令|不是可运行的程序|or batch file|command not found/i.test(cleanOutput) && hasPrompt;

    // 特殊处理：如果没有明确的提示符，但有输出包含>符号和路径，也认为可能完成
    // 但要确保这是真正的提示符，而不是命令输出的一部分
    const hasWindowsPathAndArrow = /[A-Z]:[\\\/].*[>]\s*$/.test(cleanOutput) &&
                                     output.length > 50 &&
                                     !/[A-Z]:[\\\/].*>.*[>]/.test(cleanLatestData); // 确保最新数据不是命令输出

    // 新增：处理一些常见的命令结束模式
    const hasCommandEndPattern = /\r?\n[^\r\n]*[$#>]\s*$/.test(cleanOutput) && output.length > 20;

    // 处理sudo命令或其他需要输入的命令
    const hasSudoPrompt = /\[sudo\] password for.*:/i.test(cleanOutput);

    // 处理yes/no确认提示
    const hasYesNoPrompt = /\[Y\/n\]|\[y\/N\]|\(y\/n\)|\(yes\/no\)/i.test(cleanOutput);

    // 更严格的完成判断：必须有明确的命令结果和提示符
    const isComplete = (hasPrompt && hasCommandResult && (cleanLatestData.includes('\n') || output.length > 100)) ||
                     (hasErrorAndPrompt && output.length > 50) ||
                     (hasWindowsPathAndArrow && output.length > 50) ||
                     (hasCommandEndPattern && output.length > 50) ||
                     (hasSudoPrompt || hasYesNoPrompt) || // 特殊提示符也认为完成
                     (output.length > 500 && hasPrompt); // 对于输出较长的命令，只要有提示符就认为完成

    console.log(`🎯 [AI-DEBUG] 最终命令完成判断:`, {
      isComplete,
      hasPrompt,
      hasCommandResult,
      hasErrorAndPrompt,
      hasWindowsPathAndArrow,
      hasCommandEndPattern,
      hasSudoPrompt,
      hasYesNoPrompt,
      outputEnd: outputEnd.trim().substring(0, 200)
    });

    return isComplete
  }

  /**
   * 完成命令执行
   */
  completeCommand(commandId) {
    const commandInfo = this.pendingCommands.get(commandId)
    if (!commandInfo) {
      console.warn(`⚠️ [AI-DEBUG] 尝试完成不存在的命令: ${commandId}`)
      return
    }

    const buffer = this.commandBuffers.get(commandId) || []
    const output = buffer.join('')
    const executionTime = Date.now() - commandInfo.startTime

    console.log(`✅ [AI-DEBUG] 命令执行完成:`, {
      commandId,
      command: commandInfo.command,
      connectionId: commandInfo.connectionId,
      executionTime,
      outputLength: output.length,
      outputPreview: output.substring(0, 200).replace(/\n/g, '\\n')
    })

    // 清理资源
    this.cleanupCommand(commandId)

    // 返回结果
    commandInfo.resolve(output)
  }

  /**
   * 清理命令相关资源
   */
  cleanupCommand(commandId) {
    const commandInfo = this.pendingCommands.get(commandId)
    if (commandInfo?.timeoutId) {
      clearTimeout(commandInfo.timeoutId)
    }

    this.pendingCommands.delete(commandId)
    this.commandBuffers.delete(commandId)
  }

  /**
   * 强制完成所有命令（用于连接断开等情况）
   */
  completeAllCommands(connectionId) {
    for (const [commandId, commandInfo] of this.pendingCommands.entries()) {
      if (commandInfo.connectionId === connectionId) {
        this.completeCommand(commandId)
      }
    }
  }

  /**
   * 获取待执行命令数量
   */
  getPendingCommandsCount(connectionId) {
    let count = 0
    for (const commandInfo of this.pendingCommands.values()) {
      if (commandInfo.connectionId === connectionId) {
        count++
      }
    }
    return count
  }
}

// 创建全局实例
const aiCommandExecutor = new AICommandExecutor()

// 导出实例和工具函数
export default aiCommandExecutor

export const executeAICommand = (command, connectionId) => {
  return aiCommandExecutor.executeCommand(command, connectionId)
}

export const handleAITerminalData = (connectionId, data) => {
  aiCommandExecutor.handleTerminalData(connectionId, data)
}

export const completeAllAICommands = (connectionId) => {
  aiCommandExecutor.completeAllCommands(connectionId)
}
