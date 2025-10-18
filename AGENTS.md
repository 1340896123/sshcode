# Agent Guidelines for SSH Remote App

## Build/Test Commands

- **Development**: `npm run debug` (starts Vite dev server with Electron in debug mode)
- **Build**: `npm run build` (builds frontend with Vite)
- **Main Process Build**: `npm run build-main` (compiles TypeScript to JavaScript for main process)
- **Full Build**: `npm run build-electron` or `npm run dist` (builds main process + frontend and creates Electron installer)
- **Production Start**: `npm run start` (builds and starts Electron in production mode)
- **Type Checking**: `npm run type-check` (TypeScript type checking without emitting files)
- **Linting**: `npm run lint` (ESLint with auto-fix), `npm run lint:check` (ESLint without auto-fix)
- **Formatting**: `npm run format` (Prettier formatting), `npm run format:check` (check formatting)
- **Validation**: Use `npm run type-check` for type validation - do not run automated tests

## Code Style

- **Framework**: Vue 3 with Composition API and TypeScript
- **Architecture**: Electron application with separate main process (Node.js) and renderer process (Vue)
- **Imports**: Use `@/` alias for src/ directory (e.g., `import Component from "@/components/Component"`)
- **Formatting**: Prettier with ESLint integration
- **Components**: Use `<script setup>` syntax with Composition API, define props with TypeScript interfaces
- **Types**: Full TypeScript support, avoid `any` type, define interfaces for all data structures
- **CSS**: SCSS with global variables and path aliases, CSS variable-driven theming
- **Naming**: PascalCase for components, camelCase for variables/functions, kebab-case for file names
- **File Structure**:
  - `/components/`: Vue components organized by feature
  - `/composables/`: Reusable Vue composables
  - `/modules/`: Feature-based modules (ai-assistant, terminal, file-manager)
  - `/stores/`: Pinia stores for state management
  - `/utils/`: Utility functions and services
  - `/types/`: TypeScript type definitions
  - `/hooks/`: Custom Vue hooks
  - `/database/`: SQLite database models and initialization

## Key Dependencies

- **Electron**: Desktop application framework
- **Vue 3**: Frontend framework with Composition API
- **Pinia**: State management
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **SSH2**: SSH connection library
- **ssh2-sftp-client**: SFTP file operations
- **xterm.js**: Terminal emulation
- **SCSS**: CSS preprocessor
- **SQLite**: Local database storage
- **js-yaml**: Configuration file parsing

## Development Guidelines

### Environment Requirements
- Must run in Electron context for `window.electronAPI` access
- Development server runs on port 3000
- Hot reload available in debug mode

### Code Organization
- **Feature-based modules**: Each major feature (ai-assistant, terminal, file-manager) has its own module with components, composables, stores, and utils
- **Composables Pattern**: Use composition API for reusable logic (useConnectionManager, useAIChat, useComponentStyles, etc.)
- **Type Safety**: All IPC communications are fully typed across main/renderer boundary
- **Event System**: Use mitt-based lightweight event system for cross-component communication

### SSH Connection Architecture
- **Connection Pooling**: Persistent connections maintained in main process
- **Authentication**: Support for password and private key authentication
- **Shell Integration**: Full terminal emulation with PTY allocation
- **File Operations**: SFTP-based file management with drag-drop support

### Configuration System
- **Location**: `config/app.yml` (YAML format)
- **Runtime**: Loaded into memory on startup, updates persisted immediately
- **Type Safety**: Full TypeScript interfaces for all configuration sections

### Important Notes
- Terminal output limited to 1000 lines for performance
- Automatic cleanup of connections, timers, and file watchers
- Session persistence and restoration across application restarts
- Memory management with configurable thresholds
- Accessibility support with ARIA attributes and keyboard navigation

No special rules files found.
