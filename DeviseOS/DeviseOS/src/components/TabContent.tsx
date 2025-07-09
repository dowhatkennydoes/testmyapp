import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useTabs } from '../contexts/TabContext';
import { useNotebooks } from '../contexts/NotebookContext';
import { Dashboard } from '../pages/Dashboard';
import { Search } from '../pages/Search';
import { Settings } from '../pages/Settings';
import { PageEditor } from './PageEditor';
import { FileText, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface TabContentProps {
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ className = '' }) => {
  const { tabs, activeTabId, getActiveTab, updateTabTitle, setTabUnsavedChanges } = useTabs();
  const { getPage } = useNotebooks();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [pageContent, setPageContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});

  const activeTab = getActiveTab();

  // Load page content when tab becomes active
  useEffect(() => {
    if (activeTab?.type === 'page' && activeTab.content.pageId) {
      const pageId = activeTab.content.pageId;
      
      if (!pageContent[pageId] && !loading[pageId]) {
        setLoading(prev => ({ ...prev, [pageId]: true }));
        
        getPage(pageId)
          .then(page => {
            if (page) {
              setPageContent(prev => ({ ...prev, [pageId]: page }));
              updateTabTitle(activeTab.id, page.title);
            } else {
              setError(prev => ({ ...prev, [pageId]: 'Page not found' }));
            }
          })
          .catch(err => {
            setError(prev => ({ ...prev, [pageId]: err.message || 'Failed to load page' }));
          })
          .finally(() => {
            setLoading(prev => ({ ...prev, [pageId]: false }));
          });
      }
    }
  }, [activeTab, getPage, pageContent, loading, updateTabTitle]);

  // Handle content changes (for tracking unsaved changes)
  const handleContentChange = (pageId: string, hasChanges: boolean) => {
    const tab = tabs.find(t => t.content.pageId === pageId);
    if (tab) {
      setTabUnsavedChanges(tab.id, hasChanges);
    }
  };

  // Render page content
  const renderPageContent = (pageId: string, tabId: string) => {
    if (loading[pageId]) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading page...
          </div>
        </div>
      );
    }

    if (error[pageId]) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{error[pageId]}</p>
            <Button
              onClick={() => {
                setError(prev => ({ ...prev, [pageId]: '' }));
                // Retry loading
                setLoading(prev => ({ ...prev, [pageId]: true }));
                getPage(pageId)
                  .then(page => {
                    if (page) {
                      setPageContent(prev => ({ ...prev, [pageId]: page }));
                      updateTabTitle(tabId, page.title);
                    } else {
                      setError(prev => ({ ...prev, [pageId]: 'Page not found' }));
                    }
                  })
                  .catch(err => {
                    setError(prev => ({ ...prev, [pageId]: err.message || 'Failed to load page' }));
                  })
                  .finally(() => {
                    setLoading(prev => ({ ...prev, [pageId]: false }));
                  });
              }}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    const page = pageContent[pageId];
    if (!page) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No content available</p>
          </div>
        </div>
      );
    }

    return (
      <PageEditor 
        key={pageId}
        pageId={pageId} 
        initialPage={page}
        onContentChange={(hasChanges) => handleContentChange(pageId, hasChanges)}
      />
    );
  };

  // Render empty state when no tabs
  if (tabs.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tabs open</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a new notebook, open a page, or navigate to get started
          </p>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Render active tab content
  if (!activeTab) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No active tab</h3>
          <p className="text-sm text-muted-foreground">
            Select a tab to view its content
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-hidden ${className}`}>
      {activeTab.type === 'page' && activeTab.content.pageId && (
        <div className="h-full">
          {renderPageContent(activeTab.content.pageId, activeTab.id)}
        </div>
      )}
      
      {activeTab.type === 'dashboard' && (
        <Dashboard />
      )}
      
      {activeTab.type === 'search' && (
        <Search />
      )}
      
      {activeTab.type === 'settings' && (
        <Settings />
      )}
    </div>
  );
};