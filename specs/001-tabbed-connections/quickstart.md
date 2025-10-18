# Quick Start Guide: Tabbed Connection Management

**Feature**: Tabbed Connection Management
**Version**: 1.0.0
**Date**: 2025-10-18

## Overview

This guide provides a quick start for implementing tabbed connection management in the SSH client application. The feature supports up to 15 simultaneous SSH connections with independent state management, automatic reconnection, and seamless tab switching.

## Prerequisites

- **Node.js**: 18.x or higher
- **Electron**: 28.x
- **Vue 3**: 3.3.x or higher
- **TypeScript**: 5.x
- **SQLite**: 3.x (better-sqlite3 package)

## Core Dependencies

```bash
npm install better-sqlite3@8.7.0
npm install electron-store@8.1.0
npm install @vueuse/core@10.0.0
npm install lodash@4.17.21
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vue 3 Frontend                      │
├─────────────────────────────────────────────────────────┤
│  TabManager  │  TerminalPool  │  ConnectionManager      │
├─────────────────────────────────────────────────────────┤
│                    Pinia Stores                         │
├─────────────────────────────────────────────────────────┤
│                  Electron IPC                           │
├─────────────────────────────────────────────────────────┤
│              Main Process Services                      │
│  ┌─────────────┬─────────────┬─────────────┬──────────┐ │
│  │   SQLite    │ SSH Pool    │ Terminal    │   AI     │ │
│  │  Database   │  Manager    │    Pool     │ Service  │ │
│  └─────────────┴─────────────┴─────────────┴──────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Database Setup

Create the database schema and initialization logic:

```typescript
// src/database/init.ts
import Database from 'better-sqlite3';
import path from 'path';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.setupDatabase();
  }

  private setupDatabase(): void {
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    // Create tables (see data-model.md for complete schema)
    this.createTables();
    this.createIndexes();
  }

  private createTables(): void {
    // Tabs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tabs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        is_visible BOOLEAN DEFAULT TRUE,
        position INTEGER NOT NULL,
        last_accessed INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        window_state TEXT
      );
    `);

    // Connections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 22,
        username TEXT NOT NULL,
        auth_type TEXT NOT NULL CHECK(auth_type IN ('password', 'key')),
        status TEXT NOT NULL DEFAULT 'disconnected',
        last_connected INTEGER,
        reconnect_attempts INTEGER DEFAULT 0,
        max_reconnect_attempts INTEGER DEFAULT 5,
        connected_at INTEGER,
        latency INTEGER,
        bytes_sent INTEGER DEFAULT 0,
        bytes_received INTEGER DEFAULT 0,
        memory_usage INTEGER DEFAULT 0,
        terminal_lines INTEGER DEFAULT 0,
        last_health_check INTEGER,
        health_status TEXT DEFAULT 'healthy',
        error_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Additional tables for terminal, AI, file manager...
    // (See complete schema in data-model.md)
  }

  private createIndexes(): void {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tabs_connection_id ON tabs(connection_id);
      CREATE INDEX IF NOT EXISTS idx_tabs_position ON tabs(position);
      CREATE INDEX IF NOT EXISTS idx_terminal_history_tab_timestamp ON terminal_history(tab_id, timestamp);
    `);
  }
}
```

### 2. Tab Management Store

Create the Pinia store for tab state management:

```typescript
// src/stores/tabStore.ts
import { defineStore } from 'pinia';
import { ref, shallowRef, computed } from 'vue';
import type { Tab, Connection } from '@/types';

