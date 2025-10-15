# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based SSH remote connection application with Vue 3 frontend, providing file management, terminal access, and AI assistant capabilities. The application supports multiple SSH connections with tabbed interface, real-time system monitoring, and integrated AI chat functionality.

## Development Commands

```bash
# Development
npm run debug          # Start Vite dev server with Electron in debug mode
npm run start          # Build and start Electron (production mode)

# Building
npm run build          # Build frontend with Vite
npm run build-electron # Build and create Electron installer
npm run dist           # Same as build-electron

# Testing (if available)
# No specific test commands found in package.json
```

## Architecture Overview

### Main Process (main.js)
- **Entry point**: Electron main process handling SSH connections, file operations, and IPC communication
- **SSH Management**: Maintains connection pools (`sshConnections`, `sshShells`) and configuration storage
- **Key Features**:
  - SSH connection establishment with password/key authentication
  - SFTP file operations (upload, download, directory listing)
  - Shell session management with interactive terminal
  - Configuration management (YAML-based)
  - File watching and dialog handling

### Renderer Process (Vue 3)
- **Framework**: Vue 3 with Composition API
- **State Management**: Pinia stores for AI and terminal state
- **Styling**: SCSS with global variables
- **Build Tool**: Vite with custom configuration

### Key Architectural Components

#### Connection Management System
- **useConnectionManager.js**: Core composable managing SSH connection lifecycle
- **useSSHConnectionPool.js**: Persistent connection pooling with batch command execution
- **Connection States**: connecting, connected, failed, disconnected, cancelled
- **Monitoring**: Health checks and system resource monitoring

#### Terminal System
- **XTerminal.vue**: xterm.js-based terminal emulator
- **useTerminalManager.js**: Terminal session and I/O management
- **Features**: Interactive shell, command history, autocomplete support

#### AI Integration
- **AIAssistant.vue**: Main AI chat interface
- **useAIChat.js**: AI service integration with command execution
- **aiService.js**: OpenAI-compatible API client
- **aiCommandExecutor.js**: Command execution with AI assistance

#### File Management
- **FileManager.vue**: SFTP-based file browser
- **Features**: Upload/download via drag-drop, file watching, directory navigation

### Data Flow

1. **Connection Establishment**: Vue frontend → IPC → main.js → SSH2 library
2. **Terminal I/O**: xterm.js → IPC → SSH shell stream → main.js → frontend
3. **File Operations**: FileManager → IPC → SFTP client → main.js → frontend
4. **AI Commands**: Chat interface → aiService → command execution → result display

### Configuration System
- **Location**: `config/app.yml` (YAML format)
- **Categories**: AI provider settings, general preferences, terminal configuration, security options
- **Runtime**: Loaded into memory, updates persisted immediately

### Key Technical Details

#### SSH Connection Architecture
- Uses `ssh2` library for connections and shell sessions
- `ssh2-sftp-client` for file operations
- Connection pooling for efficient resource usage
- Separate shell streams per connection for interactive terminals

#### Vue Component Structure
- Tab-based interface with ThreePanelLayout
- Reactive connection state management
- Event system for cross-component communication
- Composables for reusable logic (connections, AI, terminals)

#### Security Considerations
- Password encryption optional (configurable)
- Session timeout management
- Dangerous command confirmation
- No credential storage in plaintext by default

## Important Implementation Notes

- **Environment**: Must run in Electron context for `window.electronAPI` access
- **Connection Lifecycle**: Connections persist in main process pools during app lifetime
- **Terminal Emulation**: Full xterm-256color support with proper PTY allocation
- **File Watching**: Local file change monitoring for sync operations
- **Error Handling**: Comprehensive error mapping with user-friendly messages
- **Resource Management**: Automatic cleanup of timers, connections, and file watchers

## Development Tips

- Use `npm run debug` for development with hot reload
- SSH connections require valid credentials - test environments should have accessible SSH servers
- AI functionality requires API key configuration in settings
- File operations depend on proper SFTP permissions on target servers
- Terminal output history is limited to 1000 lines (500 after truncation)