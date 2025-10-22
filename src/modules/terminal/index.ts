/**
 * 终端管理模块
 *
 * 提供SSH终端连接、命令执行、自动补全等功能
 */

// 组件
export { default as XTerminal } from './components/XTerminal.vue';
export { default as TerminalInput } from './components/TerminalInput.vue';
export { default as TerminalInputBox } from './components/TerminalInputBox.vue';
export { default as TerminalAutocomplete } from './components/TerminalAutocomplete.vue';
export { default as SessionTabs } from './components/SessionTabs.vue';
export { default as SessionTerminal } from './components/SessionTerminal.vue';

// Composables
export { useTerminalManager } from './composables/useTerminalManager.js';

// Store
export { useTerminalStore } from './stores/terminal.js';

// 工具函数将在需要时添加
