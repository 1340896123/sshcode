import type { Ref, ComputedRef, shallowRef } from 'vue';

// Core tab entity types
export interface Tab {
  id: string;
  name: string;
  connectionId: string;
  isActive: boolean;
  isVisible: boolean;
  position: number;
  lastAccessed: number;
  createdAt: number;
  updatedAt: number;
  windowState: WindowState;
}

export interface WindowState {
  width: number;
  height: number;
  splitSizes: number[];
}

export interface CreateTabRequest {
  name?: string;
  connection?: string;
  position?: number;
}

export interface UpdateTabRequest {
  name?: string;
  position?: number;
  windowState?: WindowState;
  isActive?: boolean;
  isVisible?: boolean;
  lastAccessed?: number;
  updatedAt?: number;
}

// Connection related types
export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: AuthType;
  status: ConnectionStatus;
  lastConnected?: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectedAt?: number;
  latency?: number;
  bytesTransferred: BytesTransferred;
  memoryUsage: number;
  terminalLines: number;
  lastHealthCheck: number;
  healthStatus: HealthStatus;
  errorCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectionRequest {
  name: string;
  host: string;
  port?: number;
  username: string;
  authType: AuthType;
  password?: string;
  privateKey?: string;
}

export type AuthType = 'password' | 'key';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'reconnecting';
export type HealthStatus = 'healthy' | 'unhealthy' | 'failed';

export interface BytesTransferred {
  sent: number;
  received: number;
}

