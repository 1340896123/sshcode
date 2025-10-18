"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAssistantStateModel = void 0;
exports.getAIAssistantStateModel = getAIAssistantStateModel;
const init_1 = require("../init");
const uuid_1 = require("uuid");
class AIAssistantStateModel {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, init_1.getDatabase)().getDatabase()
        });
    }
    /**
     * Create or update AI assistant state for a tab
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
     * Create AI assistant state for a tab
     */
    async create(tabId, data) {
        const aiAssistantState = {
            tabId,
            messages: data.messages || [],
            toolCalls: data.toolCalls || [],
            currentContext: data.currentContext || {
                workingDirectory: '/home',
                environment: {},
                systemInfo: {
                    hostname: '',
                    os: '',
                    architecture: '',
                    uptime: 0,
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskUsage: 0
                },
                recentCommands: []
            },
            isVisible: data.isVisible !== undefined ? data.isVisible : true,
            inputHeight: data.inputHeight || 40,
            scrollPosition: data.scrollPosition || 0
        };
        // Insert messages if provided
        if (aiAssistantState.messages.length > 0) {
            await this.insertMessages(aiAssistantState.messages);
        }
        // Insert tool calls if provided
        if (aiAssistantState.toolCalls.length > 0) {
            await this.insertToolCalls(aiAssistantState.toolCalls);
        }
        return aiAssistantState;
    }
    /**
     * Get AI assistant state by tab ID
     */
    async findByTabId(tabId) {
        // Get messages for the tab
        const messageStmt = await this.db.prepare(`
      SELECT * FROM ai_messages
      WHERE tab_id = ?
      ORDER BY timestamp ASC
    `);
        const messageRows = await messageStmt.all(tabId);
        const messages = messageRows.map(row => ({
            id: row.id,
            tabId: row.tab_id,
            role: row.role,
            content: row.content,
            timestamp: row.timestamp,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
        // Get tool calls for the tab
        const toolCallStmt = await this.db.prepare(`
      SELECT * FROM tool_calls
      WHERE tab_id = ?
      ORDER BY start_time ASC
    `);
        const toolCallRows = await toolCallStmt.all(tabId);
        const toolCalls = toolCallRows.map(row => ({
            id: row.id,
            tabId: row.tab_id,
            command: row.command,
            status: row.status,
            result: row.result,
            error: row.error,
            startTime: row.start_time,
            endTime: row.end_time,
            executionTime: row.execution_time,
            context: row.context ? JSON.parse(row.context) : {
                workingDirectory: '/home',
                environment: {}
            }
        }));
        // Return AI assistant state
        return {
            tabId,
            messages,
            toolCalls,
            currentContext: {
                workingDirectory: '/home',
                environment: {},
                systemInfo: {
                    hostname: '',
                    os: '',
                    architecture: '',
                    uptime: 0,
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskUsage: 0
                },
                recentCommands: []
            },
            isVisible: true,
            inputHeight: 40,
            scrollPosition: 0
        };
    }
    /**
     * Update AI assistant state for a tab
     */
    async update(tabId, updates) {
        const existing = await this.findByTabId(tabId);
        if (!existing)
            return null;
        const updated = {
            ...existing,
            ...updates
        };
        // Update messages if provided
        if (updates.messages) {
            // Delete existing messages
            const deleteStmt = await this.db.prepare('DELETE FROM ai_messages WHERE tab_id = ?');
            await deleteStmt.run(tabId);
            // Insert new messages
            await this.insertMessages(updates.messages);
        }
        // Update tool calls if provided
        if (updates.toolCalls) {
            // Delete existing tool calls
            const deleteStmt = await this.db.prepare('DELETE FROM tool_calls WHERE tab_id = ?');
            await deleteStmt.run(tabId);
            // Insert new tool calls
            await this.insertToolCalls(updates.toolCalls);
        }
        return updated;
    }
    /**
     * Add message to conversation
     */
    async addMessage(tabId, role, content, metadata) {
        const message = {
            id: (0, uuid_1.v4)(),
            tabId,
            role,
            content,
            timestamp: Date.now(),
            metadata
        };
        const stmt = await this.db.prepare(`
      INSERT INTO ai_messages (id, tab_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        await stmt.run(message.id, message.tabId, message.role, message.content, message.timestamp, message.metadata ? JSON.stringify(message.metadata) : null);
        return message;
    }
    /**
     * Get messages for a tab
     */
    async getMessages(tabId, limit) {
        let query = `
      SELECT * FROM ai_messages
      WHERE tab_id = ?
      ORDER BY timestamp ASC
    `;
        if (limit) {
            query += ` LIMIT ${limit}`;
        }
        const stmt = await this.db.prepare(query);
        const rows = await stmt.all(tabId);
        return rows.map(row => ({
            id: row.id,
            tabId: row.tab_id,
            role: row.role,
            content: row.content,
            timestamp: row.timestamp,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    /**
     * Get recent messages for a tab
     */
    async getRecentMessages(tabId, count = 20) {
        const stmt = await this.db.prepare(`
      SELECT * FROM ai_messages
      WHERE tab_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
        const rows = await stmt.all(tabId, count);
        return rows.reverse().map(row => ({
            id: row.id,
            tabId: row.tab_id,
            role: row.role,
            content: row.content,
            timestamp: row.timestamp,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    /**
     * Clear messages for a tab
     */
    async clearMessages(tabId) {
        const stmt = await this.db.prepare('DELETE FROM ai_messages WHERE tab_id = ?');
        await stmt.run(tabId);
    }
    /**
     * Add tool call
     */
    async addToolCall(tabId, command, context) {
        const toolCall = {
            id: (0, uuid_1.v4)(),
            tabId,
            command,
            status: 'executing',
            startTime: Date.now(),
            context
        };
        const stmt = await this.db.prepare(`
      INSERT INTO tool_calls (id, tab_id, command, status, start_time, context)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        await stmt.run(toolCall.id, toolCall.tabId, toolCall.command, toolCall.status, toolCall.startTime, JSON.stringify(toolCall.context));
        return toolCall;
    }
    /**
     * Update tool call with result
     */
    async completeToolCall(toolCallId, status, result, error) {
        const endTime = Date.now();
        const existingToolCall = await this.getToolCall(toolCallId);
        const executionTime = endTime - (existingToolCall?.startTime || endTime);
        const stmt = await this.db.prepare(`
      UPDATE tool_calls
      SET status = ?, result = ?, error = ?, end_time = ?, execution_time = ?
      WHERE id = ?
    `);
        await stmt.run(status, result, error, endTime, executionTime, toolCallId);
    }
    /**
     * Get tool call by ID
     */
    async getToolCall(toolCallId) {
        const stmt = await this.db.prepare('SELECT * FROM tool_calls WHERE id = ?');
        const row = await stmt.get(toolCallId);
        if (!row)
            return null;
        return this.mapRowToToolCall(row);
    }
    /**
     * Get tool calls for a tab
     */
    async getToolCalls(tabId, status) {
        let query = `
      SELECT * FROM tool_calls
      WHERE tab_id = ?
    `;
        const params = [tabId];
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY start_time DESC';
        const stmt = await this.db.prepare(query);
        const rows = await stmt.all(...params);
        return rows.map(row => this.mapRowToToolCall(row));
    }
    /**
     * Get recent tool calls for a tab
     */
    async getRecentToolCalls(tabId, count = 10) {
        const stmt = await this.db.prepare(`
      SELECT * FROM tool_calls
      WHERE tab_id = ?
      ORDER BY start_time DESC
      LIMIT ?
    `);
        const rows = await stmt.all(tabId, count);
        return rows.map(row => this.mapRowToToolCall(row));
    }
    /**
     * Clear tool calls for a tab
     */
    async clearToolCalls(tabId) {
        const stmt = await this.db.prepare('DELETE FROM tool_calls WHERE tab_id = ?');
        await stmt.run(tabId);
    }
    /**
     * Update AI context
     */
    async updateContext(tabId, context) {
        const existing = await this.findByTabId(tabId);
        if (!existing)
            return;
        const updatedContext = { ...existing.currentContext, ...context };
        await this.update(tabId, { currentContext: updatedContext });
    }
    /**
     * Update visibility state
     */
    async updateVisibility(tabId, isVisible) {
        const existing = await this.findByTabId(tabId);
        if (!existing)
            return;
        await this.update(tabId, { isVisible });
    }
    /**
     * Update scroll position
     */
    async updateScrollPosition(tabId, position) {
        const existing = await this.findByTabId(tabId);
        if (!existing)
            return;
        await this.update(tabId, { scrollPosition: position });
    }
    /**
     * Update input height
     */
    async updateInputHeight(tabId, height) {
        const existing = await this.findByTabId(tabId);
        if (!existing)
            return;
        await this.update(tabId, { inputHeight: height });
    }
    /**
     * Search messages by content
     */
    async searchMessages(tabId, query, limit = 50) {
        const stmt = await this.db.prepare(`
      SELECT * FROM ai_messages
      WHERE tab_id = ? AND content LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
        const rows = await stmt.all(tabId, `%${query}%`, limit);
        return rows.reverse().map(row => ({
            id: row.id,
            tabId: row.tab_id,
            role: row.role,
            content: row.content,
            timestamp: row.timestamp,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    /**
     * Get AI assistant statistics
     */
    async getStats(tabId) {
        let messageWhere = tabId ? 'WHERE tab_id = ?' : '';
        let toolWhere = tabId ? 'WHERE tab_id = ?' : '';
        const messageParams = tabId ? [tabId] : [];
        const toolParams = tabId ? [tabId] : [];
        const messageStmt = await this.db.prepare(`SELECT COUNT(*) as count FROM ai_messages ${messageWhere}`);
        const toolStmt = await this.db.prepare(`SELECT COUNT(*) as count FROM tool_calls ${toolWhere}`);
        const completedStmt = await this.db.prepare(`
      SELECT COUNT(*) as count FROM tool_calls
      ${toolWhere} AND status = 'completed'
    `);
        const avgTimeStmt = await this.db.prepare(`
      SELECT AVG(execution_time) as avg_time FROM tool_calls
      WHERE execution_time IS NOT NULL ${tabId ? 'AND tab_id = ?' : ''}
    `);
        const tokensStmt = await this.db.prepare(`
      SELECT SUM(CAST(
        CASE
          WHEN metadata IS NOT NULL
          AND JSON_EXTRACT(metadata, '$.tokens') IS NOT NULL
          THEN JSON_EXTRACT(metadata, '$.tokens')
          ELSE 0
        END AS INTEGER
      )) as total_tokens FROM ai_messages ${messageWhere}
    `);
        const messages = await messageStmt.get(...messageParams);
        const tools = await toolStmt.get(...toolParams);
        const completed = await completedStmt.get(...toolParams);
        const avgTime = await avgTimeStmt.get(...(tabId ? [tabId] : []));
        const tokens = await tokensStmt.get(...messageParams);
        return {
            totalMessages: messages.count,
            totalToolCalls: tools.count,
            completedToolCalls: completed.count,
            averageToolExecutionTime: avgTime.avg_time ?? 0,
            totalTokensUsed: tokens.total_tokens ?? 0
        };
    }
    /**
     * Cleanup old AI data
     */
    async cleanupOldData(olderThanDays = 30) {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        // Clean old messages
        const deleteMessagesStmt = await this.db.prepare(`
      DELETE FROM ai_messages WHERE timestamp < ?
    `);
        await deleteMessagesStmt.run(cutoffTime);
        // Clean old tool calls
        const deleteToolCallsStmt = await this.db.prepare(`
      DELETE FROM tool_calls WHERE start_time < ?
    `);
        await deleteToolCallsStmt.run(cutoffTime);
    }
    /**
     * Insert multiple messages
     */
    async insertMessages(messages) {
        if (messages.length === 0)
            return;
        const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO ai_messages (id, tab_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        // Manual transaction implementation
        await this.db.exec('BEGIN');
        try {
            for (const message of messages) {
                await stmt.run(message.id, message.tabId, message.role, message.content, message.timestamp, message.metadata ? JSON.stringify(message.metadata) : null);
            }
            await this.db.exec('COMMIT');
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Insert multiple tool calls
     */
    async insertToolCalls(toolCalls) {
        if (toolCalls.length === 0)
            return;
        const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO tool_calls (
        id, tab_id, command, status, result, error,
        start_time, end_time, execution_time, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        // Manual transaction implementation
        await this.db.exec('BEGIN');
        try {
            for (const toolCall of toolCalls) {
                await stmt.run(toolCall.id, toolCall.tabId, toolCall.command, toolCall.status, toolCall.result, toolCall.error, toolCall.startTime, toolCall.endTime, toolCall.executionTime, JSON.stringify(toolCall.context));
            }
            await this.db.exec('COMMIT');
        }
        catch (error) {
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Map database row to ToolCall object
     */
    mapRowToToolCall(row) {
        return {
            id: row.id,
            tabId: row.tab_id,
            command: row.command,
            status: row.status,
            result: row.result,
            error: row.error,
            startTime: row.start_time,
            endTime: row.end_time,
            executionTime: row.execution_time,
            context: row.context ? JSON.parse(row.context) : {
                workingDirectory: '/home',
                environment: {}
            }
        };
    }
}
exports.AIAssistantStateModel = AIAssistantStateModel;
// Singleton instance
let aiAssistantStateModel = null;
function getAIAssistantStateModel() {
    if (!aiAssistantStateModel) {
        aiAssistantStateModel = new AIAssistantStateModel();
    }
    return aiAssistantStateModel;
}
