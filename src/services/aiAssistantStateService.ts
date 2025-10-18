import { getAIAssistantStateModel } from '../database/models/AIAssistantState';
import type {
  AIAssistantState,
  AIMessage,
  AIMessageRole,
  AIMessageMetadata,
  ToolCall,
  ToolCallStatus,
  ToolCallContext,
  AIContext
} from '../types/tab';

/**
 * AI Assistant State Service
 *
 * Handles automatic capture and persistence of AI assistant state changes
 */
export class AIAssistantStateService {
  private aiAssistantModel = getAIAssistantStateModel();
  private aiAssistantStates = new Map<string, AIAssistantState>();

  /**
   * Initialize AI assistant state tracking for a tab
   */
  initializeAIAssistantState(tabId: string): void {
    const existingState = this.aiAssistantModel.findByTabId(tabId);

    if (existingState) {
      this.aiAssistantStates.set(tabId, existingState);
    } else {
      // Create default state
      const defaultState: AIAssistantState = {
        tabId,
        messages: [],
        toolCalls: [],
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
      this.aiAssistantStates.set(tabId, defaultState);
      this.aiAssistantModel.create(tabId, defaultState);
    }
  }

  /**
   * Clean up AI assistant state tracking for a tab
   */
  cleanupAIAssistantState(tabId: string): void {
    this.aiAssistantStates.delete(tabId);
  }

  /**
   * Get current AI assistant state for a tab
   */
  getAIAssistantState(tabId: string): AIAssistantState | null {
    return this.aiAssistantStates.get(tabId) || null;
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(
    tabId: string,
    role: AIMessageRole,
    content: string,
    metadata?: AIMessageMetadata
  ): Promise<AIMessage | null> {
    try {
      const message = this.aiAssistantModel.addMessage(tabId, role, content, metadata);

      const state = this.aiAssistantStates.get(tabId);
      if (state) {
        state.messages.push(message);
        // Keep only the last 100 messages in memory
        if (state.messages.length > 100) {
          state.messages = state.messages.slice(-100);
        }
      }

      return message;
    } catch (error) {
      console.error(`Failed to add message for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Get messages for a tab
   */
  getMessages(tabId: string, limit?: number): AIMessage[] {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return [];

    const messages = state.messages;
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Get recent messages for a tab
   */
  getRecentMessages(tabId: string, count: number = 20): AIMessage[] {
    try {
      return this.aiAssistantModel.getRecentMessages(tabId, count);
    } catch (error) {
      console.error(`Failed to get recent messages for tab ${tabId}:`, error);
      return [];
    }
  }

  /**
   * Clear all messages for a tab
   */
  async clearMessages(tabId: string): Promise<void> {
    try {
      await this.aiAssistantModel.clearMessages(tabId);

      const state = this.aiAssistantStates.get(tabId);
      if (state) {
        state.messages = [];
      }
    } catch (error) {
      console.error(`Failed to clear messages for tab ${tabId}:`, error);
    }
  }

  /**
   * Execute a tool call
   */
  async executeToolCall(
    tabId: string,
    command: string,
    context: ToolCallContext
  ): Promise<ToolCall | null> {
    try {
      const toolCall = this.aiAssistantModel.addToolCall(tabId, command, context);

      const state = this.aiAssistantStates.get(tabId);
      if (state) {
        state.toolCalls.push(toolCall);
        // Keep only the last 50 tool calls in memory
        if (state.toolCalls.length > 50) {
          state.toolCalls = state.toolCalls.slice(-50);
        }
      }

      return toolCall;
    } catch (error) {
      console.error(`Failed to execute tool call for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Complete a tool call
   */
  async completeToolCall(
    toolCallId: string,
    status: ToolCallStatus,
    result?: string,
    error?: string
  ): Promise<void> {
    try {
      await this.aiAssistantModel.completeToolCall(toolCallId, status, result, error);

      // Update local state
      for (const state of this.aiAssistantStates.values()) {
        const toolCall = state.toolCalls.find(t => t.id === toolCallId);
        if (toolCall) {
          toolCall.status = status;
          toolCall.result = result;
          toolCall.error = error;
          if (status === 'completed' || status === 'error' || status === 'timeout') {
            toolCall.endTime = Date.now();
            toolCall.executionTime = toolCall.endTime - toolCall.startTime;
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to complete tool call ${toolCallId}:`, error);
    }
  }

  /**
   * Get tool calls for a tab
   */
  getToolCalls(tabId: string, status?: ToolCallStatus): ToolCall[] {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return [];

    return status
      ? state.toolCalls.filter(t => t.status === status)
      : state.toolCalls;
  }

  /**
   * Get recent tool calls for a tab
   */
  getRecentToolCalls(tabId: string, count: number = 10): ToolCall[] {
    try {
      return this.aiAssistantModel.getRecentToolCalls(tabId, count);
    } catch (error) {
      console.error(`Failed to get recent tool calls for tab ${tabId}:`, error);
      return [];
    }
  }

  /**
   * Clear tool calls for a tab
   */
  async clearToolCalls(tabId: string): Promise<void> {
    try {
      await this.aiAssistantModel.clearToolCalls(tabId);

      const state = this.aiAssistantStates.get(tabId);
      if (state) {
        state.toolCalls = [];
      }
    } catch (error) {
      console.error(`Failed to clear tool calls for tab ${tabId}:`, error);
    }
  }

  /**
   * Update AI context
   */
  async updateContext(tabId: string, context: Partial<AIContext>): Promise<void> {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return;

    // Update local state
    state.currentContext = { ...state.currentContext, ...context };

    // Save to database
    try {
      await this.aiAssistantModel.updateContext(tabId, context);
    } catch (error) {
      console.error(`Failed to update AI context for tab ${tabId}:`, error);
    }
  }

  /**
   * Get current AI context for a tab
   */
  getContext(tabId: string): AIContext | null {
    const state = this.aiAssistantStates.get(tabId);
    return state ? state.currentContext : null;
  }

  /**
   * Update working directory in context
   */
  async updateWorkingDirectory(tabId: string, directory: string): Promise<void> {
    await this.updateContext(tabId, { workingDirectory: directory });
  }

  /**
   * Add command to recent commands in context
   */
  async addRecentCommand(tabId: string, command: string): Promise<void> {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return;

    // Add to recent commands (keep last 20)
    const recentCommands = [command, ...state.currentContext.recentCommands.filter(c => c !== command)].slice(0, 20);

    await this.updateContext(tabId, { recentCommands });
  }

  /**
   * Update visibility state
   */
  async updateVisibility(tabId: string, isVisible: boolean): Promise<void> {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return;

    state.isVisible = isVisible;

    try {
      await this.aiAssistantModel.updateVisibility(tabId, isVisible);
    } catch (error) {
      console.error(`Failed to update visibility for tab ${tabId}:`, error);
    }
  }

  /**
   * Update scroll position
   */
  async updateScrollPosition(tabId: string, position: number): Promise<void> {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return;

    state.scrollPosition = position;

    try {
      await this.aiAssistantModel.updateScrollPosition(tabId, position);
    } catch (error) {
      console.error(`Failed to update scroll position for tab ${tabId}:`, error);
    }
  }

  /**
   * Update input height
   */
  async updateInputHeight(tabId: string, height: number): Promise<void> {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return;

    state.inputHeight = height;

    try {
      await this.aiAssistantModel.updateInputHeight(tabId, height);
    } catch (error) {
      console.error(`Failed to update input height for tab ${tabId}:`, error);
    }
  }

  /**
   * Search messages by content
   */
  searchMessages(tabId: string, query: string, limit: number = 50): AIMessage[] {
    try {
      return this.aiAssistantModel.searchMessages(tabId, query, limit);
    } catch (error) {
      console.error(`Failed to search messages for tab ${tabId}:`, error);
      return [];
    }
  }

  /**
   * Get AI assistant statistics for a tab
   */
  getAIAssistantStats(tabId: string): {
    totalMessages: number;
    totalToolCalls: number;
    completedToolCalls: number;
    averageToolExecutionTime: number;
    totalTokensUsed: number;
  } {
    try {
      const stats = this.aiAssistantModel.getStats(tabId);
      return {
        totalMessages: stats.totalMessages,
        totalToolCalls: stats.totalToolCalls,
        completedToolCalls: stats.completedToolCalls,
        averageToolExecutionTime: stats.averageToolExecutionTime,
        totalTokensUsed: stats.totalTokensUsed
      };
    } catch (error) {
      console.error(`Failed to get AI assistant stats for tab ${tabId}:`, error);
      return {
        totalMessages: 0,
        totalToolCalls: 0,
        completedToolCalls: 0,
        averageToolExecutionTime: 0,
        totalTokensUsed: 0
      };
    }
  }

  /**
   * Save current state to database
   */
  async saveState(tabId: string): Promise<void> {
    const state = this.aiAssistantStates.get(tabId);
    if (!state) return;

    try {
      await this.aiAssistantModel.upsert(tabId, state);
    } catch (error) {
      console.error(`Failed to save AI assistant state for tab ${tabId}:`, error);
    }
  }

  /**
   * Restore state from database
   */
  async restoreState(tabId: string): Promise<AIAssistantState | null> {
    try {
      const state = this.aiAssistantModel.findByTabId(tabId);
      if (state) {
        this.aiAssistantStates.set(tabId, state);
      }
      return state;
    } catch (error) {
      console.error(`Failed to restore AI assistant state for tab ${tabId}:`, error);
      return null;
    }
  }
}

// Singleton instance
let aiAssistantStateService: AIAssistantStateService | null = null;

export function getAIAssistantStateService(): AIAssistantStateService {
  if (!aiAssistantStateService) {
    aiAssistantStateService = new AIAssistantStateService();
  }
  return aiAssistantStateService;
}