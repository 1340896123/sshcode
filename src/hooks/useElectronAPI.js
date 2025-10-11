import { useState, useEffect } from 'react';

export function useElectronAPI() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // 检查是否在Electron环境中运行
    const checkElectron = () => {
      return typeof window !== 'undefined' && window.process && window.process.type;
    };

    setIsElectron(checkElectron());
  }, []);

  return {
    isElectron,
    // 可以在这里添加其他Electron相关的逻辑
  };
}

export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    if (!window.electronAPI) return;
    
    setLoading(true);
    try {
      const sessionList = await window.electronAPI.getSessions();
      setSessions(sessionList || []);
    } catch (error) {
      console.error('加载会话失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async (sessionData) => {
    if (!window.electronAPI) return false;
    
    try {
      await window.electronAPI.saveSession(sessionData);
      await loadSessions(); // 重新加载会话列表
      return true;
    } catch (error) {
      console.error('保存会话失败:', error);
      return false;
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.electronAPI) return false;
    
    try {
      await window.electronAPI.deleteSession(sessionId);
      await loadSessions(); // 重新加载会话列表
      return true;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return {
    sessions,
    loading,
    loadSessions,
    saveSession,
    deleteSession
  };
}

export function useSSHConnection() {
  const [connections, setConnections] = useState(new Map());

  const connect = async (sessionData) => {
    if (!window.electronAPI) return null;
    
    try {
      const connection = await window.electronAPI.sshConnect(sessionData);
      if (connection.success) {
        setConnections(prev => new Map(prev).set(sessionData.id, connection));
        return connection;
      }
      throw new Error(connection.error || '连接失败');
    } catch (error) {
      console.error('SSH连接失败:', error);
      throw error;
    }
  };

  const disconnect = async (sessionId) => {
    if (!window.electronAPI) return false;
    
    try {
      await window.electronAPI.sshDisconnect(sessionId);
      setConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });
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

  const isConnected = (sessionId) => {
    return connections.has(sessionId);
  };

  return {
    connections,
    connect,
    disconnect,
    executeCommand,
    isConnected
  };
}
