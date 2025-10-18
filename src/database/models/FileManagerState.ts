import { getDatabase } from '../init';
import type {
  FileManagerState,
  Bookmark,
  FileTransfer,
  TransferStatus,
  TransferType,
  ViewMode,
  SortBy,
  SortOrder
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class FileManagerStateModel {
  private db = getDatabase().getDatabase();

  /**
   * Create or update file manager state for a tab
   */
  public async upsert(tabId: string, data: Partial<FileManagerState>): Promise<FileManagerState> {
    const existing = await this.findByTabId(tabId);

    if (existing) {
      return (await this.update(tabId, data))!;
    } else {
      return await this.create(tabId, data);
    }
  }

  /**
   * Create file manager state for a tab
   */
  public async create(tabId: string, data: Partial<FileManagerState>): Promise<FileManagerState> {
    const fileManagerState: FileManagerState = {
      tabId,
      currentDirectory: data.currentDirectory || '/home',
      directoryHistory: data.directoryHistory || [],
      selectedFiles: data.selectedFiles || [],
      viewMode: data.viewMode || 'list',
      sortBy: data.sortBy || 'name',
      sortOrder: data.sortOrder || 'asc',
      showHiddenFiles: data.showHiddenFiles !== undefined ? data.showHiddenFiles : false,
      activeTransfers: data.activeTransfers || [],
      bookmarks: data.bookmarks || []
    };

    // Insert bookmarks if provided
    if (fileManagerState.bookmarks.length > 0) {
      await this.insertBookmarks(fileManagerState.bookmarks);
    }

    // Insert file transfers if provided
    if (fileManagerState.activeTransfers.length > 0) {
      await this.insertFileTransfers(fileManagerState.activeTransfers);
    }

    return fileManagerState;
  }

  /**
   * Get file manager state by tab ID
   */
  public async findByTabId(tabId: string): Promise<FileManagerState | null> {
    // Get bookmarks for the tab
    const bookmarkStmt = await this.db.prepare(`
      SELECT * FROM bookmarks
      WHERE tab_id = ?
      ORDER BY created_at ASC
    `);
    const bookmarkRows = await bookmarkStmt.all(tabId) as any[];

    const bookmarks: Bookmark[] = bookmarkRows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      name: row.name,
      path: row.path,
      createdAt: row.created_at
    }));

    // Get active file transfers for the tab
    const transferStmt = await this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ? AND status IN ('pending', 'active', 'paused')
      ORDER BY start_time DESC
    `);
    const transferRows = await transferStmt.all(tabId) as any[];

    const activeTransfers: FileTransfer[] = transferRows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      type: row.type as TransferType,
      sourcePath: row.source_path,
      destinationPath: row.destination_path,
      status: row.status as TransferStatus,
      progress: row.progress,
      bytesTransferred: row.bytes_transferred,
      totalBytes: row.total_bytes,
      startTime: row.start_time,
      endTime: row.end_time,
      error: row.error
    }));

    // Return file manager state
    return {
      tabId,
      currentDirectory: '/home', // Default directory
      directoryHistory: [],
      selectedFiles: [],
      viewMode: 'list',
      sortBy: 'name',
      sortOrder: 'asc',
      showHiddenFiles: false,
      activeTransfers,
      bookmarks
    };
  }

  /**
   * Update file manager state for a tab
   */
  public async update(tabId: string, updates: Partial<FileManagerState>): Promise<FileManagerState | null> {
    const existing = await this.findByTabId(tabId);
    if (!existing) return null;

    const updated: FileManagerState = {
      ...existing,
      ...updates
    };

    // Update bookmarks if provided
    if (updates.bookmarks) {
      // Delete existing bookmarks
      const deleteStmt = await this.db.prepare('DELETE FROM bookmarks WHERE tab_id = ?');
      await deleteStmt.run(tabId);

      // Insert new bookmarks
      await this.insertBookmarks(updates.bookmarks);
    }

    // Update active transfers if provided
    if (updates.activeTransfers) {
      // Delete existing transfers for this tab
      const deleteStmt = await this.db.prepare('DELETE FROM file_transfers WHERE tab_id = ?');
      await deleteStmt.run(tabId);

      // Insert new transfers
      await this.insertFileTransfers(updates.activeTransfers);
    }

    return updated;
  }

  /**
   * Set current directory
   */
  public async setCurrentDirectory(tabId: string, directory: string): Promise<void> {
    const existing = await this.findByTabId(tabId);
    if (!existing) {
      await this.create(tabId, { currentDirectory: directory });
    } else {
      const updatedHistory = existing.directoryHistory.includes(directory)
        ? existing.directoryHistory
        : [...existing.directoryHistory, directory];

      await this.update(tabId, {
        currentDirectory: directory,
        directoryHistory: updatedHistory
      });
    }
  }

  /**
   * Navigate to previous directory
   */
  public async navigateBack(tabId: string): Promise<string | null> {
    const existing = await this.findByTabId(tabId);
    if (!existing || existing.directoryHistory.length === 0) return null;

    const history = [...existing.directoryHistory];
    const previousDirectory = history.pop()!;

    await this.update(tabId, {
      currentDirectory: previousDirectory,
      directoryHistory: history
    });

    return previousDirectory;
  }

  /**
   * Update view settings
   */
  public async updateViewSettings(tabId: string, settings: {
    viewMode?: ViewMode;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
    showHiddenFiles?: boolean;
  }): Promise<void> {
    const existing = await this.findByTabId(tabId);
    if (!existing) return;

    await this.update(tabId, settings);
  }

  /**
   * Add bookmark
   */
  public async addBookmark(tabId: string, name: string, path: string): Promise<Bookmark> {
    const bookmark: Bookmark = {
      id: uuidv4(),
      tabId,
      name,
      path,
      createdAt: Date.now()
    };

    const stmt = await this.db.prepare(`
      INSERT INTO bookmarks (id, tab_id, name, path, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    await stmt.run(bookmark.id, bookmark.tabId, bookmark.name, bookmark.path, bookmark.createdAt);

    return bookmark;
  }

  /**
   * Remove bookmark
   */
  public async removeBookmark(bookmarkId: string): Promise<boolean> {
    const stmt = await this.db.prepare('DELETE FROM bookmarks WHERE id = ?');
    const result = await stmt.run(bookmarkId);
    return result.changes > 0;
  }

  /**
   * Get bookmarks for a tab
   */
  public async getBookmarks(tabId: string): Promise<Bookmark[]> {
    const stmt = await this.db.prepare(`
      SELECT * FROM bookmarks
      WHERE tab_id = ?
      ORDER BY created_at ASC
    `);
    const rows = await stmt.all(tabId) as any[];

    return rows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      name: row.name,
      path: row.path,
      createdAt: row.created_at
    }));
  }

  /**
   * Create file transfer
   */
  public async createFileTransfer(
    tabId: string,
    type: TransferType,
    sourcePath: string,
    destinationPath: string,
    totalBytes: number = 0
  ): Promise<FileTransfer> {
    const transfer: FileTransfer = {
      id: uuidv4(),
      tabId,
      type,
      sourcePath,
      destinationPath,
      status: 'pending',
      progress: 0,
      bytesTransferred: 0,
      totalBytes,
      startTime: Date.now()
    };

    const stmt = await this.db.prepare(`
      INSERT INTO file_transfers (
        id, tab_id, type, source_path, destination_path,
        status, progress, bytes_transferred, total_bytes, start_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
      transfer.id,
      transfer.tabId,
      transfer.type,
      transfer.sourcePath,
      transfer.destinationPath,
      transfer.status,
      transfer.progress,
      transfer.bytesTransferred,
      transfer.totalBytes,
      transfer.startTime
    );

    return transfer;
  }

  /**
   * Update file transfer progress
   */
  public async updateTransferProgress(
    transferId: string,
    progress: number,
    bytesTransferred: number
  ): Promise<void> {
    const stmt = await this.db.prepare(`
      UPDATE file_transfers
      SET progress = ?, bytes_transferred = ?, updated_at = ?
      WHERE id = ?
    `);

    await stmt.run(progress, bytesTransferred, Date.now(), transferId);
  }

  /**
   * Update file transfer status
   */
  public async updateTransferStatus(
    transferId: string,
    status: TransferStatus,
    error?: string
  ): Promise<void> {
    let query = `
      UPDATE file_transfers
      SET status = ?, updated_at = ?
    `;

    const params: any[] = [status, Date.now()];

    if (error) {
      query += `, error = ?`;
      params.push(error);
    }

    if (status === 'completed' || status === 'failed') {
      query += `, end_time = ?`;
      params.push(Date.now());
    }

    query += ` WHERE id = ?`;
    params.push(transferId);

    const stmt = await this.db.prepare(query);
    await stmt.run(...params);
  }

  /**
   * Get file transfer by ID
   */
  public async getTransfer(transferId: string): Promise<FileTransfer | null> {
    const stmt = await this.db.prepare('SELECT * FROM file_transfers WHERE id = ?');
    const row = await stmt.get(transferId) as any;

    if (!row) return null;

    return this.mapRowToFileTransfer(row);
  }

  /**
   * Get active transfers for a tab
   */
  public async getActiveTransfers(tabId: string): Promise<FileTransfer[]> {
    const stmt = await this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ? AND status IN ('pending', 'active', 'paused')
      ORDER BY start_time DESC
    `);
    const rows = await stmt.all(tabId) as any[];

    return rows.map(row => this.mapRowToFileTransfer(row));
  }

  /**
   * Get transfer history for a tab
   */
  public async getTransferHistory(tabId: string, limit: number = 50): Promise<FileTransfer[]> {
    const stmt = await this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ?
      ORDER BY start_time DESC
      LIMIT ?
    `);
    const rows = await stmt.all(tabId, limit) as any[];

    return rows.map(row => this.mapRowToFileTransfer(row));
  }

  /**
   * Cancel file transfer
   */
  public async cancelTransfer(transferId: string): Promise<boolean> {
    await this.updateTransferStatus(transferId, 'failed', 'Cancelled by user');
    return true;
  }

  /**
   * Delete completed transfers older than specified days
   */
  public async cleanupOldTransfers(olderThanDays: number = 7): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    const stmt = await this.db.prepare(`
      DELETE FROM file_transfers
      WHERE status IN ('completed', 'failed') AND end_time < ?
    `);

    const result = await stmt.run(cutoffTime);
    return result.changes;
  }

  /**
   * Get file manager statistics
   */
  public async getStats(tabId?: string): Promise<{
    totalBookmarks: number;
    activeTransfers: number;
    completedTransfers: number;
    totalBytesTransferred: number;
  }> {
    let bookmarkWhere = tabId ? 'WHERE tab_id = ?' : '';
    let transferWhere = tabId ? 'WHERE tab_id = ?' : '';
    const bookmarkParams = tabId ? [tabId] : [];
    const transferParams = tabId ? [tabId] : [];

    const bookmarkStmt = await this.db.prepare(`SELECT COUNT(*) as count FROM bookmarks ${bookmarkWhere}`);
    const activeStmt = await this.db.prepare(`
      SELECT COUNT(*) as count FROM file_transfers
      ${transferWhere} AND status IN ('pending', 'active', 'paused')
    `);
    const completedStmt = await this.db.prepare(`
      SELECT COUNT(*) as count FROM file_transfers
      ${transferWhere} AND status = 'completed'
    `);
    const bytesStmt = await this.db.prepare(`
      SELECT SUM(bytes_transferred) as total_bytes FROM file_transfers
      ${transferWhere} AND status = 'completed'
    `);

    const bookmarks = await bookmarkStmt.get(...bookmarkParams) as { count: number };
    const active = await activeStmt.get(...transferParams) as { count: number };
    const completed = await completedStmt.get(...transferParams) as { count: number };
    const bytes = await bytesStmt.get(...transferParams) as { total_bytes: number | null };

    return {
      totalBookmarks: bookmarks.count,
      activeTransfers: active.count,
      completedTransfers: completed.count,
      totalBytesTransferred: bytes.total_bytes ?? 0
    };
  }

  /**
   * Insert multiple bookmarks
   */
  private async insertBookmarks(bookmarks: Bookmark[]): Promise<void> {
    if (bookmarks.length === 0) return;

    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO bookmarks (id, tab_id, name, path, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Manual transaction implementation
    await this.db.exec('BEGIN');
    try {
      for (const bookmark of bookmarks) {
        await stmt.run(bookmark.id, bookmark.tabId, bookmark.name, bookmark.path, bookmark.createdAt);
      }
      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Insert multiple file transfers
   */
  private async insertFileTransfers(transfers: FileTransfer[]): Promise<void> {
    if (transfers.length === 0) return;

    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO file_transfers (
        id, tab_id, type, source_path, destination_path,
        status, progress, bytes_transferred, total_bytes,
        start_time, end_time, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Manual transaction implementation
    await this.db.exec('BEGIN');
    try {
      for (const transfer of transfers) {
        await stmt.run(
          transfer.id,
          transfer.tabId,
          transfer.type,
          transfer.sourcePath,
          transfer.destinationPath,
          transfer.status,
          transfer.progress,
          transfer.bytesTransferred,
          transfer.totalBytes,
          transfer.startTime,
          transfer.endTime,
          transfer.error
        );
      }
      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Map database row to FileTransfer object
   */
  private mapRowToFileTransfer(row: any): FileTransfer {
    return {
      id: row.id,
      tabId: row.tab_id,
      type: row.type as TransferType,
      sourcePath: row.source_path,
      destinationPath: row.destination_path,
      status: row.status as TransferStatus,
      progress: row.progress,
      bytesTransferred: row.bytes_transferred,
      totalBytes: row.total_bytes,
      startTime: row.start_time,
      endTime: row.end_time,
      error: row.error
    };
  }
}

// Singleton instance
let fileManagerStateModel: FileManagerStateModel | null = null;

export function getFileManagerStateModel(): FileManagerStateModel {
  if (!fileManagerStateModel) {
    fileManagerStateModel = new FileManagerStateModel();
  }
  return fileManagerStateModel;
}