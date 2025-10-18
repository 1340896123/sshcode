/**
 * Memory Management Utility
 *
 * Provides memory monitoring and cleanup functionality for the SSH client
 * to ensure optimal performance and prevent memory leaks.
 * Enhanced with session-specific memory tracking for isolated session management.
 */

import type { SessionMemoryManager, MemoryUsage, MemoryEnforcementResult, MemoryCleanupResult, MemoryOptimizationResult, EmergencyCleanupResult, OptimizationType } from '../types/session';

// Type declaration for performance.memory API
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

interface MemoryThresholds {
  warning: number;  // 75%
  critical: number; // 90%
  emergency: number; // 95%
}

interface MemoryCleanupOptions {
  forceGarbageCollection?: boolean;
  clearTerminalBuffers?: boolean;
  closeInactiveConnections?: boolean;
  clearConsoleLogs?: boolean;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private stats: MemoryStats[] = [];
  private maxStats = 100; // Keep last 100 measurements
  private thresholds: MemoryThresholds = {
    warning: 75,
    critical: 90,
    emergency: 95
  };
  private cleanupCallbacks: Map<string, () => void> = new Map();
  private monitoringInterval: number | null = null;
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get current memory statistics
   */
  getCurrentMemoryStats(): MemoryStats | null {
    try {
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        const percentage = (used / total) * 100;

        return {
          used,
          total,
          percentage,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.warn('Failed to get memory stats:', error);
    }
    return null;
  }

  /**
   * Record memory statistics
   */
  recordMemoryStats(): void {
    const stats = this.getCurrentMemoryStats();
    if (stats) {
      this.stats.push(stats);

      // Keep only the latest measurements
      if (this.stats.length > this.maxStats) {
        this.stats.shift();
      }

      // Check thresholds and trigger cleanup if needed
      this.checkMemoryThresholds(stats);
    }
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(minutes: number = 5): MemoryStats[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.stats.filter(stat => stat.timestamp > cutoff);
  }

  /**
   * Get average memory usage over time period
   */
  getAverageMemoryUsage(minutes: number = 5): number {
    const trend = this.getMemoryTrend(minutes);
    if (trend.length === 0) return 0;

    const total = trend.reduce((sum, stat) => sum + stat.percentage, 0);
    return total / trend.length;
  }

  /**
   * Check if memory usage is trending up
   */
  isMemoryTrendingUp(minutes: number = 2): boolean {
    const trend = this.getMemoryTrend(minutes);
    if (trend.length < 2) return false;

    const recent = trend.slice(-Math.floor(trend.length / 2));
    const older = trend.slice(0, Math.floor(trend.length / 2));

    const recentAvg = recent.reduce((sum, stat) => sum + stat.percentage, 0) / recent.length;
    const olderAvg = older.reduce((sum, stat) => sum + stat.percentage, 0) / older.length;

    return recentAvg > olderAvg + 5; // 5% threshold
  }

  /**
   * Check memory thresholds and trigger cleanup
   */
  private checkMemoryThresholds(stats: MemoryStats): void {
    const { percentage } = stats;

    if (percentage >= this.thresholds.emergency) {
      console.warn(`Memory usage critical: ${percentage.toFixed(1)}%`);
      this.performEmergencyCleanup();
    } else if (percentage >= this.thresholds.critical) {
      console.warn(`Memory usage high: ${percentage.toFixed(1)}%`);
      this.performCriticalCleanup();
    } else if (percentage >= this.thresholds.warning) {
      console.info(`Memory usage elevated: ${percentage.toFixed(1)}%`);
      this.performWarningCleanup();
    }
  }

  /**
   * Perform warning level cleanup
   */
  private performWarningCleanup(): void {
    this.executeCleanupCallbacks('warning');

    // Clear old console logs
    if (typeof console.clear === 'function') {
      console.clear();
    }
  }

  /**
   * Perform critical level cleanup
   */
  private performCriticalCleanup(): void {
    this.executeCleanupCallbacks('critical');

    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  /**
   * Perform emergency cleanup
   */
  private performEmergencyCleanup(): void {
    this.executeCleanupCallbacks('emergency');

    // Aggressive cleanup
    this.forceGarbageCollection();
    this.executeCleanupCallbacks('warning'); // Run warning level too

    // Notify user
    this.notifyUser('Memory usage is critically high. Some cleanup has been performed.');
  }

  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(): void {
    try {
      if (window.gc) {
        window.gc();
        console.log('Forced garbage collection');
      }
    } catch (error) {
      console.debug('Garbage collection not available:', error);
    }
  }

  /**
   * Execute registered cleanup callbacks
   */
  private executeCleanupCallbacks(level: 'warning' | 'critical' | 'emergency'): void {
    const prefix = `${level}-`;
    for (const [key, callback] of this.cleanupCallbacks) {
      if (key.startsWith(prefix)) {
        try {
          callback();
        } catch (error) {
          console.error(`Cleanup callback failed for ${key}:`, error);
        }
      }
    }
  }

  /**
   * Register cleanup callback
   */
  registerCleanupCallback(name: string, callback: () => void): void {
    this.cleanupCallbacks.set(name, callback);
  }

  /**
   * Unregister cleanup callback
   */
  unregisterCleanupCallback(name: string): void {
    this.cleanupCallbacks.delete(name);
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.recordMemoryStats();
    }, intervalMs);

    console.log('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('Memory monitoring stopped');
  }

  /**
   * Perform manual cleanup
   */
  performCleanup(options: MemoryCleanupOptions = {}): void {
    console.log('Performing manual memory cleanup...');

    if (options.clearConsoleLogs !== false) {
      if (typeof console.clear === 'function') {
        console.clear();
      }
    }

    if (options.forceGarbageCollection) {
      this.forceGarbageCollection();
    }

    // Execute all cleanup callbacks
    for (const [key, callback] of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error(`Cleanup callback failed for ${key}:`, error);
      }
    }

    const stats = this.getCurrentMemoryStats();
    if (stats) {
      console.log(`Memory after cleanup: ${stats.percentage.toFixed(1)}%`);
    }
  }

  /**
   * Get memory report
   */
  getMemoryReport(): string {
    const current = this.getCurrentMemoryStats();
    const avg5min = this.getAverageMemoryUsage(5);
    const trendingUp = this.isMemoryTrendingUp();

    if (!current) {
      return 'Memory statistics not available';
    }

    return `
Memory Report:
- Current: ${current.percentage.toFixed(1)}% (${(current.used / 1024 / 1024).toFixed(1)}MB / ${(current.total / 1024 / 1024).toFixed(1)}MB)
- 5min Average: ${avg5min.toFixed(1)}%
- Trend: ${trendingUp ? '↑ Increasing' : '→ Stable'}
- Status: ${this.getMemoryStatus(current.percentage)}
    `.trim();
  }

  /**
   * Get memory status based on percentage
   */
  private getMemoryStatus(percentage: number): string {
    if (percentage >= this.thresholds.emergency) return '🔴 Critical';
    if (percentage >= this.thresholds.critical) return '🟠 High';
    if (percentage >= this.thresholds.warning) return '🟡 Elevated';
    return '🟢 Normal';
  }

  /**
   * Notify user about memory issues
   */
  private notifyUser(message: string): void {
    // Dispatch custom event for UI components to handle
    const event = new CustomEvent('memory-warning', {
      detail: {
        message,
        timestamp: Date.now(),
        stats: this.getCurrentMemoryStats()
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Set custom thresholds
   */
  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): MemoryThresholds {
    return { ...this.thresholds };
  }

  /**
   * Clear all recorded stats
   */
  clearStats(): void {
    this.stats = [];
  }

  /**
   * Export memory data for analysis
   */
  exportData(): string {
    return JSON.stringify({
      thresholds: this.thresholds,
      stats: this.stats,
      exportTime: Date.now()
    }, null, 2);
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// ============================================================================
// SESSION MEMORY MANAGER
// ============================================================================

export class SessionMemoryManagerImpl implements SessionMemoryManager {
  private sessionMemoryUsage: Map<string, MemoryUsage> = new Map();
  private sessionLimits: Map<string, number> = new Map();
  private totalMemoryLimit: number = 200 * 1024 * 1024; // 200MB default
  private cleanupCallbacks: Map<string, (() => void)[]> = new Map();
  private emergencyThreshold: number = 0.95; // 95%
  private autoCleanupEnabled: boolean = false;
  private autoCleanupInterval: NodeJS.Timeout | null = null;

  constructor(totalMemoryLimit?: number) {
    if (totalMemoryLimit) {
      this.totalMemoryLimit = totalMemoryLimit;
    }
  }

  // ============================================================================
  // MEMORY TRACKING
  // ============================================================================

  async getSessionMemoryUsage(sessionId: string): Promise<MemoryUsage> {
    let usage = this.sessionMemoryUsage.get(sessionId);

    if (!usage) {
      // Initialize memory usage for new session
      usage = {
        sessionId,
        totalUsage: 0,
        terminalMemory: 0,
        fileManagerMemory: 0,
        aiAssistantMemory: 0,
        shellMemory: 0,
        connectionMemory: 0,
        lastUpdated: Date.now()
      };
      this.sessionMemoryUsage.set(sessionId, usage);
    }

    // Update with current estimates
    await this.updateSessionMemoryEstimates(sessionId);

    return usage;
  }

  async getTotalMemoryUsage(): Promise<number> {
    let total = 0;
    for (const usage of this.sessionMemoryUsage.values()) {
      total += usage.totalUsage;
    }

    // Add base application memory usage
    const baseMemory = this.getBaseApplicationMemory();
    total += baseMemory;

    return total;
  }

  async getMemoryUsageBySession(): Promise<Map<string, MemoryUsage>> {
    // Update all sessions before returning
    const updatePromises = Array.from(this.sessionMemoryUsage.keys()).map(
      sessionId => this.updateSessionMemoryEstimates(sessionId)
    );
    await Promise.all(updatePromises);

    return new Map(this.sessionMemoryUsage);
  }

  // ============================================================================
  // MEMORY CONTROL
  // ============================================================================

  async setMemoryLimit(sessionId: string, limit: number): Promise<void> {
    this.sessionLimits.set(sessionId, limit);
    console.log(`Set memory limit for session ${sessionId}: ${(limit / 1024 / 1024).toFixed(1)}MB`);
  }

  async enforceMemoryLimits(): Promise<MemoryEnforcementResult> {
    const sessionsEnforced: string[] = [];
    let memoryFreed = 0;
    const sessionsTerminated: string[] = [];
    const warnings: string[] = [];

    for (const [sessionId, usage] of this.sessionMemoryUsage) {
      const limit = this.sessionLimits.get(sessionId) || (this.totalMemoryLimit / 10); // Default 10% of total
      const totalUsage = await this.getTotalMemoryUsage();

      if (usage.totalUsage > limit) {
        // Try cleanup first
        const cleanupResult = await this.cleanupSessionMemory(sessionId);
        memoryFreed += cleanupResult.memoryFreed;

        // Check if still over limit
        const updatedUsage = await this.getSessionMemoryUsage(sessionId);
        if (updatedUsage.totalUsage > limit) {
          // More aggressive cleanup
          const optimizationResult = await this.optimizeSessionMemory(sessionId);
          memoryFreed += optimizationResult.memoryOptimized;

          // Final check - consider termination if still over limit
          const finalUsage = await this.getSessionMemoryUsage(sessionId);
          if (finalUsage.totalUsage > limit * 1.2) { // 20% tolerance
            sessionsTerminated.push(sessionId);
            warnings.push(`Session ${sessionId} exceeded memory limit significantly and may need termination`);
          } else {
            sessionsEnforced.push(sessionId);
          }
        }
      }

      // Check total memory limit
      if (totalUsage > this.totalMemoryLimit * this.emergencyThreshold) {
        warnings.push('Total memory usage approaching critical threshold');
        break;
      }
    }

    return {
      sessionsEnforced,
      memoryFreed,
      sessionsTerminated,
      warnings
    };
  }

  // ============================================================================
  // MEMORY CLEANUP
  // ============================================================================

  async cleanupSessionMemory(sessionId: string): Promise<MemoryCleanupResult> {
    const startTime = Date.now();
    let memoryFreed = 0;
    const componentsCleaned: string[] = [];
    const errors: string[] = [];

    try {
      const usage = this.sessionMemoryUsage.get(sessionId);
      if (!usage) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Cleanup terminal memory
      const terminalFreed = await this.cleanupTerminalMemory(sessionId);
      if (terminalFreed > 0) {
        memoryFreed += terminalFreed;
        componentsCleaned.push('terminal-buffer');
      }

      // Cleanup file manager memory
      const fileManagerFreed = await this.cleanupFileManagerMemory(sessionId);
      if (fileManagerFreed > 0) {
        memoryFreed += fileManagerFreed;
        componentsCleaned.push('file-cache');
      }

      // Cleanup AI assistant memory
      const aiFreed = await this.cleanupAIAssistantMemory(sessionId);
      if (aiFreed > 0) {
        memoryFreed += aiFreed;
        componentsCleaned.push('ai-history');
      }

      // Cleanup shell memory
      const shellFreed = await this.cleanupShellMemory(sessionId);
      if (shellFreed > 0) {
        memoryFreed += shellFreed;
        componentsCleaned.push('shell-history');
      }

      // Run custom cleanup callbacks
      const callbacks = this.cleanupCallbacks.get(sessionId) || [];
      for (const callback of callbacks) {
        try {
          await callback();
          componentsCleaned.push('custom-cleanup');
        } catch (error) {
          errors.push(`Custom cleanup callback failed: ${error}`);
        }
      }

      // Update memory usage
      await this.updateSessionMemoryEstimates(sessionId);

    } catch (error) {
      errors.push(`Cleanup failed for session ${sessionId}: ${error}`);
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    return {
      memoryFreed,
      componentsCleaned,
      duration,
      success,
      errors
    };
  }

  async cleanupAllSessions(): Promise<MemoryCleanupResult> {
    const sessionIds = Array.from(this.sessionMemoryUsage.keys());
    let totalMemoryFreed = 0;
    const allComponentsCleaned: string[] = [];
    const allErrors: string[] = [];
    let totalDuration = 0;

    for (const sessionId of sessionIds) {
      try {
        const result = await this.cleanupSessionMemory(sessionId);
        totalMemoryFreed += result.memoryFreed;
        allComponentsCleaned.push(...result.componentsCleaned);
        allErrors.push(...result.errors);
        totalDuration += result.duration;
      } catch (error) {
        allErrors.push(`Failed to cleanup session ${sessionId}: ${error}`);
      }
    }

    return {
      memoryFreed: totalMemoryFreed,
      componentsCleaned: [...new Set(allComponentsCleaned)],
      duration: totalDuration,
      success: allErrors.length === 0,
      errors: allErrors
    };
  }

  // ============================================================================
  // AUTO CLEANUP MANAGEMENT
  // ============================================================================

  enableAutoCleanup(threshold: number, interval: number): void {
    this.emergencyThreshold = threshold;
    this.autoCleanupEnabled = true;

    if (this.autoCleanupInterval) {
      clearInterval(this.autoCleanupInterval);
    }

    this.autoCleanupInterval = setInterval(async () => {
      try {
        const totalUsage = await this.getTotalMemoryUsage();
        if (totalUsage > this.totalMemoryLimit * threshold) {
          console.log(`Auto cleanup triggered - memory usage: ${(totalUsage / 1024 / 1024).toFixed(1)}MB`);
          await this.cleanupAllSessions();
        }
      } catch (error) {
        console.error('Auto cleanup failed:', error);
      }
    }, interval);

    console.log(`Auto cleanup enabled - threshold: ${(threshold * 100).toFixed(1)}%, interval: ${interval}ms`);
  }

  disableAutoCleanup(): void {
    if (this.autoCleanupInterval) {
      clearInterval(this.autoCleanupInterval);
      this.autoCleanupInterval = null;
    }
    this.autoCleanupEnabled = false;
    console.log('Auto cleanup disabled');
  }

  // ============================================================================
  // MEMORY OPTIMIZATION
  // ============================================================================

  async optimizeSessionMemory(sessionId: string): Promise<MemoryOptimizationResult> {
    const startTime = Date.now();
    let memoryOptimized = 0;
    const optimizationsApplied: OptimizationType[] = [];
    const errors: string[] = [];

    try {
      // Terminal buffer truncation
      const terminalResult = await this.optimizeTerminalMemory(sessionId);
      if (terminalResult > 0) {
        memoryOptimized += terminalResult;
        optimizationsApplied.push('terminal-buffer-truncate');
      }

      // File cache clearing
      const fileResult = await this.optimizeFileManagerMemory(sessionId);
      if (fileResult > 0) {
        memoryOptimized += fileResult;
        optimizationsApplied.push('file-cache-clear');
      }

      // AI history compression
      const aiResult = await this.optimizeAIAssistantMemory(sessionId);
      if (aiResult > 0) {
        memoryOptimized += aiResult;
        optimizationsApplied.push('ai-history-compress');
      }

      // Shell history limiting
      const shellResult = await this.optimizeShellMemory(sessionId);
      if (shellResult > 0) {
        memoryOptimized += shellResult;
        optimizationsApplied.push('shell-history-limit');
      }

      // Connection pool reduction
      const connectionResult = await this.optimizeConnectionMemory(sessionId);
      if (connectionResult > 0) {
        memoryOptimized += connectionResult;
        optimizationsApplied.push('connection-pool-reduce');
      }

      // Force garbage collection
      if (window.gc) {
        window.gc();
        optimizationsApplied.push('garbage-collection');
      }

    } catch (error) {
      errors.push(`Memory optimization failed for session ${sessionId}: ${error}`);
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    // Estimate performance impact based on optimizations applied
    let performanceImpact: 'low' | 'medium' | 'high' = 'low';
    if (optimizationsApplied.length > 3) {
      performanceImpact = 'high';
    } else if (optimizationsApplied.length > 1) {
      performanceImpact = 'medium';
    }

    return {
      memoryOptimized,
      optimizationsApplied,
      duration,
      success,
      performanceImpact
    };
  }

  async optimizeAllSessions(): Promise<MemoryOptimizationResult> {
    const sessionIds = Array.from(this.sessionMemoryUsage.keys());
    let totalMemoryOptimized = 0;
    const allOptimizations: OptimizationType[] = [];
    const allErrors: string[] = [];
    let totalDuration = 0;

    for (const sessionId of sessionIds) {
      try {
        const result = await this.optimizeSessionMemory(sessionId);
        totalMemoryOptimized += result.memoryOptimized;
        allOptimizations.push(...result.optimizationsApplied);
        totalDuration += result.duration;
      } catch (error) {
        allErrors.push(`Failed to optimize session ${sessionId}: ${error}`);
      }
    }

    const optimizationsApplied = [...new Set(allOptimizations)];
    let performanceImpact: 'low' | 'medium' | 'high' = 'low';
    if (optimizationsApplied.length > 5) {
      performanceImpact = 'high';
    } else if (optimizationsApplied.length > 2) {
      performanceImpact = 'medium';
    }

    return {
      memoryOptimized: totalMemoryOptimized,
      optimizationsApplied,
      duration: totalDuration,
      success: allErrors.length === 0,
      performanceImpact
    };
  }

  // ============================================================================
  // EMERGENCY PROCEDURES
  // ============================================================================

  async triggerEmergencyCleanup(): Promise<EmergencyCleanupResult> {
    console.warn('Triggering emergency cleanup - memory usage critically high');
    const startTime = Date.now();

    try {
      // Step 1: Aggressive cleanup of all sessions
      const cleanupResult = await this.cleanupAllSessions();

      // Step 2: Aggressive optimization
      const optimizationResult = await this.optimizeAllSessions();

      // Step 3: Force garbage collection multiple times
      for (let i = 0; i < 3; i++) {
        if (window.gc) {
          window.gc();
          await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        }
      }

      // Step 4: Identify critical sessions
      const criticalSessions: string[] = [];
      for (const [sessionId, usage] of this.sessionMemoryUsage) {
        const limit = this.sessionLimits.get(sessionId) || (this.totalMemoryLimit / 10);
        if (usage.totalUsage > limit * 1.5) {
          criticalSessions.push(sessionId);
        }
      }

      const memoryFreed = cleanupResult.memoryFreed + optimizationResult.memoryOptimized;
      const sessionsTerminated = criticalSessions.length;
      const success = criticalSessions.length === 0;
      const downtime = Date.now() - startTime;

      if (!success) {
        console.error(`Emergency cleanup completed but ${sessionsTerminated} sessions still exceed limits`);
      }

      return {
        memoryFreed,
        sessionsTerminated,
        criticalSessions,
        success,
        downtime
      };

    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return {
        memoryFreed: 0,
        sessionsTerminated: 0,
        criticalSessions: [],
        success: false,
        downtime: Date.now() - startTime
      };
    }
  }

  setEmergencyThreshold(threshold: number): void {
    this.emergencyThreshold = threshold;
    console.log(`Emergency cleanup threshold set to ${(threshold * 100).toFixed(1)}%`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  registerCleanupCallback(sessionId: string, callback: () => void): void {
    if (!this.cleanupCallbacks.has(sessionId)) {
      this.cleanupCallbacks.set(sessionId, []);
    }
    this.cleanupCallbacks.get(sessionId)!.push(callback);
  }

  unregisterCleanupCallback(sessionId: string, callback: () => void): void {
    const callbacks = this.cleanupCallbacks.get(sessionId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async updateSessionMemoryEstimates(sessionId: string): Promise<void> {
    const usage = this.sessionMemoryUsage.get(sessionId);
    if (!usage) return;

    // Estimate memory usage based on heuristics
    // In a real implementation, these would be actual measurements
    usage.terminalMemory = this.estimateTerminalMemory(sessionId);
    usage.fileManagerMemory = this.estimateFileManagerMemory(sessionId);
    usage.aiAssistantMemory = this.estimateAIAssistantMemory(sessionId);
    usage.shellMemory = this.estimateShellMemory(sessionId);
    usage.connectionMemory = this.estimateConnectionMemory(sessionId);

    usage.totalUsage = usage.terminalMemory + usage.fileManagerMemory +
                      usage.aiAssistantMemory + usage.shellMemory + usage.connectionMemory;
    usage.lastUpdated = Date.now();

    this.sessionMemoryUsage.set(sessionId, usage);
  }

  private getBaseApplicationMemory(): number {
    // Estimate base application memory (non-session related)
    try {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
    } catch (error) {
      // Fallback estimate
      return 50 * 1024 * 1024; // 50MB estimate
    }
    return 50 * 1024 * 1024;
  }

  // Memory estimation methods (simplified for this example)
  private estimateTerminalMemory(sessionId: string): number {
    return 5 * 1024 * 1024; // 5MB estimate
  }

  private estimateFileManagerMemory(sessionId: string): number {
    return 3 * 1024 * 1024; // 3MB estimate
  }

  private estimateAIAssistantMemory(sessionId: string): number {
    return 10 * 1024 * 1024; // 10MB estimate
  }

  private estimateShellMemory(sessionId: string): number {
    return 2 * 1024 * 1024; // 2MB estimate
  }

  private estimateConnectionMemory(sessionId: string): number {
    return 8 * 1024 * 1024; // 8MB estimate
  }

  // Component-specific cleanup methods
  private async cleanupTerminalMemory(sessionId: string): Promise<number> {
    // Emit event for terminal component to cleanup
    this.emitCleanupEvent(sessionId, 'terminal-cleanup');
    return 1024 * 1024; // 1MB estimated
  }

  private async cleanupFileManagerMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'file-manager-cleanup');
    return 512 * 1024; // 512KB estimated
  }

  private async cleanupAIAssistantMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'ai-assistant-cleanup');
    return 2 * 1024 * 1024; // 2MB estimated
  }

  private async cleanupShellMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'shell-cleanup');
    return 256 * 1024; // 256KB estimated
  }

  // Component-specific optimization methods
  private async optimizeTerminalMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'terminal-optimize');
    return 2048 * 1024; // 2MB estimated
  }

  private async optimizeFileManagerMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'file-manager-optimize');
    return 1024 * 1024; // 1MB estimated
  }

  private async optimizeAIAssistantMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'ai-assistant-optimize');
    return 3 * 1024 * 1024; // 3MB estimated
  }

