/**
 * SSH终端超时管理器
 * 负责监控SSH连接的空闲状态并在超时时自动断开连接
 */

export class TerminalTimeoutManager {
  constructor() {
    this.connections = new Map(); // 存储连接的超时信息
    this.warningTimers = new Map(); // 存储警告定时器
    this.timeoutTimers = new Map(); // 存储超时定时器
    this.defaultIdleTimeout = 600000; // 默认10分钟超时 (毫秒)
    this.defaultWarningTime = 30000; // 默认30秒警告 (毫秒)
  }

  /**
   * 初始化连接的超时监控
   * @param {string} connectionId - 连接ID
   * @param {Object} config - 超时配置
   * @param {Function} onWarning - 警告回调
   * @param {Function} onTimeout - 超时回调
   */
  initConnection(connectionId, config = {}, onWarning, onTimeout) {
    console.log(`⏰ [Timeout Manager] 初始化连接超时监控:`, {
      connectionId,
      idleTimeout: config.idleTimeout || this.defaultIdleTimeout,
      warningTime: config.timeoutWarning || this.defaultWarningTime
    });

    // 清理现有的定时器
    this.clearConnection(connectionId);

    const idleTimeout = config.idleTimeout || this.defaultIdleTimeout;
    const warningTime = config.timeoutWarning || this.defaultWarningTime;

    // 存储连接信息
    this.connections.set(connectionId, {
      idleTimeout,
      warningTime,
      onWarning,
      onTimeout,
      lastActivity: Date.now(),
      isActive: true
    });

    // 设置超时定时器
    this.setupTimers(connectionId);
  }

  /**
   * 更新连接的活动状态
   * @param {string} connectionId - 连接ID
   */
  updateActivity(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return;

    const now = Date.now();
    const timeSinceLastActivity = now - connection.lastActivity;

    console.log(`🔄 [Timeout Manager] 更新连接活动状态:`, {
      connectionId,
      timeSinceLastActivity: `${Math.round(timeSinceLastActivity / 1000)}s`,
      newActivity: true
    });

    connection.lastActivity = now;

    // 重置定时器
    this.resetTimers(connectionId);
  }

  /**
   * 设置定时器
   * @param {string} connectionId - 连接ID
   */
  setupTimers(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { idleTimeout, warningTime, onWarning, onTimeout } = connection;

    // 设置警告定时器
    if (warningTime > 0 && onWarning) {
      const warningTimer = setTimeout(() => {
        if (this.connections.has(connectionId)) {
          console.log(`⚠️ [Timeout Manager] 发送超时警告:`, connectionId);
          onWarning(connectionId, {
            connectionId,
            remainingTime: warningTime / 1000,
            message: `连接将在 ${Math.round(warningTime / 1000)} 秒后因空闲而断开`
          });
        }
      }, idleTimeout - warningTime);

      this.warningTimers.set(connectionId, warningTimer);
    }

    // 设置超时定时器
    const timeoutTimer = setTimeout(() => {
      if (this.connections.has(connectionId)) {
        console.log(`⏰ [Timeout Manager] 连接超时，准备断开:`, connectionId);
        onTimeout(connectionId, {
          connectionId,
          idleTime: idleTimeout / 1000,
          message: `连接因空闲 ${Math.round(idleTimeout / 1000)} 秒而自动断开`
        });
        this.clearConnection(connectionId);
      }
    }, idleTimeout);

    this.timeoutTimers.set(connectionId, timeoutTimer);
  }

  /**
   * 重置定时器
   * @param {string} connectionId - 连接ID
   */
  resetTimers(connectionId) {
    // 清除现有定时器
    this.clearTimers(connectionId);

    // 重新设置定时器
    this.setupTimers(connectionId);
  }

  /**
   * 清除特定连接的定时器
   * @param {string} connectionId - 连接ID
   */
  clearTimers(connectionId) {
    // 清除警告定时器
    if (this.warningTimers.has(connectionId)) {
      clearTimeout(this.warningTimers.get(connectionId));
      this.warningTimers.delete(connectionId);
    }

    // 清除超时定时器
    if (this.timeoutTimers.has(connectionId)) {
      clearTimeout(this.timeoutTimers.get(connectionId));
      this.timeoutTimers.delete(connectionId);
    }
  }

