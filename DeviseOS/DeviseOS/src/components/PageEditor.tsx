import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { 
  Save, 
  Trash2, 
  Tag, 
  Mic, 
  MicOff,
  Volume2,
  Lightbulb,
  Brain,
  FileText,
  Plus,
  Link as LinkIcon,
  Image,
  Paperclip,
  Maximize,
  Minimize,
  Eye,
  Edit,
  MessageSquare,
  Sidebar,
  X
} from 'lucide-react';
import { useNotebooks, Page } from '../contexts/NotebookContext';
import { useTabs } from '../contexts/TabContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { EditorToolbar, EditorFormat } from './EditorToolbar';
import { MediaUpload } from './MediaUpload';
import { PageLinking } from './PageLinking';
import toast from 'react-hot-toast';

interface PageEditorProps {
  pageId: string;
  initialPage?: Page;
  onContentChange?: (hasChanges: boolean) => void;
  className?: string;
}

export const PageEditor: React.FC<PageEditorProps> = ({ 
  pageId, 
  initialPage,
  onContentChange,
  className = '' 
}) => {
  const { getPage, updatePage, deletePage } = useNotebooks();
  const { updateTabTitle, setTabUnsavedChanges } = useTabs();
  
  const [page, setPage] = useState<Page | null>(initialPage || null);
  const [title, setTitle] = useState(initialPage?.title || '');
  const [content, setContent] = useState(initialPage?.content || '');
  const [tags, setTags] = useState<string[]>(initialPage?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showPageLinking, setShowPageLinking] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'links' | 'media' | 'comments'>('links');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Load page if not provided initially
  useEffect(() => {
    if (!initialPage && pageId) {
      setIsLoading(true);
      getPage(pageId)
        .then(fetchedPage => {
          if (fetchedPage) {
            setPage(fetchedPage);
            setTitle(fetchedPage.title);
            setContent(fetchedPage.content);
            setTags(fetchedPage.tags);
          }
        })
        .catch(error => {
          console.error('Failed to load page:', error);
          toast.error('Failed to load page');
        })
        .finally(() => setIsLoading(false));
    }
  }, [pageId, initialPage, getPage]);

  // Track unsaved changes
  useEffect(() => {
    if (page) {
      const hasChanges = 
        title !== page.title ||
        content !== page.content ||
        JSON.stringify(tags) !== JSON.stringify(page.tags);
      
      setHasUnsavedChanges(hasChanges);
      onContentChange?.(hasChanges);
      setTabUnsavedChanges(pageId, hasChanges);
    }
  }, [title, content, tags, page, pageId, onContentChange, setTabUnsavedChanges]);

  // Update tab title when page title changes
  useEffect(() => {
    if (title && title !== page?.title) {
      updateTabTitle(pageId, title);
    }
  }, [title, page?.title, pageId, updateTabTitle]);

  const handleSave = async () => {
    if (!page) return;

    setIsSaving(true);
    try {
      await updatePage(page.id, {
        title: title || 'Untitled Page',
        content,
        tags,
      });

      // Update local state
      setPage(prev => prev ? {
        ...prev,
        title: title || 'Untitled Page',
        content,
        tags,
        updated_at: new Date().toISOString(),
      } : null);

      setHasUnsavedChanges(false);
      toast.success('Page saved successfully');
    } catch (error) {
      console.error('Failed to save page:', error);
      toast.error('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!page) return;

    if (window.confirm('Are you sure you want to delete this page?')) {
      try {
        await deletePage(page.id);
        toast.success('Page deleted successfully');
        // The tab will handle closing itself
      } catch (error) {
        console.error('Failed to delete page:', error);
        toast.error('Failed to delete page');
      }
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle format application
  const handleFormatApply = (format: EditorFormat) => {
    if (!contentRef.current) return;

    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    // Save to undo stack
    setUndoStack(prev => [...prev, content]);
    setRedoStack([]);
    
    let newContent = content;
    let insertText = '';
    
    switch (format.type) {
      case 'bold':
        insertText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        insertText = `*${selectedText || 'italic text'}*`;
        break;
      case 'underline':
        insertText = `<u>${selectedText || 'underlined text'}</u>`;
        break;
      case 'strikethrough':
        insertText = `~~${selectedText || 'strikethrough text'}~~`;
        break;
      case 'code':
        insertText = `\`${selectedText || 'code'}\``;
        break;
      case 'quote':
        insertText = `> ${selectedText || 'quote'}`;
        break;
      case 'heading':
        const headingLevel = '#'.repeat(format.value as number);
        insertText = `${headingLevel} ${selectedText || 'heading'}`;
        break;
      case 'list':
        if (format.value === 'bullet') {
          insertText = `- ${selectedText || 'list item'}`;
        } else {
          insertText = `1. ${selectedText || 'list item'}`;
        }
        break;
      case 'checkbox':
        insertText = `- [ ] ${selectedText || 'task'}`;
        break;
      case 'link':
        insertText = `[${format.text || selectedText || 'link text'}](${format.value})`;
        break;
      case 'image':
        insertText = `![${selectedText || 'alt text'}](image-url)`;
        break;
      case 'table':
        insertText = `| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |`;
        break;
      case 'hr':
        insertText = '---';
        break;
      case 'color':
        insertText = `<span style="color: ${format.value}">${selectedText || 'colored text'}</span>`;
        break;
      default:
        return;
    }
    
    newContent = content.substring(0, start) + insertText + content.substring(end);
    setContent(newContent);
    
    // Set cursor position after insertion
    setTimeout(() => {
      if (contentRef.current) {
        const newCursorPos = start + insertText.length;
        contentRef.current.setSelectionRange(newCursorPos, newCursorPos);
        contentRef.current.focus();
      }
    }, 0);
  };

  // Handle undo/redo
  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousContent = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, content]);
      setContent(previousContent);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextContent = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, content]);
      setContent(nextContent);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  // Handle link insertion from PageLinking
  const handleLinkInserted = (markdown: string) => {
    if (!contentRef.current) return;

    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    setUndoStack(prev => [...prev, content]);
    setRedoStack([]);
    
    const newContent = content.substring(0, start) + markdown + content.substring(end);
    setContent(newContent);
    
    setTimeout(() => {
      if (contentRef.current) {
        const newCursorPos = start + markdown.length;
        contentRef.current.setSelectionRange(newCursorPos, newCursorPos);
        contentRef.current.focus();
      }
    }, 0);
  };

  // Handle media upload
  const handleMediaUploaded = (mediaId: string) => {
    // Insert media reference into content
    const mediaMarkdown = `![Media](media://${mediaId})`;
    handleLinkInserted(mediaMarkdown);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    } else if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    } else if (e.key === 'F11') {
      e.preventDefault();
      setIsFullscreen(!isFullscreen);
    }
  };

  // Handle content changes with undo stack management
  const handleContentChange = (newContent: string) => {
    // Only save to undo stack if there's a significant change
    if (Math.abs(newContent.length - content.length) > 10) {
      setUndoStack(prev => [...prev.slice(-50), content]); // Keep last 50 states
      setRedoStack([]);
    }
    setContent(newContent);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          Loading page...
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Page not found</h3>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`} onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">
              {title || 'Untitled Page'}
              {hasUnsavedChanges && <span className="text-orange-500 ml-2">•</span>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {page.updated_at && `Last updated ${format(new Date(page.updated_at), 'PPp')}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsRecording(!isRecording)}
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="gap-2"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? 'Stop Recording' : 'Record'}
          </Button>
          
          <Button
            onClick={() => setShowRightPanel(!showRightPanel)}
            variant={showRightPanel ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Sidebar className="w-4 h-4" />
            Panel
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            size="sm"
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            onClick={handleDelete}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <EditorToolbar
        onFormatApply={handleFormatApply}
        onTogglePreview={() => setIsPreview(!isPreview)}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        isPreview={isPreview}
        isFullscreen={isFullscreen}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Input */}
          <div className="p-4 border-b border-border">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title..."
              className="text-xl font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
            />
          </div>

          {/* Tags */}
          <div className="p-4 border-b border-border">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </Badge>
              ))}
              
              {showTagInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag();
                      } else if (e.key === 'Escape') {
                        setShowTagInput(false);
                        setNewTag('');
                      }
                    }}
                    placeholder="Add tag..."
                    className="w-32 h-6 text-xs"
                    autoFocus
                  />
                  <Button
                    onClick={handleAddTag}
                    size="sm"
                    className="h-6 px-2"
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowTagInput(true)}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Tag
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {isPreview ? (
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            ) : (
              <Textarea
                ref={contentRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start writing your page content..."
                className="w-full h-full border-none px-0 focus-visible:ring-0 bg-transparent resize-none"
              />
            )}
          </div>
        </div>

        {/* Right Panel */}
        {showRightPanel && (
          <div className="w-80 border-l border-border bg-card flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => setRightPanelTab('links')}
                  variant={rightPanelTab === 'links' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1"
                >
                  <LinkIcon className="w-4 h-4" />
                  Links
                </Button>
                <Button
                  onClick={() => setRightPanelTab('media')}
                  variant={rightPanelTab === 'media' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1"
                >
                  <Image className="w-4 h-4" />
                  Media
                </Button>
                <Button
                  onClick={() => setRightPanelTab('comments')}
                  variant={rightPanelTab === 'comments' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1"
                >
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </Button>
              </div>
              <Button
                onClick={() => setShowRightPanel(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {rightPanelTab === 'links' && (
                <PageLinking
                  currentPageId={pageId}
                  onLinkInserted={handleLinkInserted}
                />
              )}
              {rightPanelTab === 'media' && (
                <MediaUpload
                  pageId={pageId}
                  onMediaUploaded={handleMediaUploaded}
                />
              )}
              {rightPanelTab === 'comments' && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p>Comments feature coming soon!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};