export const useTabStore = defineStore('tabs', () => {
  // Use shallowRef for performance with large datasets
  const tabs = shallowRef<Map<string, Tab>>(new Map());
  const activeTabId = ref<string | null>(null);
  const maxTabs = ref(15);

  // Computed getters
  const activeTab = computed(() =>
    activeTabId.value ? tabs.value.get(activeTabId.value) : null
  );

  const tabList = computed(() =>
    Array.from(tabs.value.values()).sort((a, b) => a.position - b.position)
  );

  const canCreateTab = computed(() =>
    tabs.value.size < maxTabs.value
  );

  // Actions
  const createTab = async (name?: string, connection?: Connection): Promise<Tab> => {
    if (!canCreateTab.value) {
      throw new Error('Maximum number of tabs reached');
    }

    const tab: Tab = {
      id: generateUUID(),
      name: name || `Tab ${tabs.value.size + 1}`,
      connectionId: connection?.id || '',
      isActive: false,
      isVisible: true,
      position: tabs.value.size,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      windowState: {
        width: 1200,
        height: 800,
        splitSizes: [50, 50]
      }
    };

    tabs.value.set(tab.id, tab);

    // Persist to database
    await saveTabToDatabase(tab);

    return tab;
  };

  const activateTab = async (tabId: string): Promise<void> => {
    const tab = tabs.value.get(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    // Deactivate all tabs
    tabs.value.forEach(t => {
      t.isActive = false;
      t.isVisible = false;
    });

    // Activate selected tab
    tab.isActive = true;
    tab.isVisible = true;
    tab.lastAccessed = Date.now();
    activeTabId.value = tabId;

    // Update database
    await updateTabInDatabase(tab);
  };

  const closeTab = async (tabId: string): Promise<void> => {
    const tab = tabs.value.get(tabId);
    if (!tab) return;

    // Close connection if needed
    if (tab.connectionId) {
      await closeConnection(tab.connectionId);
    }

    // Remove from store
    tabs.value.delete(tabId);

    // Update positions
    const remainingTabs = Array.from(tabs.value.values())
      .sort((a, b) => a.position - b.position);

    remainingTabs.forEach((t, index) => {
      t.position = index;
      updateTabInDatabase(t);
    });

    // Activate another tab if this was active
    if (activeTabId.value === tabId && remainingTabs.length > 0) {
      await activateTab(remainingTabs[0].id);
    } else if (remainingTabs.length === 0) {
      activeTabId.value = null;
    }

    // Remove from database
    await deleteTabFromDatabase(tabId);
  };

  return {
    tabs,
    activeTabId,
    activeTab,
    tabList,
    canCreateTab,
    createTab,
    activateTab,
    closeTab
  };
});
```

### 3. Terminal Pool Manager

Implement the terminal instance pooling:

```typescript
// src/composables/useTerminalPool.ts
import { ref, markRaw } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

interface PooledTerminal {
  id: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  webLinksAddon: WebLinksAddon;
  lastUsed: number;
  isActive: boolean;
  connectionId?: string;
}

export function useTerminalPool() {
  const pool = ref(new Map<string, PooledTerminal>());
  const maxPoolSize = 20;
  const maxInactiveTime = 10 * 60 * 1000; // 10 minutes

  const createTerminalInstance = (id: string): PooledTerminal => {
    const terminal = new Terminal({
      cols: 80,
      rows: 24,
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      scrollback: 1000,
      rendererType: 'canvas', // Canvas renderer for performance
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#74c0fc',
      },
      allowTransparency: false,
      cursorBlink: true,
      cursorStyle: 'block',
      fastScrollModifier: 'alt',
      rightClickSelectsWord: true,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    return {
      id,
      terminal: markRaw(terminal),
      fitAddon,
      webLinksAddon,
      lastUsed: Date.now(),
      isActive: false
    };
  };

  const acquireTerminal = (connectionId: string): PooledTerminal => {
    // Find inactive terminal
    for (const [id, pooled] of pool.value.entries()) {
      if (!pooled.isActive) {
        pooled.isActive = true;
        pooled.connectionId = connectionId;
        pooled.lastUsed = Date.now();
        pooled.terminal.reset();
        return pooled;
      }
    }

    // Create new terminal
    if (pool.value.size < maxPoolSize) {
      const newId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const pooled = createTerminalInstance(newId);
      pooled.isActive = true;
      pooled.connectionId = connectionId;
      pool.value.set(newId, pooled);
      return pooled;
    }

    // Pool full - remove oldest inactive
    const oldestInactive = Array.from(pool.value.values())
      .filter(p => !p.isActive)
      .sort((a, b) => a.lastUsed - b.lastUsed)[0];

    if (oldestInactive) {
      oldestInactive.terminal.dispose();
      pool.value.delete(oldestInactive.id);

      const newId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const pooled = createTerminalInstance(newId);
      pooled.isActive = true;
      pooled.connectionId = connectionId;
      pool.value.set(newId, pooled);
      return pooled;
    }

    throw new Error('No available terminals in pool');
  };

  const releaseTerminal = (terminalId: string): void => {
    const pooled = pool.value.get(terminalId);
    if (pooled) {
      pooled.isActive = false;
      pooled.connectionId = undefined;
      pooled.lastUsed = Date.now();

      try {
        pooled.terminal.clear();
      } catch (error) {
        console.warn('Failed to clear terminal on release:', error);
      }
    }
  };

  return {
    pool,
    acquireTerminal,
    releaseTerminal
  };
}
```

### 4. Enhanced Connection Manager

Upgrade the existing connection manager for multi-connection support:

```typescript
// src/composables/useConnectionManager.ts
import { ref, reactive } from 'vue';
import { Client } from 'ssh2';
import SFTPClient from 'ssh2-sftp-client';

interface ConnectionPoolEntry {
  id: string;
  client: Client;
  sftpClient?: SFTPClient;
  shell?: any;
  lastUsed: number;
  isActive: boolean;
  memoryUsage: number;
}

export function useConnectionManager() {
  const connections = reactive(new Map<string, ConnectionPoolEntry>());
  const maxConnections = 20;
  const maxMemoryPerConnection = 8 * 1024 * 1024; // 8MB

  const createConnection = async (config: ConnectionConfig): Promise<string> => {
    if (connections.size >= maxConnections) {
      await cleanupIdleConnections();
    }

    const connectionId = generateUUID();
    const client = new Client();

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        const entry: ConnectionPoolEntry = {
          id: connectionId,
          client,
          lastUsed: Date.now(),
          isActive: true,
          memoryUsage: 0
        };

        connections.set(connectionId, entry);
        resolve(connectionId);
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey
      });
    });
  };

  const getConnection = (connectionId: string): ConnectionPoolEntry | undefined => {
    const connection = connections.get(connectionId);
    if (connection) {
      connection.lastUsed = Date.now();
    }
    return connection;
  };

  const closeConnection = async (connectionId: string): Promise<void> => {
    const connection = connections.get(connectionId);
    if (connection) {
      if (connection.shell) {
        connection.shell.end();
      }
      if (connection.sftpClient) {
        await connection.sftpClient.end();
      }
      connection.client.end();
      connections.delete(connectionId);
    }
  };

  const cleanupIdleConnections = async (): Promise<void> => {
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [id, connection] of connections.entries()) {
      if (!connection.isActive && (now - connection.lastUsed) > idleThreshold) {
        await closeConnection(id);
      }
    }
  };

  return {
    connections,
    createConnection,
    getConnection,
    closeConnection,
    cleanupIdleConnections
  };
}
```

### 5. Tab Component Integration

Update the main tab component to use the new architecture:

```vue
<!-- src/components/TabManager.vue -->
<template>
  <div class="tab-manager">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <div
        v-for="tab in tabList"
        :key="tab.id"
        :class="['tab', { 'tab--active': tab.isActive }]"
        @click="activateTab(tab.id)"
        @contextmenu.prevent="showTabContextMenu(tab)"
      >
        <div class="tab__content">
          <div class="tab__status" :class="`status-${getConnectionStatus(tab.connectionId)}`"></div>
          <span class="tab__title">{{ tab.name }}</span>
        </div>
        <button class="tab__close" @click.stop="closeTab(tab.id)">×</button>
      </div>

      <button
        class="tab-new"
        @click="createNewTab"
        :disabled="!canCreateTab"
        title="New Tab"
      >
        +
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <KeepAlive :max="8">
        <TabContent
          v-for="tab in visibleTabs"
          :key="tab.id"
          :tab="tab"
          :connection="getConnection(tab.connectionId)"
          v-show="tab.isActive"
        />
      </KeepAlive>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useTabStore } from '@/stores/tabStore';
