import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  FolderOpen,
  FileText,
  Plus,
  MoreHorizontal,
  Search,
  Settings,
  Home,
  Trash2,
  Edit3,
  Copy,
  FilePlus,
  FolderPlus,
  BookOpenCheck,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { useNotebooks, Notebook, Section, Page } from '../contexts/NotebookContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTabs } from '../contexts/TabContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface NotebookSidebarProps {
  className?: string;
}

export const NotebookSidebar: React.FC<NotebookSidebarProps> = ({ className = '' }) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { openTab, findTabByPageId, switchToTab } = useTabs();
  const {
    notebooks,
    currentNotebook,
    currentSection,
    currentPage,
    loading,
    error,
    createNotebook,
    createSection,
    createPage,
    setCurrentNotebook,
    setCurrentSection,
    setCurrentPage,
    getNotebookHierarchy,
  } = useNotebooks();

  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [notebookHierarchies, setNotebookHierarchies] = useState<Record<string, any>>({});
  const [showNewNotebookForm, setShowNewNotebookForm] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'notebook' | 'section' | 'page';
    item: Notebook | Section | Page;
  } | null>(null);

  // Load notebook hierarchies when notebooks change
  useEffect(() => {
    const loadHierarchies = async () => {
      for (const notebook of notebooks) {
        try {
          const hierarchy = await getNotebookHierarchy(notebook.id);
          setNotebookHierarchies(prev => ({
            ...prev,
            [notebook.id]: hierarchy
          }));
        } catch (error) {
          console.error('Failed to load hierarchy for notebook:', notebook.id, error);
        }
      }
    };

    if (notebooks.length > 0) {
      loadHierarchies();
    }
  }, [notebooks, getNotebookHierarchy]);

  const toggleNotebook = (notebookId: string) => {
    setExpandedNotebooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notebookId)) {
        newSet.delete(notebookId);
      } else {
        newSet.add(notebookId);
      }
      return newSet;
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const togglePage = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const handleNewNotebook = async () => {
    if (!newNotebookTitle.trim()) return;

    try {
      const notebook = await createNotebook({
        title: newNotebookTitle.trim(),
        description: `Created on ${new Date().toLocaleDateString()}`,
        color: '#3B82F6',
      });
      setNewNotebookTitle('');
      setShowNewNotebookForm(false);
      setExpandedNotebooks(prev => new Set([...prev, notebook.id]));
    } catch (error) {
      console.error('Failed to create notebook:', error);
    }
  };

  const handleNewSection = async (notebookId: string) => {
    try {
      const section = await createSection({
        notebook_id: notebookId,
        title: 'New Section',
        color: '#10B981',
      });
      setExpandedSections(prev => new Set([...prev, section.id]));
    } catch (error) {
      console.error('Failed to create section:', error);
    }
  };

  const handleNewPage = async (notebookId: string, sectionId?: string, parentPageId?: string) => {
    try {
      const page = await createPage({
        notebook_id: notebookId,
        section_id: sectionId,
        parent_page_id: parentPageId,
        title: 'New Page',
        content: '',
        tags: [],
      });
      if (parentPageId) {
        setExpandedPages(prev => new Set([...prev, parentPageId]));
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'notebook' | 'section' | 'page', item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      item,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const renderPage = (pageData: any, level: number = 0) => {
    const page = pageData.page;
    const isExpanded = expandedPages.has(page.id);
    const hasSubpages = pageData.subpages && pageData.subpages.length > 0;
    const isActive = currentPage?.id === page.id;

    return (
      <div key={page.id}>
        <div
          className={`
            flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent cursor-pointer
            ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
          `}
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => {
            setCurrentPage(page);
            // Open page in tab
            const existingTab = findTabByPageId(page.id);
            if (existingTab) {
              switchToTab(existingTab.id);
            } else {
              openTab({
                title: page.title,
                type: 'page',
                content: {
                  pageId: page.id,
                  page: page,
                },
                hasUnsavedChanges: false,
              });
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, 'page', page)}
        >
          {hasSubpages ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePage(page.id);
              }}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <FileText className="w-3 h-3" />
            </div>
          )}
          <span className="truncate text-sm">{page.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNewPage(page.notebook_id, page.section_id, page.id);
            }}
            className="ml-auto p-0.5 hover:bg-accent rounded opacity-0 group-hover:opacity-100"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {isExpanded && hasSubpages && (
          <div className="ml-2">
            {pageData.subpages.map((subpage: any) => renderPage(subpage, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (sectionData: any) => {
    const section = sectionData.section;
    const isExpanded = expandedSections.has(section.id);
    const hasPages = sectionData.pages && sectionData.pages.length > 0;
    const isActive = currentSection?.id === section.id;

    return (
      <div key={section.id} className="group">
        <div
          className={`
            flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent cursor-pointer
            ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
          `}
          onClick={() => setCurrentSection(section)}
          onContextMenu={(e) => handleContextMenu(e, 'section', section)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSection(section.id);
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <FolderOpen className="w-4 h-4" style={{ color: section.color }} />
          <span className="truncate">{section.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNewPage(section.notebook_id, section.id);
            }}
            className="ml-auto p-0.5 hover:bg-accent rounded opacity-0 group-hover:opacity-100"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {isExpanded && hasPages && (
          <div className="ml-4 mt-1 space-y-1">
            {sectionData.pages.map((pageData: any) => renderPage(pageData))}
          </div>
        )}
      </div>
    );
  };

  const renderNotebook = (notebook: Notebook) => {
    const isExpanded = expandedNotebooks.has(notebook.id);
    const hierarchy = notebookHierarchies[notebook.id];
    const hasSections = hierarchy?.sections && hierarchy.sections.length > 0;
    const isActive = currentNotebook?.id === notebook.id;

    return (
      <div key={notebook.id} className="group">
        <div
          className={`
            flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent cursor-pointer
            ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground'}
          `}
          onClick={() => setCurrentNotebook(notebook)}
          onContextMenu={(e) => handleContextMenu(e, 'notebook', notebook)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNotebook(notebook.id);
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <BookOpen className="w-4 h-4" style={{ color: notebook.color }} />
          <span className="truncate font-medium">{notebook.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNewSection(notebook.id);
            }}
            className="ml-auto p-0.5 hover:bg-accent rounded opacity-0 group-hover:opacity-100"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {isExpanded && hasSections && (
          <div className="ml-4 mt-1 space-y-1">
            {hierarchy.sections.map((sectionData: any) => renderSection(sectionData))}
          </div>
        )}
      </div>
    );
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const ThemeIcon = themeIcons[theme];

  return (
    <div className={`w-64 bg-card border-r border-border flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">DeviseOS</h1>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowNewNotebookForm(true)}
            size="sm"
            className="flex-1 justify-start gap-2"
          >
            <BookOpenCheck className="w-4 h-4" />
            New Notebook
          </Button>
        </div>
      </div>

      {/* New Notebook Form */}
      {showNewNotebookForm && (
        <div className="p-4 border-b border-border bg-accent/30">
          <div className="space-y-2">
            <Input
              value={newNotebookTitle}
              onChange={(e) => setNewNotebookTitle(e.target.value)}
              placeholder="Notebook name..."
              className="text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNewNotebook();
                } else if (e.key === 'Escape') {
                  setShowNewNotebookForm(false);
                  setNewNotebookTitle('');
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleNewNotebook}
                size="sm"
                className="flex-1"
                disabled={!newNotebookTitle.trim()}
              >
                Create
              </Button>
              <Button
                onClick={() => {
                  setShowNewNotebookForm(false);
                  setNewNotebookTitle('');
                }}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 border-b border-border">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <button
                  onClick={() => {
                    // Open route in tab
                    const tabType = item.path === '/' ? 'dashboard' : 
                                   item.path === '/search' ? 'search' : 
                                   item.path === '/settings' ? 'settings' : 'dashboard';
                    
                    openTab({
                      title: item.label,
                      type: tabType as any,
                      content: {
                        route: item.path,
                      },
                      hasUnsavedChanges: false,
                    });
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Notebooks */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">Notebooks</h2>
          <Button
            onClick={() => setShowNewNotebookForm(true)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading notebooks...
            </div>
          ) : notebooks.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No notebooks yet. Create your first notebook!
            </div>
          ) : (
            notebooks.map(renderNotebook)
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-card border border-border rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={closeContextMenu}
        >
          <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Rename
          </button>
          <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <div className="border-t border-border my-1" />
          <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent text-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={cycleTheme}
          className="w-full justify-start gap-2"
        >
          <ThemeIcon className="w-4 h-4" />
          {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme
        </Button>
      </div>

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