/**
 * AI助手相关常量配置
 */

// 类型定义
export interface QuickAction {
  id: string;
  command: string;
  label: string;
  title: string;
  icon: string;
}

export interface ThemeConfig {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface SecurityConfig {
  ALLOWED_COMMANDS: string[];
  BLOCKED_COMMANDS: string[];
  MAX_COMMAND_LENGTH: number;
  DANGEROUS_PATTERNS: RegExp[];
}

// 快捷操作配置
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'sysinfo',
    command: '请帮我查看当前系统的基本信息，包括操作系统版本、内存使用情况和磁盘空间',
    label: '系统信息',
    title: '查看系统信息',
    icon: '🔍'
  },
  {
    id: 'diskusage',
    command: '分析当前目录的磁盘使用情况，找出占用空间最大的文件和目录',
    label: '磁盘分析',
    title: '分析磁盘使用',
    icon: '💾'
  },
  {
    id: 'processes',
    command: '显示当前正在运行的进程，按CPU或内存使用率排序',
    label: '进程监控',
    title: '查看运行进程',
    icon: '⚡'
  },
  {
    id: 'network',
    command: '检查网络连接状态，包括网络接口信息和开放的端口',
    label: '网络状态',
    title: '检查网络连接',
    icon: '🌐'
  }
]

// 消息类型
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
}

// 操作类型
export const ACTION_TYPES = {
  COMMAND: 'command',
  PROMPT: 'prompt',
  LINK: 'link'
}

// AI状态
export const AI_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  PROCESSING: 'processing',
  ERROR: 'error'
}

// 通知类型
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info'
}

// 导出格式
export const EXPORT_FORMATS = {
  TEXT: 'text',
  JSON: 'json',
  MARKDOWN: 'markdown'
}

// 文件大小限制
export const FILE_SIZE_LIMITS = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_EXPORT_SIZE: 1024 * 1024 * 10, // 10MB
  MAX_LOG_SIZE: 1024 * 1024 * 5 // 5MB
}

// 时间配置
export const TIME_CONFIG = {
  COMMAND_TIMEOUT: 30000, // 30秒
  TYPING_INDICATOR_DELAY: 500, // 500ms
  SCROLL_DELAY: 100, // 100ms
  AUTO_SAVE_INTERVAL: 60000 // 1分钟
}

// 主题配置
export const THEME_CONFIG: Record<string, ThemeConfig> = {
  DARK: {
    background: '#1a1a1a',
    surface: '#2a2a2a',
    primary: '#3b82f6',
    secondary: '#4ade80',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#3a3a3a'
  },
  LIGHT: {
    background: '#ffffff',
    surface: '#f5f5f5',
    primary: '#2563eb',
    secondary: '#22c55e',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb'
  }
}

// 键盘快捷键
export const KEYBOARD_SHORTCUTS = {
  SEND_MESSAGE: 'Enter',
  NEW_LINE: 'Shift+Enter',
  CLEAR_CHAT: 'Ctrl+L',
  EXPORT_CHAT: 'Ctrl+E',
  FOCUS_INPUT: 'Ctrl+/'
}

// 正则表达式模式
export const REGEX_PATTERNS = {
  CODE_BLOCK: /```([^`]+)```/g,
  INLINE_CODE: /`([^`]+)`/g,
  BOLD: /\*\*([^*]+)\*\*/g,
  ITALIC: /\*([^*]+)\*/g,
  LINK: /(https?:\/\/[^\s]+)/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  COMMAND: /^[\w\s\-|&;<>]+$/
}

// 安全配置
export const SECURITY_CONFIG: SecurityConfig = {
  ALLOWED_COMMANDS: [
    'ls', 'pwd', 'cd', 'cat', 'grep', 'find', 'ps', 'top', 'df', 'du', 'free',
    'uname', 'who', 'last', 'ping', 'netstat', 'ss', 'ip', 'tail', 'head',
    'wc', 'sort', 'uniq', 'cut', 'awk', 'sed', 'date', 'uptime', 'which'
  ],
  BLOCKED_COMMANDS: [
    'rm', 'dd', 'mkfs', 'fdisk', 'reboot', 'shutdown', 'halt', 'poweroff',
    'passwd', 'su', 'sudo', 'chmod', 'chown', 'crontab', 'iptables'
  ],
  MAX_COMMAND_LENGTH: 1000,
  DANGEROUS_PATTERNS: [
    /rm\s+-rf\s+\//,
    /dd\s+if=/,
    /mkfs/,
    /shutdown/,
    /reboot/,
    /passwd/,
    />\s*\/etc\//
  ]
}

// API配置
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT_DELAY: 1000
}

// 本地存储键名
export const STORAGE_KEYS = {
  AI_CONFIG: 'ai-config',
  CHAT_HISTORY: 'chat-history',
  USER_PREFERENCES: 'user-preferences',
  THEME: 'theme',
  LANGUAGE: 'language'
}

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  API_ERROR: 'AI服务暂时不可用，请稍后重试',
  TIMEOUT_ERROR: '请求超时，请重试',
  PERMISSION_ERROR: '权限不足，无法执行此操作',
  INVALID_COMMAND: '无效的命令格式',
  COMMAND_FAILED: '命令执行失败',
  EXPORT_FAILED: '导出失败，请重试',
  FILE_TOO_LARGE: '文件过大，无法处理',
  INVALID_INPUT: '输入内容无效'
}

// 成功消息
export const SUCCESS_MESSAGES = {
  COMMAND_EXECUTED: '命令执行成功',
  CHAT_CLEARED: '对话已清空',
  CHAT_EXPORTED: '对话已导出',
  CONFIG_SAVED: '配置已保存',
  FILE_UPLOADED: '文件上传成功',
  CONNECTION_ESTABLISHED: '连接已建立'
}

// 默认配置
export const DEFAULT_CONFIG = {
  theme: 'dark',
  language: 'zh-CN',
  autoSave: true,
  showNotifications: true,
  enableSounds: false,
  maxMessages: 100,
  exportFormat: 'text'
}
