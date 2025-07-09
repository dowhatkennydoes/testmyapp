import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Page } from './NotebookContext';

interface Tab {
  id: string;
  title: string;
  type: 'page' | 'dashboard' | 'search' | 'settings';
  content: {
    pageId?: string;
    page?: Page;
    route?: string;
  };
  hasUnsavedChanges: boolean;
  isActive: boolean;
  lastAccessed: Date;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Tab management
  openTab: (tab: Omit<Tab, 'id' | 'isActive' | 'lastAccessed'>) => string;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  switchToTab: (tabId: string) => void;
  
  // Tab state
  updateTabTitle: (tabId: string, title: string) => void;
  setTabUnsavedChanges: (tabId: string, hasChanges: boolean) => void;
  getActiveTab: () => Tab | null;
  
  // Tab persistence
  saveTabs: () => void;
  loadTabs: () => void;
  
  // Tab navigation
  switchToNextTab: () => void;
  switchToPreviousTab: () => void;
  
  // Tab utilities
  findTabByPageId: (pageId: string) => Tab | null;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

const TAB_STORAGE_KEY = 'deviseos-tabs';
const MAX_TABS = 20;

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Generate unique tab ID
  const generateTabId = (): string => {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Create a new tab
  const openTab = useCallback((tabData: Omit<Tab, 'id' | 'isActive' | 'lastAccessed'>): string => {
    const newTabId = generateTabId();
    
    // Check if tab already exists (for pages)
    if (tabData.type === 'page' && tabData.content.pageId) {
      const existingTab = tabs.find(tab => 
        tab.type === 'page' && tab.content.pageId === tabData.content.pageId
      );
      if (existingTab) {
        switchToTab(existingTab.id);
        return existingTab.id;
      }
    }
    
    // Check if we're at max tabs
    if (tabs.length >= MAX_TABS) {
      // Close the least recently accessed tab
      const oldestTab = tabs.reduce((oldest, current) => 
        current.lastAccessed < oldest.lastAccessed ? current : oldest
      );
      closeTab(oldestTab.id);
    }
    
    const newTab: Tab = {
      ...tabData,
      id: newTabId,
      isActive: true,
      lastAccessed: new Date(),
    };
    
    setTabs(prev => {
      const updatedTabs = prev.map(tab => ({ ...tab, isActive: false }));
      return [...updatedTabs, newTab];
    });
    
    setActiveTabId(newTabId);
    return newTabId;
  }, [tabs]);

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabIndex = prev.findIndex(tab => tab.id === tabId);
      if (tabIndex === -1) return prev;
      
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // If closing active tab, switch to another tab
      if (prev[tabIndex].isActive && newTabs.length > 0) {
        // Switch to the tab to the right, or left if at the end
        const nextIndex = tabIndex < newTabs.length ? tabIndex : tabIndex - 1;
        const nextTab = newTabs[nextIndex];
        nextTab.isActive = true;
        setActiveTabId(nextTab.id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      
      return newTabs;
    });
  }, []);

  // Close all tabs
  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  // Close other tabs
  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabToKeep = prev.find(tab => tab.id === tabId);
      if (!tabToKeep) return prev;
      
      return [{ ...tabToKeep, isActive: true }];
    });
    setActiveTabId(tabId);
  }, []);

  // Switch to a tab
  const switchToTab = useCallback((tabId: string) => {
    setTabs(prev => 
      prev.map(tab => ({
        ...tab,
        isActive: tab.id === tabId,
        lastAccessed: tab.id === tabId ? new Date() : tab.lastAccessed,
      }))
    );
    setActiveTabId(tabId);
  }, []);

  // Update tab title
  const updateTabTitle = useCallback((tabId: string, title: string) => {
    setTabs(prev => 
      prev.map(tab => 
        tab.id === tabId ? { ...tab, title } : tab
      )
    );
  }, []);

  // Set unsaved changes status
  const setTabUnsavedChanges = useCallback((tabId: string, hasChanges: boolean) => {
    setTabs(prev => 
      prev.map(tab => 
        tab.id === tabId ? { ...tab, hasUnsavedChanges: hasChanges } : tab
      )
    );
  }, []);

  // Get active tab
  const getActiveTab = useCallback((): Tab | null => {
    return tabs.find(tab => tab.isActive) || null;
  }, [tabs]);

  // Tab navigation
  const switchToNextTab = useCallback(() => {
    if (tabs.length <= 1) return;
    
    const currentIndex = tabs.findIndex(tab => tab.isActive);
    const nextIndex = (currentIndex + 1) % tabs.length;
    switchToTab(tabs[nextIndex].id);
  }, [tabs, switchToTab]);

  const switchToPreviousTab = useCallback(() => {
    if (tabs.length <= 1) return;
    
    const currentIndex = tabs.findIndex(tab => tab.isActive);
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    switchToTab(tabs[prevIndex].id);
  }, [tabs, switchToTab]);

  // Find tab by page ID
  const findTabByPageId = useCallback((pageId: string): Tab | null => {
    return tabs.find(tab => 
      tab.type === 'page' && tab.content.pageId === pageId
    ) || null;
  }, [tabs]);

  // Reorder tabs
  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
  }, []);

  // Save tabs to localStorage
  const saveTabs = useCallback(() => {
    try {
      const tabsToSave = tabs.map(tab => ({
        ...tab,
        lastAccessed: tab.lastAccessed.toISOString(),
      }));
      localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify({
        tabs: tabsToSave,
        activeTabId,
      }));
    } catch (error) {
      console.error('Failed to save tabs:', error);
    }
  }, [tabs, activeTabId]);

  // Load tabs from localStorage
  const loadTabs = useCallback(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved) {
        const { tabs: savedTabs, activeTabId: savedActiveTabId } = JSON.parse(saved);
        const restoredTabs = savedTabs.map((tab: any) => ({
          ...tab,
          lastAccessed: new Date(tab.lastAccessed),
        }));
        setTabs(restoredTabs);
        setActiveTabId(savedActiveTabId);
      }
    } catch (error) {
      console.error('Failed to load tabs:', error);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab / Ctrl+Shift+Tab for tab navigation
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          switchToPreviousTab();
        } else {
          switchToNextTab();
        }
      }
      
      // Ctrl+W to close tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      
      // Ctrl+Shift+T to restore last closed tab (future feature)
      if (e.ctrlKey && e.shiftKey && e.key === 't') {
        e.preventDefault();
        // TODO: Implement tab restoration
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, switchToNextTab, switchToPreviousTab, closeTab]);

  // Auto-save tabs periodically
  useEffect(() => {
    const interval = setInterval(saveTabs, 30000); // Save every 30 seconds
    return () => clearInterval(interval);
  }, [saveTabs]);

  // Load tabs on mount
  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  const value: TabContextType = {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    switchToTab,
    updateTabTitle,
    setTabUnsavedChanges,
    getActiveTab,
    saveTabs,
    loadTabs,
    switchToNextTab,
    switchToPreviousTab,
    findTabByPageId,
    reorderTabs,
  };

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
};

export const useTabs = (): TabContextType => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
};

export type { Tab, TabContextType };