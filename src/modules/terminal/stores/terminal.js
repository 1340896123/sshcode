/**
 * 终端状态管理Store
 * 使用Pinia管理终端状态，替代window事件通信
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useTerminalStore = defineStore('terminal', () => {
  // 状态
  const connections = ref(new Map()); // 连接状态
  const activeCommands = ref(new Map()); // 活跃命令
  const commandHistory = ref(new Map()); // 命令历史
  const terminals = ref(new Map()); // 终端实例

  // 计算属性
  const getConnections = computed(() => Array.from(connections.value.values()));
  const getConnectionById = computed(() => id => connections.value.get(id));
  const getActiveCommands = computed(() => Array.from(activeCommands.value.values()));
  const getCommandHistory = computed(
    () => connectionId => commandHistory.value.get(connectionId) || []
  );

  // 连接管理
  const addConnection = connection => {
    connections.value.set(connection.id, connection);
    commandHistory.value.set(connection.id, []);
    console.log(`🔗 [TERMINAL-STORE] 添加连接:`, connection.id);
  };

  const removeConnection = connectionId => {
    connections.value.delete(connectionId);
    activeCommands.value.delete(connectionId);
    commandHistory.value.delete(connectionId);
    terminals.value.delete(connectionId);
    console.log(`🗑️ [TERMINAL-STORE] 移除连接:`, connectionId);
  };

  const updateConnection = (connectionId, updates) => {
    const connection = connections.value.get(connectionId);
    if (connection) {
      Object.assign(connection, updates);
      console.log(`📝 [TERMINAL-STORE] 更新连接:`, { connectionId, updates });
    }
  };

  // 命令管理
  const startCommand = commandData => {
    const { commandId, command, connectionId, timestamp = Date.now() } = commandData;

    const commandInfo = {
      id: commandId,
      command,
      connectionId,
      status: 'executing',
      startTime: timestamp,
      result: null,
      error: null,
      endTime: null,
      executionTime: 0
    };

    activeCommands.value.set(commandId, commandInfo);

    const history = commandHistory.value.get(connectionId) || [];
    history.push(commandInfo);
    commandHistory.value.set(connectionId, history);

    console.log(`🚀 [TERMINAL-STORE] 开始执行命令:`, { commandId, command, connectionId });
  };

  const completeCommand = commandData => {
    const { commandId, result } = commandData;
    const commandInfo = activeCommands.value.get(commandId);

    if (commandInfo) {
      commandInfo.status = 'completed';
      commandInfo.result = result;
      commandInfo.endTime = Date.now();
      commandInfo.executionTime = commandInfo.endTime - commandInfo.startTime;

      activeCommands.value.delete(commandId);

      console.log(`✅ [TERMINAL-STORE] 命令执行完成:`, {
        commandId,
        executionTime: commandInfo.executionTime
      });
    }
  };

  const errorCommand = commandData => {
    const { commandId, error } = commandData;
    const commandInfo = activeCommands.value.get(commandId);

    if (commandInfo) {
      commandInfo.status = 'error';
      commandInfo.error = error;
      commandInfo.endTime = Date.now();
      commandInfo.executionTime = commandInfo.endTime - commandInfo.startTime;

      activeCommands.value.delete(commandId);

      console.log(`❌ [TERMINAL-STORE] 命令执行失败:`, { commandId, error });
    }
  };

  // 终端输出管理
  const addTerminalOutput = (connectionId, output) => {
    const connection = connections.value.get(connectionId);
    if (connection) {
      if (!connection.outputs) {
        connection.outputs = [];
      }
      connection.outputs.push({
        ...output,
        timestamp: output.timestamp || Date.now()
      });

      // 限制输出历史长度
      if (connection.outputs.length > 1000) {
        connection.outputs = connection.outputs.slice(-800);
      }

      console.log(`📡 [TERMINAL-STORE] 添加终端输出:`, { connectionId, type: output.type });
    }
  };

  const clearTerminalOutput = connectionId => {
    const connection = connections.value.get(connectionId);
    if (connection) {
      connection.outputs = [];
      console.log(`🧹 [TERMINAL-STORE] 清空终端输出:`, connectionId);
    }
  };

  // 终端实例管理
  const setTerminal = (connectionId, terminal) => {
    terminals.value.set(connectionId, terminal);
    console.log(`🖥️ [TERMINAL-STORE] 设置终端实例:`, connectionId);
  };

  const removeTerminal = connectionId => {
    terminals.value.delete(connectionId);
    console.log(`🗑️ [TERMINAL-STORE] 移除终端实例:`, connectionId);
  };

  // 获取统计信息
  const getConnectionStats = computed(() => {
    const stats = {};
    for (const [id, connection] of connections.value.entries()) {
      const history = commandHistory.value.get(id) || [];
      const successful = history.filter(cmd => cmd.status === 'completed').length;
      const failed = history.filter(cmd => cmd.status === 'error').length;
      const totalExecutionTime = history.reduce((sum, cmd) => sum + (cmd.executionTime || 0), 0);

      stats[id] = {
        totalCommands: history.length,
        successfulCommands: successful,
        failedCommands: failed,
        successRate: history.length > 0 ? (successful / history.length) * 100 : 0,
        avgExecutionTime: history.length > 0 ? totalExecutionTime / history.length : 0,
        outputLines: connection.outputs?.length || 0
      };
    }
    return stats;
  });

  // 获取活跃命令数量
  const getActiveCommandCount = computed(() => activeCommands.value.size);

  // 清理资源
  const clearAll = () => {
    connections.value.clear();
    activeCommands.value.clear();
    commandHistory.value.clear();
    terminals.value.clear();
    console.log(`🧹 [TERMINAL-STORE] 清空所有终端数据`);
  };

  return {
    // 状态
    connections,
    activeCommands,
    commandHistory,
    terminals,

    // 计算属性
    getConnections,
    getConnectionById,
    getActiveCommands,
    getCommandHistory,
    getConnectionStats,
    getActiveCommandCount,

    // 连接管理
    addConnection,
    removeConnection,
    updateConnection,

    // 命令管理
    startCommand,
    completeCommand,
    errorCommand,

    // 输出管理
    addTerminalOutput,
    clearTerminalOutput,

    // 终端实例管理
    setTerminal,
    removeTerminal,

    // 清理方法
    clearAll
  };
});
