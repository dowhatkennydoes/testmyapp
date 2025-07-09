import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { NotesProvider } from './contexts/NotesContext';
import { NotebookProvider } from './contexts/NotebookContext';
import { TabProvider } from './contexts/TabContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotebookLayout } from './components/NotebookLayout';
import { Dashboard } from './pages/Dashboard';
import { NoteEditor } from './pages/NoteEditor';
import { Settings } from './pages/Settings';
import { Search } from './pages/Search';

function App() {
  return (
    <ThemeProvider>
      <NotesProvider>
        <NotebookProvider>
          <TabProvider>
            <div className="min-h-screen bg-background text-foreground">
              <NotebookLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/note/:id" element={<NoteEditor />} />
                  <Route path="/page/:id" element={<NoteEditor />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </NotebookLayout>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                }}
              />
            </div>
          </TabProvider>
        </NotebookProvider>
      </NotesProvider>
    </ThemeProvider>
  );
}

export default App;