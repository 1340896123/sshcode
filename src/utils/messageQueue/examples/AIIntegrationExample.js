/**
 * AI集成使用示例
 * 展示如何使用消息队列系统管理AI对话和工具调用
 */

import {
  initializeMessageQueueSystem,
  MessageTypes,
  Priority
} from '../index.js'

// 初始化包含AI功能的消息队列系统
const messageQueueSystem = initializeMessageQueueSystem({
  queueOptions: {
    maxQueueSize: 1000,
    processingInterval: 50,
    enableRetry: true,
    maxRetries: 3
  },
  enableAI: true,
  enableMonitoring: true,
  monitoringOptions: {
    interval: 3000
  }
})

// 模拟连接信息
const mockConnection = {
  id: 'conn-001',
  host: '192.168.1.100',
  port: 22,
  username: 'admin',
  currentWorkingDirectory: '/home/admin',
  status: 'connected'
}

// AI对话示例
async function aiChatExample() {
  console.log('🤖 开始AI对话示例')

  // 1. 创建AI会话
  const sessionId = messageQueueSystem.createAISession(mockConnection)
  console.log('🆕 创建AI会话:', sessionId)

  // 2. 订阅AI响应
  const responseSubscriptionId = messageQueueSystem.subscribe(MessageTypes.AI_RESPONSE, (message) => {
    console.log('🤖 AI响应:', message.data)
  })

  // 3. 订阅工具调用结果
  const toolCallSubscriptionId = messageQueueSystem.subscribe(MessageTypes.TOOL_CALL_RESULT, (message) => {
    console.log('🔧 工具调用结果:', message.data)
  })

  // 4. 订阅SSH输出
  const sshSubscriptionId = messageQueueSystem.subscribe(MessageTypes.SSH_OUTPUT, (message) => {
    console.log('💻 SSH输出:', message.data)
  })

  // 5. 发送AI聊天消息
  console.log('📤 发送AI聊天消息')
  messageQueueSystem.sendAIChatMessage(sessionId, '你好，请帮我查看当前目录的文件列表', mockConnection, [])

  // 6. 发送包含工具调用的消息
  setTimeout(() => {
    console.log('📤 发送需要工具调用的消息')
    messageQueueSystem.sendAIChatMessage(sessionId, '请执行命令查看系统负载情况', mockConnection, [
      { role: 'user', content: '你好，请帮我查看当前目录的文件列表' },
      { role: 'assistant', content: '好的，我来帮您查看当前目录的文件列表。' }
    ])
  }, 2000)

  // 7. 清理
  setTimeout(() => {
    messageQueueSystem.unsubscribe(responseSubscriptionId)
    messageQueueSystem.unsubscribe(toolCallSubscriptionId)
    messageQueueSystem.unsubscribe(sshSubscriptionId)
    messageQueueSystem.closeAISession(sessionId)
    console.log('✅ AI对话示例完成')
  }, 10000)
}

// 多会话管理示例
async function multiSessionExample() {
  console.log('🎭 开始多会话管理示例')

  const sessions = []
  const subscriptions = []

  // 1. 创建多个AI会话
  for (let i = 0; i < 3; i++) {
    const connection = {
      ...mockConnection,
      id: `conn-${i + 1}`,
      host: `192.168.1.${100 + i}`
    }
    
    const sessionId = messageQueueSystem.createAISession(connection)
    sessions.push({ sessionId, connection })
    console.log(`🆕 创建会话 ${i + 1}:`, sessionId)
  }

  // 2. 为每个会话订阅消息
  sessions.forEach((session, index) => {
    const subscriptionId = messageQueueSystem.subscribe(MessageTypes.AI_RESPONSE, (message) => {
      if (message.data.sessionId === session.sessionId) {
        console.log(`🤖 会话${index + 1} AI响应:`, message.data.type)
      }
    })
    subscriptions.push(subscriptionId)
  })

  // 3. 向不同会话发送消息
  sessions.forEach((session, index) => {
    setTimeout(() => {
      console.log(`📤 向会话${index + 1}发送消息`)
      messageQueueSystem.sendAIChatMessage(
        session.sessionId,
        `请帮我查看服务器 ${session.connection.host} 的状态`,
        session.connection,
        []
      )
    }, index * 1000)
  })

  // 4. 清理
  setTimeout(() => {
    subscriptions.forEach(subscriptionId => {
      messageQueueSystem.unsubscribe(subscriptionId)
    })
    
    sessions.forEach(session => {
      messageQueueSystem.closeAISession(session.sessionId)
    })
    
    console.log('✅ 多会话管理示例完成')
  }, 15000)
}

