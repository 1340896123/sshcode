/**
 * Connection State Validation Utility
 *
 * Utility functions for validating SSH connection states, ensuring isolation
 * between connections, and detecting potential issues with multiple connections.
 */

import type { Connection, ConnectionStatus, HealthStatus } from '@/types/tab';
import type { IsolatedSession, SessionHealthStatus } from '@/types/session';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'critical';
  connectionId?: string;
  sessionId?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  connectionId?: string;
  sessionId?: string;
}

export interface ConnectionIsolationCheck {
  connectionId: string;
  sessionId: string;
  isIsolated: boolean;
  violations: IsolationViolation[];
}

export interface IsolationViolation {
  type: 'shared-resources' | 'cross-contamination' | 'memory-leak' | 'state-bleed';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedComponent: string;
}

export interface ConnectionHealthCheck {
  connectionId: string;
  status: ConnectionStatus;
  healthStatus: HealthStatus;
  lastActivity: number;
  responseTime: number;
  memoryUsage: number;
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: 'timeout' | 'memory-leak' | 'connection-stale' | 'resource-exhaustion';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}

export interface ConnectionStateValidator {
  // Connection validation
  validateConnection: (connection: Connection) => ValidationResult;
  validateConnectionState: (connectionId: string) => Promise<ValidationResult>;

  // Session isolation validation
  validateSessionIsolation: (sessions: IsolatedSession[]) => Promise<ConnectionIsolationCheck[]>;
  validateCrossSessionContamination: (sessions: IsolatedSession[]) => Promise<ValidationResult>;

  // Health monitoring
  checkConnectionHealth: (connectionId: string) => Promise<ConnectionHealthCheck>;
  validateSystemHealth: () => Promise<ValidationResult>;

  // Resource validation
  validateResourceUsage: (connectionId: string) => Promise<ValidationResult>;
  validateMemoryLimits: (connections: Connection[]) => ValidationResult;
}

export class ConnectionStateValidatorImpl implements ConnectionStateValidator {
  private readonly MAX_CONNECTIONS_PER_HOST = 5;
  private readonly MAX_MEMORY_PER_CONNECTION = 8 * 1024 * 1024; // 8MB
  private readonly MAX_TOTAL_MEMORY = 200 * 1024 * 1024; // 200MB
  private readonly CONNECTION_TIMEOUT = 30 * 1000; // 30 seconds
  private readonly STALE_CONNECTION_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  // ============================================================================
  // CONNECTION VALIDATION
  // ============================================================================

