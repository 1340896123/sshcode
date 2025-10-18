/**
 * Session State Management Types
 *
 * This file contains types for managing session state in the tabbed connection system.
 * It provides comprehensive session isolation, persistence, and management capabilities.
 */

import type {
  SessionIsolation,
  IsolatedSession,
  SessionEnvironment,
  ShellState,
  SessionMetrics,
  SessionLimitConfig,
  SessionLimitStatus,
  SessionHealthStatus,
  TerminalState,
  FileManagerState,
  AIAssistantState
} from './tab';

// Re-export types that are commonly imported from this module
export type {
  SessionIsolation,
  IsolatedSession,
  SessionEnvironment,
  ShellState,
  SessionMetrics,
  SessionLimitConfig,
  SessionLimitStatus,
  SessionHealthStatus,
  TerminalState,
  FileManagerState,
  AIAssistantState
} from './tab';

// ============================================================================
// CORE SESSION STATE MANAGEMENT
// ============================================================================

export interface SessionStateManager {
  // Session lifecycle
  createSession: (config: SessionCreationConfig) => Promise<IsolatedSession>;
  getSession: (sessionId: string) => IsolatedSession | null;
  updateSession: (sessionId: string, updates: Partial<IsolatedSession>) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  closeAllSessions: () => Promise<void>;

  // Session queries
  getSessionsByConnection: (connectionId: string) => IsolatedSession[];
  getSessionsByTab: (tabId: string) => IsolatedSession[];
  getActiveSessions: () => IsolatedSession[];
  getInactiveSessions: (threshold?: number) => IsolatedSession[];

  // Session health
  checkSessionHealth: (sessionId: string) => Promise<SessionHealthStatus>;
  cleanupInactiveSessions: () => Promise<number>;

  // Session metrics
  getSessionMetrics: (sessionId: string) => SessionMetrics;
  getAllSessionMetrics: () => SessionMetrics[];

  // Events
  on: (event: SessionEvent, callback: SessionEventCallback) => void;
  off: (event: SessionEvent, callback: SessionEventCallback) => void;
  emit: (event: SessionEvent, data: any) => void;
}

export interface SessionCreationConfig {
  connectionId: string;
  tabId: string;
  isolationLevel: 'full' | 'shared-shell' | 'minimal';
  workingDirectory?: string;
  environment?: Record<string, string>;
  shellCommand?: string;
  terminalOptions?: any;
  autoConnect?: boolean;
}

export type SessionEvent =
  | 'session-created'
  | 'session-updated'
  | 'session-closed'
  | 'session-health-changed'
  | 'session-activity'
  | 'session-error'
  | 'session-limit-reached';

export type SessionEventCallback = (data: any) => void;

// ============================================================================
// SESSION PERSISTENCE
// ============================================================================

export interface SessionPersistenceService {
  // Save/Load operations
  saveSession: (session: IsolatedSession) => Promise<void>;
  loadSession: (sessionId: string) => Promise<IsolatedSession | null>;
  saveAllSessions: () => Promise<void>;
  loadAllSessions: () => Promise<IsolatedSession[]>;

  // Session state serialization
  serializeSessionState: (session: IsolatedSession) => Promise<SerializedSession>;
  deserializeSessionState: (data: SerializedSession) => Promise<IsolatedSession>;

  // Backup/Recovery
  backupSessions: () => Promise<string>;
  restoreSessions: (backupPath: string) => Promise<IsolatedSession[]>;

  // Cleanup
  cleanupOldSessions: (olderThan: number) => Promise<number>;
  cleanupCorruptedSessions: () => Promise<number>;
}

export interface SerializedSession {
  id: string;
  connectionId: string;
  tabId: string;
  workingDirectory: string;
  environment: SessionEnvironment;
  shellState: SerializedShellState;
  terminalState: SerializedTerminalState;
  fileManagerState: SerializedFileManagerState;
  aiAssistantState: SerializedAIAssistantState;
  isolationLevel: string;
  createdAt: number;
  lastActivity: number;
  version: string;
  checksum: string;
}

export interface SerializedShellState {
  ptyId: string;
  shellProcess: string;
  isInteractive: boolean;
  lastCommand?: {
    command: string;
    timestamp: number;
    exitCode?: number;
    duration?: number;
  };
  environmentSnapshot: Record<string, string>;
}

export interface SerializedTerminalState {
  bufferSize: number;
  scrollOffset: number;
  cursorPosition: { x: number; y: number };
  history: Array<{
    command: string;
    output: string;
    timestamp: number;
    exitCode?: number;
  }>;
  options: any;
}

export interface SerializedFileManagerState {
  currentDirectory: string;
  directoryHistory: string[];
  selectedFiles: string[];
  viewMode: 'list' | 'grid';
  sortBy: 'name' | 'size' | 'modified' | 'type';
  sortOrder: 'asc' | 'desc';
  showHiddenFiles: boolean;
  bookmarks: Array<{
    name: string;
    path: string;
    createdAt: number;
  }>;
}

