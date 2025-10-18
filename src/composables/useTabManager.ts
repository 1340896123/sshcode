import { ref, computed, shallowRef, nextTick } from 'vue';
import { useTabStore } from '../stores/tabStore';
import { useConnectionStore } from '../stores/connectionStore';
import type {
  Tab,
  CreateTabRequest,
  UpdateTabRequest,
  ConnectionRequest,
  TabManagerComposable,
  TabEvent,
  WindowState
} from '../types/tab';

/**
 * Tab Management Composable
 *
 * Provides reactive tab management functionality with performance optimizations
 * for handling multiple SSH connections in a tabbed interface.
 */
export function useTabManager(): TabManagerComposable {
  // Stores
  const tabStore = useTabStore();
  const connectionStore = useConnectionStore();

  // Reactive state using shallowRef for performance with large datasets
  const tabs = shallowRef(tabStore.tabs);
  const activeTabId = ref<string | null>(tabStore.activeTabId);

  // Computed properties
  const tabList = computed(() => Array.from(tabs.value.values())
    .sort((a, b) => a.position - b.position));

  const activeTab = computed(() =>
    activeTabId.value ? tabs.value.get(activeTabId.value) || null : null
  );

  const canCreateTab = computed(() =>
    tabs.value.size < tabStore.maxTabs
  );

  /**
   * Create a new tab with optional connection
   */
  const createTab = async (name?: string, connection?: ConnectionRequest): Promise<Tab> => {
    try {
      // Check tab limit
      if (!canCreateTab.value) {
        throw new Error(`Maximum tab limit (${tabStore.maxTabs}) reached`);
      }

      // Create connection if provided
      let connectionId: string;
      if (connection) {
        connectionId = await connectionStore.createConnection(connection);
      } else {
        // Create a placeholder connection ID for tabs without immediate connections
        connectionId = `placeholder-${Date.now()}`;
      }

      // Generate unique tab ID
      const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine position (append to end)
      const position = tabs.value.size > 0
        ? Math.max(...Array.from(tabs.value.values()).map(t => t.position)) + 1
        : 0;

      // Create tab object
      const now = Date.now();
      const tab: Tab = {
        id: tabId,
        name: name || (connection ? connection.name : `Tab ${position + 1}`),
        connectionId,
        isActive: false,
        isVisible: true,
        position,
        lastAccessed: now,
        createdAt: now,
        updatedAt: now,
        windowState: {
          width: 1200,
          height: 800,
          splitSizes: [50, 50] // Default 50/50 split
        }
      };

      // Add to store
      await tabStore.createTab({
        name: tab.name,
        connection: tab.connectionId,
        position: tab.position
      });

      // Activate the new tab
      await activateTab(tabId);

      // Emit tab created event
      emitTabEvent('tab-created', tabId, { tab });

      return tab;
    } catch (error) {
      console.error('Failed to create tab:', error);
      throw error;
    }
  };

  /**
   * Activate a specific tab
   */
  const activateTab = async (tabId: string): Promise<void> => {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab ${tabId} not found`);
      }

      const startTime = performance.now();

      // Deactivate previous active tab
      if (activeTabId.value) {
        const previousTab = tabs.value.get(activeTabId.value);
        if (previousTab) {
          previousTab.isActive = false;
          await tabStore.activateTab(tabId); // This will handle deactivation automatically
        }
      }

      // Activate new tab
      tab.isActive = true;
      tab.lastAccessed = Date.now();

      await tabStore.updateTab(tabId, {
        isActive: true,
        lastAccessed: tab.lastAccessed
      });

      // Update local state
      activeTabId.value = tabId;

      // Ensure DOM updates are complete
      await nextTick();

      // Track performance
      const activationTime = performance.now() - startTime;
      if (activationTime > 1000) {
        console.warn(`Slow tab activation: ${activationTime.toFixed(2)}ms for tab ${tabId}`);
      }

      // Emit tab activated event
      emitTabEvent('tab-activated', tabId, { activationTime });
    } catch (error) {
      console.error('Failed to activate tab:', error);
      throw error;
    }
  };

  /**
   * Close a tab and clean up its resources
   */
  const closeTab = async (tabId: string): Promise<void> => {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab ${tabId} not found`);
      }

      // Check if there are active operations that need user confirmation
      const hasActiveOperations = await checkActiveOperations(tabId);
      if (hasActiveOperations) {
        // In a real implementation, you'd show a confirmation dialog
        const confirmed = await confirmTabClose(tabId);
        if (!confirmed) {
          return;
        }
      }

      // Close associated connection
      if (tab.connectionId && !tab.connectionId.startsWith('placeholder-')) {
        await connectionStore.closeConnection(tab.connectionId);
      }

      // Remove tab from store
      await tabStore.closeTab(tabId);

      // Handle active tab switching
      if (activeTabId.value === tabId) {
        const remainingTabs = tabList.value.filter(t => t.id !== tabId);
        if (remainingTabs.length > 0) {
          // Activate the most recently accessed tab
          const nextTab = remainingTabs.reduce((prev, current) =>
            prev.lastAccessed > current.lastAccessed ? prev : current
          );
          await activateTab(nextTab.id);
        } else {
          activeTabId.value = null;
        }
      }

      // Reorder remaining tabs to maintain continuity
      await reorderRemainingTabs();

      // Emit tab closed event
      emitTabEvent('tab-closed', tabId, { tab });
    } catch (error) {
      console.error('Failed to close tab:', error);
      throw error;
    }
  };

  /**
   * Update tab properties
   */
  const updateTab = async (tabId: string, updates: UpdateTabRequest): Promise<void> => {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab ${tabId} not found`);
      }

      const updatedTab = { ...tab, ...updates, updatedAt: Date.now() };
      await tabStore.updateTab(tabId, updatedTab);

      // Update local state
      tabs.value.set(tabId, updatedTab);

      // Emit tab updated event
      emitTabEvent('tab-updated', tabId, { updates, updatedTab });
    } catch (error) {
      console.error('Failed to update tab:', error);
      throw error;
    }
  };

  /**
   * Rename a tab
   */
  const renameTab = async (tabId: string, name: string): Promise<void> => {
    if (!name.trim()) {
      throw new Error('Tab name cannot be empty');
    }
    await updateTab(tabId, { name: name.trim() });
  };

  /**
   * Reorder a tab to a new position
   */
  const reorderTab = async (tabId: string, newPosition: number): Promise<void> => {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab ${tabId} not found`);
      }

      const currentPosition = tab.position;
      if (currentPosition === newPosition) {
        return; // No change needed
      }

      // Get all tabs sorted by position
      const sortedTabs = tabList.value;

      // Adjust positions of affected tabs
      const updates: Array<{ id: string; position: number }> = [];

      if (newPosition < currentPosition) {
        // Moving tab forward (to lower position)
        sortedTabs
          .filter(t => t.position >= newPosition && t.position < currentPosition)
          .forEach(t => {
            updates.push({ id: t.id, position: t.position + 1 });
          });
      } else {
        // Moving tab backward (to higher position)
        sortedTabs
          .filter(t => t.position > currentPosition && t.position <= newPosition)
          .forEach(t => {
            updates.push({ id: t.id, position: t.position - 1 });
          });
      }

      // Update the target tab position
      updates.push({ id: tabId, position: newPosition });

      // Apply all updates
      for (const update of updates) {
        const tabToUpdate = tabs.value.get(update.id);
        if (tabToUpdate) {
          tabToUpdate.position = update.position;
          tabToUpdate.updatedAt = Date.now();
          await tabStore.updateTab(update.id, {
            position: update.position,
            updatedAt: tabToUpdate.updatedAt
          });
        }
      }

      // Emit tab reordered event
      emitTabEvent('tab-reordered', tabId, {
        oldPosition: currentPosition,
        newPosition,
        affectedTabs: updates.length - 1
      });
    } catch (error) {
      console.error('Failed to reorder tab:', error);
      throw error;
    }
  };

  /**
   * Check if tab has active operations that need confirmation before closing
   */
  const checkActiveOperations = async (tabId: string): Promise<boolean> => {
    const tab = tabs.value.get(tabId);
    if (!tab) return false;

    // Check for active file transfers
    // Check for running commands
    // Check for active AI assistant operations
    // This would integrate with other stores/services

    return false; // Placeholder - implement based on actual state
  };

  /**
   * Confirm tab close with user
   */
  const confirmTabClose = async (tabId: string): Promise<boolean> => {
    // In a real implementation, this would show a confirmation dialog
    // For now, we'll return true to proceed with closing
    return true;
  };

  /**
   * Reorder remaining tabs after a tab is closed
   */
  const reorderRemainingTabs = async (): Promise<void> => {
    const remainingTabs = Array.from(tabs.value.values())
      .sort((a, b) => a.position - b.position);

    for (let i = 0; i < remainingTabs.length; i++) {
      const tab = remainingTabs[i];
      if (tab.position !== i) {
        tab.position = i;
        tab.updatedAt = Date.now();
        await tabStore.updateTab(tab.id, {
          position: i,
          updatedAt: tab.updatedAt
        });
      }
    }
  };

  /**
   * Emit tab events for external listeners
   */
  const emitTabEvent = (type: TabEvent['type'], tabId: string, data?: any): void => {
    const event: TabEvent = {
      type,
      tabId,
      timestamp: Date.now(),
      data
    };

    // Dispatch custom event for external listeners
    window.dispatchEvent(new CustomEvent('tab-event', {
      detail: event
    }));
  };

  // Subscribe to store changes
  tabStore.$subscribe((mutation, state) => {
    tabs.value = state.tabs;
    activeTabId.value = state.activeTabId;
  });

  return {
    // State
    tabs,
    activeTab,
    activeTabId,

    // Computed
    tabList,
    canCreateTab,

    // Actions
    createTab,
    activateTab,
    closeTab,
    updateTab,
    renameTab,
    reorderTab
  };
}

/**
 * Default window state for new tabs
 */
export const defaultWindowState: WindowState = {
  width: 1200,
  height: 800,
  splitSizes: [50, 50]
};

/**
 * Helper function to generate tab names
 */
export function generateTabName(baseName: string, existingNames: string[]): string {
  let name = baseName;
  let counter = 1;

  while (existingNames.includes(name)) {
    name = `${baseName} (${counter})`;
    counter++;
  }

  return name;
}