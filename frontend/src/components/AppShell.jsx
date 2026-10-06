import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../context/ResearchContext';
import Sidebar from './Sidebar';
import '../styles/appshell.css';

export default function AppShell({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResearch } = useResearch();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleNewResearch = () => {
    clearResearch();
    navigate('/research/new');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Top Bar ── */}
      <header className="app-topbar" role="banner">
        {/* Wordmark */}
        <Link to="/" className="topbar-wordmark" aria-label="ResearchMind home">
          <span className="topbar-brand">ResearchMind</span>
        </Link>

        {/* New research quick button */}
        <button
          className="topbar-new-btn"
          onClick={handleNewResearch}
          aria-label="New research"
          title="New research"
        >
          <Plus size={14} />
        </button>

        <div className="topbar-spacer" />

        {/* Right cluster */}
        <div className="topbar-right">
          {/* Bell */}
          <button
            className="topbar-icon-btn"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={15} />
          </button>

          {/* User avatar / auth */}
          {isAuthenticated ? (
            <div className="user-dropdown-wrap" ref={userMenuRef}>
              <button
                className="topbar-avatar"
                onClick={() => setUserMenuOpen(v => !v)}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
                title={user?.email}
              >
                {userInitial}
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-email">{user?.email}</div>
                  <Link
                    to="/history"
                    className="user-dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    History
                  </Link>
                  <button
                    className="user-dropdown-item danger"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(18,35,43,0.3)',
            zIndex: 'calc(var(--z-sidebar) - 1)',
          }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNewResearch={handleNewResearch}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />

      {/* ── Main content ── */}
      <main
        className={['main-content', sidebarCollapsed && 'sidebar-collapsed'].filter(Boolean).join(' ')}
        role="main"
      >
        {children}
      </main>
    </div>
  );
}