export interface SerializedAIAssistantState {
  messages: Array<{
    role: string;
    content: string;
    timestamp: number;
    metadata?: any;
  }>;
  currentContext: {
    workingDirectory: string;
    environment: Record<string, string>;
    systemInfo?: any;
    recentCommands: string[];
  };
  isVisible: boolean;
  inputHeight: number;
  scrollPosition: number;
}

// ============================================================================
// WORKING DIRECTORY TRACKING
// ============================================================================

export interface WorkingDirectoryTracker {
  // Directory tracking
  trackWorkingDirectory: (sessionId: string, initialDirectory: string) => Promise<void>;
  updateWorkingDirectory: (sessionId: string, newDirectory: string) => Promise<void>;
  getWorkingDirectory: (sessionId: string) => string | null;

  // Directory history
  getDirectoryHistory: (sessionId: string) => DirectoryHistoryEntry[];
  addToDirectoryHistory: (sessionId: string, directory: string) => Promise<void>;
  clearDirectoryHistory: (sessionId: string) => Promise<void>;

  // Directory change detection
  enableDirectoryTracking: (sessionId: string) => Promise<void>;
  disableDirectoryTracking: (sessionId: string) => Promise<void>;
  isDirectoryTrackingEnabled: (sessionId: string) => boolean;

  // Events
  onDirectoryChanged: (callback: DirectoryChangeCallback) => void;
  offDirectoryChanged: (callback: DirectoryChangeCallback) => void;
}

export interface DirectoryHistoryEntry {
  directory: string;
  timestamp: number;
  duration?: number;
  commandCount: number;
}

export type DirectoryChangeCallback = (sessionId: string, oldDirectory: string, newDirectory: string) => void;

export interface DirectoryTrackingConfig {
  enableHistory: boolean;
  maxHistoryEntries: number;
  enableRealTimeTracking: boolean;
  trackingInterval: number;
  shellPromptIntegration: boolean;
  customPromptCommand?: string;
}

// ============================================================================
// SESSION ISOLATION VALIDATION
// ============================================================================

export interface SessionIsolationValidator {
  // Isolation validation
  validateSessionIsolation: (sessionId: string) => Promise<IsolationValidationResult>;
  validateCrossSessionContamination: (sessionIds: string[]) => Promise<ContaminationCheckResult>;

  // Environment isolation
  validateEnvironmentIsolation: (sessionId: string) => Promise<EnvironmentIsolationResult>;
  validateWorkingDirectoryIsolation: (sessionId: string) => Promise<DirectoryIsolationResult>;

  // Resource isolation
  validateResourceIsolation: (sessionId: string) => Promise<ResourceIsolationResult>;
  validateNetworkIsolation: (sessionId: string) => Promise<NetworkIsolationResult>;

  // Periodic checks
  enablePeriodicValidation: (interval: number) => void;
  disablePeriodicValidation: () => void;
  getValidationHistory: (sessionId: string) => ValidationResult[];
}

export interface IsolationValidationResult {
  sessionId: string;
  isValid: boolean;
  timestamp: number;
  environmentIsolation: EnvironmentIsolationResult;
  directoryIsolation: DirectoryIsolationResult;
  resourceIsolation: ResourceIsolationResult;
  networkIsolation: NetworkIsolationResult;
  issues: IsolationIssue[];
  recommendations: string[];
}

export interface EnvironmentIsolationResult {
  isValid: boolean;
  leakedVariables: string[];
  sharedVariables: string[];
  conflicts: EnvironmentConflict[];
}

export interface DirectoryIsolationResult {
  isValid: boolean;
  currentDirectory: string;
  expectedDirectory: string;
  sharedAccess: string[];
  unauthorizedAccess: string[];
}

export interface ResourceIsolationResult {
  isValid: boolean;
  memoryUsage: number;
  fileDescriptors: number;
  processes: ProcessInfo[];
  sharedResources: string[];
}

export interface NetworkIsolationResult {
  isValid: boolean;
  activeConnections: NetworkConnection[];
  sharedPorts: number[];
  unauthorizedConnections: NetworkConnection[];
}

