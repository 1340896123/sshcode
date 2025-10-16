/**
 * API response and networking related types
 */

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  output?: T;  // Add output property for compatibility
  error?: string;
  message?: string;
}
