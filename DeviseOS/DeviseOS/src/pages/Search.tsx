import React from 'react';
import { Search as SearchIcon, Sparkles, Target, Filter, Brain, Lightbulb } from 'lucide-react';
import { AdvancedSearch } from '../components/AdvancedSearch';
import { AIAssistant } from '../components/AIAssistant';

export const Search: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <SearchIcon className="w-8 h-8" />
          Advanced Search
        </h1>
        <p className="text-muted-foreground">
          Find your notes quickly with intelligent search, filtering, and AI assistance
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Search */}
        <div className="xl:col-span-3">
          <AdvancedSearch />
        </div>

        {/* AI Assistant Sidebar */}
        <div className="space-y-6">
          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Search Tips
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">Semantic Search</div>
                  <div className="text-muted-foreground">
                    Search by meaning, not just exact words
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Filter className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">Smart Filters</div>
                  <div className="text-muted-foreground">
                    Filter by notebooks, tags, and date ranges
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">AI-Powered</div>
                  <div className="text-muted-foreground">
                    Uses local AI models for intelligent results
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-accent rounded text-sm">
                Search recent notes
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded text-sm">
                Find untagged pages
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded text-sm">
                Search by creation date
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded text-sm">
                Find linked pages
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded text-sm">
                Search voice transcripts
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded text-sm">
                Find media attachments
              </button>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Search Operators</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <code className="bg-muted px-1 rounded text-xs">"exact phrase"</code>
                <span className="text-muted-foreground">Exact match</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-1 rounded text-xs">-exclude</code>
                <span className="text-muted-foreground">Exclude term</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-1 rounded text-xs">tag:name</code>
                <span className="text-muted-foreground">Search by tag</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-1 rounded text-xs">notebook:name</code>
                <span className="text-muted-foreground">Search in notebook</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};