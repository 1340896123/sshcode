import { getTerminalStateModel } from '../database/models/TerminalState';
import type { TerminalState, CursorPosition } from '../types/tab';

/**
 * Terminal State Service
 *
 * Handles automatic capture and persistence of terminal state changes
 */
export class TerminalStateService {
  private terminalModel = getTerminalStateModel();
  private terminalStates = new Map<string, {
    lastCommand?: string;
    bufferContent: string[];
    cursorPosition: CursorPosition;
    scrollOffset: number;
  }>();

  /**
   * Initialize terminal state tracking for a tab
   */
  initializeTerminalState(tabId: string): void {
    this.terminalStates.set(tabId, {
      bufferContent: [],
      cursorPosition: { x: 0, y: 0 },
      scrollOffset: 0
    });
  }

  /**
   * Clean up terminal state tracking for a tab
   */
  cleanupTerminalState(tabId: string): void {
    this.terminalStates.delete(tabId);
  }

  /**
   * Update cursor position for a terminal
   */
  updateCursorPosition(tabId: string, position: CursorPosition): void {
    const state = this.terminalStates.get(tabId);
    if (state) {
      state.cursorPosition = position;
    }
  }

  /**
   * Update scroll offset for a terminal
   */
  updateScrollOffset(tabId: string, offset: number): void {
    const state = this.terminalStates.get(tabId);
    if (state) {
      state.scrollOffset = offset;
    }
  }

  /**
   * Add terminal output to buffer
   */
  addTerminalOutput(tabId: string, data: string, type: 'input' | 'output' | 'error'): void {
    const state = this.terminalStates.get(tabId);
    if (!state) return;

    // Add to buffer content
    state.bufferContent.push(`[${type.toUpperCase()}] ${data}`);

    // Limit buffer size to prevent memory issues
    const maxBufferLines = 1000;
    if (state.bufferContent.length > maxBufferLines) {
      state.bufferContent = state.bufferContent.slice(-maxBufferLines);
    }

    // Save to database (debounced)
    this.debouncedBufferSave(tabId, data, type);
  }

  /**
   * Execute a command in the terminal
   */
  async executeCommand(tabId: string, command: string): Promise<void> {
    const state = this.terminalStates.get(tabId);
    if (state) {
      state.lastCommand = command;
    }

    // Add command to history
    try {
      const startTime = Date.now();
      await this.terminalModel.addCommandToHistory(tabId, command, undefined, undefined);

      // Store start time for later completion
      const commandKey = `${tabId}-${startTime}`;
      sessionStorage.setItem(commandKey, JSON.stringify({
        command,
        startTime,
        tabId
      }));
    } catch (error) {
      console.error('Failed to record command execution:', error);
    }
  }

  /**
   * Complete a command execution
   */
  async completeCommand(tabId: string, command: string, exitCode: number, output: string): Promise<void> {
    const duration = this.calculateCommandDuration(tabId, command);

    try {
      await this.terminalModel.addCommandToHistory(tabId, command, exitCode, duration);

      // Add output to buffer
      this.addTerminalOutput(tabId, output, exitCode === 0 ? 'output' : 'error');
    } catch (error) {
      console.error('Failed to complete command recording:', error);
    }

    // Clean up stored command timing
    this.cleanupCommandTiming(tabId, command);
  }

  /**
   * Save current terminal state to database
   */
  async saveTerminalState(tabId: string): Promise<void> {
    const state = this.terminalStates.get(tabId);
    if (!state) return;

    try {
      await this.terminalModel.upsert(tabId, {
        cursorPosition: state.cursorPosition,
        scrollOffset: state.scrollOffset,
        bufferSize: state.bufferContent.length
      });
    } catch (error) {
      console.error(`Failed to save terminal state for tab ${tabId}:`, error);
    }
  }

