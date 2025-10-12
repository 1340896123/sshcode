# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based SSH remote connection application that integrates file management, terminal operations, and AI assistant functionality. The application is built with Vue 3, Vite, and a comprehensive SCSS-based component library.

## Development Commands

### Core Development
- `npm run build` - Build the application for production using Vite
- `npm start` - Build and start the Electron app (production mode)
- `npm run devUI` - Start Vite development server for UI components
- `npm run debug` - Start Electron with DevTools and remote debugging (port 9222)
- `npm run debug-renderer` - Start Vite dev server only
- `npm run debug-main` - Start Electron in development mode with debugging
- `npm run debug:inspect` - Start with Node.js inspector on port 9229
- `npm run debug:break` - Start with inspector breaking on first line
- `npm run build-electron` - Build and create distributable Electron app
- `npm run dist` - Build and package for distribution

### Testing
- Test configuration setup available via @playwright/test
- Development server for testing runs on port 3003

## Architecture Overview

### Main Process (main.js)
The Electron main process handles:
- Window management and lifecycle
- SSH connection management using ssh2 library
- SFTP file operations via ssh2-sftp-client
- IPC communication with renderer process
- Configuration management (YAML-based)
- File system operations and dialogs
- AI API integration testing

### Renderer Process Architecture
The Vue 3 frontend follows a modular component architecture:

**Key Directories:**
- `src/components/` - Vue components organized by functionality
- `src/components/ui/` - Reusable UI components (ToastContainer)
- `src/components/tabs/` - Tab-related components (TabBar, WelcomeScreen, ConnectionContent)
- `src/components/connection/` - Connection state components (StatusBar, ConnectingState, etc.)
- `src/components/layout/` - Layout components (ThreePanelLayout)
- `src/hooks/` - Custom Vue 3 composition API hooks
- `src/composables/` - Shared composables (useAIChat, useConnectionManager, etc.)
- `src/constants/` - Application constants (AI constants)
- `src/utils/` - Utility functions (aiService)
- `src/styles/` - SCSS styling utilities and design tokens
- `src/styles/components/` - Component-specific styles

**Component Organization:**
- `App.vue` - Root component with layout, global state, and Electron API setup
- `Header.vue` - Application header with navigation and settings access
- `TabManager.vue` - SSH session tab management and connection lifecycle
- `ConnectionModal.vue` - SSH connection creation and management
- `SettingsModal.vue` - Application settings interface with AI configuration
- `ToastContainer.vue` - Global notification system

**Additional Key Components:**
- `AIAssistant.vue` - AI chat interface and command execution
- `FileManager.vue` - SFTP file browser and operations
- `TerminalAutocomplete.vue` - Terminal command autocomplete functionality
- `ContextMenu.vue` - Right-click context menus
- `ThreePanelLayout.vue` - Main application layout with three panels
- `ConnectionStatusBar.vue` - SSH connection status indicator
- `WelcomeScreen.vue` - Initial screen for new users

### State Management
- Vue 3 Composition API with `reactive` and `ref`
- Custom hooks in `src/hooks/` for Electron API abstraction
- Component state managed through props and events
- Global toast notification system

### Data Storage
- SSH sessions: `data/sessions.json` (JSON format)
- Application config: `config/app.yml` (YAML format)
- Both files auto-created on first run

### Key Technologies
- **Electron 27** - Desktop app framework
- **Vue 3** - UI framework with Composition API
- **Vite 7** - Build tool and dev server
- **SSH2** - SSH client library
- **ssh2-sftp-client** - SFTP file operations
- **SCSS** - Styling with design tokens
- **js-yaml** - YAML configuration parsing
- **axios** - HTTP client for AI API calls

## Design System

### SCSS Architecture
The application uses a comprehensive design token system defined in `src/styles/variables.scss`:

**Color System:**
- Semantic color tokens (primary, secondary, success, warning, error)
- Neutral grayscale scale
- Theme-specific colors (bg-primary, text-primary, etc.)
- Helper function: `color($key)`

**Spacing & Typography:**
- Consistent spacing scale (xs, sm, md, lg, xl, xxl, xxxl)
- Typography scale with font families, sizes, weights, line heights
- Helper functions: `spacing($key)`, `font-size($key)`, etc.

**Component Patterns:**
- Mixins for common patterns (`@mixin flex-center`, `@mixin button-base`)
- Consistent border radius, shadows, and transitions
- Custom scrollbar styling

### Component Patterns
- Vue 3 Composition API with `<script setup>` syntax preferred
- Reactive state management with `reactive()` and `ref()`
- Event-driven communication between components
- Consistent prop interfaces and validation

## IPC Communication

The app uses a structured IPC pattern:
```javascript
// Renderer process (setup in App.vue)
window.electronAPI.methodName(params)

// Main process
ipcMain.handle('method-name', async (event, params) => {
  // implementation
})
```

