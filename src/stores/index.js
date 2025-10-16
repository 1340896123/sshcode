/**
 * Stores入口文件
 * 统一导出所有Pinia stores
 */

export { useAIStore } from './ai.js';
export { useTerminalStore } from './terminal.js';

// 为了方便使用，也导出默认的stores
import { useAIStore } from './ai.js';
import { useTerminalStore } from './terminal.js';

export default {
  useAIStore,
  useTerminalStore
};
