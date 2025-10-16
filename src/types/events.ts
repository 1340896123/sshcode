/**
 * Event system related types
 */

export interface AppEvent {
  type: string;
  data?: unknown;
  timestamp: number;
}

// AI Response event data
export interface AIResponseEventData {
  content?: string;
  actions?: Array<{
    id: string;
    type: string;
    label: string;
    command: string;
  }>;
}

// Command execution event data
export interface CommandStartEventData {
  commandId: string;
  command: string;
  connectionId: string;
}

export interface CommandCompleteEventData {
  commandId: string;
  command: string;
  result: string;
  executionTime?: number;
}

export interface CommandErrorEventData {
  commandId: string;
  command: string;
  error: string;
}

// Config required event data
export interface ConfigRequiredEventData {
  message?: string;
}

// Terminal output event data
export interface TerminalOutputEventData {
  commandId: string;
  output: string;
}