### Available IPC Methods
- **Session Management:** `saveSession`, `getSessions`, `deleteSession`
- **SSH Operations:** `sshConnect`, `sshExecute`, `sshDisconnect`
- **File Operations:** `getFileList`, `uploadFile`, `downloadFile`, `downloadAndOpenFile`, `selectAndUploadFile`, `uploadDroppedFile`
- **SSH Key Management:** `readSSHKey`
- **File Watching:** `startFileWatcher`, `stopFileWatcher`
- **Configuration:** `getConfig`, `saveConfig`
- **AI Integration:** `testAIConnection`

## Configuration Files

### Application Config (config/app.yml)
The application uses a comprehensive YAML configuration with multiple sections:

```yaml
# General application settings
general:
  language: zh-CN
  theme: dark
  zoom: 1
  autoSaveSessions: true
  reconnectOnStart: false
  connectionTimeout: 30
  enableNotifications: true
  soundEnabled: true

# Terminal configuration
terminal:
  font: Consolas
  fontSize: 14
  lineHeight: 1.2
  bell: false
  cursorBlink: true
  cursorStyle: block
  scrollback: 1000
  copyShortcut: ctrl-c
  pasteShortcut: ctrl-v

# Security settings
security:
  encryptPasswords: false
  sessionTimeout: 30
  confirmDangerousCommands: true

# AI Chat configuration
aiChat:
  provider: custom
  apiKey: ""
  baseUrl: https://open.bigmodel.cn/api/coding/paas/v4
  model: ""
  customModel: glm-4.6
  maxTokens: 8000
  temperature: 0.7
  systemPromptEnabled: false
  systemPrompt: 你是一个专业的编程助手，请帮助用户解决编程问题。
  saveHistory: true
  historyRetentionDays: 30

# AI Completion configuration
aiCompletion:
  provider: custom
  apiKey: ""
  baseUrl: https://open.bigmodel.cn/api/coding/paas/v4
  model: ""
  customModel: glm-4.5
  autoTrigger: true
  triggerDelay: 500
  maxSuggestions: 5
  acceptOnTab: true
```

The config also supports a provider pool system for managing multiple AI providers and switching between them.

### SSH Sessions (data/sessions.json)
Stores SSH connection configurations with support for:
- Multiple authentication methods (password/key)
- Connection grouping
- Custom session names and descriptions

## Security Considerations

- SSH credentials stored in plaintext (noted for improvement)
- AI API keys handled through YAML configuration
- File operations sandboxed through Electron
- Configuration includes security settings like command confirmation

## Development Patterns

### Adding New Components
1. Create component in `src/components/` or appropriate subdirectory
2. Follow Vue 3 Composition API patterns
3. Use SCSS with design token system
4. Implement proper event emission and prop validation

### Adding New IPC Handlers
1. Add handler in `main.js` following existing patterns
2. Add corresponding method to `window.electronAPI` in `App.vue` (lines 132-151)
3. Create custom hook in `useElectronAPI.js` if needed

### Key Composables
- `useAIChat.js` - AI chat functionality and message handling
- `useConnectionManager.js` - SSH connection lifecycle management
- `useTerminalManager.js` - Terminal operations and command execution
- `usePanelManager.js` - UI panel state management
- `useContextMenu.js` - Context menu functionality
- `useMessageFormatter.js` - AI message formatting and display
- `useChatExport.js` - Chat history export functionality

### AI Integration Architecture
- AI service abstraction in `src/utils/aiService.js`
- Provider switching and configuration management
- Real-time chat interface with command execution
- Safety measures for dangerous command detection
- Support for multiple AI providers (OpenAI, Anthropic, custom APIs)

### Styling Guidelines
- Use design tokens from `variables.scss`
- Follow existing component patterns
- Implement responsive design principles
- Maintain dark/light theme support through CSS variables

## Testing

### Playwright Configuration
- Test framework: @playwright/test
- Configuration in `playwright.config.js`
- Test files in `tests/` directory with `*.spec.js` pattern
- Development server runs on port 3003 for testing
- Supports Chromium, Firefox, and WebKit browsers

## Common Development Tasks

### Modifying SSH Functionality
- Main process SSH logic in `main.js` (lines 121-211)
- Connection state managed through Vue components
- File operations handled through SFTP client

### AI Integration
- AI API testing handled in main process
- Configuration through settings modal
- Support for multiple AI providers through configurable endpoints

### Vite Configuration
- Vue plugin configuration with SCSS support
- Path aliases (`@/` maps to `src/`)
- Build optimization for Electron distribution
- Development server on port 3000

## File Organization Best Practices

- Keep components focused and single-purpose
- Use the established SCSS design system
- Follow Vue 3 Composition API patterns
- Maintain separation between UI and business logic
- Use provided Electron API abstractions

## Build and Distribution

The application supports:
- Development builds with hot reload via Vite
- Production builds via Vite
- Electron distribution packages (Windows NSIS, macOS DMG, Linux AppImage)
- Automated build configuration in electron-builder