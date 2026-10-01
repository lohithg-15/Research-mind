import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  BookOpen, User, LogOut, Clock, Plus, Menu, X,
  LayoutDashboard, Table2, GitFork, Network,
  MessageSquare, FileText, Files,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../context/ResearchContext';

const WORKSPACE_TABS = [
  { key: 'papers',     label: 'Papers',     Icon: Files },
  { key: 'overview',   label: 'Overview',   Icon: LayoutDashboard },
  { key: 'comparison', label: 'Comparison', Icon: Table2 },
  { key: 'gaps',       label: 'Gaps',       Icon: GitFork },
  { key: 'graph',      label: 'Graph',      Icon: Network },
  { key: 'assistant',  label: 'Assistant',  Icon: MessageSquare },
  { key: 'reports',    label: 'Reports',    Icon: FileText },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResearch } = useResearch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const params     = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const jobId = params.jobId;
  const currentTab = params.tab;
  const isInWorkspace = !!jobId && !!currentTab;
  const isOnProgress  = location.pathname.endsWith('/progress');

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMenuOpen(false);
  };

  const handleNewResearch = () => {
    clearResearch();
    navigate('/research/new');
    setMenuOpen(false);
  };

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <div className="navbar-logo-icon">
            <BookOpen size={15} color="#fff" />
          </div>
          <span className="navbar-brand">ResearchMind</span>
        </Link>

        {/* Desktop workspace tabs (only inside a job) */}
        {isInWorkspace && (
          <nav className="navbar-tabs" aria-label="Workspace tabs">
            {WORKSPACE_TABS.map(({ key, label, Icon }) => (
              <Link
                key={key}
                to={`/research/${jobId}/${key}`}
                className={`navbar-tab ${currentTab === key ? 'active' : ''}`}
                aria-current={currentTab === key ? 'page' : undefined}
              >
                <Icon size={13} />
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Spacer */}
        <div className="navbar-spacer" />

        {/* Desktop right cluster */}
        <div className="navbar-right desktop-only">
          <button
            className="navbar-btn navbar-btn-outline"
            onClick={handleNewResearch}
            title="Start a new research session"
          >
            <Plus size={13} />
            New Research
          </button>

          {isAuthenticated && (
            <Link to="/history" className="navbar-btn navbar-btn-ghost">
              <Clock size={13} />
              History
            </Link>
          )}

          {isAuthenticated ? (
            <div
              className="user-menu-wrap"
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <button
                className="user-avatar"
                onClick={() => setUserMenuOpen(v => !v)}
                title={user?.email}
                aria-label="User menu"
              >
                {userInitial}
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-email">{user?.email}</div>
                  <div className="user-dropdown-divider" />
                  <button
                    className="user-dropdown-item"
                    onClick={handleLogout}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"  className="navbar-btn navbar-btn-ghost">Sign in</Link>
              <Link to="/signup" className="navbar-btn navbar-btn-primary">Sign up</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="navbar-hamburger mobile-only"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile workspace tabs row */}
      {isInWorkspace && (
        <nav className="navbar-mobile-tabs mobile-only" aria-label="Workspace tabs">
          {WORKSPACE_TABS.map(({ key, label, Icon }) => (
            <Link
              key={key}
              to={`/research/${jobId}/${key}`}
              className={`navbar-mobile-tab ${currentTab === key ? 'active' : ''}`}
            >
              <Icon size={12} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu mobile-only">
          <button
            className="navbar-btn navbar-btn-outline"
            onClick={handleNewResearch}
          >
            <Plus size={13} />
            New Research
          </button>
          {isAuthenticated && (
            <Link to="/history" className="navbar-btn navbar-btn-ghost" onClick={() => setMenuOpen(false)}>
              <Clock size={13} />
              History
            </Link>
          )}
          <div className="navbar-mobile-divider" />
          {isAuthenticated ? (
            <>
              <div className="navbar-mobile-email">{user?.email}</div>
              <button className="navbar-btn navbar-btn-ghost" onClick={handleLogout}>
                <LogOut size={13} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login"  className="navbar-btn navbar-btn-ghost"   onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link to="/signup" className="navbar-btn navbar-btn-primary"  onClick={() => setMenuOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
