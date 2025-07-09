import React, { useState, useEffect, useRef } from 'react';
import { 
  Link as LinkIcon, 
  Search, 
  FileText, 
  Plus, 
  ArrowRight,
  ExternalLink,
  X,
  Hash,
  ArrowLeft
} from 'lucide-react';
import { useNotebooks, Page } from '../contexts/NotebookContext';
import { useTabs } from '../contexts/TabContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import toast from 'react-hot-toast';

interface PageLinkingProps {
  currentPageId: string;
  onLinkInserted?: (markdown: string) => void;
  className?: string;
}

interface PageLink {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  linkText: string;
  linkType: 'Manual' | 'Auto' | 'Reference' | 'Related';
  createdAt: string;
}

interface SearchResult {
  page: Page;
  relevanceScore: number;
  snippet: string;
}

export const PageLinking: React.FC<PageLinkingProps> = ({ 
  currentPageId, 
  onLinkInserted, 
  className = '' 
}) => {
  const { notebooks, getPages, createPageLink, getPageLinks } = useNotebooks();
  const { openTab } = useTabs();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [existingLinks, setExistingLinks] = useState<PageLink[]>([]);
  const [backlinks, setBacklinks] = useState<PageLink[]>([]);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [customLinkText, setCustomLinkText] = useState('');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load all pages and links
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load all pages from all notebooks
        const allPagesData: Page[] = [];
        for (const notebook of notebooks) {
          const pages = await getPages(notebook.id);
          allPagesData.push(...pages);
        }
        setAllPages(allPagesData.filter(page => page.id !== currentPageId));
        
        // Load existing links
        const links = await getPageLinks(currentPageId);
        setExistingLinks(links);
        
        // Load backlinks (pages that link to this page)
        const allLinks: PageLink[] = [];
        for (const page of allPagesData) {
          if (page.id !== currentPageId) {
            const pageLinks = await getPageLinks(page.id);
            allLinks.push(...pageLinks);
          }
        }
        setBacklinks(allLinks.filter(link => link.targetPageId === currentPageId));
        
      } catch (error) {
        console.error('Failed to load page data:', error);
        toast.error('Failed to load page links');
      } finally {
        setIsLoading(false);
      }
    };

    if (notebooks.length > 0) {
      loadData();
    }
  }, [notebooks, currentPageId, getPages, getPageLinks]);

  // Search pages
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allPages
      .filter(page => 
        page.title.toLowerCase().includes(query) ||
        page.content.toLowerCase().includes(query) ||
        page.tags.some(tag => tag.toLowerCase().includes(query))
      )
      .map(page => {
        // Calculate relevance score
        let score = 0;
        if (page.title.toLowerCase().includes(query)) score += 10;
        if (page.content.toLowerCase().includes(query)) score += 5;
        if (page.tags.some(tag => tag.toLowerCase().includes(query))) score += 3;
        
        // Create snippet
        const contentIndex = page.content.toLowerCase().indexOf(query);
        const snippet = contentIndex >= 0 
          ? page.content.substring(Math.max(0, contentIndex - 50), contentIndex + 50)
          : page.content.substring(0, 100);
        
        return {
          page,
          relevanceScore: score,
          snippet: snippet + (snippet.length < page.content.length ? '...' : ''),
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    setSearchResults(results);
  }, [searchQuery, allPages]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (showLinkDialog && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showLinkDialog]);

  // Create link
  const handleCreateLink = async (targetPage: Page, linkText?: string) => {
    try {
      const finalLinkText = linkText || targetPage.title;
      
      // Create link in database
      await createPageLink({
        sourcePageId: currentPageId,
        targetPageId: targetPage.id,
        linkText: finalLinkText,
        linkType: 'Manual',
      });

      // Insert markdown link
      const markdown = `[${finalLinkText}](page://${targetPage.id})`;
      onLinkInserted?.(markdown);
      
      // Update local state
      const newLink: PageLink = {
        id: Date.now().toString(),
        sourcePageId: currentPageId,
        targetPageId: targetPage.id,
        linkText: finalLinkText,
        linkType: 'Manual',
        createdAt: new Date().toISOString(),
      };
      setExistingLinks(prev => [...prev, newLink]);
      
      toast.success('Link created successfully');
      setShowLinkDialog(false);
      setSearchQuery('');
      setCustomLinkText('');
      setSelectedPage(null);
    } catch (error) {
      console.error('Failed to create link:', error);
      toast.error('Failed to create link');
    }
  };

  // Open page in tab
  const handleOpenPage = (page: Page) => {
    openTab({
      title: page.title,
      type: 'page',
      content: {
        pageId: page.id,
        page: page,
      },
      hasUnsavedChanges: false,
    });
  };

  // Get page by ID
  const getPageById = (pageId: string): Page | undefined => {
    return allPages.find(page => page.id === pageId);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Link Creation Button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowLinkDialog(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <LinkIcon className="w-4 h-4" />
          Link to Page
        </Button>
        
        <Button
          onClick={() => onLinkInserted?.('[@')}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Hash className="w-4 h-4" />
          @mention
        </Button>
      </div>

      {/* Existing Links */}
      {existingLinks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Outgoing Links ({existingLinks.length})
          </h4>
          <div className="space-y-1">
            {existingLinks.map((link) => {
              const targetPage = getPageById(link.targetPageId);
              if (!targetPage) return null;
              
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-2 border border-border rounded hover:bg-accent/50 group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.linkText}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        → {targetPage.title}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleOpenPage(targetPage)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Backlinks ({backlinks.length})
          </h4>
          <div className="space-y-1">
            {backlinks.map((link) => {
              const sourcePage = getPageById(link.sourcePageId);
              if (!sourcePage) return null;
              
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-2 border border-border rounded hover:bg-accent/50 group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sourcePage.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        links as "{link.linkText}"
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleOpenPage(sourcePage)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Link to Page</h3>
              <Button
                onClick={() => {
                  setShowLinkDialog(false);
                  setSearchQuery('');
                  setCustomLinkText('');
                  setSelectedPage(null);
                }}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages by title, content, or tags..."
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-1 mb-4 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.page.id}
                    className="flex items-center justify-between p-3 border border-border rounded hover:bg-accent/50 cursor-pointer"
                    onClick={() => {
                      setSelectedPage(result.page);
                      setCustomLinkText(result.page.title);
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.page.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.snippet}
                        </p>
                        {result.page.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {result.page.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-muted text-muted-foreground px-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateLink(result.page);
                      }}
                      size="sm"
                      className="ml-2"
                    >
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Page */}
            {selectedPage && (
              <div className="space-y-4">
                <div className="p-3 border border-border rounded bg-accent/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{selectedPage.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedPage.content.substring(0, 100)}...
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Link Text (optional)
                  </label>
                  <Input
                    value={customLinkText}
                    onChange={(e) => setCustomLinkText(e.target.value)}
                    placeholder="Enter custom link text..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCreateLink(selectedPage, customLinkText)}
                    className="flex-1"
                  >
                    Create Link
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedPage(null);
                      setCustomLinkText('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2" />
                <p>No pages found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};