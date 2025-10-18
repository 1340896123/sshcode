/**
 * Memory Management Utility
 *
 * Provides memory monitoring and cleanup functionality for the SSH client
 * to ensure optimal performance and prevent memory leaks.
 */

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

// Utility functions for easy access
export const startMemoryMonitoring = (intervalMs?: number) => memoryManager.startMonitoring(intervalMs);
export const stopMemoryMonitoring = () => memoryManager.stopMonitoring();
export const performMemoryCleanup = (options?: MemoryCleanupOptions) => memoryManager.performCleanup(options);
export const getMemoryReport = () => memoryManager.getMemoryReport();
export const registerMemoryCleanupCallback = (name: string, callback: () => void) =>
  memoryManager.registerCleanupCallback(name, callback);