import { useConnectionManager } from '@/composables/useConnectionManager';
import TabContent from './TabContent.vue';

const tabStore = useTabStore();
const connectionManager = useConnectionManager();

const { tabList, activeTab, canCreateTab, createTab, activateTab, closeTab } = tabStore;

const visibleTabs = computed(() =>
  tabList.filter(tab => tab.isActive || tab.isVisible)
);

const getConnection = (connectionId: string) => {
  return connectionManager.getConnection(connectionId);
};

const getConnectionStatus = (connectionId: string): string => {
  const connection = getConnection(connectionId);
  return connection?.status || 'disconnected';
};

const createNewTab = async () => {
  try {
    const tab = await createTab();
    await activateTab(tab.id);
  } catch (error) {
    console.error('Failed to create tab:', error);
  }
};

const showTabContextMenu = (tab: Tab) => {
  // Implementation for tab context menu
};

onMounted(async () => {
  // Restore previous session
  await restoreSession();
});
</script>

<style lang="scss" scoped>
.tab-manager {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.tab {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-bottom: none;
  cursor: pointer;
  position: relative;

  &:hover {
    background: #3e3e42;
  }

  &--active {
    background: #1e1e1e;
    border-bottom: 1px solid #1e1e1e;
  }
}

.tab__content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.status-connected {
    background: #4ec9b0;
  }

  &.status-connecting {
    background: #ce9178;
  }

  &.status-disconnected {
    background: #f44747;
  }
}

.tab__title {
  font-size: 13px;
  color: #cccccc;
}

.tab__close {
  margin-left: 6px;
  padding: 2px 6px;
  background: transparent;
  border: none;
  color: #cccccc;
  cursor: pointer;
  border-radius: 3px;

  &:hover {
    background: #f44747;
    color: white;
  }
}

