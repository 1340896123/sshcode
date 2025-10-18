/**
 * Connection Limit Detection Service
 *
 * Service for monitoring and enforcing connection limits to ensure optimal performance
 * and prevent resource exhaustion. Provides graceful degradation and user notifications.
 */

import { EventEmitter } from 'events';
import type { SessionLimitConfig, SessionLimitStatus } from '@/types/tab';

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  memoryUsage: number;
  averageLatency: number;
  bytesTransferred: {
    sent: number;
    received: number;
  };
}

export interface ConnectionLimitAlert {
  level: 'warning' | 'critical' | 'emergency';
  message: string;
  currentConnections: number;
  maxConnections: number;
  memoryUsage?: number;
  memoryLimit?: number;
  suggestedActions: string[];
  timestamp: number;
}

export interface ConnectionLimitConfig {
  maxTotalConnections: number;
  maxConnectionsPerHost: number;
  maxMemoryUsage: number;
  warningThreshold: number; // Percentage (0.0-1.0)
  criticalThreshold: number; // Percentage (0.0-1.0)
  enableGracefulDegradation: boolean;
  monitoringInterval: number; // milliseconds
  enableAutoCleanup: boolean;
  cleanupThreshold: number; // Percentage (0.0-1.0)
}

export class ConnectionLimitService extends EventEmitter {
  private config: ConnectionLimitConfig;
  private connectionMetrics: ConnectionMetrics;
  private connectionCountsByHost: Map<string, number> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private alertHistory: ConnectionLimitAlert[] = [];
  private maxAlertHistory = 100;

  constructor(config: Partial<ConnectionLimitConfig> = {}) {
    super();

    this.config = {
      maxTotalConnections: 15,
      maxConnectionsPerHost: 5,
      maxMemoryUsage: 200 * 1024 * 1024, // 200MB
      warningThreshold: 0.8, // 80%
      criticalThreshold: 0.95, // 95%
      enableGracefulDegradation: true,
      monitoringInterval: 30000, // 30 seconds
      enableAutoCleanup: true,
      cleanupThreshold: 0.9, // 90%
      ...config
    };

    this.connectionMetrics = this.initializeMetrics();
  }

  // ============================================================================
  // MONITORING AND LIMIT DETECTION
  // ============================================================================

  /**
   * Start monitoring connection limits
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkConnectionLimits();
    }, this.config.monitoringInterval);

    console.log('Connection limit monitoring started');
    this.emit('monitoring-started', { timestamp: Date.now() });
  }

  /**
   * Stop monitoring connection limits
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('Connection limit monitoring stopped');
    this.emit('monitoring-stopped', { timestamp: Date.now() });
  }

  /**
   * Check if a new connection can be created
   */
  canCreateConnection(host?: string): {
    allowed: boolean;
    reason?: string;
    alert?: ConnectionLimitAlert;
    suggestedActions: string[];
  } {
    const suggestedActions: string[] = [];
    let reason: string | undefined;
    let alert: ConnectionLimitAlert | undefined;

    // Check total connection limit
    if (this.connectionMetrics.totalConnections >= this.config.maxTotalConnections) {
      suggestedActions.push('Close inactive connections');
      suggestedActions.push('Wait for current connections to complete');
      suggestedActions.push('Increase maximum connection limit in settings');

      reason = `Maximum total connections reached (${this.config.maxTotalConnections})`;

      alert = this.createAlert('emergency', reason, suggestedActions);
      return { allowed: false, reason, alert, suggestedActions };
    }

    // Check per-host limit if host is specified
    if (host) {
      const hostConnections = this.connectionCountsByHost.get(host) || 0;
      if (hostConnections >= this.config.maxConnectionsPerHost) {
        suggestedActions.push(`Close connections to ${host}`);
        suggestedActions.push('Wait for current connections to complete');
        suggestedActions.push(`Increase per-host connection limit for ${host}`);

        reason = `Maximum connections per host reached (${this.config.maxConnectionsPerHost})`;

        alert = this.createAlert('critical', reason, suggestedActions);
        return { allowed: false, reason, alert, suggestedActions };
      }
    }

    // Check memory usage
    const memoryPercentage = this.connectionMetrics.memoryUsage / this.config.maxMemoryUsage;
    if (memoryPercentage >= this.config.criticalThreshold) {
      suggestedActions.push('Free up memory by closing inactive connections');
      suggestedActions.push('Enable automatic memory cleanup');
      suggestedActions.push('Restart application if memory issues persist');

      reason = `Memory usage critically high (${(memoryPercentage * 100).toFixed(1)}%)`;

      alert = this.createAlert('critical', reason, suggestedActions);
      return { allowed: false, reason, alert, suggestedActions };
    }

    // Check warning threshold
    if (memoryPercentage >= this.config.warningThreshold) {
      suggestedActions.push('Consider closing inactive connections');
      suggestedActions.push('Monitor memory usage closely');

      reason = `Memory usage elevated (${(memoryPercentage * 100).toFixed(1)}%)`;

      alert = this.createAlert('warning', reason, suggestedActions);
      // Still allow connection but with warning
      return { allowed: true, reason, alert, suggestedActions };
    }

    return { allowed: true, suggestedActions };
  }

