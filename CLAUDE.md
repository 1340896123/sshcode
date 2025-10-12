# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based SSH remote connection application that integrates file management, terminal operations, and AI assistant functionality. The application is built with Vue 3, Vite, and a comprehensive SCSS-based component library.

## Development Commands

### Core Development
- `npm run build` - Build the application for production
- `npm start` - Build and start the Electron app
- `npm run debug` - Start Electron with DevTools and remote debugging
- `npm run debug-main` - Start Electron in development mode
- `npm run build-electron` - Build and create distributable Electron app
- `npm run dist` - Build and package for distribution

### Testing
- Test configuration setup available via @playwright/test

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
- `src/hooks/` - Custom Vue 3 composition API hooks
- `src/styles/` - SCSS styling utilities and design tokens

**Component Organization:**
- `App.vue` - Root component with layout and global state
- `Header.vue` - Application header with navigation
- `TabManager.vue` - SSH session tab management
- `ConnectionModal.vue` - SSH connection creation and management
- `SettingsModal.vue` - Application settings interface
- `ToastContainer.vue` - Notification system

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
- **File Operations:** `getFileList`, `uploadFile`, `downloadFile`
- **Configuration:** `getConfig`, `saveConfig`
- **AI Integration:** `testAIConnection`

## Configuration Files

### Application Config (config/app.yml)
```yaml
ai:
  provider: custom
  baseUrl: https://open.bigmodel.cn/api/coding/paas/v4
  apiKey: ""
  model: glm-4.5
  maxTokens: 8000
  temperature: 0.7

general:
  language: zh-CN
  theme: dark
  autoSaveSessions: true

terminal:
  font: Consolas
  fontSize: 14
  bell: false
  cursorBlink: true

security:
  encryptPasswords: false
  sessionTimeout: 30
  confirmDangerousCommands: true
```

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