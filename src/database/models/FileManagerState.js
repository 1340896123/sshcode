"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManagerStateModel = void 0;
exports.getFileManagerStateModel = getFileManagerStateModel;
const init_1 = require("../init");
const uuid_1 = require("uuid");
class FileManagerStateModel {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, init_1.getDatabase)().getDatabase()
        });
    }
    /**
     * Create or update file manager state for a tab
     */
    async upsert(tabId, data) {
        const existing = await this.findByTabId(tabId);
        if (existing) {
            return (await this.update(tabId, data));
        }
        else {
            return await this.create(tabId, data);
        }
    }
    /**
     * Create file manager state for a tab
     */
    async create(tabId, data) {
        const fileManagerState = {
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
    async findByTabId(tabId) {
        // Get bookmarks for the tab
        const bookmarkStmt = await this.db.prepare(`
      SELECT * FROM bookmarks
      WHERE tab_id = ?
      ORDER BY created_at ASC
    `);
        const bookmarkRows = await bookmarkStmt.all(tabId);
        const bookmarks = bookmarkRows.map(row => ({
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
        const transferRows = await transferStmt.all(tabId);
        const activeTransfers = transferRows.map(row => ({
            id: row.id,
            tabId: row.tab_id,
            type: row.type,
            sourcePath: row.source_path,
            destinationPath: row.destination_path,
            status: row.status,
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
    async update(tabId, updates) {
        const existing = await this.findByTabId(tabId);
        if (!existing)
            return null;
        const updated = {
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
    async setCurrentDirectory(tabId, directory) {
        const existing = await this.findByTabId(tabId);
        if (!existing) {
            await this.create(tabId, { currentDirectory: directory });
        }
        else {
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
    async navigateBack(tabId) {
        const existing = await this.findByTabId(tabId);
        if (!existing || existing.directoryHistory.length === 0)
            return null;
        const history = [...existing.directoryHistory];
        const previousDirectory = history.pop();
        await this.update(tabId, {
            currentDirectory: previousDirectory,
            directoryHistory: history
        });
        return previousDirectory;
    }
    /**
     * Update view settings
     */
    async updateViewSettings(tabId, settings) {
        const existing = await this.findByTabId(tabId);
        if (!existing)
            return;
        await this.update(tabId, settings);
    }
    /**
     * Add bookmark
     */
    async addBookmark(tabId, name, path) {
        const bookmark = {
            id: (0, uuid_1.v4)(),
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
    async removeBookmark(bookmarkId) {
        const stmt = await this.db.prepare('DELETE FROM bookmarks WHERE id = ?');
        const result = await stmt.run(bookmarkId);
        return result.changes > 0;
    }
    /**
     * Get bookmarks for a tab
     */
    async getBookmarks(tabId) {
        const stmt = await this.db.prepare(`
      SELECT * FROM bookmarks
      WHERE tab_id = ?
      ORDER BY created_at ASC
    `);
        const rows = await stmt.all(tabId);
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
    async createFileTransfer(tabId, type, sourcePath, destinationPath, totalBytes = 0) {
        const transfer = {
            id: (0, uuid_1.v4)(),
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
        await stmt.run(transfer.id, transfer.tabId, transfer.type, transfer.sourcePath, transfer.destinationPath, transfer.status, transfer.progress, transfer.bytesTransferred, transfer.totalBytes, transfer.startTime);
        return transfer;
    }
    /**
     * Update file transfer progress
     */
    async updateTransferProgress(transferId, progress, bytesTransferred) {
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
    async updateTransferStatus(transferId, status, error) {
        let query = `
      UPDATE file_transfers
      SET status = ?, updated_at = ?
    `;
        const params = [status, Date.now()];
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
    async getTransfer(transferId) {
        const stmt = await this.db.prepare('SELECT * FROM file_transfers WHERE id = ?');
        const row = await stmt.get(transferId);
        if (!row)
            return null;
        return this.mapRowToFileTransfer(row);
    }
    /**
     * Get active transfers for a tab
     */
    async getActiveTransfers(tabId) {
        const stmt = await this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ? AND status IN ('pending', 'active', 'paused')
      ORDER BY start_time DESC
    `);
        const rows = await stmt.all(tabId);
        return rows.map(row => this.mapRowToFileTransfer(row));
    }
    /**
     * Get transfer history for a tab
     */
    async getTransferHistory(tabId, limit = 50) {
        const stmt = await this.db.prepare(`
      SELECT * FROM file_transfers
      WHERE tab_id = ?
      ORDER BY start_time DESC
      LIMIT ?
    `);
        const rows = await stmt.all(tabId, limit);
        return rows.map(row => this.mapRowToFileTransfer(row));
    }
    /**
     * Cancel file transfer
     */
    async cancelTransfer(transferId) {
        await this.updateTransferStatus(transferId, 'failed', 'Cancelled by user');
        return true;
    }
    /**
     * Delete completed transfers older than specified days
     */
    async cleanupOldTransfers(olderThanDays = 7) {
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
    async getStats(tabId) {
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
        const bookmarks = await bookmarkStmt.get(...bookmarkParams);
        const active = await activeStmt.get(...transferParams);
        const completed = await completedStmt.get(...transferParams);
        const bytes = await bytesStmt.get(...transferParams);
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
    async insertBookmarks(bookmarks) {
        if (bookmarks.length === 0)
            return;
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
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Insert multiple file transfers
     */
    async insertFileTransfers(transfers) {
        if (transfers.length === 0)
            return;
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
                await stmt.run(transfer.id, transfer.tabId, transfer.type, transfer.sourcePath, transfer.destinationPath, transfer.status, transfer.progress, transfer.bytesTransferred, transfer.totalBytes, transfer.startTime, transfer.endTime, transfer.error);
            }
            await this.db.exec('COMMIT');
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Map database row to FileTransfer object
     */
    mapRowToFileTransfer(row) {
        return {
            id: row.id,
            tabId: row.tab_id,
            type: row.type,
            sourcePath: row.source_path,
            destinationPath: row.destination_path,
            status: row.status,
            progress: row.progress,
            bytesTransferred: row.bytes_transferred,
            totalBytes: row.total_bytes,
            startTime: row.start_time,
            endTime: row.end_time,
            error: row.error
        };
    }
}
exports.FileManagerStateModel = FileManagerStateModel;
// Singleton instance
let fileManagerStateModel = null;
function getFileManagerStateModel() {
    if (!fileManagerStateModel) {
        fileManagerStateModel = new FileManagerStateModel();
    }
    return fileManagerStateModel;
}
