import React from 'react';
import { NotebookSidebar } from './NotebookSidebar';
import { TabManager } from './TabManager';

interface NotebookLayoutProps {
  children: React.ReactNode;
}

export const NotebookLayout: React.FC<NotebookLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background">
      {/* Notebook Sidebar */}
      <NotebookSidebar />

      {/* Main Content with Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TabManager />
      </div>
    </div>
  );
};