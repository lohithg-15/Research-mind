import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar, { SIDEBAR_LS_KEY } from './Sidebar';
import WorkspaceTabsBar from './WorkspaceTabsBar';
import CommandPalette from './CommandPalette';
import './shell.css';

export default function AppShell({ children }) {
  const { jobId, tab } = useParams();
  const isInWorkspace = !!jobId && !!tab;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_LS_KEY) !== 'collapsed'; } catch { return true; }
  });

  const toggleSidebarExpanded = useCallback((next) => {
    setSidebarExpanded(next);
    try { localStorage.setItem(SIDEBAR_LS_KEY, next ? 'expanded' : 'collapsed'); } catch {}
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mainClasses = [
    'rm-app-shell-main',
    sidebarExpanded ? 'rm-app-shell-main--expanded' : '',
    isInWorkspace ? 'rm-app-shell-main--worktabs' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <TopBar onToggleMobileSidebar={() => setMobileSidebarOpen(v => !v)} />
      {isInWorkspace && <WorkspaceTabsBar sidebarExpanded={sidebarExpanded} />}
      <Sidebar
        expanded={sidebarExpanded}
        onToggleExpanded={toggleSidebarExpanded}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenCommandPalette={openPalette}
      />
      <main className={mainClasses}>
        {children}
      </main>
      <CommandPalette isOpen={paletteOpen} onClose={closePalette} />
    </>
  );
}
