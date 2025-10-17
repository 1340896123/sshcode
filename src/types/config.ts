/**
 * Configuration related types
 */

import type { AIConfig } from './ai.js';

// 统一的配置接口，适用于主进程和渲染进程
export interface AppConfig {
  ai: AIConfig & {
    provider: string;
  };
  general: {
    theme: 'light' | 'dark';
    language: string;
    autoSave: boolean;
    autoSaveSessions?: boolean;
    checkUpdates?: boolean;
  };
  terminal: {
    font: string;
    fontSize: number;
    fontFamily: string;
    copyOnSelect: boolean;
    bell?: boolean;
    cursorBlink?: boolean;
  };
  security: {
    passwordEncryption: boolean;
    encryptPasswords?: boolean;
    sessionTimeout: number;
    confirmDangerousCommands: boolean;
  };
}

// 向后兼容的别名
export type MainAppConfig = AppConfig;
