import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabs } from '../contexts/TabContext';
import { useNotebooks } from '../contexts/NotebookContext';
import { TabBar } from './TabBar';
import { TabContent } from './TabContent';

interface TabManagerProps {
  className?: string;
}

export const TabManager: React.FC<TabManagerProps> = ({ className = '' }) => {
  const { openTab, findTabByPageId, getActiveTab, switchToTab } = useTabs();
  const { currentPage } = useNotebooks();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle route changes and sync with tabs
  useEffect(() => {
    const path = location.pathname;
    
    // Handle page routes
    if (path.startsWith('/page/')) {
      const pageId = path.split('/page/')[1];
      if (pageId && currentPage?.id === pageId) {
        // Check if tab already exists
        const existingTab = findTabByPageId(pageId);
        if (existingTab) {
          switchToTab(existingTab.id);
        } else {
          // Create new tab for this page
          openTab({
            title: currentPage.title,
            type: 'page',
            content: {
              pageId,
              page: currentPage,
            },
            hasUnsavedChanges: false,
          });
        }
      }
    }
    
    // Handle other routes
    else if (path === '/') {
      // Dashboard
      openTab({
        title: 'Dashboard',
        type: 'dashboard',
        content: {
          route: '/',
        },
        hasUnsavedChanges: false,
      });
    }
    
    else if (path === '/search') {
      // Search
      openTab({
        title: 'Search',
        type: 'search',
        content: {
          route: '/search',
        },
        hasUnsavedChanges: false,
      });
    }
    
    else if (path === '/settings') {
      // Settings
      openTab({
        title: 'Settings',
        type: 'settings',
        content: {
          route: '/settings',
        },
        hasUnsavedChanges: false,
      });
    }
  }, [location.pathname, currentPage, openTab, findTabByPageId, switchToTab]);

  // Handle creating new tabs
  const handleNewTab = () => {
    // For now, open dashboard in new tab
    openTab({
      title: 'Dashboard',
      type: 'dashboard',
      content: {
        route: '/',
      },
      hasUnsavedChanges: false,
    });
  };

  // Handle opening specific pages in tabs
  const openPageInTab = (pageId: string, pageTitle: string) => {
    const existingTab = findTabByPageId(pageId);
    if (existingTab) {
      switchToTab(existingTab.id);
    } else {
      openTab({
        title: pageTitle,
        type: 'page',
        content: {
          pageId,
        },
        hasUnsavedChanges: false,
      });
    }
    
    // Update URL
    navigate(`/page/${pageId}`);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab Bar */}
      <TabBar onNewTab={handleNewTab} />
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <TabContent />
      </div>
    </div>
  );
};