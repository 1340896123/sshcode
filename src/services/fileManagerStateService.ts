import { getFileManagerStateModel } from '../database/models/FileManagerState';
import type { FileManagerState, Bookmark, FileTransfer, ViewMode, SortBy, SortOrder } from '../types/tab';

/**
 * File Manager State Service
 *
 * Handles automatic capture and persistence of file manager state changes
 */
export class FileManagerStateService {
  private fileManagerModel = getFileManagerStateModel();
  private fileManagerStates = new Map<string, FileManagerState>();

  /**
   * Initialize file manager state tracking for a tab
   */
  async initializeFileManagerState(tabId: string): Promise<void> {
    const existingState = await this.fileManagerModel.findByTabId(tabId);

    if (existingState) {
      this.fileManagerStates.set(tabId, existingState);
    } else {
      // Create default state
      const defaultState: FileManagerState = {
        tabId,
        currentDirectory: '/home',
        directoryHistory: [],
        selectedFiles: [],
        viewMode: 'list',
        sortBy: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        activeTransfers: [],
        bookmarks: []
      };
      this.fileManagerStates.set(tabId, defaultState);
      await this.fileManagerModel.create(tabId, defaultState);
    }
  }

  /**
   * Clean up file manager state tracking for a tab
   */
  cleanupFileManagerState(tabId: string): void {
    this.fileManagerStates.delete(tabId);
  }

  /**
   * Get current file manager state for a tab
   */
  getFileManagerState(tabId: string): FileManagerState | null {
    return this.fileManagerStates.get(tabId) || null;
  }

  /**
   * Navigate to a directory
   */
  async navigateToDirectory(tabId: string, directory: string): Promise<FileManagerState> {
    let state = this.fileManagerStates.get(tabId);
    if (!state) {
      await this.initializeFileManagerState(tabId);
      state = this.fileManagerStates.get(tabId)!;
    }

    // Add current directory to history if it's different
    if (state.currentDirectory !== directory && !state.directoryHistory.includes(state.currentDirectory)) {
      state.directoryHistory.push(state.currentDirectory);
    }

    // Update current directory
    state.currentDirectory = directory;

    // Save to database
    try {
      await this.fileManagerModel.setCurrentDirectory(tabId, directory);
    } catch (error) {
      console.error(`Failed to save directory navigation for tab ${tabId}:`, error);
    }

    return state;
  }

