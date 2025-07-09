import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  MoreHorizontal, 
  FileText, 
  Home, 
  Search, 
  Settings,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { useTabs, Tab } from '../contexts/TabContext';
import { useNotebooks } from '../contexts/NotebookContext';
import { Button } from './ui/Button';

interface TabBarProps {
  onNewTab?: () => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({ onNewTab, className = '' }) => {
  const { 
    tabs, 
    activeTabId, 
    closeTab, 
    closeAllTabs, 
    closeOtherTabs, 
    switchToTab,
    reorderTabs 
  } = useTabs();
  
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tab: Tab;
  } | null>(null);
  
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Get icon for tab type
  const getTabIcon = (tab: Tab) => {
    switch (tab.type) {
      case 'page':
        return <FileText className="w-4 h-4" />;
      case 'dashboard':
        return <Home className="w-4 h-4" />;
      case 'search':
        return <Search className="w-4 h-4" />;
      case 'settings':
        return <Settings className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Get truncated title
  const getTruncatedTitle = (title: string, maxLength: number = 20) => {
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  };

  // Handle tab context menu
  const handleContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tab,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Handle tab drag and drop
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedTab) return;

    const dragIndex = tabs.findIndex(tab => tab.id === draggedTab);
    if (dragIndex !== -1 && dragIndex !== dropIndex) {
      reorderTabs(dragIndex, dropIndex);
    }

    setDraggedTab(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverIndex(null);
  };

  // Handle tab scrolling
  const scrollTabs = (direction: 'left' | 'right') => {
    if (!tabBarRef.current) return;
    
    const scrollAmount = 200;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;
    
    tabBarRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  // Check if tabs are overflowing
  const isOverflowing = tabs.length > 8; // Approximate threshold

  return (
    <div className={`bg-card border-b border-border ${className}`}>
      <div className="flex items-center h-10">
        {/* Scroll left button */}
        {isOverflowing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollTabs('left')}
            className="flex-shrink-0 h-8 w-8 p-0 mx-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Tab container */}
        <div 
          ref={tabBarRef}
          className="flex-1 flex items-center overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`
                flex items-center gap-2 px-3 py-1.5 border-r border-border cursor-pointer
                min-w-0 max-w-48 flex-shrink-0 group relative
                ${tab.isActive 
                  ? 'bg-background text-foreground border-b-2 border-b-primary' 
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
                ${dragOverIndex === index ? 'bg-accent' : ''}
              `}
              onClick={() => switchToTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Tab icon */}
              {getTabIcon(tab)}
              
              {/* Tab title */}
              <span className="truncate text-sm font-medium flex-1">
                {getTruncatedTitle(tab.title)}
                {tab.hasUnsavedChanges && (
                  <span className="ml-1 text-orange-500">•</span>
                )}
              </span>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-0.5 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Scroll right button */}
        {isOverflowing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollTabs('right')}
            className="flex-shrink-0 h-8 w-8 p-0 mx-1"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* New tab button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewTab}
          className="flex-shrink-0 h-8 w-8 p-0 mx-1"
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* Tab overflow menu */}
        {tabs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Show tab overflow menu
            }}
            className="flex-shrink-0 h-8 w-8 p-0 mx-1"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-card border border-border rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              closeTab(contextMenu.tab.id);
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Close Tab
          </button>
          <button
            onClick={() => {
              closeOtherTabs(contextMenu.tab.id);
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
          >
            Close Other Tabs
          </button>
          <button
            onClick={() => {
              closeAllTabs();
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
          >
            Close All Tabs
          </button>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => {
              // TODO: Implement duplicate tab
              closeContextMenu();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
          >
            Duplicate Tab
          </button>
        </div>
      )}

      {/* Background overlay for context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </div>
  );
};