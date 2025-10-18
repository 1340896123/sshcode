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
    upsert(tabId, data) {
        const existing = this.findByTabId(tabId);
        if (existing) {
            return this.update(tabId, data);
        }
        else {
            return this.create(tabId, data);
        }
    }
    /**
     * Create AI assistant state for a tab
     */
    create(tabId, data) {
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
            this.insertMessages(aiAssistantState.messages);
        }
        // Insert tool calls if provided
        if (aiAssistantState.toolCalls.length > 0) {
            this.insertToolCalls(aiAssistantState.toolCalls);
        }
        return aiAssistantState;
    }
    /**
     * Get AI assistant state by tab ID
     */
    findByTabId(tabId) {
        // Get messages for the tab
        const messageStmt = this.db.prepare(`
      SELECT * FROM ai_messages
      WHERE tab_id = ?
      ORDER BY timestamp ASC
    `);
        const messageRows = messageStmt.all(tabId);
        const messages = messageRows.map(row => ({
            id: row.id,
            tabId: row.tab_id,
            role: row.role,
            content: row.content,
            timestamp: row.timestamp,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
        // Get tool calls for the tab
        const toolCallStmt = this.db.prepare(`
      SELECT * FROM tool_calls
      WHERE tab_id = ?
      ORDER BY start_time ASC
    `);
        const toolCallRows = toolCallStmt.all(tabId);
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
    update(tabId, updates) {
        const existing = this.findByTabId(tabId);
        if (!existing)
            return null;
        const updated = {
            ...existing,
            ...updates
        };
        // Update messages if provided
        if (updates.messages) {
            // Delete existing messages
            const deleteStmt = this.db.prepare('DELETE FROM ai_messages WHERE tab_id = ?');
            deleteStmt.run(tabId);
            // Insert new messages
            this.insertMessages(updates.messages);
        }
        // Update tool calls if provided
        if (updates.toolCalls) {
            // Delete existing tool calls
            const deleteStmt = this.db.prepare('DELETE FROM tool_calls WHERE tab_id = ?');
            deleteStmt.run(tabId);
            // Insert new tool calls
            this.insertToolCalls(updates.toolCalls);
        }
        return updated;
    }
    /**
     * Add message to conversation
     */
    addMessage(tabId, role, content, metadata) {
        const message = {
            id: (0, uuid_1.v4)(),
            tabId,
            role,
            content,
            timestamp: Date.now(),
            metadata
        };
        const stmt = this.db.prepare(`
      INSERT INTO ai_messages (id, tab_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(message.id, message.tabId, message.role, message.content, message.timestamp, message.metadata ? JSON.stringify(message.metadata) : null);
        return message;
    }
    /**
     * Get messages for a tab
     */
    getMessages(tabId, limit) {
        let query = `
      SELECT * FROM ai_messages
      WHERE tab_id = ?
      ORDER BY timestamp ASC
    `;
        if (limit) {
            query += ` LIMIT ${limit}`;
        }
        const stmt = this.db.prepare(query);
        const rows = stmt.all(tabId);
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
    getRecentMessages(tabId, count = 20) {
        const stmt = this.db.prepare(`
      SELECT * FROM ai_messages
      WHERE tab_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
        const rows = stmt.all(tabId, count);
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
    clearMessages(tabId) {
        const stmt = this.db.prepare('DELETE FROM ai_messages WHERE tab_id = ?');
        stmt.run(tabId);
    }
    /**
     * Add tool call
     */
    addToolCall(tabId, command, context) {
        const toolCall = {
            id: (0, uuid_1.v4)(),
            tabId,
            command,
            status: 'executing',
            startTime: Date.now(),
            context
        };
        const stmt = this.db.prepare(`
      INSERT INTO tool_calls (id, tab_id, command, status, start_time, context)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(toolCall.id, toolCall.tabId, toolCall.command, toolCall.status, toolCall.startTime, JSON.stringify(toolCall.context));
        return toolCall;
    }
    /**
     * Update tool call with result
     */
    completeToolCall(toolCallId, status, result, error) {
        const endTime = Date.now();
        const executionTime = endTime - (this.getToolCall(toolCallId)?.startTime || endTime);
        const stmt = this.db.prepare(`
      UPDATE tool_calls
      SET status = ?, result = ?, error = ?, end_time = ?, execution_time = ?
      WHERE id = ?
    `);
        stmt.run(status, result, error, endTime, executionTime, toolCallId);
    }
    /**
     * Get tool call by ID
     */
    getToolCall(toolCallId) {
        const stmt = this.db.prepare('SELECT * FROM tool_calls WHERE id = ?');
        const row = stmt.get(toolCallId);
        if (!row)
            return null;
        return this.mapRowToToolCall(row);
    }
    /**
     * Get tool calls for a tab
     */
    getToolCalls(tabId, status) {
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
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        return rows.map(row => this.mapRowToToolCall(row));
    }
    /**
     * Get recent tool calls for a tab
     */
    getRecentToolCalls(tabId, count = 10) {
        const stmt = this.db.prepare(`
      SELECT * FROM tool_calls
      WHERE tab_id = ?
      ORDER BY start_time DESC
      LIMIT ?
    `);
        const rows = stmt.all(tabId, count);
        return rows.map(row => this.mapRowToToolCall(row));
    }
    /**
     * Clear tool calls for a tab
     */
    clearToolCalls(tabId) {
        const stmt = this.db.prepare('DELETE FROM tool_calls WHERE tab_id = ?');
        stmt.run(tabId);
    }
    /**
     * Update AI context
     */
    updateContext(tabId, context) {
        const existing = this.findByTabId(tabId);
        if (!existing)
            return;
        const updatedContext = { ...existing.currentContext, ...context };
        this.update(tabId, { currentContext: updatedContext });
    }
    /**
     * Update visibility state
     */
    updateVisibility(tabId, isVisible) {
        const existing = this.findByTabId(tabId);
        if (!existing)
            return;
        this.update(tabId, { isVisible });
    }
    /**
     * Update scroll position
     */
    updateScrollPosition(tabId, position) {
        const existing = this.findByTabId(tabId);
        if (!existing)
            return;
        this.update(tabId, { scrollPosition: position });
    }
    /**
     * Update input height
     */
    updateInputHeight(tabId, height) {
        const existing = this.findByTabId(tabId);
        if (!existing)
            return;
        this.update(tabId, { inputHeight: height });
    }
    /**
     * Search messages by content
     */
    searchMessages(tabId, query, limit = 50) {
        const stmt = this.db.prepare(`
      SELECT * FROM ai_messages
      WHERE tab_id = ? AND content LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
        const rows = stmt.all(tabId, `%${query}%`, limit);
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
    getStats(tabId) {
        let messageWhere = tabId ? 'WHERE tab_id = ?' : '';
        let toolWhere = tabId ? 'WHERE tab_id = ?' : '';
        const messageParams = tabId ? [tabId] : [];
        const toolParams = tabId ? [tabId] : [];
        const messageStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ai_messages ${messageWhere}`);
        const toolStmt = this.db.prepare(`SELECT COUNT(*) as count FROM tool_calls ${toolWhere}`);
        const completedStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM tool_calls
      ${toolWhere} AND status = 'completed'
    `);
        const avgTimeStmt = this.db.prepare(`
      SELECT AVG(execution_time) as avg_time FROM tool_calls
      WHERE execution_time IS NOT NULL ${tabId ? 'AND tab_id = ?' : ''}
    `);
        const tokensStmt = this.db.prepare(`
      SELECT SUM(CAST(
        CASE
          WHEN metadata IS NOT NULL
          AND JSON_EXTRACT(metadata, '$.tokens') IS NOT NULL
          THEN JSON_EXTRACT(metadata, '$.tokens')
          ELSE 0
        END AS INTEGER
      )) as total_tokens FROM ai_messages ${messageWhere}
    `);
        const messages = messageStmt.get(...messageParams);
        const tools = toolStmt.get(...toolParams);
        const completed = completedStmt.get(...toolParams);
        const avgTime = avgTimeStmt.get(...(tabId ? [tabId] : []));
        const tokens = tokensStmt.get(...messageParams);
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
    cleanupOldData(olderThanDays = 30) {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        // Clean old messages
        const deleteMessagesStmt = this.db.prepare(`
      DELETE FROM ai_messages WHERE timestamp < ?
    `);
        deleteMessagesStmt.run(cutoffTime);
        // Clean old tool calls
        const deleteToolCallsStmt = this.db.prepare(`
      DELETE FROM tool_calls WHERE start_time < ?
    `);
        deleteToolCallsStmt.run(cutoffTime);
    }
    /**
     * Insert multiple messages
     */
    insertMessages(messages) {
        if (messages.length === 0)
            return;
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ai_messages (id, tab_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const db = this.db;
        const transaction = db.transaction(() => {
            for (const message of messages) {
                stmt.run(message.id, message.tabId, message.role, message.content, message.timestamp, message.metadata ? JSON.stringify(message.metadata) : null);
            }
        });
        transaction();
    }
    /**
     * Insert multiple tool calls
     */
    insertToolCalls(toolCalls) {
        if (toolCalls.length === 0)
            return;
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tool_calls (
        id, tab_id, command, status, result, error,
        start_time, end_time, execution_time, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const db = this.db;
        const transaction = db.transaction(() => {
            for (const toolCall of toolCalls) {
                stmt.run(toolCall.id, toolCall.tabId, toolCall.command, toolCall.status, toolCall.result, toolCall.error, toolCall.startTime, toolCall.endTime, toolCall.executionTime, JSON.stringify(toolCall.context));
            }
        });
        transaction();
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