// 会话状态监控示例
async function sessionMonitoringExample() {
  console.log('📊 开始会话状态监控示例')

  // 1. 创建会话
  const sessionId = messageQueueSystem.createAISession(mockConnection)
  console.log('🆕 创建会话:', sessionId)

  // 2. 定期发送消息并监控状态
  let messageCount = 0
  const monitoringInterval = setInterval(() => {
    messageCount++
    
    console.log(`📤 发送第 ${messageCount} 条消息`)
    messageQueueSystem.sendAIChatMessage(
      sessionId,
      `这是第 ${messageCount} 条测试消息`,
      mockConnection,
      []
    )

    // 获取AI集成状态
    if (messageQueueSystem.aiIntegration) {
      const stats = messageQueueSystem.aiIntegration.getSessionStats()
      console.log('📊 会话统计:', stats)
    }

    if (messageCount >= 5) {
      clearInterval(monitoringInterval)
    }
  }, 2000)

  // 3. 监控系统健康状态
  const healthInterval = setInterval(() => {
    const healthStatus = messageQueueSystem.getHealthStatus()
    console.log('💚 系统健康状态:', healthStatus.status, healthStatus.message)
  }, 3000)

  // 4. 清理
  setTimeout(() => {
    clearInterval(healthInterval)
    messageQueueSystem.closeAISession(sessionId)
    console.log('✅ 会话状态监控示例完成')
  }, 15000)
}

// 错误处理和重试示例
async function errorHandlingExample() {
  console.log('🚨 开始错误处理和重试示例')

  // 1. 创建会话
  const sessionId = messageQueueSystem.createAISession(mockConnection)

  // 2. 订阅错误消息
  const errorSubscriptionId = messageQueueSystem.subscribe(MessageTypes.SYSTEM_ERROR, (message) => {
    console.error('❌ 系统错误:', message.data)
  })

  // 3. 发送可能导致错误的消息（模拟网络问题）
  console.log('📤 发送可能失败的消息')
  const badConnection = {
    ...mockConnection,
    id: 'bad-conn',
    status: 'disconnected' // 模拟断开连接
  }

  messageQueueSystem.sendAIChatMessage(
    sessionId,
    '这条消息可能会失败',
    badConnection,
    []
  )

  // 4. 发送正常消息验证恢复
  setTimeout(() => {
    console.log('📤 发送恢复消息')
    messageQueueSystem.sendAIChatMessage(
      sessionId,
      '系统应该恢复正常',
      mockConnection,
      []
    )
  }, 3000)

  // 5. 查看重试统计
  setTimeout(() => {
    const status = messageQueueSystem.getStatus()
    console.log('📊 队列状态（包含重试统计）:', status.stats)
    
    messageQueueSystem.unsubscribe(errorSubscriptionId)
    messageQueueSystem.closeAISession(sessionId)
    console.log('✅ 错误处理和重试示例完成')
  }, 8000)
}

// 性能测试示例
async function performanceTestExample() {
  console.log('⚡ 开始性能测试示例')

  const sessionId = messageQueueSystem.createAISession(mockConnection)
  const messageCount = 20
  const startTime = Date.now()

  // 1. 批量发送消息
  console.log(`📤 批量发送 ${messageCount} 条消息`)
  for (let i = 0; i < messageCount; i++) {
    messageQueueSystem.sendAIChatMessage(
      sessionId,
      `性能测试消息 ${i + 1}`,
      mockConnection,
      []
    )
  }

  // 2. 监控处理进度
  const progressInterval = setInterval(() => {
    const status = messageQueueSystem.getStatus()
    const processed = status.stats.processedMessages
    const queued = status.stats.queuedMessages
    
    console.log(`📊 处理进度: ${processed} 已处理, ${queued} 队列中`)
    
    if (queued === 0) {
      clearInterval(progressInterval)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      const throughput = messageCount / (duration / 1000)
      
      console.log(`⚡ 性能测试完成:`)
      console.log(`   - 总消息数: ${messageCount}`)
      console.log(`   - 总耗时: ${duration}ms`)
      console.log(`   - 吞吐量: ${throughput.toFixed(2)} 消息/秒`)
      console.log(`   - 平均处理时间: ${status.stats.averageProcessingTime.toFixed(2)}ms`)
      
      messageQueueSystem.closeAISession(sessionId)
      console.log('✅ 性能测试示例完成')
    }
  }, 500)
}

// 运行所有AI示例
export async function runAllAIExamples() {
  console.log('🎯 开始运行所有AI集成示例')
  
  try {
    await aiChatExample()
    
    setTimeout(async () => {
      await multiSessionExample()
    }, 12000)
    
    setTimeout(async () => {
      await sessionMonitoringExample()
    }, 30000)
    
    setTimeout(async () => {
      await errorHandlingExample()
    }, 50000)
    
    setTimeout(async () => {
      await performanceTestExample()
    }, 65000)
    
    setTimeout(() => {
      console.log('🎉 所有AI集成示例运行完成')
      
      // 最终清理
      setTimeout(() => {
        messageQueueSystem.destroy()
      }, 2000)
    }, 80000)
    
  } catch (error) {
    console.error('❌ AI示例运行失败:', error)
  }
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.runAIChatExample = aiChatExample
  window.runMultiSessionExample = multiSessionExample
  window.runSessionMonitoringExample = sessionMonitoringExample
  window.runErrorHandlingExample = errorHandlingExample
  window.runPerformanceTestExample = performanceTestExample
  window.runAllAIExamples = runAllAIExamples
} else if (typeof global !== 'undefined') {
  // Node.js环境
  global.runAIChatExample = aiChatExample
  global.runMultiSessionExample = multiSessionExample
  global.runSessionMonitoringExample = sessionMonitoringExample
  global.runErrorHandlingExample = errorHandlingExample
  global.runPerformanceTestExample = performanceTestExample
  global.runAllAIExamples = runAllAIExamples
}
