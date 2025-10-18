import { ref, computed } from 'vue';
import type { PerformanceMetrics, PerformanceSnapshot, SystemInfo } from '../types/tab';

/**
 * Performance Monitor Utility
 *
 * Tracks application performance metrics including tab switching times,
 * memory usage, connection counts, and provides real-time monitoring
 * for optimization and debugging purposes.
 */
export class PerformanceMonitor {
  private snapshots: PerformanceSnapshot[] = [];
  private maxSnapshots = 100; // Keep last 100 snapshots
  private intervalId: number | null = null;
  private startTime = performance.now();

  // Reactive state for Vue components
  public readonly metrics = ref<PerformanceMetrics>({
    tabSwitchTimes: [],
    memoryUsage: [],
    connectionCount: 0,
    averageTabSwitchTime: 0,
    currentMemoryUsage: 0
  });

  /**
   * Start monitoring performance metrics
   */
  public start(interval: number = 5000): void {
    this.stop(); // Stop any existing interval

    this.intervalId = window.setInterval(() => {
      this.takeSnapshot();
    }, interval);

    console.log(`Performance monitoring started with ${interval}ms interval`);
  }

  /**
   * Stop monitoring performance metrics
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Performance monitoring stopped');
    }
  }

  /**
   * Take a performance snapshot
   */
  public takeSnapshot(): PerformanceSnapshot {
    const now = performance.now();
    const uptime = now - this.startTime;

    // Get memory usage if available
    let memoryUsage = 0;
    if (window.performance && 'memory' in window.performance) {
      const perfMemory = window.performance as any;
      memoryUsage = perfMemory.memory?.usedJSHeapSize || 0;
    }

    // Estimate memory usage based on terminal instances if JS heap not available
    if (memoryUsage === 0) {
      memoryUsage = this.estimateTerminalMemoryUsage();
    }

    const snapshot: PerformanceSnapshot = {
      timestamp: now,
      memoryUsage,
      activeConnections: this.getCurrentConnectionCount(),
      activeTerminals: this.getActiveTerminalCount()
    };

    // Add to history
    this.snapshots.push(snapshot);

    // Limit history size
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Update reactive metrics
    this.updateMetrics();

    return snapshot;
  }

