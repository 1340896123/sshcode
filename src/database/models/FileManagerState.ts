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
  public upsert(tabId: string, data: Partial<FileManagerState>): FileManagerState {
    const existing = this.findByTabId(tabId);

    if (existing) {
      return this.update(tabId, data)!;
    } else {
      return this.create(tabId, data);
    }
  }

  /**
   * Create file manager state for a tab
   */
  public create(tabId: string, data: Partial<FileManagerState>): FileManagerState {
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
      this.insertBookmarks(fileManagerState.bookmarks);
    }

    // Insert file transfers if provided
    if (fileManagerState.activeTransfers.length > 0) {
      this.insertFileTransfers(fileManagerState.activeTransfers);
    }

    return fileManagerState;
  }

  /**
   * Get file manager state by tab ID
   */
  public findByTabId(tabId: string): FileManagerState | null {
    // Get bookmarks for the tab
    const bookmarkStmt = this.db.prepare(`
      SELECT * FROM bookmarks
      WHERE tab_id = ?
      ORDER BY created_at ASC
    `);
    const bookmarkRows = bookmarkStmt.all(tabId) as any[];

    const bookmarks: Bookmark[] = bookmarkRows.map(row => ({
      id: row.id,
      tabId: row.tab_id,
      name: row.name,
      path: row.path,
      createdAt: row.created_at
    }));

    // Get active file transfers for the tab
    const transferStmt = this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ? AND status IN ('pending', 'active', 'paused')
      ORDER BY start_time DESC
    `);
    const transferRows = transferStmt.all(tabId) as any[];

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
  public update(tabId: string, updates: Partial<FileManagerState>): FileManagerState | null {
    const existing = this.findByTabId(tabId);
    if (!existing) return null;

    const updated: FileManagerState = {
      ...existing,
      ...updates
    };

    // Update bookmarks if provided
    if (updates.bookmarks) {
      // Delete existing bookmarks
      const deleteStmt = this.db.prepare('DELETE FROM bookmarks WHERE tab_id = ?');
      deleteStmt.run(tabId);

      // Insert new bookmarks
      this.insertBookmarks(updates.bookmarks);
    }

    // Update active transfers if provided
    if (updates.activeTransfers) {
      // Delete existing transfers for this tab
      const deleteStmt = this.db.prepare('DELETE FROM file_transfers WHERE tab_id = ?');
      deleteStmt.run(tabId);

      // Insert new transfers
      this.insertFileTransfers(updates.activeTransfers);
    }

    return updated;
  }

  /**
   * Set current directory
   */
  public setCurrentDirectory(tabId: string, directory: string): void {
    const existing = this.findByTabId(tabId);
    if (!existing) {
      this.create(tabId, { currentDirectory: directory });
    } else {
      const updatedHistory = existing.directoryHistory.includes(directory)
        ? existing.directoryHistory
        : [...existing.directoryHistory, directory];

      this.update(tabId, {
        currentDirectory: directory,
        directoryHistory: updatedHistory
      });
    }
  }

  /**
   * Navigate to previous directory
   */
  public navigateBack(tabId: string): string | null {
    const existing = this.findByTabId(tabId);
    if (!existing || existing.directoryHistory.length === 0) return null;

    const history = [...existing.directoryHistory];
    const previousDirectory = history.pop()!;

    this.update(tabId, {
      currentDirectory: previousDirectory,
      directoryHistory: history
    });

    return previousDirectory;
  }

  /**
   * Update view settings
   */
  public updateViewSettings(tabId: string, settings: {
    viewMode?: ViewMode;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
    showHiddenFiles?: boolean;
  }): void {
    const existing = this.findByTabId(tabId);
    if (!existing) return;

    this.update(tabId, settings);
  }

  /**
   * Add bookmark
   */
  public addBookmark(tabId: string, name: string, path: string): Bookmark {
    const bookmark: Bookmark = {
      id: uuidv4(),
      tabId,
      name,
      path,
      createdAt: Date.now()
    };

    const stmt = this.db.prepare(`
      INSERT INTO bookmarks (id, tab_id, name, path, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(bookmark.id, bookmark.tabId, bookmark.name, bookmark.path, bookmark.createdAt);

    return bookmark;
  }

  /**
   * Remove bookmark
   */
  public removeBookmark(bookmarkId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM bookmarks WHERE id = ?');
    const result = stmt.run(bookmarkId);
    return result.changes > 0;
  }

  /**
   * Get bookmarks for a tab
   */
  public getBookmarks(tabId: string): Bookmark[] {
    const stmt = this.db.prepare(`
      SELECT * FROM bookmarks
      WHERE tab_id = ?
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(tabId) as any[];

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
  public createFileTransfer(
    tabId: string,
    type: TransferType,
    sourcePath: string,
    destinationPath: string,
    totalBytes: number = 0
  ): FileTransfer {
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

    const stmt = this.db.prepare(`
      INSERT INTO file_transfers (
        id, tab_id, type, source_path, destination_path,
        status, progress, bytes_transferred, total_bytes, start_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
  public updateTransferProgress(
    transferId: string,
    progress: number,
    bytesTransferred: number
  ): void {
    const stmt = this.db.prepare(`
      UPDATE file_transfers
      SET progress = ?, bytes_transferred = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(progress, bytesTransferred, Date.now(), transferId);
  }

  /**
   * Update file transfer status
   */
  public updateTransferStatus(
    transferId: string,
    status: TransferStatus,
    error?: string
  ): void {
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

    const stmt = this.db.prepare(query);
    stmt.run(...params);
  }

  /**
   * Get file transfer by ID
   */
  public getTransfer(transferId: string): FileTransfer | null {
    const stmt = this.db.prepare('SELECT * FROM file_transfers WHERE id = ?');
    const row = stmt.get(transferId) as any;

    if (!row) return null;

    return this.mapRowToFileTransfer(row);
  }

  /**
   * Get active transfers for a tab
   */
  public getActiveTransfers(tabId: string): FileTransfer[] {
    const stmt = this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ? AND status IN ('pending', 'active', 'paused')
      ORDER BY start_time DESC
    `);
    const rows = stmt.all(tabId) as any[];

    return rows.map(row => this.mapRowToFileTransfer(row));
  }

  /**
   * Get transfer history for a tab
   */
  public getTransferHistory(tabId: string, limit: number = 50): FileTransfer[] {
    const stmt = this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ?
      ORDER BY start_time DESC
      LIMIT ?
    `);
    const rows = stmt.all(tabId, limit) as any[];

    return rows.map(row => this.mapRowToFileTransfer(row));
  }

  /**
   * Cancel file transfer
   */
  public cancelTransfer(transferId: string): boolean {
    return this.updateTransferStatus(transferId, 'failed', 'Cancelled by user') !== null;
  }

  /**
   * Delete completed transfers older than specified days
   */
  public cleanupOldTransfers(olderThanDays: number = 7): number {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      DELETE FROM file_transfers
      WHERE status IN ('completed', 'failed') AND end_time < ?
    `);

    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  /**
   * Get file manager statistics
   */
  public getStats(tabId?: string): {
    totalBookmarks: number;
    activeTransfers: number;
    completedTransfers: number;
    totalBytesTransferred: number;
  } {
    let bookmarkWhere = tabId ? 'WHERE tab_id = ?' : '';
    let transferWhere = tabId ? 'WHERE tab_id = ?' : '';
    const bookmarkParams = tabId ? [tabId] : [];
    const transferParams = tabId ? [tabId] : [];

    const bookmarkStmt = this.db.prepare(`SELECT COUNT(*) as count FROM bookmarks ${bookmarkWhere}`);
    const activeStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM file_transfers
      ${transferWhere} AND status IN ('pending', 'active', 'paused')
    `);
    const completedStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM file_transfers
      ${transferWhere} AND status = 'completed'
    `);
    const bytesStmt = this.db.prepare(`
      SELECT SUM(bytes_transferred) as total_bytes FROM file_transfers
      ${transferWhere} AND status = 'completed'
    `);

    const bookmarks = bookmarkStmt.get(...bookmarkParams) as { count: number };
    const active = activeStmt.get(...transferParams) as { count: number };
    const completed = completedStmt.get(...transferParams) as { count: number };
    const bytes = bytesStmt.get(...transferParams) as { total_bytes: number | null };

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
  private insertBookmarks(bookmarks: Bookmark[]): void {
    if (bookmarks.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO bookmarks (id, tab_id, name, path, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const db = this.db;
    const transaction = db.transaction(() => {
      for (const bookmark of bookmarks) {
        stmt.run(bookmark.id, bookmark.tabId, bookmark.name, bookmark.path, bookmark.createdAt);
      }
    });

    transaction();
  }

  /**
   * Insert multiple file transfers
   */
  private insertFileTransfers(transfers: FileTransfer[]): void {
    if (transfers.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO file_transfers (
        id, tab_id, type, source_path, destination_path,
        status, progress, bytes_transferred, total_bytes,
        start_time, end_time, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const db = this.db;
    const transaction = db.transaction(() => {
      for (const transfer of transfers) {
        stmt.run(
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
    });

    transaction();
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