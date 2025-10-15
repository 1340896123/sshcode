/**
 * 基础使用示例
 * 展示消息队列系统的基本功能
 */

import {
  initializeMessageQueueSystem,
  MessageTypes,
  Priority
} from '../index.js'

// 初始化消息队列系统
const messageQueueSystem = initializeMessageQueueSystem({
  queueOptions: {
    maxQueueSize: 1000,
    processingInterval: 100
  },
  enableAI: false, // 基础示例不启用AI
  enableMonitoring: true,
  monitoringOptions: {
    interval: 2000
  }
})

async function basicUsageExample() {
  console.log('🚀 开始基础使用示例')

  // 1. 订阅消息
  const subscriptionId1 = messageQueueSystem.subscribe(MessageTypes.USER_ACTION, (message) => {
    console.log('📨 收到用户操作消息:', message.data)
  })

  const subscriptionId2 = messageQueueSystem.subscribe(MessageTypes.SYSTEM_EVENT, (message) => {
    console.log('📨 收到系统事件消息:', message.data)
  })

  // 2. 发送消息
  console.log('📤 发送用户操作消息')
  messageQueueSystem.sendMessage(MessageTypes.USER_ACTION, {
    action: 'click',
    target: 'button',
    timestamp: Date.now()
  })

  console.log('📤 发送系统事件消息')
  messageQueueSystem.sendMessage(MessageTypes.SYSTEM_EVENT, {
    event: 'startup',
    component: 'message-queue',
    timestamp: Date.now()
  })

  // 3. 发送高优先级消息
  console.log('📤 发送高优先级消息')
  messageQueueSystem.sendMessage(MessageTypes.USER_ACTION, {
    action: 'emergency-stop',
    priority: 'critical'
  }, {
    priority: Priority.CRITICAL
  })

  // 4. 批量发送消息
  console.log('📤 批量发送消息')
  const batchMessages = [
    { type: MessageTypes.USER_ACTION, data: { action: 'scroll' } },
    { type: MessageTypes.USER_ACTION, data: { action: 'hover' } },
    { type: MessageTypes.SYSTEM_EVENT, data: { event: 'heartbeat' } }
  ]

  for (const msg of batchMessages) {
    messageQueueSystem.sendMessage(msg.type, msg.data)
  }

  // 5. 查看队列状态
  setTimeout(() => {
    console.log('📊 队列状态:', messageQueueSystem.getStatus())
  }, 1000)

  // 6. 获取健康状态
  setTimeout(() => {
    console.log('💚 系统健康状态:', messageQueueSystem.getHealthStatus())
  }, 2000)

  // 7. 获取性能报告
  setTimeout(() => {
    console.log('📈 性能报告:', messageQueueSystem.getPerformanceReport(10000))
  }, 3000)

  // 8. 清理
  setTimeout(() => {
    console.log('🧹 清理订阅')
    messageQueueSystem.unsubscribe(subscriptionId1)
    messageQueueSystem.unsubscribe(subscriptionId2)
    
    console.log('✅ 基础使用示例完成')
  }, 5000)
}

// 错误处理示例
async function errorHandlingExample() {
  console.log('🚀 开始错误处理示例')

  // 订阅消息并处理错误
  const subscriptionId = messageQueueSystem.subscribe(MessageTypes.USER_ACTION, async (message) => {
    console.log('📨 处理消息:', message.data)
    
    // 模拟处理错误
    if (message.data.action === 'error') {
      throw new Error('模拟处理错误')
    }
    
    // 模拟处理延迟
    if (message.data.action === 'slow') {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }, {
    onError: (error, message) => {
      console.error('❌ 消息处理错误:', error.message, '消息:', message.data)
    },
    timeout: 1000
  })

  // 发送正常消息
  messageQueueSystem.sendMessage(MessageTypes.USER_ACTION, {
    action: 'normal'
  })

  // 发送会出错的消息
  messageQueueSystem.sendMessage(MessageTypes.USER_ACTION, {
    action: 'error'
  })

  // 发送会超时的消息
  messageQueueSystem.sendMessage(MessageTypes.USER_ACTION, {
    action: 'slow'
  })

  setTimeout(() => {
    messageQueueSystem.unsubscribe(subscriptionId)
    console.log('✅ 错误处理示例完成')
  }, 5000)
}

// 优先级示例
async function priorityExample() {
  console.log('🚀 开始优先级示例')

  // 订阅消息
  const subscriptionId = messageQueueSystem.subscribe(MessageTypes.USER_ACTION, (message) => {
    const priority = message.priority || Priority.NORMAL
    const priorityName = Object.keys(Priority).find(key => Priority[key] === priority)
    console.log(`📨 收到${priorityName}优先级消息:`, message.data)
  })

  // 发送不同优先级的消息
  const messages = [
    { data: { action: 'low' }, priority: Priority.LOW },
    { data: { action: 'normal' }, priority: Priority.NORMAL },
    { data: { action: 'high' }, priority: Priority.HIGH },
    { data: { action: 'critical' }, priority: Priority.CRITICAL }
  ]

  // 乱序发送，验证优先级处理
  messages.reverse().forEach(msg => {
    messageQueueSystem.sendMessage(MessageTypes.USER_ACTION, msg.data, {
      priority: msg.priority
    })
  })

  setTimeout(() => {
    messageQueueSystem.unsubscribe(subscriptionId)
    console.log('✅ 优先级示例完成')
  }, 3000)
}

// 过滤器示例
async function filterExample() {
  console.log('🚀 开始过滤器示例')

  // 订阅消息并使用过滤器
  const subscriptionId = messageQueueSystem.subscribe(MessageTypes.USER_ACTION, (message) => {
    console.log('📨 通过过滤器的消息:', message.data)
  }, {
    filter: (message) => {
      // 只处理点击操作
      return message.data.action === 'click'
    }
  })

  // 发送各种类型的消息
  const actions = ['click', 'scroll', 'hover', 'click', 'focus', 'click']
  actions.forEach(action => {
    messageQueueSystem.sendMessage(MessageTypes.USER_ACTION, { action })
  })

  setTimeout(() => {
    messageQueueSystem.unsubscribe(subscriptionId)
    console.log('✅ 过滤器示例完成')
  }, 2000)
}

// 运行所有示例
export async function runAllExamples() {
  console.log('🎯 开始运行所有示例')
  
  try {
    await basicUsageExample()
    
    setTimeout(async () => {
      await errorHandlingExample()
    }, 6000)
    
    setTimeout(async () => {
      await priorityExample()
    }, 12000)
    
    setTimeout(async () => {
      await filterExample()
    }, 16000)
    
    setTimeout(() => {
      console.log('🎉 所有示例运行完成')
      
      // 最终清理
      setTimeout(() => {
        messageQueueSystem.destroy()
      }, 2000)
    }, 20000)
    
  } catch (error) {
    console.error('❌ 示例运行失败:', error)
  }
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.runBasicUsageExample = basicUsageExample
  window.runErrorHandlingExample = errorHandlingExample
  window.runPriorityExample = priorityExample
  window.runFilterExample = filterExample
  window.runAllExamples = runAllExamples
} else if (typeof global !== 'undefined') {
  // Node.js环境
  global.runBasicUsageExample = basicUsageExample
  global.runErrorHandlingExample = errorHandlingExample
  global.runPriorityExample = priorityExample
  global.runFilterExample = filterExample
  global.runAllExamples = runAllExamples
}
