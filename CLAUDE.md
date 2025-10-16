# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based SSH remote connection application with Vue 3 frontend, providing file management, terminal access, and AI assistant capabilities. The application supports multiple SSH connections with tabbed interface, real-time system monitoring, and integrated AI chat functionality.

## Development Commands

```bash
# Development
npm run debug          # Start Vite dev server with Electron in debug mode (recommended for development)
npm run start          # Build and start Electron (production mode)

# Building
npm run build          # Build frontend with Vite
npm run build-main     # Compile TypeScript to JavaScript for main process
npm run build-electron # Build main process + frontend and create Electron installer
npm run dist           # Same as build-electron

# Code Quality
npm run type-check     # TypeScript type checking without emitting files
npm run lint           # Run ESLint with auto-fix
npm run lint:check     # Run ESLint without auto-fix
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting with Prettier
```

## Architecture Overview

### Main Process (main.ts → main.js)
- **Entry point**: Electron main process handling SSH connections, file operations, and IPC communication
- **SSH Management**: Maintains connection pools (`sshConnections`, `sshShells`) and configuration storage
- **Key Features**:
  - SSH connection establishment with password/key authentication using ssh2 library
  - SFTP file operations (upload, download, directory listing) via ssh2-sftp-client
  - Shell session management with interactive terminal and PTY allocation
  - Configuration management (YAML-based) with js-yaml
  - File watching and dialog handling
- **Module System**: TypeScript compiled to CommonJS (tsconfig.main.json)

### Renderer Process (Vue 3 + TypeScript)
- **Framework**: Vue 3 with Composition API and TypeScript
- **State Management**: Pinia stores for AI and terminal state
- **Styling**: SCSS with global variables and path aliases
- **Build Tool**: Vite 7.x with custom configuration
- **Module System**: ES modules with bundler resolution

### Key Architectural Components

#### Connection Management System
- **useConnectionManager.ts**: Core composable managing SSH connection lifecycle with reactive state
- **useSSHConnectionPool.ts**: Persistent connection pooling with batch command execution for system monitoring
- **Connection States**: connecting, connected, failed, disconnected, cancelled
- **Monitoring**: Health checks every 30 seconds and real-time system resource monitoring

#### Terminal System
- **XTerminal.vue**: xterm.js-based terminal emulator with full xterm-256color support
- **TerminalInput.vue**: Command input with autocomplete and history
- **Shell Integration**: Separate shell streams per connection via IPC with proper PTY allocation
- **Features**: Interactive shell, command history, autocomplete support

#### AI Integration
- **AIAssistant.vue**: Main AI chat interface with OpenAI-compatible API integration
- **useAIChat.ts**: AI service composable with command execution capabilities
- **aiCommandExecutor.ts**: Command execution with AI assistance and context management
- **aiCompletionService.ts**: AI-powered command completion and suggestions
- **constants/index.ts**: AI module constants and configuration exports
- **styles/index.ts**: AI module SCSS imports and style management
- **utils/index.ts**: AI module utility functions and service exports

#### File Management
- **FileManager.vue**: SFTP-based file browser with drag-drop support
- **Features**: Upload/download via drag-drop, file watching, directory navigation
- **File Operations**: Full CRUD operations with progress tracking and error handling

### Data Flow Architecture

1. **Connection Establishment**: Vue frontend → IPC → main.ts → SSH2 library → connection pool
2. **Terminal I/O**: xterm.js → IPC → SSH shell stream → main.ts → frontend (real-time)
3. **File Operations**: FileManager → IPC → SFTP client → main.ts → frontend
4. **AI Commands**: Chat interface → aiService → command execution → result display
5. **System Monitoring**: Connection pool → batch commands → processed metrics → UI updates

### Configuration System
- **Location**: `config/app.yml` (YAML format) created automatically on first run
- **Categories**: AI provider settings, general preferences, terminal configuration, security options
- **Runtime**: Loaded into memory on startup, updates persisted immediately
- **Type Safety**: Full TypeScript interface definitions in src/types/ including `AppConfig` for renderer and `MainAppConfig` for main process
- **Extended Config**: Main process supports additional settings like `autoSaveSessions`, `checkUpdates`, and `encryptPasswords`

### Key Technical Details