  validateConnection(connection: Connection): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields
    if (!connection.id || connection.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Connection ID is required',
        code: 'MISSING_ID',
        severity: 'error',
        connectionId: connection.id
      });
    }

    if (!connection.host || connection.host.trim() === '') {
      errors.push({
        field: 'host',
        message: 'Host is required',
        code: 'MISSING_HOST',
        severity: 'error',
        connectionId: connection.id
      });
    } else {
      // Validate host format
      if (!this.isValidHost(connection.host)) {
        errors.push({
          field: 'host',
          message: 'Invalid host format',
          code: 'INVALID_HOST',
          severity: 'error',
          connectionId: connection.id
        });
      }
    }

    if (!connection.username || connection.username.trim() === '') {
      errors.push({
        field: 'username',
        message: 'Username is required',
        code: 'MISSING_USERNAME',
        severity: 'error',
        connectionId: connection.id
      });
    }

    // Validate port
    if (connection.port < 1 || connection.port > 65535) {
      errors.push({
        field: 'port',
        message: 'Port must be between 1 and 65535',
        code: 'INVALID_PORT',
        severity: 'error',
        connectionId: connection.id
      });
    }

    // Validate authentication type
    if (!['password', 'key'].includes(connection.authType)) {
      errors.push({
        field: 'authType',
        message: 'Authentication type must be either "password" or "key"',
        code: 'INVALID_AUTH_TYPE',
        severity: 'error',
        connectionId: connection.id
      });
    }

    // Validate status
    if (!this.isValidConnectionStatus(connection.status)) {
      errors.push({
        field: 'status',
        message: 'Invalid connection status',
        code: 'INVALID_STATUS',
        severity: 'error',
        connectionId: connection.id
      });
    }

    // Validate health status
    if (!this.isValidHealthStatus(connection.healthStatus)) {
      errors.push({
        field: 'healthStatus',
        message: 'Invalid health status',
        code: 'INVALID_HEALTH_STATUS',
        severity: 'error',
        connectionId: connection.id
      });
    }

    // Validate numeric fields
    if (connection.reconnectAttempts < 0) {
      errors.push({
        field: 'reconnectAttempts',
        message: 'Reconnect attempts cannot be negative',
        code: 'INVALID_RECONNECT_ATTEMPTS',
        severity: 'error',
        connectionId: connection.id
      });
    }

    if (connection.maxReconnectAttempts < 0 || connection.maxReconnectAttempts > 10) {
      warnings.push({
        field: 'maxReconnectAttempts',
        message: 'Max reconnect attempts should be between 0 and 10',
        suggestion: 'Set a reasonable value between 0 and 10',
        connectionId: connection.id
      });
    }

    if (connection.memoryUsage < 0) {
      errors.push({
        field: 'memoryUsage',
        message: 'Memory usage cannot be negative',
        code: 'INVALID_MEMORY_USAGE',
        severity: 'error',
        connectionId: connection.id
      });
    }

    if (connection.terminalLines < 0) {
      errors.push({
        field: 'terminalLines',
        message: 'Terminal lines cannot be negative',
        code: 'INVALID_TERMINAL_LINES',
        severity: 'error',
        connectionId: connection.id
      });
    }

    // Performance warnings
    if (connection.memoryUsage > this.MAX_MEMORY_PER_CONNECTION) {
      warnings.push({
        field: 'memoryUsage',
        message: `Memory usage (${(connection.memoryUsage / 1024 / 1024).toFixed(1)}MB) exceeds recommended limit`,
        suggestion: 'Consider reducing terminal buffer size or enabling memory cleanup',
        connectionId: connection.id
      });
    }

    if (connection.errorCount > 10) {
      warnings.push({
        field: 'errorCount',
        message: `High error count (${connection.errorCount}) detected`,
        suggestion: 'Investigate connection stability and network issues',
        connectionId: connection.id
      });
    }

    if (connection.latency && connection.latency > 5000) { // 5 seconds
      warnings.push({
        field: 'latency',
        message: `High latency detected (${connection.latency}ms)`,
        suggestion: 'Check network connectivity and server load',
        connectionId: connection.id
      });
    }

    const isValid = errors.length === 0;
    const summary = this.generateValidationSummary(isValid, errors, warnings);

    return {
      isValid,
      errors,
      warnings,
      summary
    };
  }

  async validateConnectionState(connectionId: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // This would typically involve checking the actual connection state
      // For now, we'll validate against expected patterns

      // Check if connection state is consistent
      // In a real implementation, this would query the actual connection

      // Simulate state validation
      const now = Date.now();

      // Example validation logic (would be replaced with actual connection checks)
      warnings.push({
        field: 'state',
        message: 'Connection state validation simulated - implement actual connection checks',
        suggestion: 'Connect to actual SSH connection to validate real state',
        connectionId
      });

    } catch (error) {
      errors.push({
        field: 'state',
        message: `Failed to validate connection state: ${error}`,
        code: 'STATE_VALIDATION_FAILED',
        severity: 'error',
        connectionId
      });
    }

    const isValid = errors.length === 0;
    const summary = this.generateValidationSummary(isValid, errors, warnings);

    return {
      isValid,
      errors,
      warnings,
      summary
    };
  }

  // ============================================================================
  // SESSION ISOLATION VALIDATION
  // ============================================================================

  async validateSessionIsolation(sessions: IsolatedSession[]): Promise<ConnectionIsolationCheck[]> {
    const results: ConnectionIsolationCheck[] = [];

    for (const session of sessions) {
      const violations: IsolationViolation[] = [];

      // Check for memory leaks
      if (session.memoryUsage > this.MAX_MEMORY_PER_CONNECTION) {
        violations.push({
          type: 'memory-leak',
          description: `Session memory usage (${(session.memoryUsage / 1024 / 1024).toFixed(1)}MB) exceeds limit`,
          severity: session.memoryUsage > this.MAX_MEMORY_PER_CONNECTION * 1.5 ? 'critical' : 'high',
          affectedComponent: 'session-memory'
        });
      }

      // Check for stale sessions
      const timeSinceActivity = Date.now() - session.lastActivity;
      if (timeSinceActivity > this.STALE_CONNECTION_THRESHOLD) {
        violations.push({
          type: 'state-bleed',
          description: `Session inactive for ${Math.round(timeSinceActivity / 60000)} minutes`,
          severity: timeSinceActivity > this.STALE_CONNECTION_THRESHOLD * 2 ? 'high' : 'medium',
          affectedComponent: 'session-lifecycle'
        });
      }

      // Check for unhealthy sessions
      if (session.healthStatus !== 'healthy') {
        violations.push({
          type: 'cross-contamination',
          description: `Session health status is ${session.healthStatus}`,
          severity: session.healthStatus === 'error' ? 'critical' : 'medium',
          affectedComponent: 'session-health'
        });
      }

      // Check for shared resource conflicts
      const conflictingSessions = sessions.filter(s =>
        s.id !== session.id &&
        s.connectionId === session.connectionId &&
        s.isolationLevel !== 'full'
      );

      if (conflictingSessions.length > 0) {
        violations.push({
          type: 'shared-resources',
          description: `${conflictingSessions.length} other sessions share the same connection with isolation level ${session.isolationLevel}`,
          severity: 'medium',
          affectedComponent: 'connection-sharing'
        });
      }

      results.push({
        connectionId: session.connectionId,
        sessionId: session.id,
        isIsolated: violations.length === 0,
        violations
      });
    }

    return results;
  }

  async validateCrossSessionContamination(sessions: IsolatedSession[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Group sessions by connection
    const sessionsByConnection = new Map<string, IsolatedSession[]>();
    for (const session of sessions) {
      if (!sessionsByConnection.has(session.connectionId)) {
        sessionsByConnection.set(session.connectionId, []);
      }
      sessionsByConnection.get(session.connectionId)!.push(session);
    }

    // Check each connection group
    for (const [connectionId, connectionSessions] of sessionsByConnection) {
      if (connectionSessions.length > 1) {
        // Multiple sessions on same connection - check isolation levels
        const isolationLevels = connectionSessions.map(s => s.isolationLevel);
        const hasNonFullIsolation = isolationLevels.some(level => level !== 'full');

        if (hasNonFullIsolation) {
          warnings.push({
            field: 'session-isolation',
            message: `Multiple sessions on connection ${connectionId} with non-full isolation`,
            suggestion: 'Consider using full isolation for better session separation',
            connectionId
          });
        }

        // Check for working directory conflicts
        const workingDirectories = connectionSessions.map(s => s.workingDirectory);
        const duplicateDirectories = workingDirectories.filter((dir, index) =>
          workingDirectories.indexOf(dir) !== index
        );

        if (duplicateDirectories.length > 0) {
          warnings.push({
            field: 'working-directory',
            message: `Multiple sessions share the same working directory: ${[...new Set(duplicateDirectories)].join(', ')}`,
            suggestion: 'Ensure each session has an independent working directory',
            connectionId
          });
        }

        // Check memory usage aggregation
        const totalMemory = connectionSessions.reduce((sum, s) => sum + s.memoryUsage, 0);
        if (totalMemory > this.MAX_MEMORY_PER_CONNECTION * 2) {
          errors.push({
            field: 'memory-usage',
            message: `Combined memory usage (${(totalMemory / 1024 / 1024).toFixed(1)}MB) exceeds safe limits`,
            code: 'EXCESSIVE_MEMORY_USAGE',
            severity: 'error',
            connectionId
          });
        }
      }
    }

    // Check total system memory
    const totalMemory = sessions.reduce((sum, s) => sum + s.memoryUsage, 0);
    if (totalMemory > this.MAX_TOTAL_MEMORY) {
      errors.push({
        field: 'system-memory',
        message: `Total system memory usage (${(totalMemory / 1024 / 1024).toFixed(1)}MB) exceeds limits`,
        code: 'SYSTEM_MEMORY_EXCEEDED',
        severity: 'critical'
      });
    }

    const isValid = errors.length === 0;
    const summary = this.generateValidationSummary(isValid, errors, warnings);

    return {
      isValid,
      errors,
      warnings,
      summary
    };
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  async checkConnectionHealth(connectionId: string): Promise<ConnectionHealthCheck> {
    const startTime = Date.now();

    // Simulate health check - in real implementation, this would check actual connection
    const issues: HealthIssue[] = [];

    // Default values for demonstration
    const status: ConnectionStatus = 'connected';
    const healthStatus: HealthStatus = 'healthy';
    const lastActivity = Date.now() - 60000; // 1 minute ago
    const responseTime = 50; // 50ms
    const memoryUsage = 5 * 1024 * 1024; // 5MB

    // Check for issues based on simulated data
    const timeSinceActivity = Date.now() - lastActivity;
    if (timeSinceActivity > this.CONNECTION_TIMEOUT) {
      issues.push({
        type: 'timeout',
        description: `Connection inactive for ${Math.round(timeSinceActivity / 1000)} seconds`,
        severity: timeSinceActivity > this.CONNECTION_TIMEOUT * 2 ? 'critical' : 'high',
        recommendedAction: 'Check connection status and consider reconnecting'
      });
    }

    if (memoryUsage > this.MAX_MEMORY_PER_CONNECTION) {
      issues.push({
        type: 'memory-leak',
        description: `Memory usage (${(memoryUsage / 1024 / 1024).toFixed(1)}MB) exceeds recommended limit`,
        severity: memoryUsage > this.MAX_MEMORY_PER_CONNECTION * 1.5 ? 'critical' : 'high',
        recommendedAction: 'Enable memory cleanup or reduce buffer sizes'
      });
    }

    if (responseTime > 1000) {
      issues.push({
        type: 'connection-stale',
        description: `High response time detected (${responseTime}ms)`,
        severity: responseTime > 5000 ? 'critical' : 'medium',
        recommendedAction: 'Check network connectivity and server load'
      });
    }

    const endTime = Date.now();

    return {
      connectionId,
      status,
      healthStatus,
      lastActivity,
      responseTime: endTime - startTime,
      memoryUsage,
      issues
    };
  }

  async validateSystemHealth(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Simulate system health checks
      // In real implementation, this would check actual system state

      warnings.push({
        field: 'system-health',
        message: 'System health validation simulated - implement actual system monitoring',
        suggestion: 'Connect to system monitoring APIs for real-time health data'
      });

    } catch (error) {
      errors.push({
        field: 'system-health',
        message: `Failed to validate system health: ${error}`,
        code: 'SYSTEM_HEALTH_CHECK_FAILED',
        severity: 'critical'
      });
    }

    const isValid = errors.length === 0;
    const summary = this.generateValidationSummary(isValid, errors, warnings);

    return {
      isValid,
      errors,
      warnings,
      summary
    };
  }

  // ============================================================================
  // RESOURCE VALIDATION
  // ============================================================================

  async validateResourceUsage(connectionId: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Simulate resource usage validation
      // In real implementation, this would check actual resource usage

      warnings.push({
        field: 'resource-usage',
        message: 'Resource usage validation simulated - implement actual resource monitoring',
        suggestion: 'Connect to system resource monitoring APIs',
        connectionId
      });

    } catch (error) {
      errors.push({
        field: 'resource-usage',
        message: `Failed to validate resource usage: ${error}`,
        code: 'RESOURCE_VALIDATION_FAILED',
        severity: 'error',
        connectionId
      });
    }

    const isValid = errors.length === 0;
    const summary = this.generateValidationSummary(isValid, errors, warnings);

    return {
      isValid,
      errors,
      warnings,
      summary
    };
  }

  validateMemoryLimits(connections: Connection[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const totalMemory = connections.reduce((sum, conn) => sum + conn.memoryUsage, 0);

    // Check total memory limit
    if (totalMemory > this.MAX_TOTAL_MEMORY) {
      errors.push({
        field: 'total-memory',
        message: `Total memory usage (${(totalMemory / 1024 / 1024).toFixed(1)}MB) exceeds system limit`,
        code: 'TOTAL_MEMORY_EXCEEDED',
        severity: 'critical'
      });
    } else if (totalMemory > this.MAX_TOTAL_MEMORY * 0.8) {
      warnings.push({
        field: 'total-memory',
        message: `Total memory usage (${(totalMemory / 1024 / 1024).toFixed(1)}MB) approaching limit`,
        suggestion: 'Consider closing inactive connections'
      });
    }

    // Check individual connection memory
    for (const connection of connections) {
      if (connection.memoryUsage > this.MAX_MEMORY_PER_CONNECTION) {
        errors.push({
          field: 'connection-memory',
          message: `Connection ${connection.id} memory usage (${(connection.memoryUsage / 1024 / 1024).toFixed(1)}MB) exceeds per-connection limit`,
          code: 'CONNECTION_MEMORY_EXCEEDED',
          severity: 'error',
          connectionId: connection.id
        });
      } else if (connection.memoryUsage > this.MAX_MEMORY_PER_CONNECTION * 0.8) {
        warnings.push({
          field: 'connection-memory',
          message: `Connection ${connection.id} memory usage (${(connection.memoryUsage / 1024 / 1024).toFixed(1)}MB) approaching limit`,
          suggestion: 'Consider reducing terminal buffer size',
          connectionId: connection.id
        });
      }
    }

    // Check memory distribution
    const avgMemory = connections.length > 0 ? totalMemory / connections.length : 0;
    const highMemoryConnections = connections.filter(conn => conn.memoryUsage > avgMemory * 2);

    if (highMemoryConnections.length > 0 && highMemoryConnections.length < connections.length) {
      warnings.push({
        field: 'memory-distribution',
        message: `${highMemoryConnections.length} connections using significantly more memory than average`,
        suggestion: 'Investigate high memory usage connections',
        connectionId: highMemoryConnections.map(conn => conn.id).join(', ')
      });
    }

    const isValid = errors.length === 0;
    const summary = this.generateValidationSummary(isValid, errors, warnings);

    return {
      isValid,
      errors,
      warnings,
      summary
    };
  }

  // ============================================================================
  // PRIVATE UTILITY METHODS
  // ============================================================================

  private isValidHost(host: string): boolean {
    // Basic host validation - could be enhanced with more sophisticated checks
    const hostRegex = /^[a-zA-Z0-9.-]+$/;
    return hostRegex.test(host) && !host.startsWith('.') && !host.endsWith('.');
  }

  private isValidConnectionStatus(status: string): boolean {
    const validStatuses: ConnectionStatus[] = ['disconnected', 'connecting', 'connected', 'failed', 'reconnecting'];
    return validStatuses.includes(status as ConnectionStatus);
  }

  private isValidHealthStatus(status: string): boolean {
    const validStatuses: HealthStatus[] = ['healthy', 'unhealthy', 'failed'];
    return validStatuses.includes(status as HealthStatus);
  }

  private generateValidationSummary(isValid: boolean, errors: ValidationError[], warnings: ValidationWarning[]): string {
    if (isValid && warnings.length === 0) {
      return 'Validation passed successfully';
    } else if (isValid && warnings.length > 0) {
      return `Validation passed with ${warnings.length} warning(s)`;
    } else {
      return `Validation failed with ${errors.length} error(s)${warnings.length > 0 ? ` and ${warnings.length} warning(s)` : ''}`;
    }
  }
}

// Export singleton instance
export const connectionStateValidator = new ConnectionStateValidatorImpl();

// Utility functions for easy access
export const validateConnection = (connection: Connection) =>
  connectionStateValidator.validateConnection(connection);
export const validateMemoryLimits = (connections: Connection[]) =>
  connectionStateValidator.validateMemoryLimits(connections);
export const checkConnectionHealth = (connectionId: string) =>
  connectionStateValidator.checkConnectionHealth(connectionId);