import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  Tag, 
  Link as LinkIcon, 
  FileText, 
  Search, 
  Lightbulb,
  BookOpen,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  X,
  Wand2,
  Target,
  TrendingUp
} from 'lucide-react';
import { useNotebooks, Page } from '../contexts/NotebookContext';
import { useNotes } from '../contexts/NotesContext';
import { useTabs } from '../contexts/TabContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';

interface AIAssistantProps {
  currentPageId?: string;
  currentPage?: Page;
  onSuggestionApplied?: (type: string, data: any) => void;
  className?: string;
}

interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
}

interface LinkSuggestion {
  targetPageId: string;
  targetPageTitle: string;
  linkText: string;
  relevanceScore: number;
  context: string;
}

interface OrganizationSuggestion {
  type: 'move_to_section' | 'create_section' | 'merge_pages' | 'split_page';
  title: string;
  description: string;
  confidence: number;
  data: any;
}

interface ContentSuggestion {
  type: 'expand_topic' | 'add_structure' | 'improve_clarity' | 'add_examples';
  title: string;
  description: string;
  preview: string;
  confidence: number;
}

interface AIAnalysis {
  sentiment: number;
  keyTopics: string[];
  complexity: number;
  readability: number;
  completeness: number;
  suggestedImprovements: string[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  currentPageId,
  currentPage,
  onSuggestionApplied,
  className = ''
}) => {
  const { notebooks, getPages } = useNotebooks();
  const { suggestTags } = useNotes();
  const { openTab } = useTabs();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([]);
  const [organizationSuggestions, setOrganizationSuggestions] = useState<OrganizationSuggestion[]>([]);
  const [contentSuggestions, setContentSuggestions] = useState<ContentSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'tags' | 'links' | 'organization' | 'content'>('analysis');

  // Run AI analysis when page changes
  useEffect(() => {
    if (currentPage && currentPage.content) {
      runAIAnalysis();
    }
  }, [currentPage?.id, currentPage?.content]);

  const runAIAnalysis = async () => {
    if (!currentPage) return;

    setIsAnalyzing(true);
    try {
      // Run parallel AI analysis
      const [
        sentimentResult,
        entitiesResult,
        summaryResult,
        tagSuggestionsResult,
        aiProcessingResult
      ] = await Promise.all([
        invoke<number>('analyze_sentiment', { content: currentPage.content }),
        invoke<string[]>('extract_entities', { content: currentPage.content }),
        invoke<string | null>('generate_summary', { content: currentPage.content }),
        invoke<string[]>('suggest_tags', { content: currentPage.content }),
        invoke<any>('process_note_ai', { content: currentPage.content })
      ]);

      // Process results
      setAnalysis({
        sentiment: sentimentResult,
        keyTopics: entitiesResult,
        complexity: calculateComplexity(currentPage.content),
        readability: calculateReadability(currentPage.content),
        completeness: calculateCompleteness(currentPage.content),
        suggestedImprovements: generateImprovements(currentPage.content)
      });

      // Generate tag suggestions
      const tags = tagSuggestionsResult.map(tag => ({
        tag,
        confidence: Math.random() * 0.3 + 0.7, // Simulate confidence
        reason: generateTagReason(tag, currentPage.content)
      }));
      setTagSuggestions(tags);

      // Generate link suggestions
      await generateLinkSuggestions();

      // Generate organization suggestions
      await generateOrganizationSuggestions();

      // Generate content suggestions
      generateContentSuggestions();

    } catch (error) {
      console.error('AI analysis failed:', error);
      toast.error('Failed to analyze content');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate link suggestions based on content similarity
  const generateLinkSuggestions = async () => {
    if (!currentPage || !currentPageId) return;

    try {
      // Get all pages from all notebooks
      const allPages: Page[] = [];
      for (const notebook of notebooks) {
        const pages = await getPages(notebook.id);
        allPages.push(...pages.filter(p => p.id !== currentPageId));
      }

      // Simple content similarity (in real implementation, use embeddings)
      const suggestions = allPages
        .map(page => {
          const similarity = calculateContentSimilarity(currentPage.content, page.content);
          return {
            targetPageId: page.id,
            targetPageTitle: page.title,
            linkText: page.title,
            relevanceScore: similarity,
            context: findCommonContext(currentPage.content, page.content)
          };
        })
        .filter(s => s.relevanceScore > 0.3)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);

      setLinkSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate link suggestions:', error);
    }
  };

  // Generate organization suggestions
  const generateOrganizationSuggestions = async () => {
    if (!currentPage) return;

    const suggestions: OrganizationSuggestion[] = [];

    // Analyze content length and structure
    const contentLength = currentPage.content.length;
    const headingCount = (currentPage.content.match(/^#+\s/gm) || []).length;
    const listCount = (currentPage.content.match(/^[\s]*[-*+]\s/gm) || []).length;

    // Suggest splitting if content is too long
    if (contentLength > 5000 && headingCount > 3) {
      suggestions.push({
        type: 'split_page',
        title: 'Split into multiple pages',
        description: 'This page is quite long. Consider splitting it into separate pages for better organization.',
        confidence: 0.8,
        data: { suggestedSplits: extractHeadings(currentPage.content) }
      });
    }

    // Suggest section creation based on content
    if (currentPage.tags.length > 0) {
      const primaryTag = currentPage.tags[0];
      suggestions.push({
        type: 'create_section',
        title: `Create "${primaryTag}" section`,
        description: `Group related pages under a new "${primaryTag}" section for better organization.`,
        confidence: 0.6,
        data: { sectionName: primaryTag, tag: primaryTag }
      });
    }

    // Suggest moving to appropriate section
    if (currentPage.section_id === null && notebooks.length > 0) {
      suggestions.push({
        type: 'move_to_section',
        title: 'Move to appropriate section',
        description: 'This page might fit better in an existing section.',
        confidence: 0.5,
        data: { suggestedSections: [] } // Would analyze existing sections
      });
    }

    setOrganizationSuggestions(suggestions);
  };

  // Generate content improvement suggestions
  const generateContentSuggestions = () => {
    if (!currentPage) return;

    const suggestions: ContentSuggestion[] = [];
    const content = currentPage.content;

    // Suggest adding structure if content lacks headings
    if (content.length > 500 && !content.includes('#')) {
      suggestions.push({
        type: 'add_structure',
        title: 'Add headings and structure',
        description: 'Your content would benefit from headings to improve readability.',
        preview: '# Main Topic\n\n## Subtopic 1\n\n## Subtopic 2',
        confidence: 0.8
      });
    }

    // Suggest expanding if content is too brief
    if (content.length < 200 && currentPage.title.length > 10) {
      suggestions.push({
        type: 'expand_topic',
        title: 'Expand on the topic',
        description: 'Consider adding more details, examples, or explanations.',
        preview: 'Add: background information, examples, related concepts, next steps',
        confidence: 0.7
      });
    }

    // Suggest adding examples if content is abstract
    if (content.includes('concept') || content.includes('theory') || content.includes('principle')) {
      suggestions.push({
        type: 'add_examples',
        title: 'Add practical examples',
        description: 'Include concrete examples to illustrate abstract concepts.',
        preview: 'For example: [specific example related to your topic]',
        confidence: 0.6
      });
    }

    // Suggest improving clarity if sentences are too long
    const avgSentenceLength = content.split(/[.!?]+/).reduce((sum, s) => sum + s.length, 0) / content.split(/[.!?]+/).length;
    if (avgSentenceLength > 100) {
      suggestions.push({
        type: 'improve_clarity',
        title: 'Improve clarity',
        description: 'Consider breaking down long sentences for better readability.',
        preview: 'Split complex sentences into shorter, clearer ones.',
        confidence: 0.5
      });
    }

    setContentSuggestions(suggestions);
  };

  // Helper functions
  const calculateComplexity = (content: string): number => {
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    return Math.min(1, avgWordsPerSentence / 20); // Normalize to 0-1
  };

  const calculateReadability = (content: string): number => {
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const syllables = content.split(/[aeiou]/i).length;
    const fleschScore = 206.835 - (1.015 * words / sentences) - (84.6 * syllables / words);
    return Math.max(0, Math.min(1, fleschScore / 100));
  };

  const calculateCompleteness = (content: string): number => {
    let score = 0;
    if (content.includes('#')) score += 0.2; // Has headings
    if (content.includes('- ') || content.includes('1. ')) score += 0.2; // Has lists
    if (content.includes('**') || content.includes('*')) score += 0.1; // Has formatting
    if (content.includes('[') && content.includes(']')) score += 0.2; // Has links
    if (content.length > 500) score += 0.3; // Substantial content
    return Math.min(1, score);
  };

  const generateImprovements = (content: string): string[] => {
    const improvements = [];
    if (!content.includes('#')) improvements.push('Add headings to structure content');
    if (content.length < 200) improvements.push('Expand with more details');
    if (!content.includes('- ')) improvements.push('Use bullet points for lists');
    if (!content.includes('**')) improvements.push('Add emphasis to key points');
    return improvements;
  };

  const generateTagReason = (tag: string, content: string): string => {
    if (content.toLowerCase().includes(tag.toLowerCase())) {
      return `Mentioned in content`;
    }
    return `Related to main topic`;
  };

  const calculateContentSimilarity = (content1: string, content2: string): number => {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  };

  const findCommonContext = (content1: string, content2: string): string => {
    const words1 = content1.toLowerCase().split(/\s+/);
    const words2 = content2.toLowerCase().split(/\s+/);
    const common = words1.filter(word => words2.includes(word) && word.length > 3);
    return common.slice(0, 3).join(', ');
  };

  const extractHeadings = (content: string): string[] => {
    const headings = content.match(/^#+\s.+$/gm) || [];
    return headings.map(h => h.replace(/^#+\s/, ''));
  };

  // Handle suggestion application
  const applySuggestion = (type: string, data: any) => {
    onSuggestionApplied?.(type, data);
    toast.success('Suggestion applied');
  };

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0.1) return 'text-green-600';
    if (sentiment < -0.1) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (sentiment: number): string => {
    if (sentiment > 0.1) return 'Positive';
    if (sentiment < -0.1) return 'Negative';
    return 'Neutral';
  };

  const getScoreColor = (score: number): string => {
    if (score > 0.7) return 'text-green-600';
    if (score > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI Assistant
        </h3>
        <Button
          onClick={runAIAnalysis}
          disabled={isAnalyzing}
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1">
        {[
          { id: 'analysis', label: 'Analysis', icon: TrendingUp },
          { id: 'tags', label: 'Tags', icon: Tag },
          { id: 'links', label: 'Links', icon: LinkIcon },
          { id: 'organization', label: 'Organization', icon: Layers },
          { id: 'content', label: 'Content', icon: FileText }
        ].map(tab => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            className="gap-1"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Analysis Tab */}
        {activeTab === 'analysis' && analysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-border rounded">
                <div className="text-sm font-medium mb-1">Sentiment</div>
                <div className={`text-lg font-bold ${getSentimentColor(analysis.sentiment)}`}>
                  {getSentimentLabel(analysis.sentiment)}
                </div>
              </div>
              <div className="p-3 border border-border rounded">
                <div className="text-sm font-medium mb-1">Readability</div>
                <div className={`text-lg font-bold ${getScoreColor(analysis.readability)}`}>
                  {Math.round(analysis.readability * 100)}%
                </div>
              </div>
            </div>

            <div className="p-3 border border-border rounded">
              <div className="text-sm font-medium mb-2">Key Topics</div>
              <div className="flex flex-wrap gap-1">
                {analysis.keyTopics.map(topic => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-3 border border-border rounded">
              <div className="text-sm font-medium mb-2">Improvements</div>
              <div className="space-y-1">
                {analysis.suggestedImprovements.map((improvement, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Lightbulb className="w-3 h-3 text-yellow-500" />
                    {improvement}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div className="space-y-2">
            {tagSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-border rounded">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span className="font-medium">{suggestion.tag}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>
                <Button
                  onClick={() => applySuggestion('add_tag', suggestion.tag)}
                  size="sm"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Links Tab */}
        {activeTab === 'links' && (
          <div className="space-y-2">
            {linkSuggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border border-border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{suggestion.targetPageTitle}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(suggestion.relevanceScore * 100)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Common: {suggestion.context}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => applySuggestion('create_link', suggestion)}
                    size="sm"
                    variant="outline"
                  >
                    Link
                  </Button>
                  <Button
                    onClick={() => openTab({
                      title: suggestion.targetPageTitle,
                      type: 'page',
                      content: { pageId: suggestion.targetPageId },
                      hasUnsavedChanges: false
                    })}
                    size="sm"
                    variant="ghost"
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Organization Tab */}
        {activeTab === 'organization' && (
          <div className="space-y-2">
            {organizationSuggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border border-border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{suggestion.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {suggestion.description}
                </p>
                <Button
                  onClick={() => applySuggestion('organization', suggestion)}
                  size="sm"
                  variant="outline"
                >
                  Apply
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-2">
            {contentSuggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border border-border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{suggestion.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {suggestion.description}
                </p>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded mb-2">
                  {suggestion.preview}
                </div>
                <Button
                  onClick={() => applySuggestion('content', suggestion)}
                  size="sm"
                  variant="outline"
                >
                  Apply
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};