import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Save, 
  ArrowLeft, 
  Trash2, 
  Tag, 
  Mic, 
  MicOff,
  Volume2,
  Lightbulb,
  Brain
} from 'lucide-react';
import { useNotes, Note } from '../contexts/NotesContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';

export const NoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNote, updateNote, deleteNote, suggestTags } = useNotes();
  
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (id) {
      loadNote();
    }
  }, [id]);

  useEffect(() => {
    if (note) {
      setHasChanges(
        title !== note.title ||
        content !== note.content ||
        JSON.stringify(tags) !== JSON.stringify(note.tags)
      );
    }
  }, [title, content, tags, note]);

  const loadNote = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const noteData = await getNote(id);
      if (noteData) {
        setNote(noteData);
        setTitle(noteData.title);
        setContent(noteData.content);
        setTags(noteData.tags);
      } else {
        toast.error('Note not found');
        navigate('/');
      }
    } catch (error) {
      toast.error('Failed to load note');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      await updateNote({
        id,
        title: title.trim() || 'Untitled',
        content,
        tags,
      });
      setHasChanges(false);
      toast.success('Note saved');
    } catch (error) {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(id);
        navigate('/');
      } catch (error) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSuggestTags = async () => {
    if (!content.trim()) {
      toast.error('Add some content first to get tag suggestions');
      return;
    }
    
    try {
      const suggestions = await suggestTags(content);
      setSuggestedTags(suggestions.filter(tag => !tags.includes(tag)));
    } catch (error) {
      toast.error('Failed to get tag suggestions');
    }
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
      setSuggestedTags(suggestedTags.filter(t => t !== tag));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement actual recording functionality
    if (!isRecording) {
      toast.success('Recording started');
    } else {
      toast.success('Recording stopped');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Note not found</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(note.updated_at), 'MMM d, yyyy HH:mm')}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleRecording}
            className={isRecording ? 'text-red-500' : ''}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? 'Stop Recording' : 'Record'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestTags}
          >
            <Lightbulb className="w-4 h-4" />
            Suggest Tags
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-2xl font-bold border-none shadow-none px-0 py-2 mb-4"
          />

          {/* Tags */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add tag..."
                  className="h-8 w-32 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  <Tag className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Suggested Tags */}
            {suggestedTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Suggested tags:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleAddSuggestedTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your note..."
            className="min-h-[500px] text-base leading-relaxed border-none shadow-none px-0 py-2 resize-none"
          />

          {/* Voice Annotations */}
          {note.voice_annotations.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold">Voice Annotations</h3>
              {note.voice_annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="p-4 bg-card rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">
                        {format(new Date(annotation.timestamp), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {annotation.duration.toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-sm">{annotation.transcription}</p>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{note.metadata.word_count} words</span>
              <span>{note.metadata.character_count} characters</span>
              <span>{note.metadata.reading_time} min read</span>
              <span>Version {note.metadata.version}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};