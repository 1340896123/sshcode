/**
 * Configuration related types
 */

import type { AIConfig } from './ai.js';

export interface AppConfig {
  ai: AIConfig;
  aiChat: {
    enabled: boolean;
    maxTokens: number;
    temperature: number;
    model: string;
  };
  general: {
    theme: 'light' | 'dark';
    language: string;
    autoSave: boolean;
  };
  terminal: {
    fontSize: number;
    fontFamily: string;
    copyOnSelect: boolean;
  };
  security: {
    passwordEncryption: boolean;
    sessionTimeout: number;
    confirmDangerousCommands: boolean;
  };
}

// Extended AppConfig for main process
export interface MainAppConfig {
  ai: AIConfig & {
    provider: string;
  };
  general: {
    theme: 'light' | 'dark';
    language: string;
    autoSave: boolean;
    autoSaveSessions: boolean;
    checkUpdates: boolean;
  };
  terminal: {
    font: string;
    fontSize: number;
    fontFamily: string;
    copyOnSelect: boolean;
    bell: boolean;
    cursorBlink: boolean;
  };
  security: {
    passwordEncryption: boolean;
    encryptPasswords: boolean;
    sessionTimeout: number;
    confirmDangerousCommands: boolean;
  };
}
