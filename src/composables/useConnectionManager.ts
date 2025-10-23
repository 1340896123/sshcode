import { ref, reactive, type Ref } from 'vue';
import { useSSHConnectionPool } from './useSSHConnectionPool.js';
import type { SSHConnectionConfig, Connection, SystemInfo, NetworkHistory } from '@/types/ssh.ts';
import type { SystemDataFromPool } from '@/types/terminal.ts';
import { formatBytes } from '@/utils/formatters.js';

interface ConnectionManagerEmits {
  (e: 'show-notification', message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
}

export function useConnectionManager(emit: ConnectionManagerEmits) {
  // 状态管理
  const connections: Ref<Connection[]> = ref([]);
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

  // 添加新的连接配置
  const addConnection = async (connectionConfig: SSHConnectionConfig): Promise<void> => {
    console.log('➕ [CONNECTION-MANAGER] 添加新连接:', {
      name: connectionConfig.name,
      id: connectionConfig.id,
      host: connectionConfig.host
    });

    // 检查连接是否已存在
    const existingConnection = connections.value.find(c => c.id === connectionConfig.id);
    if (existingConnection) {
      console.log('⚠️ [CONNECTION-MANAGER] 连接已存在:', connectionConfig.id);
      emit('show-notification', `连接 "${connectionConfig.name}" 已存在`, 'warning');
      return;
    }

    // 使用 reactive 确保连接对象的响应式
    const connection: Connection = reactive({
      id: connectionConfig.id,
      config: connectionConfig,
      status: 'idle',
      errorMessage: null,
      connectedAt: null,
      lastActivity: new Date(),
      systemInfo: {
        cpu: 0,
        memory: 0,
        disk: 0,
        networkUp: 0,
        networkDown: 0,
        lastUpdate: null
      },
      persistentConnection: {
        connected: false
      }
    });

    console.log(
      '📋 [CONNECTION-MANAGER] 连接对象创建完成，当前连接数:',
      connections.value.length
    );
    connections.value.push(connection);

    console.log('🎯 [CONNECTION-MANAGER] 添加连接成功:', connection.id);
    emit('show-notification', `连接 "${connectionConfig.name}" 已添加`, 'success');
  };

  // 建立持久连接到连接池
  const establishPersistentConnection = async (connectionId: string): Promise<boolean> => {
    const connection = connections.value.find(c => c.id === connectionId);
    if (!connection) return false;

    console.log('🔄 [CONNECTION-MANAGER] 建立持久连接:', {
      id: connection.id,
      name: connection.config.name,
      host: connection.config.host
    });

    try {
      connection.status = 'connecting';
      connection.errorMessage = null;
      emit('show-notification', `正在连接到 ${connection.config.host}...`, 'info');

      if (window.electronAPI) {
        const connectionParams = {
          id: connection.id,
          name: connection.config.name,
          host: connection.config.host,
          port: connection.config.port,
          username: connection.config.username,
          password: connection.config.password,
          privateKey: connection.config.privateKey || connection.config.keyContent,
          authType: connection.config.authType
        };

        const result = await window.electronAPI.sshConnect(connectionParams);

        if (result.success) {
          connection.status = 'connected';
          connection.connectedAt = new Date();
          connection.errorMessage = null;
          connection.persistentConnection.connected = true;

          // 创建持久连接池条目
          try {
            await createPersistentConnection(connection.id, connectionParams);
            console.log('🔗 [CONNECTION-MANAGER] 持久连接池创建成功');
          } catch (poolError) {
            console.warn('⚠️ [CONNECTION-MANAGER] 持久连接池创建失败:', (poolError as Error).message);
          }

          emit('show-notification', `已连接到 ${connection.config.name}`, 'success');

          // 启动连接监控
          startConnectionMonitoring(connection);
          startSystemMonitoring(connection);

          return true;
        } else {
          connection.status = 'failed';
          connection.errorMessage = result.error;
          connection.persistentConnection.connected = false;
          emit('show-notification', `连接失败: ${result.error}`, 'error');
          return false;
        }
      } else {
        connection.status = 'failed';
        connection.errorMessage = 'ElectronAPI不可用';
        connection.persistentConnection.connected = false;
        emit('show-notification', 'ElectronAPI不可用，请在Electron环境中运行应用', 'error');
        return false;
      }
    } catch (error) {
      connection.status = 'failed';
      connection.errorMessage = (error as Error).message;
      connection.persistentConnection.connected = false;
      emit('show-notification', `连接异常: ${(error as Error).message}`, 'error');
      return false;
    }
  };

  // 取消连接
  const cancelConnection = async (connectionId: string): Promise<void> => {
    const connection = connections.value.find(c => c.id === connectionId);
    if (!connection || connection.status !== 'connecting') return;

    console.log('❌ [CONNECTION-MANAGER] 取消连接:', connectionId);

    connection.status = 'cancelled';
    connection.errorMessage = '用户取消了连接';
    connection.persistentConnection.connected = false;

    emit('show-notification', `已取消连接到 ${connection.config.name}`, 'info');

    // 停止任何进行中的连接尝试
    if (window.electronAPI) {
      try {
        await window.electronAPI.sshDisconnect(connectionId);
      } catch (error) {
        console.log('取消连接时清理资源:', (error as Error).message);
      }
    }
  };

  // 断开连接
  const disconnectConnection = async (connectionId: string): Promise<void> => {
    const connection = connections.value.find(c => c.id === connectionId);
    if (!connection) return;

    try {
      connection.status = 'disconnected';
      connection.persistentConnection.connected = false;

      // 关闭连接池中的持久连接
      try {
        await closePersistentConnection(connectionId);
        console.log('🔌 [CONNECTION-MANAGER] 持久连接已关闭:', connectionId);
      } catch (poolError) {
        console.warn('⚠️ [CONNECTION-MANAGER] 关闭持久连接失败:', (poolError as Error).message);
      }

      if (window.electronAPI) {
        await window.electronAPI.sshDisconnect(connectionId);
      }

      emit('show-notification', `已断开 ${connection.config.name} 的连接`, 'info');

      // 停止连接监控
      stopConnectionMonitoring(connectionId);
      stopSystemMonitoring(connectionId);
    } catch (error) {
      emit('show-notification', `断开连接失败: ${(error as Error).message}`, 'error');
    }
  };

  // 重新连接
  const reconnectConnection = async (connectionId: string): Promise<boolean> => {
    const connection = connections.value.find(c => c.id === connectionId);
    if (!connection) return false;

    // 先关闭现有的持久连接
    try {
      await closePersistentConnection(connectionId);
    } catch (error) {
      console.warn('⚠️ [CONNECTION-MANAGER] 重新连接时关闭持久连接失败:', (error as Error).message);
    }

    return await establishPersistentConnection(connectionId);
  };

  // 移除连接
  const removeConnection = async (connectionId: string): Promise<void> => {
    const connection = connections.value.find(c => c.id === connectionId);
    if (!connection) return;

    // 先断开连接
    if (connection.status === 'connected') {
      await disconnectConnection(connectionId);
    }

    // 确保连接池也被清理
    try {
      await closePersistentConnection(connectionId);
    } catch (error) {
      console.warn('⚠️ [CONNECTION-MANAGER] 移除连接时清理连接池失败:', (error as Error).message);
    }

    // 移除连接
    const index = connections.value.findIndex(c => c.id === connectionId);
    if (index > -1) {
      connections.value.splice(index, 1);
    }

    emit('show-notification', `已移除连接 "${connection.config.name}"`, 'info');
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
    } catch (error) {
      connection.status = 'disconnected';
      connection.persistentConnection.connected = false;
      emit('show-notification', `${connection.config.name} 连接已丢失`, 'warning');
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
    } catch (error) {
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
      networkUp: networkUpRate,
      lastUpdate: new Date()
    };
  };

  // 处理外部连接请求
  const handleConnectionAdded = (connectionConfig: SSHConnectionConfig): void => {
    console.log('📬 [CONNECTION-MANAGER] 收到连接添加请求:', {
      name: connectionConfig.name,
      id: connectionConfig.id,
      host: connectionConfig.host
    });
    addConnection(connectionConfig);
  };

  return {
    // 状态
    connections,
    connectionTimers,
    systemMonitorTimers,

    // 连接管理方法
    addConnection,
    handleConnectionAdded,
    removeConnection,
    disconnectConnection,
    reconnectConnection,
    cancelConnection,
    establishPersistentConnection,

    // 监控方法
    startConnectionMonitoring,
    stopConnectionMonitoring,
    startSystemMonitoring,
    stopSystemMonitoring,
    updateSystemInfo,

    // 工具方法
    formatBytes
  };
}