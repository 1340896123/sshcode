/**
 * 消息类型定义
 */

// 消息类型枚举
export const MessageTypes = {
  // AI对话相关
  AI_CHAT: 'ai_chat',
  AI_RESPONSE: 'ai_response',
  TOOL_CALL: 'tool_call',
  TOOL_CALL_RESULT: 'tool_call_result',
  
  // SSH和终端相关
  SSH_COMMAND: 'ssh_command',
  SSH_OUTPUT: 'ssh_output',
  TERMINAL_INPUT: 'terminal_input',
  TERMINAL_OUTPUT: 'terminal_output',
  
  // 连接管理
  CONNECTION_CONNECT: 'connection_connect',
  CONNECTION_DISCONNECT: 'connection_disconnect',
  CONNECTION_STATUS: 'connection_status',
  
  // 系统事件
  SYSTEM_EVENT: 'system_event',
  SYSTEM_ERROR: 'system_error',
  SYSTEM_NOTIFICATION: 'system_notification',
  
  // 用户操作
  USER_ACTION: 'user_action',
  USER_INPUT: 'user_input',
  
  // 文件操作
  FILE_OPERATION: 'file_operation',
  FILE_UPLOAD: 'file_upload',
  FILE_DOWNLOAD: 'file_download',
  
  // 队列管理
  QUEUE_STATS: 'queue_stats',
  QUEUE_HEALTH: 'queue_health'
}

// 消息优先级
export const Priority = {
  CRITICAL: 0,    // 系统关键事件（错误、断开连接等）
  HIGH: 1,        // 用户交互（点击、输入等）
  NORMAL: 2,      // AI对话、命令执行
  LOW: 3          // 后台任务（日志收集、统计等）
}

// 消息状态
export const MessageStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

// 获取消息类型的默认优先级
export const getDefaultPriority = (messageType) => {
  const priorityMap = {
    [MessageTypes.SYSTEM_ERROR]: Priority.CRITICAL,
    [MessageTypes.CONNECTION_DISCONNECT]: Priority.CRITICAL,
    [MessageTypes.USER_ACTION]: Priority.HIGH,
    [MessageTypes.USER_INPUT]: Priority.HIGH,
    [MessageTypes.AI_CHAT]: Priority.NORMAL,
    [MessageTypes.TOOL_CALL]: Priority.NORMAL,
    [MessageTypes.SSH_COMMAND]: Priority.NORMAL,
    [MessageTypes.SYSTEM_NOTIFICATION]: Priority.LOW,
    [MessageTypes.QUEUE_STATS]: Priority.LOW
  }
  
  return priorityMap[messageType] || Priority.NORMAL
}