  /**
   * Restore terminal state from database
   */
  async restoreTerminalState(tabId: string): Promise<{
    cursorPosition: CursorPosition;
    scrollOffset: number;
    history: Array<{
      command: string;
      timestamp: number;
      exitCode?: number;
      duration?: number;
    }>;
    bufferContent: string[];
  } | null> {
    try {
      const state = await this.terminalModel.findByTabId(tabId);
      if (!state) return null;

      // Get recent buffer content
      const bufferContent = await this.terminalModel.getBufferContent(tabId, 100);

      return {
        cursorPosition: state.cursorPosition,
        scrollOffset: state.scrollOffset,
        history: state.history.map(h => ({
          command: h.command,
          timestamp: h.timestamp,
          exitCode: h.exitCode,
          duration: h.duration
        })),
        bufferContent: bufferContent.map(b => b.content)
      };
    } catch (error) {
      console.error(`Failed to restore terminal state for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Get command history for a tab
   */
  async getCommandHistory(tabId: string, limit: number = 50): Promise<Array<{
    command: string;
    timestamp: number;
    exitCode?: number;
    duration?: number;
  }>> {
    try {
      const history = await this.terminalModel.getCommandHistory(tabId, limit);
      return history.map(h => ({
        command: h.command,
        timestamp: h.timestamp,
        exitCode: h.exitCode,
        duration: h.duration
      }));
    } catch (error) {
      console.error(`Failed to get command history for tab ${tabId}:`, error);
      return [];
    }
  }

  /**
   * Search command history
   */
  async searchHistory(tabId: string, query: string, limit: number = 20): Promise<Array<{
    command: string;
    timestamp: number;
    exitCode?: number;
    duration?: number;
  }>> {
    try {
      const history = await this.terminalModel.searchHistory(tabId, query, limit);
      return history.map(h => ({
        command: h.command,
        timestamp: h.timestamp,
        exitCode: h.exitCode,
        duration: h.duration
      }));
    } catch (error) {
      console.error(`Failed to search command history for tab ${tabId}:`, error);
      return [];
    }
  }

  /**
   * Get terminal statistics
   */
  async getTerminalStats(tabId: string): Promise<{
    totalCommands: number;
    successRate: number;
    averageDuration: number;
    bufferSize: number;
  }> {
    try {
      const stats = await this.terminalModel.getStats(tabId);
      return {
        totalCommands: stats.totalCommands,
        successRate: stats.successRate,
        averageDuration: stats.averageCommandDuration,
        bufferSize: stats.bufferSize
      };
    } catch (error) {
      console.error(`Failed to get terminal stats for tab ${tabId}:`, error);
      return {
        totalCommands: 0,
        successRate: 0,
        averageDuration: 0,
        bufferSize: 0
      };
    }
  }

  /**
   * Clear terminal history for a tab
   */
  async clearTerminalHistory(tabId: string): Promise<void> {
    try {
      await this.terminalModel.clearHistory(tabId);
      await this.terminalModel.clearBuffer(tabId);

      // Reset in-memory state
      const state = this.terminalStates.get(tabId);
      if (state) {
        state.bufferContent = [];
        state.lastCommand = undefined;
      }
    } catch (error) {
      console.error(`Failed to clear terminal history for tab ${tabId}:`, error);
    }
  }

  // Private methods

  private debouncedBufferSave = this.debounce(async (tabId: string, data: string, type: string) => {
    await this.terminalModel.addBufferEntry(tabId, data, type as any);
  }, 1000);

  private calculateCommandDuration(tabId: string, command: string): number {
    // Find stored command timing
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(`${tabId}-`)) {
        try {
          const stored = JSON.parse(sessionStorage.getItem(key) || '{}');
          if (stored.command === command) {
            return Date.now() - stored.startTime;
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }
    return 0;
  }

  private cleanupCommandTiming(tabId: string, command: string): void {
    // Remove stored command timing
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(`${tabId}-`)) {
        try {
          const stored = JSON.parse(sessionStorage.getItem(key) || '{}');
          if (stored.command === command) {
            sessionStorage.removeItem(key);
            break;
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }
  }

  private debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Singleton instance
let terminalStateService: TerminalStateService | null = null;

export function getTerminalStateService(): TerminalStateService {
  if (!terminalStateService) {
    terminalStateService = new TerminalStateService();
  }
  return terminalStateService;
}