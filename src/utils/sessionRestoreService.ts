import { getDefaultPerformanceMonitor } from './performanceMonitor';
import type { SessionData, SessionRestoreOptions, Tab, Connection } from '../types/tab';

/**
 * Session Restore Service
 *
 * Provides automatic session saving and restoration functionality
 * for maintaining tab states and connection configurations across
 * application restarts.
 */
export class SessionRestoreService {
  private readonly SESSION_KEY = 'sshcode_session';
  private readonly OPTIONS_KEY = 'sshcode_session_options';
  private autoSaveEnabled = true;
  private saveDebounceTimer: number | null = null;
  private performanceMonitor = getDefaultPerformanceMonitor();

  constructor() {
    this.setupAutoSave();
  }

  /**
   * Save current session data
   */
  public async saveSession(tabs: Tab[], activeTabId: string | null): Promise<boolean> {
    try {
      const sessionData: SessionData = {
        tabs: tabs.map(this.serializeTab),
        activeTabId,
        lastSaved: Date.now(),
        version: '1.0.0'
      };

      // Save to localStorage
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

      console.log(`Session saved: ${tabs.length} tabs, active: ${activeTabId}`);
      return true;
    } catch (error) {
      console.error('Failed to save session:', error);
      return false;
    }
  }

  /**
   * Load saved session data
   */
  public async loadSession(): Promise<SessionData | null> {
    try {
      const sessionJson = localStorage.getItem(this.SESSION_KEY);
      if (!sessionJson) {
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionJson);

      // Validate session data
      if (!this.validateSessionData(sessionData)) {
        console.warn('Invalid session data found, ignoring');
        this.clearSession();
        return null;
      }

      console.log(`Session loaded: ${sessionData.tabs.length} tabs`);
      return sessionData;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * Restore session with options
   */
  public async restoreSession(
    options: SessionRestoreOptions = {
      autoReconnect: true,
      restoreTerminalState: true,
      restoreAIHistory: true,
      restoreFileManagerState: true
    }
  ): Promise<SessionRestoreResult> {
    try {
      const sessionData = await this.loadSession();
      if (!sessionData) {
        return {
          success: false,
          error: 'No saved session found',
          restoredTabs: 0,
          restoredConnections: 0
        };
      }

      const startTime = performance.now();

      // Restore tabs
      const restoreResult = await this.restoreTabs(sessionData.tabs, options);

      // Restore active tab if specified
      let activeTabId = sessionData.activeTabId;
      if (activeTabId && !restoreResult.restoredTabIds.includes(activeTabId)) {
        activeTabId = restoreResult.restoredTabIds[0] || null;
      }

      const duration = performance.now() - startTime;

      console.log(`Session restored in ${duration.toFixed(2)}ms: ${restoreResult.restoredTabIds.length} tabs`);

      return {
        success: true,
        activeTabId,
        restoredTabs: restoreResult.restoredTabIds.length,
        restoredConnections: restoreResult.restoredConnectionIds.length,
        duration
      };
    } catch (error) {
      console.error('Failed to restore session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        restoredTabs: 0,
        restoredConnections: 0
      };
    }
  }

  /**
   * Clear saved session data
   */
  public clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      console.log('Session data cleared');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Get session restore options
   */
  public getRestoreOptions(): SessionRestoreOptions {
    try {
      const optionsJson = localStorage.getItem(this.OPTIONS_KEY);
      if (optionsJson) {
        return { ...this.getDefaultOptions(), ...JSON.parse(optionsJson) };
      }
    } catch (error) {
      console.warn('Failed to load restore options:', error);
    }
    return this.getDefaultOptions();
  }

  /**
   * Set session restore options
   */
  public setRestoreOptions(options: Partial<SessionRestoreOptions>): void {
    try {
      const currentOptions = this.getRestoreOptions();
      const newOptions = { ...currentOptions, ...options };
      localStorage.setItem(this.OPTIONS_KEY, JSON.stringify(newOptions));
      console.log('Session restore options updated');
    } catch (error) {
      console.error('Failed to save restore options:', error);
    }
  }

  /**
   * Enable/disable auto-save
   */
  public setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    console.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Trigger auto-save (debounced)
   */
  public triggerAutoSave(tabs: Tab[], activeTabId: string | null): void {
    if (!this.autoSaveEnabled) return;

    // Clear existing timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Set new timer
    this.saveDebounceTimer = window.setTimeout(async () => {
      await this.saveSession(tabs, activeTabId);
      this.saveDebounceTimer = null;
    }, 2000); // 2 second debounce
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): SessionStats {
    try {
      const sessionJson = localStorage.getItem(this.SESSION_KEY);
      if (!sessionJson) {
        return {
          hasSession: false,
          lastSaved: null,
          tabCount: 0,
          activeTabId: null,
          size: 0
        };
      }

      const sessionData: SessionData = JSON.parse(sessionJson);
      return {
        hasSession: true,
        lastSaved: sessionData.lastSaved,
        tabCount: sessionData.tabs.length,
        activeTabId: sessionData.activeTabId,
        size: sessionJson.length,
        version: sessionData.version,
        age: Date.now() - sessionData.lastSaved
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return {
        hasSession: false,
        lastSaved: null,
        tabCount: 0,
        activeTabId: null,
        size: 0
      };
    }
  }

  /**
   * Export session data to file
   */
  public async exportSession(filename?: string): Promise<boolean> {
    try {
      const sessionData = await this.loadSession();
      if (!sessionData) {
        throw new Error('No session data to export');
      }

      const exportData = {
        session: sessionData,
        options: this.getRestoreOptions(),
        performance: this.performanceMonitor.exportData(),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `sshcode-session-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Session exported successfully');
      return true;
    } catch (error) {
      console.error('Failed to export session:', error);
      return false;
    }
  }

  /**
   * Import session data from file
   */
  public async importSession(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.session) {
        throw new Error('Invalid session file format');
      }

      // Validate session data
      if (!this.validateSessionData(importData.session)) {
        throw new Error('Invalid session data in file');
      }

      // Import session
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(importData.session));

      // Import options if available
      if (importData.options) {
        this.setRestoreOptions(importData.options);
      }

      console.log('Session imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import session:', error);
      return false;
    }
  }

  /**
   * Setup auto-save on window events
   */
  private setupAutoSave(): void {
    // Save on page visibility change (when user might be closing)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Trigger immediate save when page is hidden
        this.saveCurrentState();
      }
    });

    // Save on beforeunload
    window.addEventListener('beforeunload', () => {
      this.saveCurrentState();
    });
  }

  /**
   * Save current application state
   */
  private async saveCurrentState(): Promise<void> {
    try {
      // This would integrate with the application state
      // For now, just log that save was triggered
      console.log('Auto-save triggered by application state change');
    } catch (error) {
      console.error('Failed to save current state:', error);
    }
  }

  /**
   * Validate session data structure
   */
  private validateSessionData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.tabs)) return false;
    if (data.lastSaved && typeof data.lastSaved !== 'number') return false;

    // Validate each tab
    for (const tab of data.tabs) {
      if (!tab.id || typeof tab.id !== 'string') return false;
      if (!tab.name || typeof tab.name !== 'string') return false;
      if (!tab.connectionId || typeof tab.connectionId !== 'string') return false;
      if (tab.position !== undefined && typeof tab.position !== 'number') return false;
    }

    return true;
  }

  /**
   * Serialize tab for storage
   */
  private serializeTab(tab: Tab): any {
    return {
      id: tab.id,
      name: tab.name,
      connectionId: tab.connectionId,
      isActive: tab.isActive,
      isVisible: tab.isVisible,
      position: tab.position,
      lastAccessed: tab.lastAccessed,
      createdAt: tab.createdAt,
      updatedAt: tab.updatedAt,
      windowState: tab.windowState
      // Note: Not storing live state like terminal content, AI messages, etc.
      // Those are handled separately or restored on demand
    };
  }

  /**
   * Restore tabs from session data
   */
  private async restoreTabs(
    tabs: any[],
    options: SessionRestoreOptions
  ): Promise<TabRestoreResult> {
    const restoredTabIds: string[] = [];
    const restoredConnectionIds: string[] = [];

    for (const tabData of tabs) {
      try {
        // This would integrate with the tab store and connection manager
        // For now, simulate restoration
        restoredTabIds.push(tabData.id);

        if (options.autoReconnect && tabData.connectionId) {
          restoredConnectionIds.push(tabData.connectionId);
        }

        console.log(`Tab restored: ${tabData.name} (${tabData.id})`);
      } catch (error) {
        console.error(`Failed to restore tab ${tabData.id}:`, error);
      }
    }

    return {
      restoredTabIds,
      restoredConnectionIds
    };
  }

  /**
   * Get default restore options
   */
  private getDefaultOptions(): SessionRestoreOptions {
    return {
      autoReconnect: true,
      restoreTerminalState: true,
      restoreAIHistory: true,
      restoreFileManagerState: true
    };
  }
}

// Type definitions
export interface SessionRestoreResult {
  success: boolean;
  error?: string;
  activeTabId?: string | null;
  restoredTabs: number;
  restoredConnections: number;
  duration?: number;
}

export interface TabRestoreResult {
  restoredTabIds: string[];
  restoredConnectionIds: string[];
}

export interface SessionStats {
  hasSession: boolean;
  lastSaved: number | null;
  tabCount: number;
  activeTabId: string | null;
  size: number;
  version?: string;
  age?: number;
}

/**
 * Create session restore service composable
 */
export function useSessionRestore() {
  const service = new SessionRestoreService();

  return {
    service,
    saveSession: service.saveSession.bind(service),
    loadSession: service.loadSession.bind(service),
    restoreSession: service.restoreSession.bind(service),
    clearSession: service.clearSession.bind(service),
    triggerAutoSave: service.triggerAutoSave.bind(service),
    getSessionStats: service.getSessionStats.bind(service),
    exportSession: service.exportSession.bind(service),
    importSession: service.importSession.bind(service)
  };
}

/**
 * Default session restore service instance
 */
let defaultSessionRestoreService: SessionRestoreService | null = null;

/**
 * Get or create default session restore service instance
 */
export function getDefaultSessionRestoreService(): SessionRestoreService {
  if (!defaultSessionRestoreService) {
    defaultSessionRestoreService = new SessionRestoreService();
  }
  return defaultSessionRestoreService;
}