  private async optimizeShellMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'shell-optimize');
    return 128 * 1024; // 128KB estimated
  }

  private async optimizeConnectionMemory(sessionId: string): Promise<number> {
    this.emitCleanupEvent(sessionId, 'connection-optimize');
    return 1024 * 1024; // 1MB estimated
  }

  private emitCleanupEvent(sessionId: string, action: string): void {
    const event = new CustomEvent('session-memory-cleanup', {
      detail: { sessionId, action, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  // Cleanup method
  destroy(): void {
    this.disableAutoCleanup();
    this.sessionMemoryUsage.clear();
    this.sessionLimits.clear();
    this.cleanupCallbacks.clear();
  }
}

// Export session memory manager
export const sessionMemoryManager = new SessionMemoryManagerImpl();

// Utility functions for easy access
export const startMemoryMonitoring = (intervalMs?: number) => memoryManager.startMonitoring(intervalMs);
export const stopMemoryMonitoring = () => memoryManager.stopMonitoring();
export const performMemoryCleanup = (options?: MemoryCleanupOptions) => memoryManager.performCleanup(options);
export const getMemoryReport = () => memoryManager.getMemoryReport();
export const registerMemoryCleanupCallback = (name: string, callback: () => void) =>
  memoryManager.registerCleanupCallback(name, callback);