  /**
   * Record a tab switch operation
   */
  public recordTabSwitch(tabId: string, duration: number): void {
    const switchData = {
      tabId,
      duration,
      timestamp: Date.now()
    };

    this.metrics.value.tabSwitchTimes.push(duration);

    // Limit history size
    if (this.metrics.value.tabSwitchTimes.length > 50) {
      this.metrics.value.tabSwitchTimes =
        this.metrics.value.tabSwitchTimes.slice(-50);
    }

    // Update average
    this.updateAverageTabSwitchTime();

    // Log slow tab switches (>1000ms)
    if (duration > 1000) {
      console.warn(`Slow tab switch detected: ${tabId} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Update connection count
   */
  public updateConnectionCount(count: number): void {
    this.metrics.value.connectionCount = count;
    this.takeSnapshot(); // Take immediate snapshot
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics.value };
  }

  /**
   * Get performance history
   */
  public getHistory(): PerformanceSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get performance summary
   */
  public getSummary(): PerformanceSummary {
    const now = performance.now();
    const uptime = (now - this.startTime) / 1000; // seconds

    return {
      uptime,
      totalSnapshots: this.snapshots.length,
      averageTabSwitchTime: this.metrics.value.averageTabSwitchTime,
      currentMemoryUsage: this.metrics.value.currentMemoryUsage,
      peakMemoryUsage: this.getPeakMemoryUsage(),
      averageMemoryUsage: this.getAverageMemoryUsage(),
      currentConnections: this.metrics.value.connectionCount,
      slowTabSwitches: this.countSlowTabSwitches(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Export performance data for debugging
   */
  public exportData(): PerformanceExportData {
    return {
      timestamp: Date.now(),
      uptime: (performance.now() - this.startTime) / 1000,
      metrics: this.metrics.value,
      history: this.snapshots,
      summary: this.getSummary()
    };
  }

  /**
   * Import performance data (for analysis)
   */
  public importData(data: PerformanceExportData): void {
    this.metrics.value = data.metrics;
    this.snapshots = data.history;
    this.startTime = performance.now() - (data.uptime * 1000);
  }

  /**
   * Update reactive metrics based on current snapshots
   */
  private updateMetrics(): void {
    if (this.snapshots.length === 0) return;

    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    this.metrics.value.currentMemoryUsage = latestSnapshot.memoryUsage;
    this.metrics.value.connectionCount = latestSnapshot.activeConnections;

    // Update memory usage history
    this.metrics.value.memoryUsage.push(latestSnapshot.memoryUsage);
    if (this.metrics.value.memoryUsage.length > 100) {
      this.metrics.value.memoryUsage =
        this.metrics.value.memoryUsage.slice(-100);
    }
  }

  /**
   * Update average tab switch time
   */
  private updateAverageTabSwitchTime(): void {
    const times = this.metrics.value.tabSwitchTimes;
    if (times.length === 0) {
      this.metrics.value.averageTabSwitchTime = 0;
      return;
    }

    const sum = times.reduce((acc, time) => acc + time, 0);
    this.metrics.value.averageTabSwitchTime = sum / times.length;
  }

  /**
   * Get current connection count
   */
  private getCurrentConnectionCount(): number {
    // This would integrate with connection store
    // For now, use current metrics value
    return this.metrics.value.connectionCount;
  }

  /**
   * Get active terminal count
   */
  private getActiveTerminalCount(): number {
    // This would integrate with terminal pool
    // Estimate based on connection count for now
    return Math.min(this.metrics.value.connectionCount, 15);
  }

  /**
   * Estimate terminal memory usage
   */
  private estimateTerminalMemoryUsage(): number {
    // Rough estimation: 8MB per terminal + 50KB per line of history
    const activeTerminals = this.getActiveTerminalCount();
    const terminalOverhead = activeTerminals * 8 * 1024 * 1024; // 8MB each
    const historyOverhead = activeTerminals * 1000 * 50; // 50KB per 1000 lines
    const baseUsage = 50 * 1024 * 1024; // 50MB base application

    return terminalOverhead + historyOverhead + baseUsage;
  }

  /**
   * Get peak memory usage
   */
  private getPeakMemoryUsage(): number {
    return Math.max(...this.snapshots.map(s => s.memoryUsage));
  }

  /**
   * Get average memory usage
   */
  private getAverageMemoryUsage(): number {
    if (this.snapshots.length === 0) return 0;
    const sum = this.snapshots.reduce((acc, s) => acc + s.memoryUsage, 0);
    return sum / this.snapshots.length;
  }

  /**
   * Count slow tab switches (>500ms)
   */
  private countSlowTabSwitches(): number {
    return this.metrics.value.tabSwitchTimes.filter(time => time > 500).length;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const summary = this.getSummary();

    // Memory usage recommendations
    if (summary.peakMemoryUsage > 200 * 1024 * 1024) { // 200MB
      recommendations.push({
        type: 'memory',
        severity: 'warning',
        message: 'Memory usage exceeds 200MB. Consider reducing terminal history or closing unused connections.',
        suggestion: 'Reduce terminal history or close unused connections'
      });
    }

    if (summary.averageMemoryUsage > 150 * 1024 * 1024) { // 150MB
      recommendations.push({
        type: 'memory',
        severity: 'info',
        message: 'Average memory usage is high. Monitor for potential memory leaks.',
        suggestion: 'Check for terminal buffer cleanup'
      });
    }

    // Tab switching performance recommendations
    if (summary.averageTabSwitchTime > 1000) { // 1 second
      recommendations.push({
        type: 'performance',
        severity: 'warning',
        message: 'Average tab switch time exceeds 1 second. Consider optimizing terminal pool or component caching.',
        suggestion: 'Optimize terminal pool and component caching'
      });
    }

    if (summary.slowTabSwitches > 5) {
      recommendations.push({
        type: 'performance',
        severity: 'info',
        message: `${summary.slowTabSwitches} slow tab switches detected.`,
        suggestion: 'Review terminal initialization performance'
      });
    }

    // Connection count recommendations
    if (summary.currentConnections > 10) {
      recommendations.push({
        type: 'connection',
        severity: 'info',
        message: 'High number of active connections. Monitor resource usage.',
        suggestion: 'Consider closing unused connections'
      });
    }

    return recommendations;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stop();
    this.snapshots = [];
    this.metrics.value = {
      tabSwitchTimes: [],
      memoryUsage: [],
      connectionCount: 0,
      averageTabSwitchTime: 0,
      currentMemoryUsage: 0
    };
  }
}

// Type definitions
export interface PerformanceSummary {
  uptime: number;
  totalSnapshots: number;
  averageTabSwitchTime: number;
  currentMemoryUsage: number;
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  currentConnections: number;
  slowTabSwitches: number;
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  type: 'memory' | 'performance' | 'connection';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion: string;
}

export interface PerformanceExportData {
  timestamp: number;
  uptime: number;
  metrics: PerformanceMetrics;
  history: PerformanceSnapshot[];
  summary: PerformanceSummary;
}

/**
 * Create performance monitoring composable for Vue components
 */
export function usePerformanceMonitor(interval: number = 5000) {
  const monitor = new PerformanceMonitor();

  // Start monitoring automatically
  monitor.start(interval);

  // Cleanup on component unmount
  const cleanup = () => {
    monitor.dispose();
  };

  return {
    monitor,
    metrics: monitor.metrics,
    summary: computed(() => monitor.getSummary()),
    history: computed(() => monitor.getHistory()),
    cleanup
  };
}

/**
 * Default performance monitor instance for application
 */
let defaultPerformanceMonitor: PerformanceMonitor | null = null;

/**
 * Get or create default performance monitor instance
 */
export function getDefaultPerformanceMonitor(): PerformanceMonitor {
  if (!defaultPerformanceMonitor) {
    defaultPerformanceMonitor = new PerformanceMonitor();
    // Start with 5-second interval
    defaultPerformanceMonitor.start(5000);
  }
  return defaultPerformanceMonitor;
}

/**
 * Performance utility functions
 */
export const PerformanceUtils = {
  /**
   * Measure function execution time
   */
  async measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${name}: ${duration.toFixed(2)}ms (failed)`);
      throw error;
    }
  },

  /**
   * Measure synchronous function execution time
   */
  measureSyncTime<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[Performance] ${name}: ${duration.toFixed(2)}ms (failed)`);
      throw error;
    }
  },

  /**
   * Debounce function for performance optimization
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), delay);
    }) as T;
  },

  /**
   * Throttle function for performance optimization
   */
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  }
};