/* Phase 1 patch: Updated Navbar to use new teal tokens.
   This component is replaced by AppShell in Phase 2-3,
   but still used by LandingPage, LoginPage, SignupPage,
   NewResearchPage, ProgressPage until their Phase 2 rewrite. */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Plus, Clock, Menu, X,
  LayoutDashboard, Table2, GitFork, Network,
  MessageSquare, FileText, Files,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../context/ResearchContext';

const WORKSPACE_TABS = [
  { key: 'papers',     label: 'Papers',     Icon: Files           },
  { key: 'overview',   label: 'Overview',   Icon: LayoutDashboard },
  { key: 'comparison', label: 'Comparison', Icon: Table2          },
  { key: 'gaps',       label: 'Gaps',       Icon: GitFork         },
  { key: 'graph',      label: 'Graph',      Icon: Network         },
  { key: 'assistant',  label: 'Assistant',  Icon: MessageSquare   },
  { key: 'reports',    label: 'Reports',    Icon: FileText        },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResearch } = useResearch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const params     = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const jobId       = params.jobId;
  const currentTab  = params.tab;
  const isInWorkspace = !!jobId && !!currentTab;

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout(); navigate('/'); setUserMenuOpen(false); setMenuOpen(false);
  };
  const handleNewResearch = () => {
    clearResearch(); navigate('/research/new'); setMenuOpen(false);
  };
  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 'var(--z-topbar)',
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: '0 var(--sp-6)', height: 'var(--topbar-h)',
          maxWidth: '100%',
        }}
      >
        {/* Wordmark */}
        <Link
          to="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          onClick={() => setMenuOpen(false)}
        >
          <span className="topbar-brand">ResearchMind</span>
        </Link>

        {/* Workspace tabs (desktop) */}
        {isInWorkspace && (
          <nav
            style={{ display: 'flex', alignItems: 'stretch', gap: 0, flex: 1, overflow: 'hidden' }}
            aria-label="Workspace tabs"
          >
            {WORKSPACE_TABS.map(({ key, label, Icon }) => (
              <Link
                key={key}
                to={`/research/${jobId}/${key}`}
                className={['workspace-tab-btn', currentTab === key && 'active'].filter(Boolean).join(' ')}
                aria-current={currentTab === key ? 'page' : undefined}
                style={{ textDecoration: 'none' }}
              >
                <Icon size={13} />
                {label}
              </Link>
            ))}
          </nav>
        )}

        <div style={{ flex: 1 }} />

        {/* Desktop right cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleNewResearch}
          >
            <Plus size={13} />
            New Research
          </button>

          {isAuthenticated && (
            <Link to="/history" className="btn btn-ghost btn-sm">
              <Clock size={13} />
              History
            </Link>
          )}

          {isAuthenticated ? (
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                className="topbar-avatar"
                onClick={() => setUserMenuOpen(v => !v)}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                {userInitial}
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-email">{user?.email}</div>
                  <button className="user-dropdown-item danger" onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"  className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            style={{ display: 'none' }}
            className="btn btn-icon"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile workspace tabs */}
      {isInWorkspace && (
        <nav
          style={{
            display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)',
            padding: '0 var(--sp-4)', scrollbarWidth: 'none',
          }}
          aria-label="Workspace tabs mobile"
        >
          {WORKSPACE_TABS.map(({ key, label, Icon }) => (
            <Link
              key={key}
              to={`/research/${jobId}/${key}`}
              className={['workspace-tab-btn', currentTab === key && 'active'].filter(Boolean).join(' ')}
              style={{ textDecoration: 'none', fontSize: 'var(--text-xs)' }}
            >
              <Icon size={12} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
