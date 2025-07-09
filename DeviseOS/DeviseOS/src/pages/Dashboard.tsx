import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Tags,
  Calendar,
  Filter
} from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

export const Dashboard: React.FC = () => {
  const { notes, tags, loading, createNote } = useNotes();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const handleNewNote = async () => {
    try {
      const note = await createNote({
        title: 'New Note',
        content: '',
        tags: [],
      });
      window.location.href = `/note/${note.id}`;
    } catch (error) {
      console.error('Failed to create new note:', error);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm === '' || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === null || note.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const recentNotes = filteredNotes.slice(0, 10);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back to your memory platform
          </p>
        </div>
        <Button onClick={handleNewNote} className="gap-2">
          <Plus className="w-4 h-4" />
          New Note
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{notes.length}</p>
              <p className="text-sm text-muted-foreground">Total Notes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-3">
            <Tags className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{tags.length}</p>
              <p className="text-sm text-muted-foreground">Tags</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">
                {notes.reduce((acc, note) => acc + note.metadata.word_count, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Words</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Tag Filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedTag === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTag(null)}
          >
            All Tags
          </Button>
          {tags.slice(0, 10).map(tag => (
            <Button
              key={tag.id}
              variant={selectedTag === tag.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTag(tag.name)}
            >
              {tag.name} ({tag.usage_count})
            </Button>
          ))}
        </div>
      )}

      {/* Recent Notes */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Notes</h2>
          <Link to="/search">
            <Button variant="outline" className="gap-2">
              <Search className="w-4 h-4" />
              View All
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No notes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedTag 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first note'
              }
            </p>
            <Button onClick={handleNewNote} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Note
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {recentNotes.map(note => (
              <Link 
                key={note.id} 
                to={`/note/${note.id}`}
                className="block bg-card rounded-lg p-4 border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-lg line-clamp-1">{note.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(note.updated_at), 'MMM d, yyyy')}
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-3 line-clamp-2">
                  {note.content.substring(0, 200)}...
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <Badge variant="outline" size="sm">
                        +{note.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{note.metadata.word_count} words</span>
                    <span>{note.metadata.reading_time} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};