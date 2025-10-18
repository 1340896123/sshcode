---
description: "Task list for Tabbed Connection Management feature implementation"
---

# Tasks: Tabbed Connection Management

**Input**: Design documents from `/specs/001-tabbed-connections/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Electron + Vue project**: `src/`, `tests/` at repository root
- Paths shown below follow the plan.md structure for this codebase

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install required dependencies (better-sqlite3, electron-store, @vueuse/core, lodash) per research decisions
- [x] T002 [P] Create new directory structure per plan.md (src/database/, src/stores/tabStore.ts, src/composables/useTabManager.ts, etc.)
- [x] T003 [P] Update TypeScript configuration for new modules and database types
- [x] T004 [P] Configure Vite build for better-sqlite3 external dependency

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create SQLite database schema and migrations in src/database/init.ts
- [x] T006 [P] Create database models (Tab, Connection, TerminalState, etc.) in src/database/models/
- [x] T007 [P] Implement Tab Store (Pinia) in src/stores/tabStore.ts
- [x] T008 [P] Implement enhanced Connection Store in src/stores/connectionStore.ts
- [x] T009 [P] Create basic IPC handlers for tab operations in main process
- [x] T010 Configure Electron Store for configuration persistence
- [x] T011 Setup database connection pooling and error handling

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Multiple Independent Connections (Priority: P1) 🎯 MVP

**Goal**: Users can open multiple SSH connections simultaneously, each in its own tab, with independent connection states and contexts.

**Independent Test**: Can be fully tested by opening multiple tabs, establishing connections to different servers, and verifying each tab maintains its own connection state independently.

### Implementation for User Story 1

- [x] T012 [P] [US1] Create Tab entity model in src/database/models/Tab.ts
- [x] T013 [P] [US1] Create Connection entity model in src/database/models/Connection.ts
- [x] T014 [P] [US1] Implement enhanced connection pool with lazy initialization in src/composables/useConnectionManager.ts
- [x] T015 [US1] Implement useTabManager composable in src/composables/useTabManager.ts (depends on T012, T013, T014)
- [x] T016 [US1] Create TabManager.vue component in src/components/TabManager.vue
- [x] T017 [US1] Implement IPC handlers for tab creation and connection management in main.ts
- [x] T018 [US1] Add connection status indicators and validation
- [x] T019 [US1] Add error handling for connection failures in isolation

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Seamless Tab Switching with Connection Context (Priority: P1)

**Goal**: Users can switch between tabs and immediately continue working with the appropriate connection context, including terminal sessions, file operations, and AI assistance.

**Independent Test**: Can be fully tested by establishing connections in multiple tabs, performing operations in each, then switching between tabs to verify context preservation.

### Implementation for User Story 2

- [x] T020 [P] [US2] Create TerminalState entity model in src/database/models/TerminalState.ts
- [x] T021 [P] [US2] Create FileManagerState entity model in src/database/models/FileManagerState.ts
- [x] T022 [P] [US2] Create AIAssistantState entity model in src/database/models/AIAssistantState.ts
- [x] T023 [US2] Implement terminal instance pooling in src/composables/useTerminalPool.ts
- [x] T024 [US2] Implement automatic reconnection logic in useConnectionManager.ts
- [x] T025 [US2] Create TabContent.vue component in src/components/TabContent.vue
- [x] T026 [US2] Implement state persistence and restoration for all three components
- [x] T027 [US2] Add tab switching performance optimization with shallow reactivity

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Tab Management and Organization (Priority: P2)

**Goal**: Users can organize and manage their connection tabs through intuitive controls including renaming, closing, and reordering tabs.

**Independent Test**: Can be fully tested by creating multiple tabs, renaming them with server names, reordering, and closing tabs while verifying other connections remain stable.

### Implementation for User Story 3

- [x] T028 [P] [US3] Implement tab renaming functionality in TabManager.vue
- [x] T029 [P] [US3] Add tab context menu with management options in src/components/TabContextMenu.vue
- [x] T030 [US3] Implement drag-and-drop tab reordering in TabManager.vue
- [x] T031 [US3] Add confirmation dialogs for tab closing with active operations
- [x] T032 [US3] Update tab store to handle position changes and validation
- [x] T033 [US3] Add keyboard shortcuts for tab navigation (Ctrl+Tab, Ctrl+1, etc.)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Connection State Persistence Across Sessions (Priority: P3)

**Goal**: Users can have their tab configuration and connection details restored when reopening the application, maintaining their workflow continuity.

**Independent Test**: Can be fully tested by establishing multiple connections, closing the application, reopening it, and verifying tabs and connection states are restored.

### Implementation for User Story 4

- [x] T034 [P] [US4] Create session restore service in src/utils/sessionRestoreService.ts
- [x] T035 [US4] Implement automatic session saving on tab changes
- [x] T036 [US4] Add application startup session restoration in main.ts
- [x] T037 [US4] Handle partial restoration (disconnected tabs) with clear UI indicators
- [x] T038 [US4] Add session management options (clear saved sessions, auto-reconnect settings)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T039 [P] Add performance monitoring for tab switching metrics in src/utils/performanceMonitor.ts
- [x] T040 [P] Implement memory management and cleanup in src/utils/memoryManagement.ts
- [x] T041 [P] Add comprehensive error handling and user feedback
- [x] T042 [P] Update component styling with SCSS variables and theming
- [x] T043 [P] Add connection limit warnings and graceful degradation
- [x] T044 Update main window layout to accommodate tab interface
- [x] T045 Add accessibility features (ARIA labels, keyboard navigation)
- [x] T046 Update application settings for tab preferences
- [x] T047 Documentation updates in CLAUDE.md for new tab functionality
- [x] T048 Code cleanup and optimization based on performance metrics

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for tab infrastructure
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 tab management
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 and US2 for complete state

### Within Each User Story

- Models before services and composables
- Services/composables before components
- Core implementation before integration and optimization
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel:
  - US1 and US2 can be developed concurrently by different team members
  - US3 and US4 can also be developed in parallel
- All models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1 & 2

```bash
# Launch all models for User Story 1 & 2 together:
Task: "Create Tab entity model in src/database/models/Tab.ts"
Task: "Create Connection entity model in src/database/models/Connection.ts"
Task: "Create TerminalState entity model in src/database/models/TerminalState.ts"
Task: "Create FileManagerState entity model in src/database/models/FileManagerState.ts"
Task: "Create AIAssistantState entity model in src/database/models/AIAssistantState.ts"

