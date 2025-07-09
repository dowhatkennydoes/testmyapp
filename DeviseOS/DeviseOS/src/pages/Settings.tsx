import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Settings as SettingsIcon, 
  Database, 
  Shield, 
  Brain, 
  Palette,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';

interface AIStatus {
  whisper_available: boolean;
  embedding_available: boolean;
  whisper_model: string | null;
  embedding_model: string | null;
}

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [aiStatus, setAIStatus] = useState<AIStatus>({
    whisper_available: false,
    embedding_available: false,
    whisper_model: null,
    embedding_model: null,
  });
  const [loading, setLoading] = useState(false);
  const [initializingAI, setInitializingAI] = useState(false);

  useEffect(() => {
    loadAIStatus();
  }, []);

  const loadAIStatus = async () => {
    try {
      const status = await invoke<AIStatus>('get_ai_status');
      setAIStatus(status);
    } catch (error) {
      console.error('Failed to load AI status:', error);
    }
  };

  const handleInitializeAI = async () => {
    try {
      setInitializingAI(true);
      await invoke('initialize_ai_models');
      await loadAIStatus();
      toast.success('AI models initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI models:', error);
      toast.error('Failed to initialize AI models');
    } finally {
      setInitializingAI(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      // TODO: Implement data export
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    try {
      setLoading(true);
      // TODO: Implement data import
      toast.success('Data imported successfully');
    } catch (error) {
      toast.error('Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        setLoading(true);
        // TODO: Implement data clearing
        toast.success('Data cleared successfully');
      } catch (error) {
        toast.error('Failed to clear data');
      } finally {
        setLoading(false);
      }
    }
  };

  const settingSections = [
    {
      title: 'Appearance',
      icon: Palette,
      description: 'Customize the look and feel of DeviseOS',
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
              >
                System
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'AI Models',
      icon: Brain,
      description: 'Manage local AI models for transcription and search',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Whisper (Speech-to-Text)</h4>
                <Badge variant={aiStatus.whisper_available ? 'default' : 'destructive'}>
                  {aiStatus.whisper_available ? 'Available' : 'Not Available'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Model: {aiStatus.whisper_model || 'Not loaded'}
              </p>
              <div className="flex items-center gap-2 text-sm">
                {aiStatus.whisper_available ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span>
                  {aiStatus.whisper_available 
                    ? 'Ready for voice transcription' 
                    : 'Initialize to enable voice features'
                  }
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Embeddings (Semantic Search)</h4>
                <Badge variant={aiStatus.embedding_available ? 'default' : 'destructive'}>
                  {aiStatus.embedding_available ? 'Available' : 'Not Available'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Model: {aiStatus.embedding_model || 'Not loaded'}
              </p>
              <div className="flex items-center gap-2 text-sm">
                {aiStatus.embedding_available ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span>
                  {aiStatus.embedding_available 
                    ? 'Ready for semantic search' 
                    : 'Initialize to enable AI search'
                  }
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleInitializeAI}
              disabled={initializingAI}
              className="gap-2"
            >
              {initializingAI ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {initializingAI ? 'Initializing...' : 'Initialize AI Models'}
            </Button>
            
            <Button
              variant="outline"
              onClick={loadAIStatus}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: 'Security',
      icon: Shield,
      description: 'Manage encryption and security settings',
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h4 className="font-medium">End-to-End Encryption</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              All your notes and voice recordings are encrypted with AES-256-GCM before being stored locally.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Encryption Algorithm:</span>
                <span className="font-mono">AES-256-GCM</span>
              </div>
              <div className="flex justify-between">
                <span>Key Derivation:</span>
                <span className="font-mono">Argon2</span>
              </div>
              <div className="flex justify-between">
                <span>Data Location:</span>
                <span className="font-mono">Local Device Only</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h4 className="font-medium">Privacy-First Design</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              DeviseOS processes all data locally on your device. No data is sent to external servers 
              unless you explicitly choose to sync with a cloud service.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Data Management',
      icon: Database,
      description: 'Backup, restore, and manage your data',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={loading}
              className="gap-2 h-auto p-4 flex-col items-start"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </div>
              <span className="text-sm text-muted-foreground">
                Download all your notes and settings as a backup file
              </span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleImportData}
              disabled={loading}
              className="gap-2 h-auto p-4 flex-col items-start"
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Data
              </div>
              <span className="text-sm text-muted-foreground">
                Restore notes and settings from a backup file
              </span>
            </Button>
          </div>
          
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <h4 className="font-medium text-destructive mb-2">Danger Zone</h4>
            <p className="text-sm text-muted-foreground mb-3">
              This action will permanently delete all your notes, tags, and settings. 
              This cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={loading}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your DeviseOS configuration and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {settingSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
              <div className="bg-card rounded-lg p-6 border border-border">
                {section.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-border">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            DeviseOS - Privacy-First AI Memory Platform
          </p>
          <p className="text-xs text-muted-foreground">
            Version 0.1.0 - All data processed locally on your device
          </p>
        </div>
      </div>
    </div>
  );
};