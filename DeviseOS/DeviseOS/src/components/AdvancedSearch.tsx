import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Tag, 
  BookOpen, 
  FileText, 
  Clock, 
  SortAsc, 
  SortDesc,
  X,
  ChevronDown,
  Sparkles,
  Target,
  History,
  Bookmark
} from 'lucide-react';
import { useNotebooks, Notebook, Section, Page } from '../contexts/NotebookContext';
import { useTabs } from '../contexts/TabContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';

interface AdvancedSearchProps {
  className?: string;
}

interface SearchFilters {
  notebooks: string[];
  sections: string[];
  tags: string[];
  dateRange: {
    start: string;
    end: string;
  };
  contentType: 'all' | 'text' | 'media' | 'links';
  sortBy: 'relevance' | 'date' | 'title' | 'modified';
  sortOrder: 'asc' | 'desc';
}

interface SearchResult {
  page: Page;
  notebook: Notebook;
  section?: Section;
  relevanceScore: number;
  matchedTerms: string[];
  snippet: string;
  highlightedSnippet: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  created: Date;
  lastUsed: Date;
  usageCount: number;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ className = '' }) => {
  const { notebooks, getPages, getSections } = useNotebooks();
  const { openTab } = useTabs();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    notebooks: [],
    sections: [],
    tags: [],
    dateRange: { start: '', end: '' },
    contentType: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAvailableTags();
    loadSearchHistory();
    loadSavedSearches();
  }, []);

  // Perform search when query or filters change
  useEffect(() => {
    if (query.trim()) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [query, filters]);

  const loadAvailableTags = async () => {
    try {
      const allTags = new Set<string>();
      for (const notebook of notebooks) {
        const pages = await getPages(notebook.id);
        pages.forEach(page => {
          page.tags.forEach(tag => allTags.add(tag));
        });
      }
      setAvailableTags(Array.from(allTags));
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadSearchHistory = () => {
    const saved = localStorage.getItem('search-history');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  };

  const loadSavedSearches = () => {
    const saved = localStorage.getItem('saved-searches');
    if (saved) {
      setSavedSearches(JSON.parse(saved).map((s: any) => ({
        ...s,
        created: new Date(s.created),
        lastUsed: new Date(s.lastUsed)
      })));
    }
  };

  const saveSearchHistory = (searchQuery: string) => {
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    saveSearchHistory(query);

    try {
      let allResults: SearchResult[] = [];

      // Search in each notebook
      for (const notebook of notebooks) {
        if (filters.notebooks.length > 0 && !filters.notebooks.includes(notebook.id)) {
          continue;
        }

        // Use semantic search if available
        try {
          const semanticResults = await invoke<any[]>('semantic_search', {
            query,
            limit: 20
          });

          const processedResults = semanticResults.map(result => ({
            page: result.note, // Note: backend returns 'note' but we treat as page
            notebook,
            relevanceScore: result.relevance_score,
            matchedTerms: result.matched_terms,
            snippet: result.snippet,
            highlightedSnippet: highlightText(result.snippet, query)
          }));

          allResults.push(...processedResults);
        } catch {
          // Fallback to regular search
          const pages = await getPages(notebook.id);
          const filteredPages = pages.filter(page => {
            // Apply filters
            if (filters.sections.length > 0 && page.section_id && !filters.sections.includes(page.section_id)) {
              return false;
            }
            if (filters.tags.length > 0 && !filters.tags.some(tag => page.tags.includes(tag))) {
              return false;
            }
            if (filters.dateRange.start && new Date(page.created_at) < new Date(filters.dateRange.start)) {
              return false;
            }
            if (filters.dateRange.end && new Date(page.created_at) > new Date(filters.dateRange.end)) {
              return false;
            }

            // Text search
            const searchTerms = query.toLowerCase().split(/\s+/);
            const content = (page.title + ' ' + page.content + ' ' + page.tags.join(' ')).toLowerCase();
            return searchTerms.every(term => content.includes(term));
          });

          const searchResults = filteredPages.map(page => {
            const content = page.title + ' ' + page.content;
            const snippet = extractSnippet(content, query);
            return {
              page,
              notebook,
              relevanceScore: calculateRelevance(page, query),
              matchedTerms: extractMatchedTerms(content, query),
              snippet,
              highlightedSnippet: highlightText(snippet, query)
            };
          });

          allResults.push(...searchResults);
        }
      }

      // Sort results
      allResults.sort((a, b) => {
        switch (filters.sortBy) {
          case 'relevance':
            return filters.sortOrder === 'desc' ? b.relevanceScore - a.relevanceScore : a.relevanceScore - b.relevanceScore;
          case 'date':
            return filters.sortOrder === 'desc' 
              ? new Date(b.page.created_at).getTime() - new Date(a.page.created_at).getTime()
              : new Date(a.page.created_at).getTime() - new Date(b.page.created_at).getTime();
          case 'title':
            return filters.sortOrder === 'desc' 
              ? b.page.title.localeCompare(a.page.title)
              : a.page.title.localeCompare(b.page.title);
          case 'modified':
            return filters.sortOrder === 'desc'
              ? new Date(b.page.updated_at).getTime() - new Date(a.page.updated_at).getTime()
              : new Date(a.page.updated_at).getTime() - new Date(b.page.updated_at).getTime();
          default:
            return 0;
        }
      });

      setResults(allResults);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const extractSnippet = (content: string, query: string): string => {
    const terms = query.toLowerCase().split(/\s+/);
    const lowerContent = content.toLowerCase();
    
    for (const term of terms) {
      const index = lowerContent.indexOf(term);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + term.length + 50);
        return content.substring(start, end);
      }
    }
    
    return content.substring(0, 100);
  };

  const highlightText = (text: string, query: string): string => {
    const terms = query.split(/\s+/);
    let highlighted = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  };

  const calculateRelevance = (page: Page, query: string): number => {
    const terms = query.toLowerCase().split(/\s+/);
    const title = page.title.toLowerCase();
    const content = page.content.toLowerCase();
    const tags = page.tags.join(' ').toLowerCase();
    
    let score = 0;
    terms.forEach(term => {
      if (title.includes(term)) score += 3;
      if (content.includes(term)) score += 1;
      if (tags.includes(term)) score += 2;
    });
    
    return score;
  };

  const extractMatchedTerms = (content: string, query: string): string[] => {
    const terms = query.toLowerCase().split(/\s+/);
    const lowerContent = content.toLowerCase();
    return terms.filter(term => lowerContent.includes(term));
  };

  const openPage = (page: Page) => {
    openTab({
      title: page.title,
      type: 'page',
      content: {
        pageId: page.id,
        page: page
      },
      hasUnsavedChanges: false
    });
  };

  const saveSearch = () => {
    const name = prompt('Enter a name for this search:');
    if (!name) return;

    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      query,
      filters: { ...filters },
      created: new Date(),
      lastUsed: new Date(),
      usageCount: 1
    };

    const newSavedSearches = [...savedSearches, savedSearch];
    setSavedSearches(newSavedSearches);
    localStorage.setItem('saved-searches', JSON.stringify(newSavedSearches));
    toast.success('Search saved');
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    
    // Update usage
    const updated = savedSearches.map(s => 
      s.id === savedSearch.id 
        ? { ...s, lastUsed: new Date(), usageCount: s.usageCount + 1 }
        : s
    );
    setSavedSearches(updated);
    localStorage.setItem('saved-searches', JSON.stringify(updated));
    setShowSavedSearches(false);
  };

  const addFilter = (type: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [type]: Array.isArray(prev[type]) 
        ? [...(prev[type] as any[]), value]
        : value
    }));
  };

  const removeFilter = (type: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [type]: Array.isArray(prev[type])
        ? (prev[type] as any[]).filter(v => v !== value)
        : type === 'dateRange' ? { start: '', end: '' } : prev[type]
    }));
  };

  const clearFilters = () => {
    setFilters({
      notebooks: [],
      sections: [],
      tags: [],
      dateRange: { start: '', end: '' },
      contentType: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all notebooks..."
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              onClick={() => setQuery('')}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filters.notebooks.length + filters.sections.length + filters.tags.length) > 0 && (
            <Badge variant="secondary" className="ml-1">
              {filters.notebooks.length + filters.sections.length + filters.tags.length}
            </Badge>
          )}
        </Button>
        
        <Button
          onClick={() => setShowSearchHistory(!showSearchHistory)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <History className="w-4 h-4" />
        </Button>
        
        <Button
          onClick={() => setShowSavedSearches(!showSavedSearches)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Bookmark className="w-4 h-4" />
        </Button>
      </div>

      {/* Search History */}
      {showSearchHistory && searchHistory.length > 0 && (
        <div className="p-3 border border-border rounded-md">
          <h4 className="text-sm font-medium mb-2">Recent Searches</h4>
          <div className="space-y-1">
            {searchHistory.map((historyQuery, index) => (
              <button
                key={index}
                onClick={() => setQuery(historyQuery)}
                className="block w-full text-left text-sm p-2 hover:bg-accent rounded"
              >
                {historyQuery}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved Searches */}
      {showSavedSearches && savedSearches.length > 0 && (
        <div className="p-3 border border-border rounded-md">
          <h4 className="text-sm font-medium mb-2">Saved Searches</h4>
          <div className="space-y-1">
            {savedSearches.map((savedSearch) => (
              <div key={savedSearch.id} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                <div>
                  <div className="font-medium text-sm">{savedSearch.name}</div>
                  <div className="text-xs text-muted-foreground">{savedSearch.query}</div>
                </div>
                <Button
                  onClick={() => loadSavedSearch(savedSearch)}
                  size="sm"
                  variant="ghost"
                >
                  Load
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border border-border rounded-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Search Filters</h3>
            <Button onClick={clearFilters} variant="ghost" size="sm">
              Clear All
            </Button>
          </div>

          {/* Notebook Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Notebooks</label>
            <div className="flex flex-wrap gap-2">
              {notebooks.map(notebook => (
                <Button
                  key={notebook.id}
                  onClick={() => 
                    filters.notebooks.includes(notebook.id)
                      ? removeFilter('notebooks', notebook.id)
                      : addFilter('notebooks', notebook.id)
                  }
                  variant={filters.notebooks.includes(notebook.id) ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  {notebook.title}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Button
                  key={tag}
                  onClick={() => 
                    filters.tags.includes(tag)
                      ? removeFilter('tags', tag)
                      : addFilter('tags', tag)
                  }
                  variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                className="flex-1"
              />
              <Input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                className="flex-1"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <div className="flex gap-2">
                {[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'date', label: 'Date' },
                  { value: 'title', label: 'Title' },
                  { value: 'modified', label: 'Modified' }
                ].map(option => (
                  <Button
                    key={option.value}
                    onClick={() => setFilters(prev => ({ ...prev, sortBy: option.value as any }))}
                    variant={filters.sortBy === option.value ? 'default' : 'outline'}
                    size="sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Order</label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                  variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1"
                >
                  <SortDesc className="w-3 h-3" />
                  Desc
                </Button>
                <Button
                  onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                  variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1"
                >
                  <SortAsc className="w-3 h-3" />
                  Asc
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Search */}
      {query && (
        <div className="flex items-center gap-2">
          <Button onClick={saveSearch} variant="outline" size="sm" className="gap-2">
            <Bookmark className="w-4 h-4" />
            Save Search
          </Button>
          <Button onClick={performSearch} disabled={isSearching} size="sm" className="gap-2">
            <Sparkles className="w-4 h-4" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {results.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Found {results.length} results
          </div>
        )}
        
        {results.map((result, index) => (
          <div key={index} className="p-4 border border-border rounded-md hover:bg-accent/50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 
                  className="font-medium cursor-pointer hover:underline"
                  onClick={() => openPage(result.page)}
                >
                  {result.page.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <BookOpen className="w-3 h-3" />
                  {result.notebook.title}
                  {result.section && (
                    <>
                      <span>•</span>
                      {result.section.title}
                    </>
                  )}
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  {new Date(result.page.updated_at).toLocaleDateString()}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {Math.round(result.relevanceScore * 100)}% match
              </Badge>
            </div>
            
            <div 
              className="text-sm text-muted-foreground mb-2"
              dangerouslySetInnerHTML={{ __html: result.highlightedSnippet }}
            />
            
            <div className="flex items-center gap-2">
              {result.page.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        
        {query && !isSearching && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2" />
            <p>No results found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
};