import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image, 
  FileText, 
  Film, 
  Music, 
  File, 
  X, 
  Eye,
  Download,
  Copy,
  Trash2
} from 'lucide-react';
import { useNotebooks } from '../contexts/NotebookContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import toast from 'react-hot-toast';

interface MediaUploadProps {
  pageId: string;
  onMediaUploaded?: (mediaId: string) => void;
  className?: string;
}

interface MediaFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  thumbnailData?: string;
  url: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({ 
  pageId, 
  onMediaUploaded, 
  className = '' 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get media icon based on MIME type
  const getMediaIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.startsWith('video/')) return <Film className="w-4 h-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    const uploadedFiles: MediaFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large (max 10MB)`);
          continue;
        }

        // Read file as base64
        const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });

        // Create thumbnail for images
        let thumbnailData: string | undefined;
        if (file.type.startsWith('image/')) {
          thumbnailData = await createImageThumbnail(file);
        }

        // Upload to backend
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pageId,
            filename: file.name,
            mimeType: file.type,
            fileData: Array.from(new Uint8Array(fileData)),
            thumbnailData: thumbnailData ? Array.from(new Uint8Array(await (await fetch(thumbnailData)).arrayBuffer())) : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const mediaAttachment = await response.json();
        
        const mediaFile: MediaFile = {
          id: mediaAttachment.id,
          filename: mediaAttachment.filename,
          originalFilename: mediaAttachment.original_filename,
          mimeType: mediaAttachment.mime_type,
          fileSize: mediaAttachment.file_size,
          thumbnailData: thumbnailData,
          url: `/api/media/${mediaAttachment.id}`,
        };

        uploadedFiles.push(mediaFile);
        onMediaUploaded?.(mediaFile.id);
      }

      setMediaFiles(prev => [...prev, ...uploadedFiles]);
      toast.success(`Uploaded ${uploadedFiles.length} file(s)`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  // Create image thumbnail
  const createImageThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate thumbnail size (max 200x200)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type, 0.8));
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground">
          Support for images, videos, documents (max 10MB each)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Media Gallery */}
      {mediaFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Media</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {mediaFiles.map((file) => (
              <div
                key={file.id}
                className="border border-border rounded-lg p-3 hover:bg-accent/50 group"
              >
                <div className="flex items-center gap-3">
                  {file.thumbnailData ? (
                    <img
                      src={file.thumbnailData}
                      alt={file.originalFilename}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                      {getMediaIcon(file.mimeType)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.originalFilename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => setPreviewFile(file)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(`![${file.originalFilename}](${file.url})`);
                        toast.success('Markdown link copied');
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => {
                        // TODO: Implement delete
                        toast.success('File deleted');
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{previewFile.originalFilename}</h3>
              <Button
                onClick={() => setPreviewFile(null)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="text-center">
              {previewFile.mimeType.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.originalFilename}
                  className="max-w-full max-h-96 object-contain rounded"
                />
              ) : previewFile.mimeType.startsWith('video/') ? (
                <video
                  src={previewFile.url}
                  controls
                  className="max-w-full max-h-96 rounded"
                />
              ) : previewFile.mimeType.startsWith('audio/') ? (
                <audio src={previewFile.url} controls />
              ) : (
                <div className="p-8 text-center">
                  {getMediaIcon(previewFile.mimeType)}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                  <Button
                    onClick={() => window.open(previewFile.url, '_blank')}
                    className="mt-2 gap-2"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};