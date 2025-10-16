/**
 * AI助手模块
 *
 * 提供AI聊天、命令执行建议、智能分析等功能
 */

// 组件
export { default as AIAssistant } from './components/AIAssistant.vue';

// AI子组件
export { default as CommandExecution } from './components/ai/CommandExecution.vue';

// Composables
export { default as useAIChat } from './composables/useAIChat.ts';

// Store
export { useAIStore } from './stores/ai.js';

// 工具函数
export * from './utils/index.js';

// 常量
export * from './constants/index.js';

// 样式
export { default as AIAssistantStyles } from './styles/index.js';
