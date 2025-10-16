/**
 * Event system related types
 */

export interface AppEvent {
  type: string;
  data?: any;
  timestamp: number;
}
