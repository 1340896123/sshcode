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

export function useSessions() {
  const sessions = ref([]);
  const loading = ref(false);

  const loadSessions = async () => {
    if (!window.electronAPI) return;

    loading.value = true;
    try {
      const sessionList = await window.electronAPI.getSessions();
      sessions.value = sessionList || [];
    } catch (error) {
      console.error('加载连接失败:', error);
    } finally {
      loading.value = false;
    }
  };

  const saveSession = async sessionData => {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.saveSession(sessionData);
      await loadSessions(); // 重新加载连接列表
      return true;
    } catch (error) {
      console.error('保存连接失败:', error);
      return false;
    }
  };

  const deleteSession = async sessionId => {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.deleteSession(sessionId);
      await loadSessions(); // 重新加载连接列表
      return true;
    } catch (error) {
      console.error('删除连接失败:', error);
      return false;
    }
  };

  onMounted(() => {
    loadSessions();
  });

  return {
    sessions,
    loading,
    loadSessions,
    saveSession,
    deleteSession
  };
}

export function useSSHConnection() {
  const connections = ref(new Map());

  const connect = async sessionData => {
    if (!window.electronAPI) return null;

    try {
      const connection = await window.electronAPI.sshConnect(sessionData);
      if (connection.success) {
        connections.value = new Map(connections.value).set(sessionData.id, connection);
        return connection;
      }
      throw new Error(connection.error || '连接失败');
    } catch (error) {
      console.error('SSH连接失败:', error);
      throw error;
    }
  };

  const disconnect = async sessionId => {
    if (!window.electronAPI) return false;

    try {
      await window.electronAPI.sshDisconnect(sessionId);
      const newMap = new Map(connections.value);
      newMap.delete(sessionId);
      connections.value = newMap;
      return true;
    } catch (error) {
      console.error('断开连接失败:', error);
      return false;
    }
  };

  const executeCommand = async (sessionId, command) => {
    if (!window.electronAPI) return null;

    try {
      return await window.electronAPI.sshExecute(sessionId, command);
    } catch (error) {
      console.error('执行命令失败:', error);
      throw error;
    }
  };

  const isConnected = sessionId => {
    return connections.value.has(sessionId);
  };

  return {
    connections,
    connect,
    disconnect,
    executeCommand,
    isConnected
  };
}