  /**
   * Check current connection limits and emit alerts if necessary
   */
  private checkConnectionLimits(): void {
    const totalPercentage = this.connectionMetrics.totalConnections / this.config.maxTotalConnections;
    const memoryPercentage = this.connectionMetrics.memoryUsage / this.config.maxMemoryUsage;

    // Check for warning conditions
    if (totalPercentage >= this.config.warningThreshold || memoryPercentage >= this.config.warningThreshold) {
      const level = totalPercentage >= this.config.criticalThreshold || memoryPercentage >= this.config.criticalThreshold
        ? 'critical'
        : 'warning';

      const suggestedActions: string[] = [];
      if (totalPercentage >= this.config.warningThreshold) {
        suggestedActions.push('Monitor connection count');
      }
      if (memoryPercentage >= this.config.warningThreshold) {
        suggestedActions.push('Monitor memory usage');
        suggestedActions.push('Consider memory cleanup');
      }

      const reason = `Resource usage high: Connections ${(totalPercentage * 100).toFixed(1)}%, Memory ${(memoryPercentage * 100).toFixed(1)}%`;
      const alert = this.createAlert(level, reason, suggestedActions);

      this.emitAlert(alert);
    }

    // Check if auto cleanup should be triggered
    if (this.config.enableAutoCleanup && memoryPercentage >= this.config.cleanupThreshold) {
      this.emit('auto-cleanup-triggered', {
        reason: 'Memory usage exceeded cleanup threshold',
        memoryUsage: this.connectionMetrics.memoryUsage,
        memoryLimit: this.config.maxMemoryUsage,
        percentage: memoryPercentage
      });
    }

    // Emit current status
    this.emit('limits-checked', {
      metrics: this.connectionMetrics,
      config: this.config,
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // CONNECTION TRACKING
  // ============================================================================

  /**
   * Update connection metrics
   */
  updateConnectionMetrics(metrics: Partial<ConnectionMetrics>): void {
    this.connectionMetrics = { ...this.connectionMetrics, ...metrics };
    this.emit('metrics-updated', { metrics: this.connectionMetrics, timestamp: Date.now() });
  }

  /**
   * Increment connection count for a host
   */
  incrementConnectionCount(host: string): void {
    const current = this.connectionCountsByHost.get(host) || 0;
    this.connectionCountsByHost.set(host, current + 1);
    this.connectionMetrics.totalConnections++;

    this.emit('connection-added', { host, count: current + 1, total: this.connectionMetrics.totalConnections });
  }

  /**
   * Decrement connection count for a host
   */
  decrementConnectionCount(host: string): void {
    const current = this.connectionCountsByHost.get(host) || 0;
    if (current > 0) {
      this.connectionCountsByHost.set(host, current - 1);
      this.connectionMetrics.totalConnections--;

      // Clean up host entry if no more connections
      if (current - 1 === 0) {
        this.connectionCountsByHost.delete(host);
      }

      this.emit('connection-removed', { host, count: current - 1, total: this.connectionMetrics.totalConnections });
    }
  }

  /**
   * Get connection count for a specific host
   */
  getConnectionCount(host: string): number {
    return this.connectionCountsByHost.get(host) || 0;
  }

  /**
   * Get all host connection counts
   */
  getAllHostConnectionCounts(): Map<string, number> {
    return new Map(this.connectionCountsByHost);
  }

  /**
   * Update memory usage
   */
  updateMemoryUsage(memoryUsage: number): void {
    this.connectionMetrics.memoryUsage = memoryUsage;
    this.emit('memory-updated', { memoryUsage, timestamp: Date.now() });
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(fromStatus: string, toStatus: string): void {
    if (fromStatus === 'active' && toStatus !== 'active') {
      this.connectionMetrics.activeConnections--;
    } else if (fromStatus !== 'active' && toStatus === 'active') {
      this.connectionMetrics.activeConnections++;
    } else if (fromStatus !== 'failed' && toStatus === 'failed') {
      this.connectionMetrics.failedConnections++;
    }

    this.emit('connection-status-changed', { fromStatus, toStatus, metrics: this.connectionMetrics });
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConnectionLimitConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.emit('config-updated', { oldConfig, newConfig: this.config, timestamp: Date.now() });

    // Restart monitoring if interval changed
    if (newConfig.monitoringInterval && this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ConnectionLimitConfig {
    return { ...this.config };
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get current status and limits
   */
  getStatus(): {
    metrics: ConnectionMetrics;
    config: ConnectionLimitConfig;
    connectionUtilization: number;
    memoryUtilization: number;
    isNearLimits: boolean;
    canCreateMoreConnections: boolean;
  } {
    const connectionUtilization = this.connectionMetrics.totalConnections / this.config.maxTotalConnections;
    const memoryUtilization = this.connectionMetrics.memoryUsage / this.config.maxMemoryUsage;
    const isNearLimits = connectionUtilization >= this.config.warningThreshold ||
                        memoryUtilization >= this.config.warningThreshold;
    const canCreateMoreConnections = this.canCreateConnection().allowed;

    return {
      metrics: this.connectionMetrics,
      config: this.config,
      connectionUtilization,
      memoryUtilization,
      isNearLimits,
      canCreateMoreConnections
    };
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): ConnectionLimitAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level: 'warning' | 'critical' | 'emergency'): ConnectionLimitAlert[] {
    return this.alertHistory.filter(alert => alert.level === level);
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(): void {
    this.alertHistory = [];
    this.emit('alert-history-cleared', { timestamp: Date.now() });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get connection limit suggestions
   */
  getSuggestions(): string[] {
    const suggestions: string[] = [];
    const connectionUtilization = this.connectionMetrics.totalConnections / this.config.maxTotalConnections;
    const memoryUtilization = this.connectionMetrics.memoryUsage / this.config.maxMemoryUsage;

    if (connectionUtilization >= 0.8) {
      suggestions.push('Consider closing inactive connections');
      suggestions.push('Monitor connection patterns');
    }

    if (memoryUtilization >= 0.8) {
      suggestions.push('Enable automatic memory cleanup');
      suggestions.push('Reduce terminal buffer sizes');
      suggestions.push('Limit AI assistant history');
    }

    if (connectionUtilization >= 0.95 || memoryUtilization >= 0.95) {
      suggestions.push('Immediate action required - system at capacity');
      suggestions.push('Consider restarting application');
    }

    const hostsNearLimit = Array.from(this.connectionCountsByHost.entries())
      .filter(([_, count]) => count >= this.config.maxConnectionsPerHost * 0.8);

    if (hostsNearLimit.length > 0) {
      suggestions.push(`Multiple hosts near connection limit: ${hostsNearLimit.map(([host]) => host).join(', ')}`);
    }

    return suggestions;
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): {
    connection: string[];
    memory: string[];
    general: string[];
  } {
    const connectionUtilization = this.connectionMetrics.totalConnections / this.config.maxTotalConnections;
    const memoryUtilization = this.connectionMetrics.memoryUsage / this.config.maxMemoryUsage;

    const connection: string[] = [];
    const memory: string[] = [];
    const general: string[] = [];

    // Connection recommendations
    if (connectionUtilization > 0.7) {
      connection.push('Implement connection pooling');
      connection.push('Set shorter connection timeouts');
      connection.push('Enable automatic connection cleanup');
    }

    if (this.connectionMetrics.failedConnections > this.connectionMetrics.activeConnections * 0.2) {
      connection.push('Investigate high failure rate');
      connection.push('Implement connection retry logic');
      connection.push('Check network stability');
    }

    // Memory recommendations
    if (memoryUtilization > 0.7) {
      memory.push('Reduce terminal history buffer size');
      memory.push('Enable automatic memory cleanup');
      memory.push('Implement memory usage monitoring');
    }

    if (this.connectionMetrics.memoryUsage > 150 * 1024 * 1024) { // 150MB
      memory.push('Consider reducing maximum concurrent connections');
      memory.push('Implement memory compression for stored data');
    }

    // General recommendations
    if (connectionUtilization > 0.8 || memoryUtilization > 0.8) {
      general.push('System operating near capacity - monitor closely');
      general.push('Consider upgrading system resources');
      general.push('Implement performance monitoring dashboard');
    }

    return { connection, memory, general };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeMetrics(): ConnectionMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      memoryUsage: 0,
      averageLatency: 0,
      bytesTransferred: { sent: 0, received: 0 }
    };
  }

  private createAlert(level: 'warning' | 'critical' | 'emergency', message: string, suggestedActions: string[]): ConnectionLimitAlert {
    return {
      level,
      message,
      currentConnections: this.connectionMetrics.totalConnections,
      maxConnections: this.config.maxTotalConnections,
      memoryUsage: this.connectionMetrics.memoryUsage,
      memoryLimit: this.config.maxMemoryUsage,
      suggestedActions,
      timestamp: Date.now()
    };
  }

  private emitAlert(alert: ConnectionLimitAlert): void {
    this.alertHistory.push(alert);

    // Keep only recent alerts
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxAlertHistory);
    }

    this.emit('alert', alert);

    // Log alert based on level
    const logMethod = alert.level === 'emergency' ? 'error' : alert.level === 'critical' ? 'warn' : 'info';
    console[logMethod](`Connection Limit Alert [${alert.level.toUpperCase()}]: ${alert.message}`);
  }

  // Cleanup method
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.alertHistory = [];
    this.connectionCountsByHost.clear();
  }
}

// Export singleton instance
export const connectionLimitService = new ConnectionLimitService();

// Utility functions for easy access
export const startConnectionMonitoring = () => connectionLimitService.startMonitoring();
export const stopConnectionMonitoring = () => connectionLimitService.stopMonitoring();
export const canCreateConnection = (host?: string) => connectionLimitService.canCreateConnection(host);
export const getConnectionStatus = () => connectionLimitService.getStatus();
export const updateConnectionMetrics = (metrics: Partial<ConnectionMetrics>) =>
  connectionLimitService.updateConnectionMetrics(metrics);