  /**
   * 暂停连接的超时监控
   * @param {string} connectionId - 连接ID
   */
  pauseConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    console.log(`⏸️ [Timeout Manager] 暂停连接超时监控:`, connectionId);

    connection.isActive = false;
    this.clearTimers(connectionId);
  }

  /**
   * 恢复连接的超时监控
   * @param {string} connectionId - 连接ID
   */
  resumeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    console.log(`▶️ [Timeout Manager] 恢复连接超时监控:`, connectionId);

    connection.isActive = true;
    connection.lastActivity = Date.now();
    this.setupTimers(connectionId);
  }

  /**
   * 完全清理连接
   * @param {string} connectionId - 连接ID
   */
  clearConnection(connectionId) {
    console.log(`🗑️ [Timeout Manager] 清理连接超时监控:`, connectionId);

    this.clearTimers(connectionId);
    this.connections.delete(connectionId);
  }

  /**
   * 获取连接状态信息
   * @param {string} connectionId - 连接ID
   * @returns {Object} 连接状态信息
   */
  getConnectionStatus(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    const now = Date.now();
    const idleTime = now - connection.lastActivity;
    const remainingTime = connection.idleTimeout - idleTime;

    return {
      connectionId,
      isActive: connection.isActive,
      idleTime: Math.round(idleTime / 1000),
      remainingTime: Math.max(0, Math.round(remainingTime / 1000)),
      idleTimeout: connection.idleTimeout / 1000,
      warningTime: connection.warningTime / 1000,
      willTimeoutSoon: remainingTime <= connection.warningTime && remainingTime > 0
    };
  }

  /**
   * 获取所有连接状态
   * @returns {Array} 所有连接的状态信息
   */
  getAllConnectionsStatus() {
    return Array.from(this.connections.keys()).map(id => this.getConnectionStatus(id));
  }

  /**
   * 更新连接配置
   * @param {string} connectionId - 连接ID
   * @param {Object} newConfig - 新配置
   */
  updateConnectionConfig(connectionId, newConfig) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    console.log(`⚙️ [Timeout Manager] 更新连接配置:`, {
      connectionId,
      oldConfig: {
        idleTimeout: connection.idleTimeout,
        warningTime: connection.warningTime
      },
      newConfig
    });

    // 更新配置
    Object.assign(connection, newConfig);

    // 如果连接处于活动状态，重新设置定时器
    if (connection.isActive) {
      this.resetTimers(connectionId);
    }
  }

  /**
   * 清理所有连接
   */
  clearAllConnections() {
    console.log(`🗑️ [Timeout Manager] 清理所有连接超时监控`);

    // 清除所有定时器
    for (const timer of this.warningTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.timeoutTimers.values()) {
      clearTimeout(timer);
    }

    // 清空所有映射
    this.connections.clear();
    this.warningTimers.clear();
    this.timeoutTimers.clear();
  }
}

// 创建全局实例
const terminalTimeoutManager = new TerminalTimeoutManager();

// 导出实例和工具函数
export default terminalTimeoutManager;

export const initTerminalTimeout = (connectionId, config, onWarning, onTimeout) => {
  return terminalTimeoutManager.initConnection(connectionId, config, onWarning, onTimeout);
};

export const updateTerminalActivity = connectionId => {
  return terminalTimeoutManager.updateActivity(connectionId);
};

export const pauseTerminalTimeout = connectionId => {
  return terminalTimeoutManager.pauseConnection(connectionId);
};

export const resumeTerminalTimeout = connectionId => {
  return terminalTimeoutManager.resumeTerminalTimeout(connectionId);
};

export const clearTerminalTimeout = connectionId => {
  return terminalTimeoutManager.clearConnection(connectionId);
};

export const getTerminalTimeoutStatus = connectionId => {
  return terminalTimeoutManager.getConnectionStatus(connectionId);
};
