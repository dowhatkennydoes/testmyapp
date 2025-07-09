import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Types matching the Rust backend
interface Notebook {
  id: string;
  title: string;
  description?: string;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  sections: Section[];
}

interface Section {
  id: string;
  notebook_id: string;
  title: string;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  pages: Page[];
}

interface Page {
  id: string;
  notebook_id: string;
  section_id?: string;
  parent_page_id?: string;
  title: string;
  content: string;
  tags: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
  subpages: Page[];
}

interface NotebookHierarchy {
  notebook: Notebook;
  sections: SectionWithPages[];
}

interface SectionWithPages {
  section: Section;
  pages: PageWithSubpages[];
}

interface PageWithSubpages {
  page: Page;
  subpages: PageWithSubpages[];
}

interface CreateNotebookRequest {
  title: string;
  description?: string;
  color?: string;
}

interface CreateSectionRequest {
  notebook_id: string;
  title: string;
  color?: string;
}

interface CreatePageRequest {
  notebook_id: string;
  section_id?: string;
  parent_page_id?: string;
  title: string;
  content: string;
  tags: string[];
}

interface NotebookContextType {
  notebooks: Notebook[];
  currentNotebook: Notebook | null;
  currentSection: Section | null;
  currentPage: Page | null;
  loading: boolean;
  error: string | null;
  
  // Notebook operations
  createNotebook: (request: CreateNotebookRequest) => Promise<Notebook>;
  getNotebooks: () => Promise<void>;
  getNotebook: (id: string) => Promise<Notebook | null>;
  updateNotebook: (id: string, updates: Partial<CreateNotebookRequest>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  
  // Section operations
  createSection: (request: CreateSectionRequest) => Promise<Section>;
  getSections: (notebookId: string) => Promise<Section[]>;
  updateSection: (id: string, updates: Partial<CreateSectionRequest>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  
  // Page operations
  createPage: (request: CreatePageRequest) => Promise<Page>;
  getPages: (notebookId: string, sectionId?: string) => Promise<Page[]>;
  getPage: (id: string) => Promise<Page | null>;
  updatePage: (id: string, updates: Partial<CreatePageRequest>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  
  // Navigation
  setCurrentNotebook: (notebook: Notebook | null) => void;
  setCurrentSection: (section: Section | null) => void;
  setCurrentPage: (page: Page | null) => void;
  
  // Hierarchy
  getNotebookHierarchy: (id: string) => Promise<NotebookHierarchy>;
}

const NotebookContext = createContext<NotebookContextType | undefined>(undefined);

export const NotebookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notebook operations
  const createNotebook = async (request: CreateNotebookRequest): Promise<Notebook> => {
    try {
      setLoading(true);
      setError(null);
      const notebook = await invoke<Notebook>('create_notebook', { request });
      setNotebooks(prev => [...prev, notebook]);
      return notebook;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getNotebooks = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const notebooks = await invoke<Notebook[]>('get_notebooks');
      setNotebooks(notebooks);
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getNotebook = async (id: string): Promise<Notebook | null> => {
    try {
      setLoading(true);
      setError(null);
      const notebook = await invoke<Notebook | null>('get_notebook', { id });
      return notebook;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateNotebook = async (id: string, updates: Partial<CreateNotebookRequest>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('update_notebook', { request: { id, ...updates } });
      setNotebooks(prev => prev.map(nb => nb.id === id ? { ...nb, ...updates } : nb));
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteNotebook = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('delete_notebook', { id });
      setNotebooks(prev => prev.filter(nb => nb.id !== id));
      if (currentNotebook?.id === id) {
        setCurrentNotebook(null);
      }
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Section operations
  const createSection = async (request: CreateSectionRequest): Promise<Section> => {
    try {
      setLoading(true);
      setError(null);
      const section = await invoke<Section>('create_section', { request });
      return section;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSections = async (notebookId: string): Promise<Section[]> => {
    try {
      setLoading(true);
      setError(null);
      const sections = await invoke<Section[]>('get_sections', { notebookId });
      return sections;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async (id: string, updates: Partial<CreateSectionRequest>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('update_section', { request: { id, ...updates } });
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('delete_section', { id });
      if (currentSection?.id === id) {
        setCurrentSection(null);
      }
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Page operations
  const createPage = async (request: CreatePageRequest): Promise<Page> => {
    try {
      setLoading(true);
      setError(null);
      const page = await invoke<Page>('create_page', { request });
      return page;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getPages = async (notebookId: string, sectionId?: string): Promise<Page[]> => {
    try {
      setLoading(true);
      setError(null);
      const pages = await invoke<Page[]>('get_pages', { notebookId, sectionId });
      return pages;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getPage = async (id: string): Promise<Page | null> => {
    try {
      setLoading(true);
      setError(null);
      const page = await invoke<Page | null>('get_page', { id });
      return page;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePage = async (id: string, updates: Partial<CreatePageRequest>): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('update_page', { request: { id, ...updates } });
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePage = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('delete_page', { id });
      if (currentPage?.id === id) {
        setCurrentPage(null);
      }
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getNotebookHierarchy = async (id: string): Promise<NotebookHierarchy> => {
    try {
      setLoading(true);
      setError(null);
      const hierarchy = await invoke<NotebookHierarchy>('get_notebook_hierarchy', { id });
      return hierarchy;
    } catch (err) {
      setError(err as string);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load notebooks on mount
  useEffect(() => {
    getNotebooks().catch(console.error);
  }, []);

  const value: NotebookContextType = {
    notebooks,
    currentNotebook,
    currentSection,
    currentPage,
    loading,
    error,
    createNotebook,
    getNotebooks,
    getNotebook,
    updateNotebook,
    deleteNotebook,
    createSection,
    getSections,
    updateSection,
    deleteSection,
    createPage,
    getPages,
    getPage,
    updatePage,
    deletePage,
    setCurrentNotebook,
    setCurrentSection,
    setCurrentPage,
    getNotebookHierarchy,
  };

  return (
    <NotebookContext.Provider value={value}>
      {children}
    </NotebookContext.Provider>
  );
};

export const useNotebooks = (): NotebookContextType => {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error('useNotebooks must be used within a NotebookProvider');
  }
  return context;
};

export type { Notebook, Section, Page, NotebookHierarchy, SectionWithPages, PageWithSubpages };