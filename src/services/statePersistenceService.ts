import { getTerminalStateModel } from '../database/models/TerminalState';
import { getFileManagerStateModel } from '../database/models/FileManagerState';
import { getAIAssistantStateModel } from '../database/models/AIAssistantState';
import type { TerminalState, FileManagerState, AIAssistantState } from '../types/tab';

/**
 * State Persistence Service
 *
 * Handles saving and restoring component states for tabs
 */
export class StatePersistenceService {
  private terminalModel = getTerminalStateModel();
  private fileManagerModel = getFileManagerStateModel();
  private aiAssistantModel = getAIAssistantStateModel();

  /**
   * Save all component states for a tab
   */
  async saveTabStates(tabId: string, states: {
    terminal?: Partial<TerminalState>;
    fileManager?: Partial<FileManagerState>;
    aiAssistant?: Partial<AIAssistantState>;
  }): Promise<void> {
    try {
      const savePromises: Promise<any>[] = [];

      // Save terminal state
      if (states.terminal) {
        savePromises.push(
          Promise.resolve(this.terminalModel.upsert(tabId, states.terminal))
        );
      }

      // Save file manager state
      if (states.fileManager) {
        savePromises.push(
          Promise.resolve(this.fileManagerModel.upsert(tabId, states.fileManager))
        );
      }

      // Save AI assistant state
      if (states.aiAssistant) {
        savePromises.push(
          Promise.resolve(this.aiAssistantModel.upsert(tabId, states.aiAssistant))
        );
      }

      await Promise.all(savePromises);
      console.debug(`States saved for tab ${tabId}`);
    } catch (error) {
      console.error(`Failed to save states for tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * Restore all component states for a tab
   */
  async restoreTabStates(tabId: string): Promise<{
    terminal: TerminalState | null;
    fileManager: FileManagerState | null;
    aiAssistant: AIAssistantState | null;
  }> {
    try {
      const [terminal, fileManager, aiAssistant] = await Promise.all([
        Promise.resolve(this.terminalModel.findByTabId(tabId)),
        Promise.resolve(this.fileManagerModel.findByTabId(tabId)),
        Promise.resolve(this.aiAssistantModel.findByTabId(tabId))
      ]);

      console.debug(`States restored for tab ${tabId}`);
      return {
        terminal,
        fileManager,
        aiAssistant
      };
    } catch (error) {
      console.error(`Failed to restore states for tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * Save terminal state only
   */
  async saveTerminalState(tabId: string, state: Partial<TerminalState>): Promise<void> {
    try {
      this.terminalModel.upsert(tabId, state);
      console.debug(`Terminal state saved for tab ${tabId}`);
    } catch (error) {
      console.error(`Failed to save terminal state for tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * Save file manager state only
   */
  async saveFileManagerState(tabId: string, state: Partial<FileManagerState>): Promise<void> {
    try {
      this.fileManagerModel.upsert(tabId, state);
      console.debug(`File manager state saved for tab ${tabId}`);
    } catch (error) {
      console.error(`Failed to save file manager state for tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * Save AI assistant state only
   */
  async saveAIAssistantState(tabId: string, state: Partial<AIAssistantState>): Promise<void> {
    try {
      this.aiAssistantModel.upsert(tabId, state);
      console.debug(`AI assistant state saved for tab ${tabId}`);
    } catch (error) {
      console.error(`Failed to save AI assistant state for tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * Restore terminal state only
   */
  async restoreTerminalState(tabId: string): Promise<TerminalState | null> {
    try {
      const state = this.terminalModel.findByTabId(tabId);
      console.debug(`Terminal state restored for tab ${tabId}`);
      return state;
    } catch (error) {
      console.error(`Failed to restore terminal state for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Restore file manager state only
   */
  async restoreFileManagerState(tabId: string): Promise<FileManagerState | null> {
    try {
      const state = this.fileManagerModel.findByTabId(tabId);
      console.debug(`File manager state restored for tab ${tabId}`);
      return state;
    } catch (error) {
      console.error(`Failed to restore file manager state for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Restore AI assistant state only
   */
  async restoreAIAssistantState(tabId: string): Promise<AIAssistantState | null> {
    try {
      const state = this.aiAssistantModel.findByTabId(tabId);
      console.debug(`AI assistant state restored for tab ${tabId}`);
      return state;
    } catch (error) {
      console.error(`Failed to restore AI assistant state for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Clear all states for a tab
   */
  async clearTabStates(tabId: string): Promise<void> {
    try {
      // Clear terminal history and buffer
      this.terminalModel.clearHistory(tabId);
      this.terminalModel.clearBuffer(tabId);

      // Clear AI messages and tool calls
      this.aiAssistantModel.clearMessages(tabId);
      this.aiAssistantModel.clearToolCalls(tabId);

      // File manager bookmarks and transfers will be cleaned up automatically
      // when the tab is deleted through foreign key constraints

      console.debug(`States cleared for tab ${tabId}`);
    } catch (error) {
      console.error(`Failed to clear states for tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a tab has saved states
   */
  async hasSavedStates(tabId: string): Promise<boolean> {
    try {
      const [terminal, fileManager, aiAssistant] = await Promise.all([
        Promise.resolve(this.terminalModel.findByTabId(tabId)),
        Promise.resolve(this.fileManagerModel.findByTabId(tabId)),
        Promise.resolve(this.aiAssistantModel.findByTabId(tabId))
      ]);

      return !!(terminal || fileManager || aiAssistant);
    } catch (error) {
      console.error(`Failed to check saved states for tab ${tabId}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics for a tab
   */
  async getStorageStats(tabId: string): Promise<{
    terminal: {
      historyCount: number;
      bufferSize: number;
    };
    fileManager: {
      bookmarksCount: number;
      activeTransfersCount: number;
    };
    aiAssistant: {
      messagesCount: number;
      toolCallsCount: number;
    };
  }> {
    try {
      const [terminalStats, fileManagerStats, aiStats] = await Promise.all([
        Promise.resolve(this.terminalModel.getStats(tabId)),
        Promise.resolve(this.fileManagerModel.getStats(tabId)),
        Promise.resolve(this.aiAssistantModel.getStats(tabId))
      ]);

      return {
        terminal: {
          historyCount: terminalStats.totalCommands,
          bufferSize: terminalStats.bufferSize
        },
        fileManager: {
          bookmarksCount: fileManagerStats.totalBookmarks,
          activeTransfersCount: fileManagerStats.activeTransfers
        },
        aiAssistant: {
          messagesCount: aiStats.totalMessages,
          toolCallsCount: aiStats.totalToolCalls
        }
      };
    } catch (error) {
      console.error(`Failed to get storage stats for tab ${tabId}:`, error);
      return {
        terminal: { historyCount: 0, bufferSize: 0 },
        fileManager: { bookmarksCount: 0, activeTransfersCount: 0 },
        aiAssistant: { messagesCount: 0, toolCallsCount: 0 }
      };
    }
  }
}

// Singleton instance
let statePersistenceService: StatePersistenceService | null = null;

export function getStatePersistenceService(): StatePersistenceService {
  if (!statePersistenceService) {
    statePersistenceService = new StatePersistenceService();
  }
  return statePersistenceService;
}