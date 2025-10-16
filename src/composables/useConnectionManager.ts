import { ref, reactive, type Ref } from 'vue';
import { useSSHConnectionPool } from './useSSHConnectionPool.js';
import type { SessionData, Connection, SystemInfo, NetworkHistory } from '@/types/index.js';
import type { TerminalOutputLine, SystemDataFromPool } from '@/types/terminal.js';
import { formatBytes } from '@/utils/formatters.js';

interface ConnectionManagerEmits {
  (e: 'show-notification', message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
}

export function useConnectionManager(emit: ConnectionManagerEmits) {
  // 状态管理
  const activeConnections: Ref<Connection[]> = ref([]);
  const activeTabId: Ref<string | null> = ref(null);
  const connectionTimers: Ref<Map<string, NodeJS.Timeout>> = ref(new Map());
  const systemMonitorTimers: Ref<Map<string, NodeJS.Timeout>> = ref(new Map());

  // SSH连接池
  const {
    createPersistentConnection,
    executeBatchCommand,
    checkConnectionHealth: checkPoolHealth,
    closePersistentConnection,
    getConnectionStatus,
    startCleanupTimer
  } = useSSHConnectionPool();

  // 启动连接池清理
  startCleanupTimer();

  // 添加新的SSH连接
  const addConnection = async (sessionData: SessionData): Promise<void> => {
    console.log('➕ [CONNECTION-MANAGER] 添加新连接到activeConnections:', {
      name: sessionData.name,
      id: sessionData.id
    });

    // 使用 reactive 确保连接对象的响应式
    const connection: Connection = reactive({
      id: sessionData.id,
      name: sessionData.name,
      host: sessionData.host,
      port: sessionData.port || 22,
      username: sessionData.username,
      authType: sessionData.authType,
      password: sessionData.password,
      keyPath: sessionData.keyPath,
      keyContent: sessionData.keyContent,
      status: 'connecting',
      connected: false,
      connectStep: 0,
      errorMessage: null,
      connectedAt: null,
      terminalOutput: [],
      currentCommand: '',
      showAutocomplete: false,
      lastActivity: new Date(),
      activePanel: 'terminal',
      systemInfo: {
        cpu: 0,
        memory: 0,
        disk: 0,
        networkUp: 0,
        networkDown: 0,
        lastUpdate: null
      }
    });

    console.log(
      '📋 [CONNECTION-MANAGER] 连接对象创建完成，当前连接数:',
      activeConnections.value.length
    );
    activeConnections.value.push(connection);
    activeTabId.value = connection.id;

    console.log('🎯 [CONNECTION-MANAGER] 设置活动标签页为:', connection.id);

    // 开始连接过程
    await establishConnection(connection);
  };

  // 建立SSH连接
  const establishConnection = async (connection: Connection): Promise<void> => {
    console.log('🔄 [CONNECTION-MANAGER] 开始建立SSH连接:', {
      id: connection.id,
      name: connection.name,
      host: connection.host,
      username: connection.username,
      authType: connection.authType
    });

    try {
      connection.status = 'connecting';
      connection.connectStep = 1;
      connection.errorMessage = null;

      console.log('📱 [CONNECTION-MANAGER] 状态更新为connecting，发送通知');
      emit('show-notification', `正在连接到 ${connection.host}...`, 'info');

      // 建立真实SSH连接，不使用模拟步骤
      if (window.electronAPI) {
        console.log('🌐 [CONNECTION-MANAGER] 使用ElectronAPI进行真实SSH连接');

        const connectionParams = {
          id: connection.id,
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.password,
          privateKey: connection.keyContent,
          authType: connection.authType
        };

        console.log('📤 [CONNECTION-MANAGER] 发送SSH连接参数:', {
          id: connectionParams.id,
          host: connectionParams.host,
          port: connectionParams.port,
          username: connectionParams.username,
          authType: connectionParams.authType,
          hasPassword: !!connectionParams.password,
          hasPrivateKey: !!connectionParams.privateKey
        });

        const result = await window.electronAPI.sshConnect(connectionParams);

        console.log('📥 [CONNECTION-MANAGER] SSH连接结果:', {
          success: result.success,
          message: result.message,
          error: result.error
        });

        if (result.success) {
          console.log('🎉 [CONNECTION-MANAGER] SSH连接成功，更新状态');
          connection.status = 'connected';
          connection.connectedAt = new Date();
          connection.errorMessage = null;

          // 创建持久连接池条目
          try {
            await createPersistentConnection(connection.id, connectionParams);
            console.log('🔗 [CONNECTION-MANAGER] 持久连接池创建成功');
          } catch (poolError: Error) {
            console.warn(
              '⚠️ [CONNECTION-MANAGER] 持久连接池创建失败，使用普通模式:',
              poolError.message
            );
          }

          addTerminalOutput(connection, {
            type: 'success',
            content: `成功连接到 ${connection.host}`,
            timestamp: new Date()
          });

          addTerminalOutput(connection, {
            type: 'info',
            content: `欢迎 ${connection.username}@${connection.host}`,
            timestamp: new Date()
          });

          emit('show-notification', `已连接到 ${connection.name}`, 'success');

          // 启动连接监控
          startConnectionMonitoring(connection);
          console.log('👁️ [CONNECTION-MANAGER] 连接监控已启动');

          // 启动系统监控
          startSystemMonitoring(connection);
          console.log('📊 [CONNECTION-MANAGER] 系统监控已启动');
        } else {
          console.error('💥 [CONNECTION-MANAGER] SSH连接失败:', result.error);
          connection.status = 'failed';
          connection.errorMessage = result.error;

          addTerminalOutput(connection, {
            type: 'error',
            content: `连接失败: ${result.error}`,
            timestamp: new Date()
          });

          emit('show-notification', `连接失败: ${result.error}`, 'error');
        }
      } else {
        console.error('💥 [CONNECTION-MANAGER] ElectronAPI不可用，无法建立SSH连接');
        connection.status = 'failed';
        connection.errorMessage = 'ElectronAPI不可用，请在Electron环境中运行应用';

        addTerminalOutput(connection, {
          type: 'error',
          content: '连接失败: ElectronAPI不可用，请在Electron环境中运行应用',
          timestamp: new Date()
        });

        emit('show-notification', 'ElectronAPI不可用，请在Electron环境中运行应用', 'error');
      }
    } catch (error: Error) {
      console.error('💥 [CONNECTION-MANAGER] 连接异常:', error);
      connection.status = 'failed';
      connection.errorMessage = error.message;

      addTerminalOutput(connection, {
        type: 'error',
        content: `连接异常: ${error.message}`,
        timestamp: new Date()
      });

      emit('show-notification', `连接异常: ${error.message}`, 'error');
    }

    console.log('🏁 [CONNECTION-MANAGER] 连接尝试完成，最终状态:', connection.status);
  };

  // 取消连接
  const cancelConnection = async (connectionId: string): Promise<void> => {
    const connection = activeConnections.value.find(c => c.id === connectionId);
    if (!connection || connection.status !== 'connecting') return;

    console.log('❌ [CONNECTION-MANAGER] 取消连接:', connectionId);

    connection.status = 'cancelled';
    connection.errorMessage = '用户取消了连接';

    addTerminalOutput(connection, {
      type: 'warning',
      content: '连接已被用户取消',
      timestamp: new Date()
    });

    emit('show-notification', `已取消连接到 ${connection.name}`, 'info');

    // 停止任何进行中的连接尝试
    if (window.electronAPI) {
      try {
        await window.electronAPI.sshDisconnect(connectionId);
      } catch (error: Error) {
        console.log('取消连接时清理资源:', error.message);
      }
    }
  };

  // 添加终端输出
  const addTerminalOutput = (connection: Connection, line: TerminalOutputLine): void => {
    connection.terminalOutput.push(line);

    // 限制输出历史记录
    if (connection.terminalOutput.length > 1000) {
      connection.terminalOutput = connection.terminalOutput.slice(-500);
    }
  };

  // 切换标签
  const switchTab = (connectionId: string): void => {
    activeTabId.value = connectionId;
    const connection = activeConnections.value.find(c => c.id === connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  };

  // 断开连接
  const disconnectConnection = async (connectionId: string): Promise<void> => {
    const connection = activeConnections.value.find(c => c.id === connectionId);
    if (!connection) return;

    try {
      connection.status = 'disconnected';

      // 关闭连接池中的持久连接
      try {
        await closePersistentConnection(connectionId);
        console.log('🔌 [CONNECTION-MANAGER] 持久连接已关闭:', connectionId);
      } catch (poolError: Error) {
        console.warn('⚠️ [CONNECTION-MANAGER] 关闭持久连接失败:', poolError.message);
      }

      if (window.electronAPI) {
        await window.electronAPI.sshDisconnect(connectionId);
      }

      addTerminalOutput(connection, {
        type: 'info',
        content: '连接已断开',
        timestamp: new Date()
      });

      emit('show-notification', `已断开 ${connection.name} 的连接`, 'info');

      // 停止连接监控
      stopConnectionMonitoring(connectionId);

      // 停止系统监控
      stopSystemMonitoring(connectionId);
    } catch (error: Error) {
      emit('show-notification', `断开连接失败: ${error.message}`, 'error');
    }
  };

  // 重新连接
  const reconnectConnection = async (connection: Connection): Promise<void> => {
    // 先关闭现有的持久连接
    try {
      await closePersistentConnection(connection.id);
    } catch (error: Error) {
      console.warn('⚠️ [CONNECTION-MANAGER] 重新连接时关闭持久连接失败:', error.message);
    }

    await establishConnection(connection);
  };

  // 关闭连接
  const closeConnection = async (connectionId: string): Promise<void> => {
    const connection = activeConnections.value.find(c => c.id === connectionId);
    if (!connection) return;

    // 先断开连接
    if (connection.status === 'connected') {
      await disconnectConnection(connectionId);
    }

    // 确保连接池也被清理
    try {
      await closePersistentConnection(connectionId);
    } catch (error: Error) {
      console.warn('⚠️ [CONNECTION-MANAGER] 关闭连接时清理连接池失败:', error.message);
    }

    // 移除连接
    const index = activeConnections.value.findIndex(c => c.id === connectionId);
    if (index > -1) {
      activeConnections.value.splice(index, 1);
    }

    // 如果关闭的是当前活动标签，切换到其他标签
    if (activeTabId.value === connectionId) {
      // 重新计算剩余的连接数量（在splice之后）
      const remainingConnections = activeConnections.value.filter(c => c.id !== connectionId);
      if (remainingConnections.length > 0) {
        // 切换到最后一个连接
        activeTabId.value = remainingConnections[remainingConnections.length - 1].id;
        console.log(`🔄 [CONNECTION-MANAGER] 切换到标签: ${activeTabId.value}`);
      } else {
        // 没有剩余连接时，清空活动标签
        activeTabId.value = null;
        console.log(`🏠 [CONNECTION-MANAGER] 所有标签已关闭，回到首页`);
      }
    }

    emit('show-notification', `已关闭 ${connection.name}`, 'info');
  };

  // 连接监控
  const startConnectionMonitoring = (connection: Connection): void => {
    const timer = setInterval(() => {
      if (connection.status === 'connected') {
        // 检查连接状态
        checkConnectionHealth(connection);
      }
    }, 30000); // 每30秒检查一次

    connectionTimers.value.set(connection.id, timer);
  };

  const stopConnectionMonitoring = (connectionId: string): void => {
    const timer = connectionTimers.value.get(connectionId);
    if (timer) {
      clearInterval(timer);
      connectionTimers.value.delete(connectionId);
    }
  };

  const checkConnectionHealth = async (connection: Connection): Promise<void> => {
    try {
      if (window.electronAPI) {
        // 发送心跳命令检查连接状态
        await window.electronAPI.sshExecute(connection.id, 'echo "heartbeat"');
      }
    } catch (error: Error) {
      connection.status = 'disconnected';
      addTerminalOutput(connection, {
        type: 'warning',
        content: '连接已丢失',
        timestamp: new Date()
      });
      emit('show-notification', `${connection.name} 连接已丢失`, 'warning');
    }
  };

  // 系统监控
  const startSystemMonitoring = (connection: Connection): void => {
    // 初始化网络数据历史记录
    if (!connection.networkHistory) {
      connection.networkHistory = {
        lastNetworkDown: 0,
        lastNetworkUp: 0,
        lastUpdateTime: Date.now()
      };
    }

    // 立即获取一次系统信息
    updateSystemInfo(connection);

    // 每秒更新一次系统信息
    const timer = setInterval(() => {
      if (connection.status === 'connected') {
        updateSystemInfo(connection);
      }
    }, 1000);

    systemMonitorTimers.value.set(connection.id, timer);
  };

  const stopSystemMonitoring = (connectionId: string): void => {
    const timer = systemMonitorTimers.value.get(connectionId);
    if (timer) {
      clearInterval(timer);
      systemMonitorTimers.value.delete(connectionId);
    }
  };

  const updateSystemInfo = async (connection: Connection): Promise<void> => {
    try {
      if (connection.status !== 'connected') {
        return;
      }

      // 优先使用连接池
      const poolStatus = getConnectionStatus(connection.id);
      if (poolStatus && poolStatus.status === 'connected') {
        // 使用连接池批量获取系统信息
        const systemData = await executeBatchCommand(connection.id);
        if (systemData) {
          const processedInfo = processSystemData(connection, systemData);
          connection.systemInfo = {
            ...processedInfo,
            lastUpdate: new Date()
          };
          return;
        }
      }
    } catch (error: Error) {
      console.error('💥 [CONNECTION-MANAGER] 获取系统信息失败:', error);
      // 设置默认值，避免界面显示异常
      connection.systemInfo = {
        cpu: 0,
        memory: 0,
        disk: 0,
        networkDown: 0,
        networkUp: 0,
        lastUpdate: new Date()
      };
    }
  };

  // 处理从连接池获取的系统数据
  const processSystemData = (
    connection: Connection,
    systemData: SystemDataFromPool
  ): SystemInfo => {
    // 初始化网络历史记录
    if (!connection.networkHistory) {
      connection.networkHistory = {
        lastNetworkDown: 0,
        lastNetworkUp: 0,
        lastUpdateTime: Date.now()
      };
    }

    const currentNetworkDown = systemData.networkDown || 0;
    const currentNetworkUp = systemData.networkUp || 0;
    const currentTime = systemData.timestamp * 1000 || Date.now();

    // 计算网络速率
    let networkDownRate = 0;
    let networkUpRate = 0;

    if (connection.networkHistory.lastUpdateTime > 0) {
      const timeDiff = (currentTime - connection.networkHistory.lastUpdateTime) / 1000;

      if (timeDiff > 0) {
        const downDiff = currentNetworkDown - connection.networkHistory.lastNetworkDown;
        const upDiff = currentNetworkUp - connection.networkHistory.lastNetworkUp;

        networkDownRate = Math.max(0, Math.round(downDiff / timeDiff));
        networkUpRate = Math.max(0, Math.round(upDiff / timeDiff));
      }
    }

    // 更新网络历史记录
    connection.networkHistory = {
      lastNetworkDown: currentNetworkDown,
      lastNetworkUp: currentNetworkUp,
      lastUpdateTime: currentTime
    };

    return {
      cpu: Math.round(systemData.cpu || 0),
      memory: Math.round(systemData.memory || 0),
      disk: Math.round(systemData.disk || 0),
      networkDown: networkDownRate,
      networkUp: networkUpRate
    };
  };

  // 处理外部连接请求
  const handleSessionConnected = (sessionData: SessionData): void => {
    console.log('📬 [CONNECTION-MANAGER] 收到handleSessionConnected调用:', {
      name: sessionData.name,
      id: sessionData.id,
      host: sessionData.host
    });
    addConnection(sessionData);
  };

  return {
    // 状态
    activeConnections,
    activeTabId,
    connectionTimers,
    systemMonitorTimers,

    // 方法
    addConnection,
    handleSessionConnected,
    switchTab,
    closeConnection,
    disconnectConnection,
    reconnectConnection,
    cancelConnection,
    startConnectionMonitoring,
    stopConnectionMonitoring,
    startSystemMonitoring,
    stopSystemMonitoring,
    addTerminalOutput,
    updateSystemInfo,
    formatBytes
  };
}