export interface ContaminationCheckResult {
  isContaminated: boolean;
  contaminationSources: ContaminationSource[];
  affectedSessions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface EnvironmentConflict {
  variable: string;
  expectedValue: string;
  actualValue: string;
  severity: 'warning' | 'error';
}

export interface ProcessInfo {
  pid: number;
  command: string;
  arguments: string[];
  sessionId?: string;
  memoryUsage: number;
  startTime: number;
}

export interface NetworkConnection {
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  protocol: string;
  sessionId?: string;
  startTime: number;
}

export interface IsolationIssue {
  type: 'environment' | 'directory' | 'resource' | 'network';
  severity: 'warning' | 'error' | 'critical';
  description: string;
  affectedComponent: string;
  recommendation: string;
}

export interface ContaminationSource {
  sessionId: string;
  contaminationType: string;
  sourceComponent: string;
  affectedVariables: string[];
  affectedDirectories: string[];
  timestamp: number;
}

export interface ValidationResult {
  timestamp: number;
  isValid: boolean;
  issues: IsolationIssue[];
  metrics: any;
}

// ============================================================================
// SESSION MEMORY MANAGEMENT
// ============================================================================

export interface SessionMemoryManager {
  // Memory tracking
  getSessionMemoryUsage: (sessionId: string) => Promise<MemoryUsage>;
  getTotalMemoryUsage: () => Promise<number>;
  getMemoryUsageBySession: () => Promise<Map<string, MemoryUsage>>;

  // Memory control
  setMemoryLimit: (sessionId: string, limit: number) => Promise<void>;
  enforceMemoryLimits: () => Promise<MemoryEnforcementResult>;

  // Memory cleanup
  cleanupSessionMemory: (sessionId: string) => Promise<MemoryCleanupResult>;
  cleanupAllSessions: () => Promise<MemoryCleanupResult>;
  enableAutoCleanup: (threshold: number, interval: number) => void;
  disableAutoCleanup: () => void;

  // Memory optimization
  optimizeSessionMemory: (sessionId: string) => Promise<MemoryOptimizationResult>;
  optimizeAllSessions: () => Promise<MemoryOptimizationResult>;

  // Emergency procedures
  triggerEmergencyCleanup: () => Promise<EmergencyCleanupResult>;
  setEmergencyThreshold: (threshold: number) => void;
}

export interface MemoryUsage {
  sessionId: string;
  totalUsage: number;
  terminalMemory: number;
  fileManagerMemory: number;
  aiAssistantMemory: number;
  shellMemory: number;
  connectionMemory: number;
  lastUpdated: number;
}

export interface MemoryEnforcementResult {
  sessionsEnforced: string[];
  memoryFreed: number;
  sessionsTerminated: string[];
  warnings: string[];
}

export interface MemoryCleanupResult {
  memoryFreed: number;
  componentsCleaned: string[];
  duration: number;
  success: boolean;
  errors: string[];
}

export interface MemoryOptimizationResult {
  memoryOptimized: number;
  optimizationsApplied: OptimizationType[];
  duration: number;
  success: boolean;
  performanceImpact: 'low' | 'medium' | 'high';
}

export interface EmergencyCleanupResult {
  memoryFreed: number;
  sessionsTerminated: number;
  criticalSessions: string[];
  success: boolean;
  downtime: number;
}

export type OptimizationType =
  | 'terminal-buffer-truncate'
  | 'file-cache-clear'
  | 'ai-history-compress'
  | 'shell-history-limit'
  | 'connection-pool-reduce'
  | 'garbage-collection';

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================

export interface SessionConfig {
  // Isolation settings
  isolationLevel: 'full' | 'shared-shell' | 'minimal';
  enableWorkingDirectoryTracking: boolean;
  enableEnvironmentIsolation: boolean;
  enableCommandHistoryIsolation: boolean;

  // Resource limits
  maxSessionsPerConnection: number;
  maxTotalSessions: number;
  maxMemoryPerSession: number;
  maxTerminalHistory: number;
  maxAIHistory: number;

  // Timeout settings
  sessionTimeout: number;
  idleTimeout: number;
  connectionTimeout: number;
  commandTimeout: number;

  // Cleanup settings
  cleanupInterval: number;
  enableAutoCleanup: boolean;
  enableAutoReconnect: boolean;
  enablePersistence: boolean;

  // Performance settings
  enableMemoryOptimization: boolean;
  enableLazyLoading: boolean;
  enableConnectionPooling: boolean;

  // Security settings
  enableIsolationValidation: boolean;
  validationInterval: number;
  enableSecurityMonitoring: boolean;

  // Debug settings
  enableDebugLogging: boolean;
  enableMetricsCollection: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface SessionGlobalConfig {
  version: string;
  defaultSessionConfig: SessionConfig;
  databaseConfig: SessionDatabaseConfig;
  backupConfig: SessionBackupConfig;
  monitoringConfig: SessionMonitoringConfig;
}

export interface SessionDatabaseConfig {
  path: string;
  maxConnections: number;
  connectionTimeout: number;
  enableWAL: boolean;
  vacuumInterval: number;
  backupInterval: number;
}

export interface SessionBackupConfig {
  enableAutoBackup: boolean;
  backupInterval: number;
  maxBackupFiles: number;
  backupLocation: string;
  enableCompression: boolean;
}

export interface SessionMonitoringConfig {
  enableMetrics: boolean;
  metricsInterval: number;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  enableAlerts: boolean;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  memoryUsage: number;
  sessionCount: number;
  responseTime: number;
  errorRate: number;
}