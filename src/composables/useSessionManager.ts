import { ref, reactive, computed, type Ref } from 'vue';
import type {
  TerminalSession,
  SessionManager,
  CreateSessionOptions,
  TerminalData,
  ShellOptions
} from '@/types/terminal.js';
import type { Connection } from '@/types/ssh.js';

export interface SessionManagerEmits {
  (e: 'session-created', session: TerminalSession): void;
  (e: 'session-activated', sessionId: string): void;
  (e: 'session-closed', sessionId: string): void;
  (e: 'session-updated', session: TerminalSession): void;
  (e: 'show-notification', message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
}

export function useSessionManager(emit: SessionManagerEmits) {
  // Reactive session managers for each connection
  const sessionManagers: Ref<Map<string, SessionManager>> = ref(new Map());

  // Generate unique session ID
  const generateSessionId = (connectionId: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${connectionId}-${timestamp}-${random}`;
  };

  // Generate session name
  const generateSessionName = (connectionId: string, sessionNumber: number): string => {
    const connection = getConnectionById(connectionId);
    const connectionName = connection?.config?.name || `Connection ${connectionId}`;
    return `${connectionName} - Session ${sessionNumber}`;
  };

  // Get connection by ID (this would need to be injected or passed in)
  const getConnectionById = (connectionId: string): Connection | undefined => {
    // This should be provided by the parent component or through a global store
    // For now, return undefined and let the calling code handle it
    return undefined;
  };

  // Initialize session manager for a connection
  const initializeSessionManager = (connectionId: string): SessionManager => {
    if (!sessionManagers.value.has(connectionId)) {
      const manager: SessionManager = reactive({
        sessions: new Map(),
        activeSessionId: null,
        connectionId
      });
      sessionManagers.value.set(connectionId, manager);
    }
    return sessionManagers.value.get(connectionId)!;
  };

  // Create a new session
  const createSession = async (
    connectionId: string,
    options: CreateSessionOptions = {}
  ): Promise<TerminalSession | null> => {
    try {
      const sessionManager = initializeSessionManager(connectionId);

      // Generate session details
      const sessionId = generateSessionId(connectionId);
      const sessionCount = sessionManager.sessions.size + 1;
      const sessionName = options.name || generateSessionName(connectionId, sessionCount);

      // Create session object
      const session: TerminalSession = reactive({
        id: sessionId,
        connectionId,
        name: sessionName,
        history: [],
        isActive: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        commandHistory: [],
        shellOptions: options.shellOptions || { rows: 24, cols: 80, term: 'xterm-256color' },
        status: 'connecting',
        errorMessage: null,
        envVars: options.envVars || {},
        isDirty: false,
        currentWorkingDirectory: options.workingDirectory
      });

      // Add to session manager
      sessionManager.sessions.set(sessionId, session);

      // If this is the first session, activate it
      if (sessionManager.sessions.size === 1) {
        await activateSession(connectionId, sessionId);
      }

      console.log(`📝 [SESSION-MANAGER] Created session: ${sessionName} (${sessionId})`);
      emit('session-created', session);
      emit('show-notification', `会话 "${sessionName}" 已创建`, 'success');

      return session;
    } catch (error) {
      console.error('❌ [SESSION-MANAGER] Failed to create session:', error);
      emit('show-notification', `创建会话失败: ${(error as Error).message}`, 'error');
      return null;
    }
  };

  // Activate a session
  const activateSession = async (connectionId: string, sessionId: string): Promise<void> => {
    try {
      const sessionManager = sessionManagers.value.get(connectionId);
      if (!sessionManager || !sessionManager.sessions.has(sessionId)) {
        throw new Error('Session not found');
      }

      // Deactivate all sessions in this connection
      sessionManager.sessions.forEach(session => {
        session.isActive = false;
      });

      // Activate the selected session
      const session = sessionManager.sessions.get(sessionId)!;
      session.isActive = true;
      session.lastActivity = new Date();
      sessionManager.activeSessionId = sessionId;

      console.log(`🎯 [SESSION-MANAGER] Activated session: ${session.name} (${sessionId})`);
      emit('session-activated', sessionId);
      emit('session-updated', session);

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] Failed to activate session:', error);
      emit('show-notification', `激活会话失败: ${(error as Error).message}`, 'error');
    }
  };

  // Close a session
  const closeSession = async (connectionId: string, sessionId: string): Promise<void> => {
    try {
      const sessionManager = sessionManagers.value.get(connectionId);
      if (!sessionManager || !sessionManager.sessions.has(sessionId)) {
        return;
      }

      const session = sessionManager.sessions.get(sessionId)!;

      // Close shell stream if exists
      if (session.shellStream) {
        session.shellStream.end();
        session.shellStream.destroy();
      }

      // Clean up terminal instance if exists
      if (session.terminal) {
        session.terminal.dispose();
      }

      // Remove from session manager
      sessionManager.sessions.delete(sessionId);

      // If this was the active session, activate another one
      if (sessionManager.activeSessionId === sessionId) {
        const remainingSessions = Array.from(sessionManager.sessions.values());
        if (remainingSessions.length > 0) {
          await activateSession(connectionId, remainingSessions[0].id);
        } else {
          sessionManager.activeSessionId = null;
        }
      }

      console.log(`🗑️ [SESSION-MANAGER] Closed session: ${session.name} (${sessionId})`);
      emit('session-closed', sessionId);
      emit('show-notification', `会话 "${session.name}" 已关闭`, 'info');

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] Failed to close session:', error);
      emit('show-notification', `关闭会话失败: ${(error as Error).message}`, 'error');
    }
  };

  // Close all sessions for a connection
  const closeAllSessions = async (connectionId: string): Promise<void> => {
    try {
      const sessionManager = sessionManagers.value.get(connectionId);
      if (!sessionManager) return;

      const sessionIds = Array.from(sessionManager.sessions.keys());

      for (const sessionId of sessionIds) {
        await closeSession(connectionId, sessionId);
      }

      // Remove session manager
      sessionManagers.value.delete(connectionId);

      console.log(`🧹 [SESSION-MANAGER] Closed all sessions for connection: ${connectionId}`);

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] Failed to close all sessions:', error);
    }
  };

  // Add data to session history
  const addSessionData = (sessionId: string, data: Omit<TerminalData, 'timestamp'>): void => {
    const session = findSessionById(sessionId);
    if (!session) return;

    const terminalData: TerminalData = {
      ...data,
      timestamp: Date.now()
    };

    session.history.push(terminalData);
    session.lastActivity = new Date();
    session.isDirty = true;

    // Limit history size (keep last 1000 entries)
    if (session.history.length > 1000) {
      session.history = session.history.slice(-1000);
    }

    emit('session-updated', session);
  };

  // Add command to session history
  const addCommandToHistory = (sessionId: string, command: string): void => {
    const session = findSessionById(sessionId);
    if (!session) return;

    // Avoid duplicates
    if (session.commandHistory[session.commandHistory.length - 1] !== command) {
      session.commandHistory.push(command);

      // Limit history size
      if (session.commandHistory.length > 100) {
        session.commandHistory = session.commandHistory.slice(-100);
      }
    }
  };

  // Find session by ID
  const findSessionById = (sessionId: string): TerminalSession | undefined => {
    for (const manager of sessionManagers.value.values()) {
      if (manager.sessions.has(sessionId)) {
        return manager.sessions.get(sessionId);
      }
    }
    return undefined;
  };

  // Get sessions for a connection
  const getConnectionSessions = (connectionId: string): TerminalSession[] => {
    const sessionManager = sessionManagers.value.get(connectionId);
    return sessionManager ? Array.from(sessionManager.sessions.values()) : [];
  };

  // Get active session for a connection
  const getActiveSession = (connectionId: string): TerminalSession | undefined => {
    const sessionManager = sessionManagers.value.get(connectionId);
    if (!sessionManager || !sessionManager.activeSessionId) {
      return undefined;
    }
    return sessionManager.sessions.get(sessionManager.activeSessionId);
  };

  // Update session status
  const updateSessionStatus = (sessionId: string, status: TerminalSession['status'], errorMessage?: string | null): void => {
    const session = findSessionById(sessionId);
    if (!session) return;

    session.status = status;
    if (errorMessage !== undefined) {
      session.errorMessage = errorMessage;
    }

    emit('session-updated', session);
  };

  // Set session shell stream
  const setSessionShellStream = (sessionId: string, shellStream: import('ssh2').ClientChannel): void => {
    const session = findSessionById(sessionId);
    if (!session) return;

    session.shellStream = shellStream;
    emit('session-updated', session);
  };

  // Computed properties
  const totalSessionCount = computed(() => {
    let total = 0;
    for (const manager of sessionManagers.value.values()) {
      total += manager.sessions.size;
    }
    return total;
  });

  const connectionSessionCount = (connectionId: string): number => {
    const sessionManager = sessionManagers.value.get(connectionId);
    return sessionManager ? sessionManager.sessions.size : 0;
  };

  return {
    // State
    sessionManagers,
    totalSessionCount,

    // Session management methods
    initializeSessionManager,
    createSession,
    activateSession,
    closeSession,
    closeAllSessions,

    // Session data methods
    addSessionData,
    addCommandToHistory,

    // Session query methods
    findSessionById,
    getConnectionSessions,
    getActiveSession,
    connectionSessionCount,

    // Session update methods
    updateSessionStatus,
    setSessionShellStream
  };
}