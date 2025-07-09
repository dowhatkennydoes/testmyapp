import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  voice_annotations: VoiceAnnotation[];
  metadata: NoteMetadata;
}

export interface VoiceAnnotation {
  id: string;
  note_id: string;
  audio_data: number[];
  transcription: string;
  timestamp: string;
  duration: number;
  metadata: VoiceMetadata;
}

export interface VoiceMetadata {
  sample_rate: number;
  channels: number;
  format: string;
  quality: number;
}

export interface NoteMetadata {
  word_count: number;
  character_count: number;
  reading_time: number;
  version: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  usage_count: number;
  created_at: string;
  last_used?: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  tags: string[];
}

export interface UpdateNoteRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
}

interface NotesContextType {
  notes: Note[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  
  // Note operations
  createNote: (request: CreateNoteRequest) => Promise<Note>;
  getNote: (id: string) => Promise<Note | null>;
  updateNote: (request: UpdateNoteRequest) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  searchNotes: (request: SearchRequest) => Promise<Note[]>;
  
  // AI operations
  suggestTags: (content: string) => Promise<string[]>;
  transcribeAudio: (audioData: number[]) => Promise<string>;
  semanticSearch: (query: string, limit?: number) => Promise<any[]>;
  
  // Data refresh
  refreshNotes: () => Promise<void>;
  refreshTags: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (error: any, message: string) => {
    console.error(message, error);
    setError(error.toString());
    toast.error(message);
  };

  const refreshNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const notesData = await invoke<Note[]>('get_notes', { limit: 100, offset: 0 });
      setNotes(notesData);
    } catch (error) {
      handleError(error, 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const refreshTags = async () => {
    try {
      const tagsData = await invoke<Tag[]>('get_tags');
      setTags(tagsData);
    } catch (error) {
      handleError(error, 'Failed to load tags');
    }
  };

  const createNote = async (request: CreateNoteRequest): Promise<Note> => {
    try {
      setLoading(true);
      setError(null);
      const note = await invoke<Note>('create_note', { request });
      setNotes(prev => [note, ...prev]);
      toast.success('Note created successfully');
      refreshTags(); // Refresh tags to update usage counts
      return note;
    } catch (error) {
      handleError(error, 'Failed to create note');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getNote = async (id: string): Promise<Note | null> => {
    try {
      setError(null);
      const note = await invoke<Note | null>('get_note', { id });
      return note;
    } catch (error) {
      handleError(error, 'Failed to get note');
      return null;
    }
  };

  const updateNote = async (request: UpdateNoteRequest): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('update_note', { request });
      
      // Update the note in the local state
      setNotes(prev => prev.map(note => 
        note.id === request.id 
          ? { 
              ...note, 
              title: request.title ?? note.title,
              content: request.content ?? note.content,
              tags: request.tags ?? note.tags,
              updated_at: new Date().toISOString()
            }
          : note
      ));
      
      toast.success('Note updated successfully');
      refreshTags(); // Refresh tags to update usage counts
    } catch (error) {
      handleError(error, 'Failed to update note');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await invoke('delete_note', { id });
      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success('Note deleted successfully');
    } catch (error) {
      handleError(error, 'Failed to delete note');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const searchNotes = async (request: SearchRequest): Promise<Note[]> => {
    try {
      setLoading(true);
      setError(null);
      const results = await invoke<Note[]>('search_notes', { request });
      return results;
    } catch (error) {
      handleError(error, 'Failed to search notes');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const suggestTags = async (content: string): Promise<string[]> => {
    try {
      const suggestions = await invoke<string[]>('suggest_tags', { content });
      return suggestions;
    } catch (error) {
      console.error('Failed to get tag suggestions:', error);
      return [];
    }
  };

  const transcribeAudio = async (audioData: number[]): Promise<string> => {
    try {
      const transcription = await invoke<string>('transcribe_audio', { audioData });
      return transcription;
    } catch (error) {
      handleError(error, 'Failed to transcribe audio');
      return '';
    }
  };

  const semanticSearch = async (query: string, limit?: number): Promise<any[]> => {
    try {
      const results = await invoke<any[]>('semantic_search', { query, limit });
      return results;
    } catch (error) {
      handleError(error, 'Failed to perform semantic search');
      return [];
    }
  };

  // Load initial data
  useEffect(() => {
    refreshNotes();
    refreshTags();
  }, []);

  const contextValue: NotesContextType = {
    notes,
    tags,
    loading,
    error,
    createNote,
    getNote,
    updateNote,
    deleteNote,
    searchNotes,
    suggestTags,
    transcribeAudio,
    semanticSearch,
    refreshNotes,
    refreshTags,
  };

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};