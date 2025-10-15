<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0 (initial constitution creation)
- Modified principles: None (initial constitution)
- Added sections: Core Principles, Security Requirements, Development Workflow, Governance
- Removed sections: None (initial constitution)
- Templates requiring updates:
  ✅ plan-template.md (already references constitution checks)
  ✅ spec-template.md (already includes requirements validation)
  ✅ tasks-template.md (already includes principle-driven task categorization)
- Follow-up TODOs: None (all placeholders filled)
-->

# SSH Remote App Constitution

## Core Principles

### I. Security-First Architecture
SSH credentials and API keys MUST be handled securely; All remote operations MUST be sandboxed through Electron's security model; AI functionality MUST implement dangerous command detection and user confirmation; File operations MUST validate paths and permissions before execution.

### II. Cross-Platform Desktop Application
Application MUST be built with Electron for Windows, macOS, and Linux compatibility; User interface MUST be responsive across different screen sizes and DPI settings; Native desktop features (file dialogs, system notifications) MUST be utilized appropriately.

### III. Modular Component Architecture
Frontend MUST use Vue 3 Composition API with clear separation of concerns; Components MUST be single-purpose and independently testable; State management MUST use Vue 3 reactive patterns; SCSS design token system MUST be consistently applied across all components.

### IV. Test-Driven Development
End-to-end tests MUST be written using Playwright framework; Critical user journeys (SSH connection, file operations, AI integration) MUST have automated test coverage; Tests MUST be executable in development and CI environments.

### V. Integrated AI Assistant
AI functionality MUST integrate multiple providers (OpenAI, Anthropic, custom APIs); Natural language commands MUST be translated to safe shell operations; AI responses MUST include command execution results and contextual explanations; Provider switching and configuration management MUST be seamless.

## Security Requirements

### Credential Management
SSH sessions stored in JSON format MUST include encryption options; AI API keys MUST be configurable through YAML settings; Session timeout and connection security MUST be enforced; Dangerous command detection MUST require user confirmation before execution.

### File System Security
All file operations MUST be scoped to authorized SSH connections; File uploads/downloads MUST validate file types and sizes; File system access MUST be restricted through SFTP protocol; Local file operations MUST be sandboxed within Electron security context.

### Network Security
SSH connections MUST use secure authentication methods; AI API communications MUST use HTTPS endpoints; Connection timeouts and retry limits MUST be configurable; Network error handling MUST not expose sensitive information.

## Development Workflow

### Code Organization
Main process MUST handle Electron lifecycle, SSH connections, and IPC communication; Renderer process MUST organize components by functionality in dedicated directories; Composables MUST manage shared state and business logic; SCSS variables MUST define design tokens and maintain consistency.

### Build Process
Development MUST use Vite dev server with hot reload; Production builds MUST optimize for Electron distribution; Cross-platform packaging MUST generate installers for Windows (NSIS), macOS (DMG), and Linux (AppImage); Source code MUST follow Vue 3 and SCSS best practices.

### Quality Assurance
Code changes MUST maintain existing functionality; New features MUST include Playwright test coverage; AI integration MUST handle API failures gracefully; Component props MUST include proper validation and documentation.

## Governance

This constitution supersedes all other development practices and documentation; Amendments MUST follow semantic versioning principles (MAJOR for governance changes, MINOR for principle additions, PATCH for clarifications); All feature development MUST verify compliance with core principles; Changes to security requirements MUST undergo review; Implementation guidance MUST reference this constitution for authority; Template updates MUST maintain consistency with constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-01-14 | **Last Amended**: 2025-01-14