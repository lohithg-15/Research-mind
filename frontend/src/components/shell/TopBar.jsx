import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResearch } from '../../context/ResearchContext';
import Wordmark from '../ui/Wordmark';
import Button from '../ui/Button';
import './shell.css';

export default function TopBar({ onToggleMobileSidebar }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { clearResearch } = useResearch();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleNewResearch() {
    clearResearch();
    navigate('/research/new');
  }

  function handleLogout() {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  }

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <header className="rm-topbar">
      <button
        className="rm-btn rm-btn-ghost rm-btn-icon-only rm-btn-sm rm-topbar-mobile-toggle"
        onClick={onToggleMobileSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      <Link to="/" className="rm-topbar-logo" aria-label="ResearchMind home">
        <Wordmark size={16} />
      </Link>

      <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={handleNewResearch}>
        New research
      </Button>

      <div className="rm-topbar-spacer" />

      <div className="rm-topbar-actions">
        {isAuthenticated ? (
          <>
            <Link to="/history" className="rm-btn rm-btn-ghost rm-btn-sm">History</Link>
            <button className="rm-btn rm-btn-ghost rm-btn-icon-only rm-btn-sm" aria-label="Notifications">
              <Bell size={16} />
            </button>
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                className="rm-topbar-avatar"
                onClick={() => setUserMenuOpen(v => !v)}
                aria-label="User menu"
                title={user?.email}
              >
                {userInitial}
              </button>
              {userMenuOpen && (
                <div className="rm-dropdown-menu rm-topbar-user-dropdown" role="menu">
                  <div className="rm-topbar-user-email">{user?.email}</div>
                  <button className="rm-dropdown-item" onClick={handleLogout}>
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="rm-btn rm-btn-ghost rm-btn-sm">Sign in</Link>
            <Link to="/signup" className="rm-btn rm-btn-primary rm-btn-sm">Start for free</Link>
          </>
        )}
      </div>
    </header>
  );
}
