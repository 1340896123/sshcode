/**
 * Configuration related types
 */

import type { AIConfig } from './ai.js';

export interface AppConfig {
  ai: AIConfig;
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
    language: string;
    theme: string;
    autoSaveSessions: boolean;
    checkUpdates: boolean;
  };
  terminal: {
    font: string;
    fontSize: number;
    bell: boolean;
    cursorBlink: boolean;
  };
  security: {
    encryptPasswords: boolean;
    sessionTimeout: number;
    confirmDangerousCommands: boolean;
  };
}