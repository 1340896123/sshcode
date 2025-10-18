import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Tab, CreateTabRequest, UpdateTabRequest, TabStoreState } from '@/types';
import { getTabModel } from '@/database/models';

/**
 * Tab Store - Manages tab state and operations
 */
export const useTabStore = defineStore('tab', () => {
  // State
  const tabs = ref<Map<string, Tab>>(new Map());
  const activeTabId = ref<string | null>(null);
  const maxTabs = 15;
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters (Computed)
  const tabList = computed(() => Array.from(tabs.value.values()).sort((a, b) => a.position - b.position));
  const activeTab = computed(() => activeTabId.value ? tabs.value.get(activeTabId.value) || null : null);
  const canCreateTab = computed(() => tabs.value.size < maxTabs);
  const visibleTabs = computed(() => tabList.value.filter(tab => tab.isVisible));
  const activeVisibleTab = computed(() => visibleTabs.value.find(tab => tab.isActive) || null);

  // Actions
  /**
   * Load all tabs from database
   */
  async function loadTabs(): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      const tabModel = getTabModel();
      const dbTabs = await tabModel.findAll();

      // Clear current state
      tabs.value.clear();

      // Load tabs into state
      for (const tab of dbTabs) {
        tabs.value.set(tab.id, tab);
      }

      // Set active tab
      const activeDbTab = await tabModel.findActive();
      if (activeDbTab) {
        activeTabId.value = activeDbTab.id;
      } else if (tabs.value.size > 0) {
        // If no active tab, activate the first one
        activateTab(tabList.value[0].id);
      }

      console.log(`Loaded ${tabs.value.size} tabs from database`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tabs';
      console.error('Failed to load tabs:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Create a new tab
   */
  async function createTab(request?: CreateTabRequest): Promise<Tab> {
    try {
      if (!canCreateTab.value) {
        throw new Error(`Maximum number of tabs (${maxTabs}) reached`);
      }

      isLoading.value = true;
      error.value = null;

      const tabModel = getTabModel();

      // Determine position for new tab
      const maxPosition = await tabModel.getMaxPosition();
      const position = request?.position ?? maxPosition + 1;

      // Create tab data
      const tabData = {
        name: request?.name || `Terminal ${tabs.value.size + 1}`,
        connectionId: request?.connection || '',
        isActive: false,
        isVisible: true,
        position,
        lastAccessed: Date.now(),
        windowState: {
          width: 1200,
          height: 800,
          splitSizes: [50, 50]
        }
      };

      // Create tab in database
      const newTab = await tabModel.create(tabData);

      // Add to state
      tabs.value.set(newTab.id, newTab);

      // If this is the first tab, activate it
      if (tabs.value.size === 1) {
        await activateTab(newTab.id);
      }

      console.log(`Created tab: ${newTab.name} (${newTab.id})`);
      return newTab;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create tab';
      console.error('Failed to create tab:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Activate a tab (deactivates all other tabs)
   */
  async function activateTab(tabId: string): Promise<void> {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab not found: ${tabId}`);
      }

      const tabModel = getTabModel();

      // Update active status in database
      await tabModel.setActive(tabId, true);

      // Update last accessed
      await tabModel.updateLastAccessed(tabId);

      // Update local state
      // Deactivate all tabs
      for (const [id, t] of tabs.value) {
        tabs.value.set(id, { ...t, isActive: false });
      }

      // Activate the specified tab
      tabs.value.set(tabId, { ...tab, isActive: true, lastAccessed: Date.now() });

      // Update active tab ID
      activeTabId.value = tabId;

      console.log(`Activated tab: ${tab.name} (${tabId})`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to activate tab';
      console.error('Failed to activate tab:', err);
      throw err;
    }
  }

  /**
   * Close a tab
   */
  async function closeTab(tabId: string): Promise<void> {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab not found: ${tabId}`);
      }

      // Don't close if it's the only tab
      if (tabs.value.size === 1) {
        throw new Error('Cannot close the last tab');
      }

      const tabModel = getTabModel();

      // Delete from database
      const success = await tabModel.delete(tabId);
      if (!success) {
        throw new Error(`Failed to delete tab from database: ${tabId}`);
      }

      // Remove from state
      tabs.value.delete(tabId);

      // If we closed the active tab, activate another one
      if (activeTabId.value === tabId) {
        const remainingTabs = Array.from(tabs.value.values()).sort((a, b) => a.position - b.position);
        if (remainingTabs.length > 0) {
          await activateTab(remainingTabs[0].id);
        } else {
          activeTabId.value = null;
        }
      }

      // Reorder remaining tabs
      await reorderTabsAfterClose(tabId);

      console.log(`Closed tab: ${tab.name} (${tabId})`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to close tab';
      console.error('Failed to close tab:', err);
      throw err;
    }
  }

  /**
   * Update a tab
   */
  async function updateTab(tabId: string, updates: UpdateTabRequest): Promise<void> {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab not found: ${tabId}`);
      }

      const tabModel = getTabModel();

      // Update in database
      const updatedTab = await tabModel.update(tabId, updates);
      if (!updatedTab) {
        throw new Error(`Failed to update tab in database: ${tabId}`);
      }

      // Update local state
      tabs.value.set(tabId, updatedTab);

      console.log(`Updated tab: ${tab.name} (${tabId})`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update tab';
      console.error('Failed to update tab:', err);
      throw err;
    }
  }

  /**
   * Rename a tab
   */
  async function renameTab(tabId: string, name: string): Promise<void> {
    await updateTab(tabId, { name });
  }

  /**
   * Reorder a tab to a new position
   */
  async function reorderTab(tabId: string, newPosition: number): Promise<void> {
    try {
      const tab = tabs.value.get(tabId);
      if (!tab) {
        throw new Error(`Tab not found: ${tabId}`);
      }

      const currentTabs = tabList.value;
      const currentIndex = currentTabs.findIndex(t => t.id === tabId);

      if (currentIndex === -1) {
        throw new Error(`Tab not found in list: ${tabId}`);
      }

      if (newPosition < 0 || newPosition >= currentTabs.length) {
        throw new Error(`Invalid position: ${newPosition}`);
      }

      if (currentIndex === newPosition) {
        return; // No change needed
      }

      const tabModel = getTabModel();

      // Calculate new positions
      const updates: { id: string; position: number }[] = [];
      const movedTab = currentTabs[currentIndex];

      // Update positions for affected tabs
      if (newPosition < currentIndex) {
        // Moving tab to the left
        for (let i = newPosition; i < currentIndex; i++) {
          updates.push({ id: currentTabs[i].id, position: i + 1 });
        }
        updates.push({ id: tabId, position: newPosition });
      } else {
        // Moving tab to the right
        for (let i = currentIndex + 1; i <= newPosition; i++) {
          updates.push({ id: currentTabs[i].id, position: i - 1 });
        }
        updates.push({ id: tabId, position: newPosition });
      }

      // Update positions in database
      await tabModel.updatePositions(updates);

      // Update local state
      for (const update of updates) {
        const tabToUpdate = tabs.value.get(update.id);
        if (tabToUpdate) {
          tabs.value.set(update.id, { ...tabToUpdate, position: update.position });
        }
      }

      console.log(`Reordered tab ${movedTab.name} to position ${newPosition}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reorder tab';
      console.error('Failed to reorder tab:', err);
      throw err;
    }
  }

  /**
   * Update window state for a tab
   */
  async function updateWindowState(tabId: string, windowState: Tab['windowState']): Promise<void> {
    await updateTab(tabId, { windowState });
  }

  /**
   * Toggle visibility of a tab
   */
  async function toggleTabVisibility(tabId: string): Promise<void> {
    const tab = tabs.value.get(tabId);
    if (tab) {
      await updateTab(tabId, { isVisible: !tab.isVisible });
    }
  }

  /**
   * Get tab statistics
   */
  async function getStats(): Promise<{
    totalTabs: number;
    activeTabs: number;
    visibleTabs: number;
    canCreateMore: boolean;
  }> {
    const stats = await getTabModel().getStats();
    return {
      ...stats,
      canCreateMore: canCreateTab.value
    };
  }

  /**
   * Find tab by name
   */
  function findTabByName(name: string): Tab | null {
    return tabList.value.find(tab => tab.name === name) || null;
  }

  /**
   * Get tabs by connection ID
   */
  function getTabsByConnectionId(connectionId: string): Tab[] {
    return tabList.value.filter(tab => tab.connectionId === connectionId);
  }

  /**
   * Clear all tabs (for testing/reset purposes)
   */
  async function clearAllTabs(): Promise<void> {
    try {
      const tabModel = getTabModel();
      const allTabs = await tabModel.findAll();

      for (const tab of allTabs) {
        await tabModel.delete(tab.id);
      }

      tabs.value.clear();
      activeTabId.value = null;

      console.log('Cleared all tabs');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to clear tabs';
      console.error('Failed to clear tabs:', err);
      throw err;
    }
  }

  // Helper functions
  async function reorderTabsAfterClose(closedTabId: string): Promise<void> {
    try {
      const tabModel = getTabModel();
      const remainingTabs = (await tabModel.findAll()).sort((a, b) => a.position - b.position);

      const updates: { id: string; position: number }[] = [];
      remainingTabs.forEach((tab, index) => {
        if (tab.position !== index) {
          updates.push({ id: tab.id, position: index });
        }
      });

      if (updates.length > 0) {
        await tabModel.updatePositions(updates);

        // Update local state
        for (const update of updates) {
          const tab = tabs.value.get(update.id);
          if (tab) {
            tabs.value.set(update.id, { ...tab, position: update.position });
          }
        }
      }
    } catch (err) {
      console.error('Failed to reorder tabs after close:', err);
      // Don't throw here, as this is a cleanup operation
    }
  }

  // Watch for changes and persist to database
  watch(tabs, (newTabs) => {
    // This is a fallback persistence mechanism
    // Primary persistence happens in individual action methods
    console.log(`Tabs state updated: ${newTabs.size} tabs`);
  }, { deep: true });

  return {
    // State
    tabs,
    activeTabId,
    isLoading,
    error,
    maxTabs,

    // Getters
    tabList,
    activeTab,
    canCreateTab,
    visibleTabs,
    activeVisibleTab,

    // Actions
    loadTabs,
    createTab,
    activateTab,
    closeTab,
    updateTab,
    renameTab,
    reorderTab,
    updateWindowState,
    toggleTabVisibility,
    getStats,
    findTabByName,
    getTabsByConnectionId,
    clearAllTabs
  };
});