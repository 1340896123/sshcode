# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based SSH remote connection application that integrates file management, terminal operations, and AI assistant functionality. The application is built with React, Vite, and a comprehensive component library.

## Development Commands

### Core Development
- `npm run dev` - Start development server with hot reload
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
The React frontend follows a modular component architecture:

**Key Directories:**
- `src/components/` - React components organized by functionality
- `src/components/ui/` - Comprehensive UI component library with 300+ components
- `src/hooks/` - Custom React hooks including Electron API abstractions
- `src/styles/` - CSS and styling utilities

**Component Organization:**
- `primitives/` - Basic UI elements (Button, Input, etc.)
- `layout/` - Layout and navigation components
- `connection/` - SSH connection management components
- `session/` - Session handling and tab management
- `file/` - File browser and management components
- `terminal/` - Terminal interface components
- `ai/` - AI assistant interface components
- `settings/` - Application settings and configuration
- `feedback/` - Notifications, modals, and user feedback

### State Management
- React hooks for local state
- Custom hooks in `src/hooks/useElectronAPI.js` for Electron IPC communication
- Session and connection state managed through dedicated hooks

### Data Storage
- SSH sessions: `data/sessions.json` (JSON format)
- Application config: `config/app.yml` (YAML format)
- Both files auto-created on first run

### Key Technologies
- **Electron 27** - Desktop app framework
- **React 19** - UI framework
- **Vite 7** - Build tool and dev server
- **SSH2** - SSH client library
- **ssh2-sftp-client** - SFTP file operations
- **xterm** - Terminal emulation
- **js-yaml** - YAML configuration parsing
- **axios** - HTTP client for AI API calls

## Component Library Structure

The UI component library is extensively organized with:

### Component Categories
1. **Primitives** - Basic interactive elements
2. **Layout** - Structural and navigation components
3. **Connection Management** - SSH session components
4. **Session Management** - Tab and session handling
5. **File Management** - File browser components
6. **Terminal Management** - Terminal interface components
7. **AI Assistant** - Chat and AI interaction components
8. **Settings** - Configuration and preference components
9. **Feedback** - Notifications and modals
10. **Composite** - Multi-purpose components
11. **Accessibility** - A11y and i18n components

### Key Components to Understand
- `TabManager` - Manages multiple SSH sessions in tabs
- `SessionModal` - SSH connection creation and management
- `SettingsModal` - Application configuration interface
- `Terminal` - SSH terminal with xterm integration
- `FileExplorer` - Remote file system browser
- `AIChat` - AI assistant interface

## Development Patterns

### IPC Communication
The app uses a structured IPC pattern:
```javascript
// Renderer process
window.electronAPI.methodName(params)

// Main process
ipcMain.handle('method-name', async (event, params) => {
  // implementation
})
```

### Component Structure
Components follow these patterns:
- Functional components with hooks
- Comprehensive prop interfaces
- Consistent styling with CSS classes
- Error boundaries and loading states

### Styling Approach
- CSS files in `src/styles/`
- Component-specific styling
- Responsive design principles
- Dark/light theme support

## Configuration Files

### Application Config (config/app.yml)
```yaml
ai:
  provider: openai
  baseUrl: https://api.openai.com/v1
  apiKey: ""
  model: gpt-3.5-turbo
  maxTokens: 2000
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
- AI API keys handled securely through config
- File operations sandboxed through Electron
- Dangerous command confirmation system

## Common Development Tasks

### Adding New UI Components
1. Create component in appropriate `src/components/ui/` subdirectory
2. Export from `src/components/ui/index.js`
3. Follow existing component patterns and styling

### Adding New IPC Handlers
1. Add handler in `main.js` following existing patterns
2. Add corresponding method to `window.electronAPI` in `App.jsx`
3. Create custom hook in `useElectronAPI.js` if needed

### Modifying SSH Functionality
- Main process SSH logic in `main.js` (lines 121-211)
- Connection state managed through custom hooks
- Terminal component uses xterm library

### AI Integration
- AI API testing handled in main process
- Chat interface components in `src/components/ui/ai/`
- Configuration through settings modal

## File Organization Best Practices

- Keep components focused and single-purpose
- Use the established component library structure
- Follow the existing naming conventions
- Maintain the separation between UI and business logic
- Use the provided hooks for Electron API interactions

## Build and Distribution

The application supports:
- Development builds with hot reload
- Production builds via Vite
- Electron distribution packages (Windows NSIS, macOS DMG, Linux AppImage)
- Automated build configuration in electron-builder