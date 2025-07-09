import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image,
  Table,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CheckSquare,
  Type,
  Palette,
  Maximize,
  Minimize,
  Eye,
  Edit,
  Save,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface EditorToolbarProps {
  onFormatApply: (format: EditorFormat) => void;
  onTogglePreview?: () => void;
  onToggleFullscreen?: () => void;
  isPreview?: boolean;
  isFullscreen?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  className?: string;
}

export interface EditorFormat {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'quote' | 'link' | 'image' | 'heading' | 'list' | 'table' | 'hr' | 'checkbox' | 'align' | 'color';
  value?: string | number;
  text?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onFormatApply,
  onTogglePreview,
  onToggleFullscreen,
  isPreview = false,
  isFullscreen = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
  className = '',
}) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleFormat = (format: EditorFormat) => {
    onFormatApply(format);
  };

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      handleFormat({
        type: 'link',
        value: linkUrl,
        text: linkText || linkUrl,
      });
      setShowLinkDialog(false);
      setLinkUrl('');
      setLinkText('');
    }
  };

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#808080', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080',
    '#C0C0C0', '#FF4500', '#32CD32', '#4169E1', '#FFD700', '#FF69B4', '#40E0D0',
  ];

  return (
    <div className={`flex items-center gap-1 p-2 border-b border-border bg-card ${className}`}>
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Text Formatting */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          onClick={() => handleFormat({ type: 'bold' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'italic' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'underline' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'strikethrough' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'code' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Headings */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          onClick={() => handleFormat({ type: 'heading', value: 1 })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'heading', value: 2 })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'heading', value: 3 })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Lists */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          onClick={() => handleFormat({ type: 'list', value: 'bullet' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'list', value: 'ordered' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'checkbox' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Insert Elements */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          onClick={() => setShowLinkDialog(true)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'image' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Insert Image"
        >
          <Image className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'table' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Insert Table"
        >
          <Table className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'hr' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Quote */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          onClick={() => handleFormat({ type: 'quote' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Alignment */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          onClick={() => handleFormat({ type: 'align', value: 'left' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'align', value: 'center' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleFormat({ type: 'align', value: 'right' })}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Color Picker */}
      <div className="relative">
        <Button
          onClick={() => setShowColorPicker(!showColorPicker)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Text Color"
        >
          <Palette className="w-4 h-4" />
        </Button>
        
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-md shadow-lg z-10">
            <div className="grid grid-cols-7 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    handleFormat({ type: 'color', value: color });
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View Controls */}
      <div className="flex items-center gap-1">
        <Button
          onClick={onTogglePreview}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title={isPreview ? "Edit" : "Preview"}
        >
          {isPreview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          onClick={onToggleFullscreen}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
        <Button
          onClick={onSave}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Save"
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">URL</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Link Text (optional)</label>
                <Input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleLinkSubmit}
                  className="flex-1"
                  disabled={!linkUrl.trim()}
                >
                  Insert Link
                </Button>
                <Button
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                    setLinkText('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Overlay */}
      {showColorPicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};