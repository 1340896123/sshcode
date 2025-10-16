/**
 * Terminal related types
 */

export interface TerminalData {
  output: string;
  timestamp: number;
  type: 'input' | 'output' | 'error';
}

export interface TerminalSession {
  id: string;
  connectionId: string;
  terminal?: any;
  history: TerminalData[];
}