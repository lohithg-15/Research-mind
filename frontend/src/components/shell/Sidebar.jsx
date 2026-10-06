import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Clock, FileText, X, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResearch } from '../../context/ResearchContext';
import Tooltip from '../ui/Tooltip';
import './shell.css';

const API_BASE = 'http://localhost:8000';
export const SIDEBAR_LS_KEY = 'rm_sidebar';
const TIP_DISMISSED_KEY = 'rm_sidebar_tip_dismissed';

const NAV_LINKS = [
  { key: 'history', label: 'History', to: '/history', Icon: Clock },
];

export default function Sidebar({ expanded, onToggleExpanded, mobileOpen, onCloseMobile, onOpenCommandPalette }) {
  const { isAuthenticated, authHeaders, user } = useAuth();
  const { clearResearch } = useResearch();
  const navigate = useNavigate();
  const location = useLocation();

  const [recent, setRecent] = useState([]);
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem(TIP_DISMISSED_KEY) === '1'; } catch { return false; }
  });

  const fetchRecent = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`${API_BASE}/history`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRecent(data.slice(0, 6));
      }
    } catch { /* ignore */ }
  }, [isAuthenticated, authHeaders]);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  function handleNewResearch() {
    clearResearch();
    navigate('/research/new');
    onCloseMobile?.();
  }

  function dismissTip() {
    setTipDismissed(true);
    try { localStorage.setItem(TIP_DISMISSED_KEY, '1'); } catch {}
  }

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  const sidebarClasses = [
    'rm-sidebar',
    expanded ? 'rm-sidebar--expanded' : '',
    mobileOpen ? 'rm-sidebar--drawer-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {mobileOpen && <div className="rm-sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={sidebarClasses} aria-label="Sidebar">
        {!expanded ? (
          <>
            <Tooltip label="New research" side="right">
              <button className="rm-sidebar-rail-item" onClick={handleNewResearch} aria-label="New research">
                <Plus size={18} />
              </button>
            </Tooltip>
            <Tooltip label="Search" side="right">
              <button className="rm-sidebar-rail-item" onClick={onOpenCommandPalette} aria-label="Search">
                <Search size={18} />
              </button>
            </Tooltip>
            {isAuthenticated && (
              <Tooltip label="History" side="right">
                <Link
                  to="/history"
                  className={`rm-sidebar-rail-item ${location.pathname === '/history' ? 'rm-sidebar-rail-item--active' : ''}`}
                  aria-current={location.pathname === '/history' ? 'page' : undefined}
                >
                  <Clock size={18} />
                </Link>
              </Tooltip>
            )}
            <Tooltip label="Expand sidebar" side="right">
              <button className="rm-sidebar-toggle-btn" onClick={() => onToggleExpanded(true)} aria-label="Expand sidebar">
                <ChevronsRight size={16} />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="rm-sidebar-section">
              <button className="rm-sidebar-new-btn" onClick={handleNewResearch}>
                <Plus size={15} />
                New research
              </button>
              <button className="rm-sidebar-search-btn" onClick={onOpenCommandPalette}>
                <Search size={14} />
                Search
                <span className="rm-sidebar-search-kbd">⌘K</span>
              </button>
              <nav className="rm-sidebar-nav" aria-label="Primary">
                {isAuthenticated && NAV_LINKS.map(({ key, label, to, Icon }) => (
                  <Link
                    key={key}
                    to={to}
                    className={`rm-sidebar-nav-link ${location.pathname === to ? 'rm-sidebar-nav-link--active' : ''}`}
                    aria-current={location.pathname === to ? 'page' : undefined}
                  >
                    <Icon size={15} />
                    {label}
                  </Link>
                ))}
              </nav>

              {isAuthenticated && recent.length > 0 && (
                <>
                  <div className="rm-sidebar-recent-title">Recent researches</div>
                  {recent.map(session => (
                    <Link
                      key={session.id}
                      to={`/research/${session.id}/papers`}
                      className="rm-sidebar-recent-item"
                      title={session.title || session.query}
                    >
                      <FileText size={12} style={{ marginRight: 6 }} />
                      {session.title || session.query}
                    </Link>
                  ))}
                </>
              )}

              {!tipDismissed && (
                <div className="rm-sidebar-tip-card">
                  <button className="rm-sidebar-tip-dismiss" onClick={dismissTip} aria-label="Dismiss tip">
                    <X size={13} />
                  </button>
                  <p className="rm-sidebar-tip-text">
                    Tip: press ⌘K anywhere to jump to a paper, tab, or past research.
                  </p>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="rm-sidebar-footer">
                <span className="rm-topbar-avatar" aria-hidden="true">{userInitial}</span>
                <span className="rm-sidebar-footer-email">{user?.email}</span>
              </div>
            )}

            <button className="rm-sidebar-toggle-btn" onClick={() => onToggleExpanded(false)} aria-label="Collapse sidebar">
              <ChevronsLeft size={16} />
            </button>
          </>
        )}
      </aside>
    </>
  );
}
