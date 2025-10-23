import { ref, reactive, type Ref } from 'vue';
import type { Session, SessionData } from '@/types/ssh.js';
import type { CreateSessionOptions } from '@/types/terminal.js';

export interface UseSessionManagerEmits {
  (e: 'session-created', session: Session): void;
  (e: 'session-activated', sessionId: string): void;
  (e: 'session-closed', sessionId: string): void;
  (e: 'session-updated', session: Session): void;
  (e: 'show-notification', message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
}

export function useSessionManager(emit: UseSessionManagerEmits) {
  // 存储所有会话，按连接ID分组
  const sessions: Ref<Map<string, Session[]>> = ref(new Map());

  // 当前活动会话ID（全局）
  const activeSessionId: Ref<string | null> = ref(null);

  // 生成唯一会话ID
  const generateSessionId = (connectionId: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${connectionId}-${timestamp}-${random}`;
  };

  // 生成会话名称
  const generateSessionName = (connectionId: string, connectionName: string, sessionNumber: number): string => {
    return `${connectionName} - 会话 ${sessionNumber}`;
  };

  // 获取连接的所有会话
  const getConnectionSessions = (connectionId: string): Session[] => {
    return sessions.value.get(connectionId) || [];
  };

  // 获取活动会话
  const getActiveSession = (): Session | undefined => {
    if (!activeSessionId.value) return undefined;

    for (const connectionSessions of sessions.value.values()) {
      const session = connectionSessions.find(s => s.id === activeSessionId.value);
      if (session) return session;
    }
    return undefined;
  };

  // 通过ID查找会话
  const findSessionById = (sessionId: string): Session | undefined => {
    for (const connectionSessions of sessions.value.values()) {
      const session = connectionSessions.find(s => s.id === sessionId);
      if (session) return session;
    }
    return undefined;
  };

  // 创建新会话
  const createSession = async (
    connectionId: string,
    connectionConfig: any, // SSHConnectionConfig
    options: CreateSessionOptions = {}
  ): Promise<Session | null> => {
    try {
      // 获取连接的现有会话列表
      const connectionSessions = getConnectionSessions(connectionId);
      const sessionNumber = connectionSessions.length + 1;

      // 生成会话详情
      const sessionId = generateSessionId(connectionId);
      const sessionName = options.name || generateSessionName(connectionId, connectionConfig.name, sessionNumber);

      // 创建会话对象
      const session: Session = reactive({
        id: sessionId,
        connectionId,
        name: sessionName,
        status: 'connecting',
        errorMessage: null,
        createdAt: new Date(),
        lastActivity: new Date(),
        activePanel: options.initialPanel || 'terminal',
        isActive: false,
        // SSH连接资源将在连接建立后设置
        sshConnection: undefined,
        // 终端状态
        terminalState: {
          fontSize: 14,
          fontFamily: 'Consolas, Monaco, monospace',
          history: []
        }
      });

      // 添加到会话列表
      if (!sessions.value.has(connectionId)) {
        sessions.value.set(connectionId, []);
      }
      sessions.value.get(connectionId)!.push(session);

      // 如果这是第一个会话，激活它
      if (connectionSessions.length === 0) {
        await activateSession(sessionId);
      }

      console.log(`📝 [SESSION-MANAGER] 创建会话: ${sessionName} (${sessionId})`);
      emit('session-created', session);
      emit('show-notification', `会话 "${sessionName}" 已创建`, 'success');

      return session;
    } catch (error) {
      console.error('❌ [SESSION-MANAGER] 创建会话失败:', error);
      emit('show-notification', `创建会话失败: ${(error as Error).message}`, 'error');
      return null;
    }
  };

  // 激活会话
  const activateSession = async (sessionId: string): Promise<void> => {
    try {
      const session = findSessionById(sessionId);
      if (!session) {
        throw new Error('会话不存在');
      }

      // 取消所有会话的活动状态
      for (const connectionSessions of sessions.value.values()) {
        connectionSessions.forEach(s => {
          s.isActive = false;
        });
      }

      // 激活选中的会话
      session.isActive = true;
      session.lastActivity = new Date();
      activeSessionId.value = sessionId;

      console.log(`🎯 [SESSION-MANAGER] 激活会话: ${session.name} (${sessionId})`);
      emit('session-activated', sessionId);
      emit('session-updated', session);

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] 激活会话失败:', error);
      emit('show-notification', `激活会话失败: ${(error as Error).message}`, 'error');
    }
  };

  // 关闭会话
  const closeSession = async (sessionId: string): Promise<void> => {
    try {
      const session = findSessionById(sessionId);
      if (!session) return;

      // 清理SSH连接资源
      if (session.sshConnection) {
        const { shellStream, sftpClient, client } = session.sshConnection;

        if (shellStream) {
          shellStream.end();
          shellStream.destroy();
        }

        if (sftpClient) {
          try {
            sftpClient.end();
          } catch (error) {
            console.warn('关闭SFTP客户端失败:', error);
          }
        }

        if (client) {
          try {
            client.end();
          } catch (error) {
            console.warn('关闭SSH客户端失败:', error);
          }
        }
      }

      // 从会话列表中移除
      const connectionSessions = sessions.value.get(session.connectionId);
      if (connectionSessions) {
        const index = connectionSessions.findIndex(s => s.id === sessionId);
        if (index > -1) {
          connectionSessions.splice(index, 1);
        }

        // 如果连接没有会话了，移除连接的会话列表
        if (connectionSessions.length === 0) {
          sessions.value.delete(session.connectionId);
        }
      }

      // 如果这是活动会话，激活另一个会话
      if (activeSessionId.value === sessionId) {
        const remainingSessions = Array.from(sessions.value.values()).flat();
        if (remainingSessions.length > 0) {
          await activateSession(remainingSessions[0].id);
        } else {
          activeSessionId.value = null;
        }
      }

      console.log(`🗑️ [SESSION-MANAGER] 关闭会话: ${session.name} (${sessionId})`);
      emit('session-closed', sessionId);
      emit('show-notification', `会话 "${session.name}" 已关闭`, 'info');

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] 关闭会话失败:', error);
      emit('show-notification', `关闭会话失败: ${(error as Error).message}`, 'error');
    }
  };

  // 关闭连接的所有会话
  const closeConnectionSessions = async (connectionId: string): Promise<void> => {
    try {
      const connectionSessions = getConnectionSessions(connectionId);
      const sessionIds = connectionSessions.map(s => s.id);

      for (const sessionId of sessionIds) {
        await closeSession(sessionId);
      }

      console.log(`🧹 [SESSION-MANAGER] 关闭连接的所有会话: ${connectionId}`);

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] 关闭连接的所有会话失败:', error);
    }
  };

  // 更新会话状态
  const updateSessionStatus = (sessionId: string, status: Session['status'], errorMessage?: string | null): void => {
    const session = findSessionById(sessionId);
    if (!session) return;

    session.status = status;
    if (errorMessage !== undefined) {
      session.errorMessage = errorMessage;
    }

    if (status === 'connected') {
      session.connectedAt = new Date();
    }

    session.lastActivity = new Date();
    emit('session-updated', session);
  };

  // 设置会话SSH连接资源
  const setSessionSSHConnection = (sessionId: string, sshConnection: Session['sshConnection']): void => {
    const session = findSessionById(sessionId);
    if (!session) return;

    session.sshConnection = sshConnection;
    emit('session-updated', session);
  };

  // 更新会话活动面板
  const updateSessionActivePanel = (sessionId: string, activePanel: Session['activePanel']): void => {
    const session = findSessionById(sessionId);
    if (!session) return;

    session.activePanel = activePanel;
    session.lastActivity = new Date();
    emit('session-updated', session);
  };

  // 获取所有会话总数
  const totalSessionCount = ref(0);

  // 更新会话总数
  const updateTotalSessionCount = () => {
    let total = 0;
    for (const connectionSessions of sessions.value.values()) {
      total += connectionSessions.length;
    }
    totalSessionCount.value = total;
  };

  return {
    // 状态
    sessions,
    activeSessionId,
    totalSessionCount,

    // 会话管理方法
    createSession,
    activateSession,
    closeSession,
    closeConnectionSessions,

    // 会话查询方法
    getConnectionSessions,
    getActiveSession,
    findSessionById,

    // 会话更新方法
    updateSessionStatus,
    setSessionSSHConnection,
    updateSessionActivePanel,
    updateTotalSessionCount
  };
}