  /**
   * Navigate back to previous directory
   */
  async navigateBack(tabId: string): Promise<string | null> {
    try {
      const previousDirectory = await this.fileManagerModel.navigateBack(tabId);

      if (previousDirectory) {
        const state = this.fileManagerStates.get(tabId);
        if (state) {
          state.currentDirectory = previousDirectory;
          // Remove the last entry from history since we're going back to it
          state.directoryHistory.pop();
        }
      }

      return previousDirectory;
    } catch (error) {
      console.error(`Failed to navigate back for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Update view settings
   */
  async updateViewSettings(tabId: string, settings: {
    viewMode?: ViewMode;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
    showHiddenFiles?: boolean;
  }): Promise<void> {
    const state = this.fileManagerStates.get(tabId);
    if (!state) return;

    // Update local state
    Object.assign(state, settings);

    // Save to database
    try {
      await this.fileManagerModel.updateViewSettings(tabId, settings);
    } catch (error) {
      console.error(`Failed to update view settings for tab ${tabId}:`, error);
    }
  }

  /**
   * Set selected files
   */
  setSelectedFiles(tabId: string, selectedFiles: string[]): void {
    const state = this.fileManagerStates.get(tabId);
    if (state) {
      state.selectedFiles = selectedFiles;
      this.debouncedSave(tabId);
    }
  }

  /**
   * Add selected file
   */
  addSelectedFile(tabId: string, filePath: string): void {
    const state = this.fileManagerStates.get(tabId);
    if (state && !state.selectedFiles.includes(filePath)) {
      state.selectedFiles.push(filePath);
      this.debouncedSave(tabId);
    }
  }

  /**
   * Remove selected file
   */
  removeSelectedFile(tabId: string, filePath: string): void {
    const state = this.fileManagerStates.get(tabId);
    if (state) {
      const index = state.selectedFiles.indexOf(filePath);
      if (index > -1) {
        state.selectedFiles.splice(index, 1);
        this.debouncedSave(tabId);
      }
    }
  }

  /**
   * Clear selected files
   */
  clearSelectedFiles(tabId: string): void {
    const state = this.fileManagerStates.get(tabId);
    if (state) {
      state.selectedFiles = [];
      this.debouncedSave(tabId);
    }
  }

  /**
   * Add bookmark
   */
  async addBookmark(tabId: string, name: string, path: string): Promise<Bookmark | null> {
    try {
      const bookmark = await this.fileManagerModel.addBookmark(tabId, name, path);

      const state = this.fileManagerStates.get(tabId);
      if (state) {
        state.bookmarks.push(bookmark);
      }

      return bookmark;
    } catch (error) {
      console.error(`Failed to add bookmark for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(tabId: string, bookmarkId: string): Promise<boolean> {
    try {
      const success = await this.fileManagerModel.removeBookmark(bookmarkId);

      if (success) {
        const state = this.fileManagerStates.get(tabId);
        if (state) {
          state.bookmarks = state.bookmarks.filter(b => b.id !== bookmarkId);
        }
      }

      return success;
    } catch (error) {
      console.error(`Failed to remove bookmark for tab ${tabId}:`, error);
      return false;
    }
  }

  /**
   * Get bookmarks for a tab
   */
  getBookmarks(tabId: string): Bookmark[] {
    const state = this.fileManagerStates.get(tabId);
    return state ? state.bookmarks : [];
  }

  /**
   * Create file transfer
   */
  async createFileTransfer(
    tabId: string,
    type: 'upload' | 'download',
    sourcePath: string,
    destinationPath: string,
    totalBytes: number = 0
  ): Promise<FileTransfer | null> {
    try {
      const transfer = await this.fileManagerModel.createFileTransfer(
        tabId,
        type,
        sourcePath,
        destinationPath,
        totalBytes
      );

      const state = this.fileManagerStates.get(tabId);
      if (state) {
        state.activeTransfers.push(transfer);
      }

      return transfer;
    } catch (error) {
      console.error(`Failed to create file transfer for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Update transfer progress
   */
  async updateTransferProgress(transferId: string, progress: number, bytesTransferred: number): Promise<void> {
    try {
      await this.fileManagerModel.updateTransferProgress(transferId, progress, bytesTransferred);

      // Update local state
      for (const state of this.fileManagerStates.values()) {
        const transfer = state.activeTransfers.find(t => t.id === transferId);
        if (transfer) {
          transfer.progress = progress;
          transfer.bytesTransferred = bytesTransferred;
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to update transfer progress for ${transferId}:`, error);
    }
  }

  /**
   * Complete transfer
   */
  async completeTransfer(transferId: string, success: boolean, error?: string): Promise<void> {
    try {
      const status = success ? 'completed' : 'failed';
      await this.fileManagerModel.updateTransferStatus(transferId, status as any, error);

      // Remove from active transfers in local state
      for (const state of this.fileManagerStates.values()) {
        const index = state.activeTransfers.findIndex(t => t.id === transferId);
        if (index > -1) {
          const transfer = state.activeTransfers[index];
          transfer.status = status as any;
          if (error) {
            transfer.error = error;
          }
          transfer.endTime = Date.now();

          // Remove from active transfers after a delay
          setTimeout(() => {
            const currentIndex = state.activeTransfers.findIndex(t => t.id === transferId);
            if (currentIndex > -1) {
              state.activeTransfers.splice(currentIndex, 1);
            }
          }, 5000);
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to complete transfer ${transferId}:`, error);
    }
  }

  /**
   * Get active transfers for a tab
   */
  getActiveTransfers(tabId: string): FileTransfer[] {
    const state = this.fileManagerStates.get(tabId);
    return state ? state.activeTransfers : [];
  }

  /**
   * Get transfer history for a tab
   */
  async getTransferHistory(tabId: string, limit: number = 50): Promise<FileTransfer[]> {
    try {
      return await this.fileManagerModel.getTransferHistory(tabId, limit);
    } catch (error) {
      console.error(`Failed to get transfer history for tab ${tabId}:`, error);
      return [];
    }
  }

  /**
   * Get file manager statistics for a tab
   */
  async getFileManagerStats(tabId: string): Promise<{
    bookmarksCount: number;
    activeTransfersCount: number;
    completedTransfersCount: number;
    totalBytesTransferred: number;
  }> {
    try {
      const stats = await this.fileManagerModel.getStats(tabId);
      return {
        bookmarksCount: stats.totalBookmarks,
        activeTransfersCount: stats.activeTransfers,
        completedTransfersCount: stats.completedTransfers,
        totalBytesTransferred: stats.totalBytesTransferred
      };
    } catch (error) {
      console.error(`Failed to get file manager stats for tab ${tabId}:`, error);
      return {
        bookmarksCount: 0,
        activeTransfersCount: 0,
        completedTransfersCount: 0,
        totalBytesTransferred: 0
      };
    }
  }

  /**
   * Save current state to database
   */
  async saveState(tabId: string): Promise<void> {
    const state = this.fileManagerStates.get(tabId);
    if (!state) return;

    try {
      await this.fileManagerModel.upsert(tabId, state);
    } catch (error) {
      console.error(`Failed to save file manager state for tab ${tabId}:`, error);
    }
  }

  // Private methods

  private debouncedSave = this.debounce((tabId: string) => {
    this.saveState(tabId);
  }, 1000);

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
let fileManagerStateService: FileManagerStateService | null = null;

export function getFileManagerStateService(): FileManagerStateService {
  if (!fileManagerStateService) {
    fileManagerStateService = new FileManagerStateService();
  }
  return fileManagerStateService;
}