# Launch all infrastructure for User Story 1 & 2 together:
Task: "Implement enhanced connection pool with lazy initialization in src/composables/useConnectionManager.ts"
Task: "Implement terminal instance pooling in src/composables/useTerminalPool.ts"
Task: "Implement useTabManager composable in src/composables/useTabManager.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (tab creation and connection management)
   - Developer B: User Story 2 (tab switching and state preservation)
   - Developer C: User Story 3 (tab organization and management)
3. Stories complete and integrate independently
4. Developer C or A: User Story 4 (session persistence) + Polish phase

---

## Task Count Summary

- **Total Tasks**: 48
- **Setup Phase**: 4 tasks
- **Foundational Phase**: 7 tasks (CRITICAL)
- **User Story 1**: 8 tasks (MVP)
- **User Story 2**: 8 tasks
- **User Story 3**: 6 tasks
- **User Story 4**: 5 tasks
- **Polish Phase**: 10 tasks

## Parallel Opportunities Identified

- **Setup**: 4 parallel tasks available
- **Foundational**: 6 parallel tasks available
- **Within Stories**: Multiple parallel models and components
- **Cross-Story**: US1 and US2 can be developed in parallel by different team members

## Independent Test Criteria

- **User Story 1**: Multiple tabs with independent connections → No cross-tab interference
- **User Story 2**: Tab switching preserves terminal, file manager, and AI state → Complete context restoration
- **User Story 3**: Tab management operations (rename, reorder, close) → Other connections remain stable
- **User Story 4**: Application restart → Previous session restored with all tabs and states

## Suggested MVP Scope

**User Story 1 Only** (8 tasks after foundation):
- Essential for core functionality
- Delivers immediate value: multi-connection management
- Independent testable and deployable
- Foundation for all other stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Memory management is critical due to 15 connection limit and <200MB constraint
- Performance optimization (<1s tab switching) must be considered throughout implementation
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence