import { ref, shallowRef, onUnmounted } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import type {
  PooledTerminal,
  TerminalPoolComposable,
  PoolStats
} from '../types/tab';

/**
 * Terminal Pool Configuration
 */
interface PoolConfig {
  maxTerminals: number;
  maxIdleTime: number; // milliseconds
  cleanupInterval: number; // milliseconds
  memoryThreshold: number; // bytes
}

/**
 * Terminal Pool Composable
 *
 * Manages a pool of terminal instances for efficient tab switching
 * and memory management. Implements lazy initialization and automatic cleanup.
 */
export function useTerminalPool(config: Partial<PoolConfig> = {}): TerminalPoolComposable {
  // Configuration with defaults
  const poolConfig: PoolConfig = {
    maxTerminals: 20,
    maxIdleTime: 10 * 60 * 1000, // 10 minutes
    cleanupInterval: 60 * 1000, // 1 minute
    memoryThreshold: 100 * 1024 * 1024, // 100MB
    ...config
  };

  // State
  const terminals = shallowRef<Map<string, PooledTerminal>>(new Map());
  const poolStats = ref<PoolStats>({
    totalTerminals: 0,
    activeTerminals: 0,
    idleTerminals: 0,
    memoryUsage: 0
  });

  // Cleanup interval reference
  let cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Create a new terminal instance with addons
   */
  const createTerminalInstance = (): PooledTerminal => {
    const terminalId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create terminal with default renderer for better performance
    const terminal = new Terminal({
      allowTransparency: true,
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      } as any,
      scrollback: 1000, // Limit buffer size for memory management
      cols: 80,
      rows: 24
    });

    // Add performance addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    const now = Date.now();
    const pooledTerminal: PooledTerminal = {
      id: terminalId,
      terminal,
      fitAddon,
      webLinksAddon,
      lastUsed: now,
      isActive: false,
      connectionId: undefined
    };

    return pooledTerminal;
  };

  /**
   * Acquire a terminal instance from the pool
   */
  const acquireTerminal = (connectionId: string): PooledTerminal => {
    // Try to find an existing idle terminal for this connection
    let pooledTerminal = Array.from(terminals.value.values())
      .find(t => !t.isActive && t.connectionId === connectionId);

    // If no existing terminal, try to reuse an idle terminal
    if (!pooledTerminal) {
      pooledTerminal = Array.from(terminals.value.values())
        .find(t => !t.isActive);
    }

    // If no idle terminals available and we haven't reached the limit, create a new one
    if (!pooledTerminal && terminals.value.size < poolConfig.maxTerminals) {
      pooledTerminal = createTerminalInstance();
      terminals.value.set(pooledTerminal.id, pooledTerminal);
    }

    // If we still don't have a terminal, we need to wait or fail
    if (!pooledTerminal) {
      throw new Error(`Unable to acquire terminal instance. Pool limit (${poolConfig.maxTerminals}) reached.`);
    }

    // Configure the terminal for this connection
    pooledTerminal.isActive = true;
    pooledTerminal.connectionId = connectionId;
    pooledTerminal.lastUsed = Date.now();

    // Clear the terminal if it was previously used
    pooledTerminal.terminal.clear();

    updatePoolStats();

    console.debug(`Terminal acquired: ${pooledTerminal.id} for connection: ${connectionId}`);
    return pooledTerminal;
  };

  /**
   * Release a terminal instance back to the pool
   */
  const releaseTerminal = (terminalId: string): void => {
    const pooledTerminal = terminals.value.get(terminalId);
    if (!pooledTerminal) {
      console.warn(`Attempted to release unknown terminal: ${terminalId}`);
      return;
    }

    // Mark as inactive but keep in pool for reuse
    pooledTerminal.isActive = false;
    pooledTerminal.lastUsed = Date.now();

    // Clear terminal content to free memory
    try {
      pooledTerminal.terminal.clear();
    } catch (error) {
      console.warn(`Failed to clear terminal ${terminalId}:`, error);
    }

    updatePoolStats();
    console.debug(`Terminal released: ${terminalId}`);
  };

  /**
   * Completely remove a terminal from the pool
   */
  const removeTerminal = (terminalId: string): void => {
    const pooledTerminal = terminals.value.get(terminalId);
    if (!pooledTerminal) {
      return;
    }

    try {
      // Dispose of terminal resources
      pooledTerminal.terminal.dispose();
    } catch (error) {
      console.warn(`Failed to dispose terminal ${terminalId}:`, error);
    }

    terminals.value.delete(terminalId);
    updatePoolStats();
    console.debug(`Terminal removed from pool: ${terminalId}`);
  };

  /**
   * Clear all terminals from the pool
   */
  const clearPool = (): void => {
    console.log(`Clearing terminal pool (${terminals.value.size} terminals)`);

    for (const terminalId of terminals.value.keys()) {
      removeTerminal(terminalId);
    }

    updatePoolStats();
  };

  /**
   * Update pool statistics
   */
  const updatePoolStats = (): void => {
    const terminalsList = Array.from(terminals.value.values());

    poolStats.value = {
      totalTerminals: terminalsList.length,
      activeTerminals: terminalsList.filter(t => t.isActive).length,
      idleTerminals: terminalsList.filter(t => !t.isActive).length,
      memoryUsage: estimateMemoryUsage(terminalsList)
    };
  };

  /**
   * Estimate memory usage of terminals in the pool
   */
  const estimateMemoryUsage = (terminalsList: PooledTerminal[]): number => {
    // Rough estimation: each character cell uses ~50-100 bytes
    // Including terminal instance overhead and addons
    const bytesPerCell = 75;
    const terminalOverhead = 1024 * 1024; // 1MB per terminal instance

    let totalUsage = 0;
    for (const pooledTerminal of terminalsList) {
      const buffer = pooledTerminal.terminal.buffer;
      const cellCount = (buffer?.active?.length || 0) * (pooledTerminal.terminal.cols || 80);
      totalUsage += terminalOverhead + (cellCount * bytesPerCell);
    }

    return totalUsage;
  };

  /**
   * Cleanup idle terminals that exceed the maximum idle time
   */
  const cleanupIdleTerminals = (): void => {
    const now = Date.now();
    const terminalsToRemove: string[] = [];

    for (const [terminalId, pooledTerminal] of terminals.value.entries()) {
      if (!pooledTerminal.isActive &&
          (now - pooledTerminal.lastUsed) > poolConfig.maxIdleTime) {
        terminalsToRemove.push(terminalId);
      }
    }

    // Remove idle terminals, but always keep at least 2 terminals available
    const terminalsToRemoveCount = Math.max(
      0,
      Math.min(terminalsToRemove.length, terminals.value.size - 2)
    );

    for (let i = 0; i < terminalsToRemoveCount; i++) {
      removeTerminal(terminalsToRemove[i]);
    }

    if (terminalsToRemoveCount > 0) {
      console.log(`Cleaned up ${terminalsToRemoveCount} idle terminals`);
    }
  };

  /**
   * Emergency cleanup when memory threshold is exceeded
   */
  const emergencyCleanup = (): void => {
    if (poolStats.value.memoryUsage > poolConfig.memoryThreshold) {
      console.warn(`Memory threshold exceeded (${poolStats.value.memoryUsage} bytes). Performing emergency cleanup.`);

      // Sort terminals by last used time (oldest first)
      const sortedTerminals = Array.from(terminals.value.entries())
        .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

      // Remove inactive terminals first
      for (const [terminalId, pooledTerminal] of sortedTerminals) {
        if (!pooledTerminal.isActive) {
          removeTerminal(terminalId);
          if (poolStats.value.memoryUsage <= poolConfig.memoryThreshold) {
            break;
          }
        }
      }
    }
  };

  /**
   * Get current pool statistics
   */
  const getPoolStats = (): PoolStats => {
    return { ...poolStats.value };
  };

  /**
   * Start the cleanup timer
   */
  const startCleanupTimer = (): void => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
    }

    cleanupTimer = setInterval(() => {
      cleanupIdleTerminals();
      emergencyCleanup();
    }, poolConfig.cleanupInterval);
  };

  /**
   * Stop the cleanup timer
   */
  const stopCleanupTimer = (): void => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  };

  // Initialize cleanup timer
  startCleanupTimer();

  // Cleanup on component unmount
  onUnmounted(() => {
    stopCleanupTimer();
    clearPool();
  });

  return {
    acquireTerminal,
    releaseTerminal,
    clearPool,
    getPoolStats
  };
}

/**
 * Default terminal pool instance for the application
 */
let defaultTerminalPool: ReturnType<typeof useTerminalPool> | null = null;

/**
 * Get or create the default terminal pool instance
 */
export function getDefaultTerminalPool(): ReturnType<typeof useTerminalPool> {
  if (!defaultTerminalPool) {
    defaultTerminalPool = useTerminalPool({
      maxTerminals: 15, // Match the connection limit
      maxIdleTime: 10 * 60 * 1000, // 10 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      memoryThreshold: 100 * 1024 * 1024 // 100MB
    });
  }
  return defaultTerminalPool;
}

/**
 * Utility function to configure terminal for optimal performance
 */
export function configureTerminalForPerformance(terminal: Terminal): void {
  // Performance optimizations
  terminal.options.scrollback = 1000; // Limit scrollback for memory
  terminal.options.fastScrollModifier = 'alt'; // Enable fast scrolling
  terminal.options.rightClickSelectsWord = true; // Better UX

  // Disable features we don't need for better performance
  terminal.options.convertEol = false;
}

/**
 * Utility function to resize terminal to fit container
 */
export function resizeTerminalToFit(terminal: Terminal, fitAddon: FitAddon): void {
  try {
    // Use requestAnimationFrame for smooth resizing
    requestAnimationFrame(() => {
      fitAddon.fit();
    });
  } catch (error) {
    console.warn('Failed to resize terminal:', error);
  }
}