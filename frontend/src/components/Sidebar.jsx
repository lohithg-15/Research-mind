import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Search, Clock, FileText, Home,
  ChevronLeft, ChevronRight, ChevronDown, X,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8000';

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onNewResearch,
  isAuthenticated,
  user,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [recentSessions, setRecentSessions] = useState([]);
  const [showTip, setShowTip] = useState(true);
  const [footerMenuOpen, setFooterMenuOpen] = useState(false);

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';
  const { authHeaders } = useAuth();

  // Load recent sessions
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${API_BASE}/history`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setRecentSessions(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {});
  }, [isAuthenticated]); // eslint-disable-line

  const navItems = [
    { to: '/research/new', label: 'New Research', Icon: Home },
    { to: '/history',      label: 'History',      Icon: Clock,     auth: true },
  ];

  const isActive = (path) => location.pathname === path;

  const sidebarCls = [
    'sidebar',
    collapsed && 'collapsed',
    mobileOpen && 'mobile-open',
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarCls} aria-label="Main navigation">
      {/* Toggle button */}
      <button
        className="sidebar-toggle"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft size={12} />
        }
      </button>

      {/* Header */}
      <div className="sidebar-header">
        <button
          className="sidebar-new-btn"
          onClick={onNewResearch}
          aria-label="New research"
        >
          <Plus size={15} aria-hidden="true" />
          <span>New research</span>
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="sidebar-search">
          <Search size={13} className="sidebar-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="sidebar-search-input"
            placeholder="Search  ⌘K"
            aria-label="Search researches"
          />
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {navItems
          .filter(item => !item.auth || isAuthenticated)
          .map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className={['sidebar-nav-item', isActive(to) && 'active'].filter(Boolean).join(' ')}
              aria-current={isActive(to) ? 'page' : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
      </nav>

      {/* Recent researches */}
      {isAuthenticated && !collapsed && recentSessions.length > 0 && (
        <div>
          <div className="sidebar-section-label">
            Recent researches
            <Link
              to="/history"
              style={{
                float: 'right',
                color: 'var(--accent-ink)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--fw-medium)',
                textDecoration: 'none',
              }}
            >
              All
            </Link>
          </div>
          <div className="sidebar-recent-list">
            {recentSessions.map(s => {
              const jobPath = `/research/${s.id}/papers`;
              return (
                <Link
                  key={s.id}
                  to={jobPath}
                  className={['sidebar-recent-item', location.pathname.startsWith(`/research/${s.id}`) && 'active'].filter(Boolean).join(' ')}
                  title={s.title || s.query}
                >
                  <Search size={11} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span className="sidebar-recent-title">
                    {s.title || s.query || 'Untitled'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tip card */}
      {!collapsed && showTip && (
        <div className="sidebar-tip">
          <Lightbulb size={12} style={{ marginBottom: 4 }} aria-hidden="true" />
          <strong style={{ display: 'block', marginBottom: 2 }}>Tip</strong>
          Use filters to narrow papers by year before you start.
          <button
            className="sidebar-tip-close"
            onClick={() => setShowTip(false)}
            aria-label="Dismiss tip"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Footer */}
      {isAuthenticated && (
        <div className="sidebar-footer">
          <div
            className="sidebar-footer-inner"
            onClick={() => setFooterMenuOpen(v => !v)}
            role="button"
            tabIndex={0}
            aria-label="User menu"
            onKeyDown={(e) => { if (e.key === 'Enter') setFooterMenuOpen(v => !v); }}
          >
            <div className="sidebar-footer-avatar">{userInitial}</div>
            <span className="sidebar-footer-name">{user?.email?.split('@')[0]}</span>
            <ChevronDown size={13} className="chevron" aria-hidden="true" />
          </div>

          {footerMenuOpen && (
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-popover)',
              overflow: 'hidden',
              marginTop: 4,
            }}>
              <Link
                to="/history"
                className="user-dropdown-item"
                onClick={() => setFooterMenuOpen(false)}
              >
                <Clock size={13} />
                History
              </Link>
              <button className="user-dropdown-item danger" onClick={onLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