// Terminal state types
export interface TerminalState {
  tabId: string;
  cursorPosition: CursorPosition;
  scrollOffset: number;
  bufferSize: number;
  history: CommandHistoryEntry[];
  options: TerminalOptions;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CommandHistoryEntry {
  id: string;
  tabId: string;
  command: string;
  timestamp: number;
  exitCode?: number;
  duration?: number;
}

export interface TerminalOptions {
  fontSize: number;
  fontFamily: string;
  theme: string;
  scrollback: number;
}

export interface CommandResult {
  command: string;
  exitCode: number;
  output: string;
  error?: string;
  duration: number;
}

// File manager state types
export interface FileManagerState {
  tabId: string;
  currentDirectory: string;
  directoryHistory: string[];
  selectedFiles: string[];
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  showHiddenFiles: boolean;
  activeTransfers: FileTransfer[];
  bookmarks: Bookmark[];
}

export type ViewMode = 'list' | 'grid';
export type SortBy = 'name' | 'size' | 'modified' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface FileTransfer {
  id: string;
  tabId: string;
  type: TransferType;
  sourcePath: string;
  destinationPath: string;
  status: TransferStatus;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

export type TransferType = 'upload' | 'download';
export type TransferStatus = 'pending' | 'active' | 'completed' | 'failed' | 'paused';

export interface Bookmark {
  id: string;
  tabId: string;
  name: string;
  path: string;
  createdAt: number;
}

export interface DirectoryListing {
  path: string;
  parent: string;
  files: FileInfo[];
}

export interface FileInfo {
  name: string;
  path: string;
  type: string;
  size: number;
  modified: number;
  permissions: string;
  isDirectory: boolean;
}

// AI assistant state types
export interface AIAssistantState {
  tabId: string;
  messages: AIMessage[];
  toolCalls: ToolCall[];
  currentContext: AIContext;
  isVisible: boolean;
  inputHeight: number;
  scrollPosition: number;
}

export interface AIMessage {
  id: string;
  tabId: string;
  role: AIMessageRole;
  content: string;
  timestamp: number;
  metadata?: AIMessageMetadata;
}

export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessageMetadata {
  model?: string;
  tokens?: number;
  duration?: number;
}

export interface ToolCall {
  id: string;
  tabId: string;
  command: string;
  status: ToolCallStatus;
  result?: string;
  error?: string;
  startTime: number;
  endTime?: number;
  executionTime?: number;
  context: ToolCallContext;
}

export type ToolCallStatus = 'executing' | 'completed' | 'error' | 'timeout';

export interface ToolCallContext {
  workingDirectory: string;
  environment: Record<string, string>;
}

export interface AIContext {
  workingDirectory: string;
  environment: Record<string, string>;
  systemInfo: SystemInfo;
  recentCommands: string[];
}

export interface SystemInfo {
  hostname: string;
  os: string;
  architecture: string;
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

// Store state types
export interface TabStoreState {
  tabs: Map<string, Tab>;
  activeTabId: string | null;
  maxTabs: number;
}

export interface ConnectionStoreState {
  connections: Map<string, Connection>;
  activeConnections: Set<string>;
  maxConnections: number;
}

// Composable return types
export interface TabManagerComposable {
  // State
  tabs: ReturnType<typeof shallowRef<Map<string, Tab>>>;
  activeTab: ComputedRef<Tab | null>;
  activeTabId: Ref<string | null>;

  // Computed
  tabList: ComputedRef<Tab[]>;
  canCreateTab: ComputedRef<boolean>;

  // Actions
  createTab: (name?: string, connection?: ConnectionRequest) => Promise<Tab>;
  activateTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  updateTab: (tabId: string, updates: UpdateTabRequest) => Promise<void>;
  renameTab: (tabId: string, name: string) => Promise<void>;
  reorderTab: (tabId: string, newPosition: number) => Promise<void>;
}

export interface ConnectionManagerComposable {
  // State
  connections: Map<string, Connection>;

  // Actions
  createConnection: (config: ConnectionRequest) => Promise<string>;
  getConnection: (connectionId: string) => Connection | undefined;
  closeConnection: (connectionId: string) => Promise<void>;
  reconnectConnection: (connectionId: string) => Promise<void>;
  testConnection: (config: ConnectionRequest) => Promise<boolean>;
}

export interface TerminalPoolComposable {
  // Actions
  acquireTerminal: (connectionId: string) => PooledTerminal;
  releaseTerminal: (terminalId: string) => void;
  clearPool: () => void;
  getPoolStats: () => PoolStats;
}

export interface PooledTerminal {
  id: string;
  terminal: any; // xterm Terminal instance
  fitAddon: any;
  webLinksAddon: any;
  lastUsed: number;
  isActive: boolean;
  connectionId?: string;
}

export interface PoolStats {
  totalTerminals: number;
  activeTerminals: number;
  idleTerminals: number;
  memoryUsage: number;
}

// Event types
export interface TabEvent {
  type: 'tab-created' | 'tab-activated' | 'tab-updated' | 'tab-closed' | 'tab-reordered';
  tabId: string;
  timestamp: number;
  data?: any;
}

export interface ConnectionEvent {
  type: 'connection-created' | 'connection-connected' | 'connection-disconnected' | 'connection-error';
  connectionId: string;
  timestamp: number;
  data?: any;
}

// Performance monitoring types
export interface PerformanceMetrics {
  tabSwitchTimes: number[];
  memoryUsage: number[];
  connectionCount: number;
  averageTabSwitchTime: number;
  currentMemoryUsage: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  tabSwitchTime?: number;
  memoryUsage: number;
  activeConnections: number;
  activeTerminals: number;
}

// Session management types
export interface SessionData {
  tabs: Tab[];
  activeTabId: string | null;
  lastSaved: number;
  version: string;
}

export interface SessionRestoreOptions {
  autoReconnect: boolean;
  restoreTerminalState: boolean;
  restoreAIHistory: boolean;
  restoreFileManagerState: boolean;
}

// Session isolation types
export interface SessionIsolation {
  sessionId: string;
  tabId: string;
  connectionId: string;
  workingDirectory: string;
  environment: SessionEnvironment;
  shellState: ShellState;
  isolationLevel: IsolationLevel;
  createdAt: number;
  lastActivity: number;
}

export interface SessionEnvironment {
  SESSION_ID: string;
  TAB_ID: string;
  HISTFILE: string;
  PWD: string;
  SHELL: string;
  TERM: string;
  USER: string;
  HOME: string;
  PATH: string;
  customVars: Record<string, string>;
}

export interface ShellState {
  ptyId: string;
  shellProcess: string;
  isInteractive: boolean;
  commandHistory: CommandHistoryEntry[];
  lastCommand?: CommandHistoryEntry;
  runningCommand: RunningCommand | null;
}

export interface RunningCommand {
  command: string;
  startTime: number;
  pid: number;
  ptyId: string;
  status: CommandStatus;
}

export type CommandStatus = 'starting' | 'running' | 'completed' | 'failed' | 'killed';

export type IsolationLevel = 'full' | 'shared-shell' | 'minimal';

export interface SessionFactoryConfig {
  isolationLevel: IsolationLevel;
  enableWorkingDirectoryTracking: boolean;
  enableEnvironmentIsolation: boolean;
  enableCommandHistoryIsolation: boolean;
  maxSessionsPerConnection: number;
  sessionTimeout: number;
  cleanupInterval: number;
}

export interface SessionPool {
  sessions: Map<string, IsolatedSession>;
  activeConnections: Map<string, Set<string>>;
  maxSessionsPerConnection: number;
  totalMemoryUsage: number;
  maxMemoryUsage: number;
}

export interface IsolatedSession {
  id: string;
  connectionId: string;
  tabId: string;
  sshConnection: any; // SSH2 Client
  shellStream: any; // SSH2 ClientChannel
  workingDirectory: string;
  environment: SessionEnvironment;
  terminalState: TerminalState;
  fileManagerState: FileManagerState;
  aiAssistantState: AIAssistantState;
  shellState: ShellState;
  isolationLevel: IsolationLevel;
  createdAt: number;
  lastActivity: number;
  memoryUsage: number;
  isActive: boolean;
  healthStatus: SessionHealthStatus;
}

export type SessionHealthStatus = 'healthy' | 'unhealthy' | 'disconnected' | 'error';

export interface SessionMetrics {
  sessionId: string;
  connectionId: string;
  memoryUsage: number;
  terminalLines: number;
  fileOperations: number;
  aiMessages: number;
  lastActivity: number;
  uptime: number;
  responseTime: number;
}

export interface SessionLimitConfig {
  maxTotalSessions: number;
  maxSessionsPerConnection: number;
  maxMemoryPerSession: number;
  maxTotalMemory: number;
  enableGracefulDegradation: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface SessionLimitStatus {
  currentSessions: number;
  maxSessions: number;
  currentMemory: number;
  maxMemory: number;
  sessionsPerConnection: Map<string, number>;
  warningLevel: 'normal' | 'warning' | 'critical';
  canCreateSession: boolean;
  suggestedActions: string[];
}