#### SSH Connection Architecture
- **Primary Libraries**: `ssh2` for connections/shell sessions, `ssh2-sftp-client` for file operations
- **Connection Pooling**: Persistent connections with automatic cleanup and health monitoring
- **Authentication**: Support for password and private key authentication with proper error handling
- **PTY Allocation**: Full terminal emulation with proper environment variable setup

#### TypeScript Configuration
- **Dual Setup**: Separate configs for main process (CommonJS) and renderer (ES modules)
- **Path Aliases**: `@/` mapped to `src/` for clean imports
- **Type Safety**: Comprehensive type definitions for all IPC communications and SSH operations
- **Build Process**: main.ts compiled to main.js, renderer processed by Vite

#### Vue Component Architecture
- **Modular Structure**: Organized by feature (terminal, ai-assistant, file-manager) with index.ts barrel exports
- **Composables Pattern**: Reusable logic with useConnectionManager, useAIChat, useComponentStyles, etc.
- **Reactive State**: Connection state management with real-time updates
- **Event System**: Cross-component communication via lightweight event system (src/utils/eventSystem.ts)
- **Styling System**: Dynamic component styling with useComponentStyles hook supporting theme-aware CSS variables
- **Type Safety**: Comprehensive TypeScript interfaces for all components, props, and events

#### Development Tooling
- **ESLint**: Flat config with TypeScript, Vue, and Prettier integration
- **Type Checking**: Project-wide type checking with vue-tsc
- **Build System**: Vite for frontend, TypeScript compiler for main process
- **Hot Reload**: Full development server with Electron integration

#### Security Considerations
- **Context Isolation**: Secure IPC communication via preload script
- **Credential Handling**: Optional password encryption, no plaintext storage by default
- **Session Management**: Configurable timeouts and dangerous command confirmation
- **File Access**: Sandboxed file operations through SFTP protocol

## Important Implementation Notes

- **Environment**: Must run in Electron context for `window.electronAPI` access
- **Connection Lifecycle**: Connections persist in main process pools during app lifetime with automatic cleanup
- **Terminal Output**: Limited to 1000 lines history (500 after truncation) for performance
- **Error Handling**: Comprehensive error mapping with user-friendly messages and logging
- **Resource Management**: Automatic cleanup of timers, connections, and file watchers on component unmount
- **Type System**: All IPC communications are fully typed for type safety across main/renderer boundary
- **Event System**: Uses mitt-based lightweight event system with priority handling, history tracking, and component lifecycle management
- **Styling Architecture**: CSS variable-driven theming with useComponentStyles hook for consistent, theme-aware component styling
- **Module Organization**: Feature-based modules with barrel exports (index.ts) for clean import paths and better code organization

## Development Workflow

1. **Development**: Use `npm run debug` for hot reload and development tools
2. **Type Safety**: Run `npm run type-check` to verify TypeScript types before commits
3. **Code Quality**: Use `npm run lint` and `npm run format` to maintain code standards
4. **Building**: Use `npm run build-electron` to create distributable packages
5. **SSH Testing**: Ensure test environments have accessible SSH servers for connection testing
6. **AI Features**: Configure API keys in application settings for AI functionality

## Module Structure

### Feature-Based Modules
The codebase is organized into feature-based modules under `src/modules/`:

- **ai-assistant/**: Complete AI integration module with chat interface, command execution, and completion services
  - `components/`: Vue components for AI chat and tool execution
  - `composables/`: Reactive AI chat management
  - `stores/`: Pinia store for AI state
  - `utils/`: AI services, command execution, and completion
  - `constants/`: AI module configuration and constants
  - `styles/`: SCSS imports for AI components

- **terminal/**: Terminal emulation and SSH shell management
  - `components/`: XTerm-based terminal emulator and input components
  - `composables/`: Terminal session and connection management
  - `utils/`: Command execution utilities and timeout management

- **file-manager/**: SFTP-based file operations and browser
  - `components/`: File browser with drag-drop support and icon components

Each module exports its functionality through an `index.ts` barrel export for clean import paths.

### Component Architecture
- **Modular Components**: Feature-organized with clear separation of concerns
- **Composables Pattern**: Reusable reactive logic (useConnectionManager, useAIChat, useComponentStyles, etc.)
- **Event System**: Cross-component communication via `src/utils/eventSystem.ts` using mitt event emitter
- **Styling System**: Dynamic component styling with `useComponentStyles` hook supporting CSS variables