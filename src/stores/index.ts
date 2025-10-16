/**
 * Stores入口文件
 * 统一导出所有Pinia stores
 */

export { useAIStore } from '../modules/ai-assistant/stores/ai.js';
export { useTerminalStore } from '../modules/terminal/stores/terminal.js';

// 为了方便使用，也导出默认的stores
import { useAIStore } from '../modules/ai-assistant/stores/ai.js';
import { useTerminalStore } from '../modules/terminal/stores/terminal.js';

export default {
  useAIStore,
  useTerminalStore
};