.tab-new {
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #cccccc;
  cursor: pointer;
  font-size: 16px;

  &:hover:not(:disabled) {
    background: #3e3e42;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.tab-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
```

## Testing

### Unit Tests

```typescript
// tests/unit/tabStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTabStore } from '@/stores/tabStore';

describe('TabStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should create a new tab', async () => {
    const store = useTabStore();
    const tab = await store.createTab('Test Tab');

    expect(tab.name).toBe('Test Tab');
    expect(tab.isActive).toBe(false);
    expect(store.tabList).toHaveLength(1);
  });

  it('should activate a tab', async () => {
    const store = useTabStore();
    const tab = await store.createTab();

    await store.activateTab(tab.id);

    expect(tab.isActive).toBe(true);
    expect(store.activeTabId).toBe(tab.id);
  });

  it('should limit maximum tabs', async () => {
    const store = useTabStore();

    // Create maximum tabs
    for (let i = 0; i < 15; i++) {
      await store.createTab(`Tab ${i}`);
    }

    expect(store.canCreateTab.value).toBe(false);

    await expect(store.createTab()).rejects.toThrow('Maximum number of tabs reached');
  });
});
```

### Integration Tests

```typescript
// tests/integration/tabManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TabManager from '@/components/TabManager.vue';

describe('TabManager Integration', () => {
  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(TabManager);
  });

  it('should render tab bar', () => {
    expect(wrapper.find('.tab-bar').exists()).toBe(true);
  });

  it('should create new tab on button click', async () => {
    const newTabButton = wrapper.find('.tab-new');
    await newTabButton.trigger('click');

    expect(wrapper.vm.tabList).toHaveLength(1);
  });

  it('should switch tabs on click', async () => {
    // Create two tabs
    await wrapper.vm.createNewTab();
    await wrapper.vm.createNewTab();

    const tabs = wrapper.findAll('.tab');
    await tabs[1].trigger('click');

    expect(wrapper.vm.activeTab?.id).toBe(wrapper.vm.tabList[1].id);
  });
});
```

## Performance Monitoring

Add performance tracking to monitor the success criteria:

```typescript
// src/utils/performanceMonitor.ts
export class PerformanceMonitor {
  private metrics = {
    tabSwitchTimes: [] as number[],
    memoryUsage: [] as number[],
    connectionCount: 0
  };

  startTabSwitchMeasurement = () => {
    const startTime = performance.now();

    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.metrics.tabSwitchTimes.push(duration);

        if (this.metrics.tabSwitchTimes.length > 50) {
          this.metrics.tabSwitchTimes.shift();
        }

        return duration;
      }
    };
  };

  getAverageTabSwitchTime = (): number => {
    if (this.metrics.tabSwitchTimes.length === 0) return 0;
    const sum = this.metrics.tabSwitchTimes.reduce((a, b) => a + b, 0);
    return sum / this.metrics.tabSwitchTimes.length;
  };

  checkPerformanceCriteria = () => ({
    tabSwitching: this.getAverageTabSwitchTime() < 1000, // < 1s
    memoryUsage: this.getCurrentMemoryUsage() < 200 * 1024 * 1024, // < 200MB
    connectionLimit: this.metrics.connectionCount <= 15
  });
}
```

## Deployment

### Build Configuration

Update the build configuration to include the new dependencies:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['better-sqlite3']
    }
  },
  optimizeDeps: {
    exclude: ['better-sqlite3']
  }
});
```

### Electron Configuration

```typescript
// electron-builder.json
{
  "build": {
    "extraResources": [
      {
        "from": "node_modules/better-sqlite3/lib/binding/napi-v3-darwin-arm64/node_sqlite3.node",
        "to": "better-sqlite3.node"
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

1. **Memory Leaks**: Ensure terminal instances are properly released back to the pool
2. **Database Locks**: Use WAL mode and proper connection handling
3. **Performance**: Monitor tab switching times and optimize with lazy loading
4. **Connection Issues**: Implement proper reconnection logic with exponential backoff

### Debug Tools

- **Vue DevTools**: Monitor component reactivity and performance
- **Chrome DevTools**: Memory profiling and performance analysis
- **Electron DevTools**: Main process debugging and IPC monitoring

## Next Steps

1. **Implement**: Complete the core tab management functionality
2. **Test**: Comprehensive testing of all scenarios
3. **Optimize**: Performance tuning based on metrics
4. **Document**: Update user documentation and help content

For detailed implementation guidance, refer to:
- [Data Model Specification](./data-model.md)
- [API Contracts](./contracts/api.yaml)
- [Research Findings](./research.md)