import { ref, onMounted, onUnmounted } from 'vue';

export function useElectronAPI() {
  const isElectron = ref(false);

  onMounted(() => {
    // 检查是否在Electron环境中运行
    const checkElectron = () => {
      return typeof window !== 'undefined' && window.process && window.process.type;
    };

    isElectron.value = !!checkElectron();
  });

  return {
    isElectron
    // 可以在这里添加其他Electron相关的逻辑
  };
}

export function useConnections() {
  const connections = ref([]);
  const loading = ref(false);

  const loadConnections = async () => {
    if (!window.electronAPI) return;

    loading.value = true;
    try {
      const connectionList = await window.electronAPI.getConnections();
      connections.value = connectionList || [];
    } catch (error) {
      console.error('加载连接失败:', error);
    } finally {
      loading.value = false;
    }
  };

  const saveConnection = async connectionData => {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.saveConnection(connectionData);
      await loadConnections(); // 重新加载连接列表
      return true;
    } catch (error) {
      console.error('保存连接失败:', error);
      return false;
    }
  };

  const deleteConnection = async connectionId => {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.deleteConnection(connectionId);
      await loadConnections(); // 重新加载连接列表
      return true;
    } catch (error) {
      console.error('删除连接失败:', error);
      return false;
    }
  };

  onMounted(() => {
    loadConnections();
  });

  return {
    connections,
    loading,
    loadConnections,
    saveConnection,
    deleteConnection
  };
}

export function useSSHConnection() {
  const activeConnections = ref(new Map());

  const connect = async connectionConfig => {
    if (!window.electronAPI) return null;

    try {
      const connection = await window.electronAPI.sshConnect(connectionConfig);
      if (connection.success) {
        activeConnections.value = new Map(activeConnections.value).set(connectionConfig.id, connection);
        return connection;
      }
      throw new Error(connection.error || '连接失败');
    } catch (error) {
      console.error('SSH连接失败:', error);
      throw error;
    }
  };

  const disconnect = async connectionId => {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.sshDisconnect(connectionId);
      const newMap = new Map(activeConnections.value);
      newMap.delete(connectionId);
      activeConnections.value = newMap;
      return true;
    } catch (error) {
      console.error('断开连接失败:', error);
      return false;
    }
  };

  const executeCommand = async (connectionId, command) => {
    if (!window.electronAPI) return null;

    try {
      return await window.electronAPI.sshExecute(connectionId, command);
    } catch (error) {
      console.error('执行命令失败:', error);
      throw error;
    }
  };

  const isConnected = connectionId => {
    return activeConnections.value.has(connectionId);
  };

  return {
    connections: activeConnections,
    connect,
    disconnect,
    executeCommand,
    isConnected
  };
}
