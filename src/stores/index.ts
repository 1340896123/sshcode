/**
 * Stores入口文件
 * 统一导出所有Pinia stores
 */

export { useAIStore } from '../modules/ai-assistant/stores/ai';
export { useTerminalStore } from '../modules/terminal/stores/terminal';

// 为了方便使用，也导出默认的stores
import { useAIStore } from '../modules/ai-assistant/stores/ai';
import { useTerminalStore } from '../modules/terminal/stores/terminal';

export default {
  useAIStore,
  useTerminalStore
};
