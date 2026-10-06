import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Clock, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResearch } from '../../context/ResearchContext';
import './shell.css';

const API_BASE = 'http://localhost:8000';

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { isAuthenticated, authHeaders } = useAuth();
  const { clearResearch } = useResearch();
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setFocusIdx(0);
    inputRef.current?.focus();
    if (isAuthenticated) {
      fetch(`${API_BASE}/history`, { headers: authHeaders() })
        .then(res => res.ok ? res.json() : [])
        .then(data => setSessions(data))
        .catch(() => setSessions([]));
    }
  }, [isOpen, isAuthenticated, authHeaders]);

  const staticActions = useMemo(() => ([
    {
      key: 'new-research',
      label: 'Start new research',
      Icon: Plus,
      onSelect: () => { clearResearch(); navigate('/research/new'); },
    },
    ...(isAuthenticated ? [{
      key: 'history',
      label: 'Go to History',
      Icon: Clock,
      onSelect: () => navigate('/history'),
    }] : []),
  ]), [clearResearch, navigate, isAuthenticated]);

  const sessionActions = useMemo(() => sessions
    .filter(s => (s.title || s.query || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)
    .map(s => ({
      key: `session-${s.id}`,
      label: s.title || s.query,
      Icon: FileText,
      onSelect: () => navigate(`/research/${s.id}/papers`),
    })), [sessions, query, navigate]);

  const items = useMemo(() => {
    const filteredStatic = staticActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
    return [...filteredStatic, ...sessionActions];
  }, [staticActions, sessionActions, query]);

  const select = useCallback((item) => {
    item.onSelect();
    onClose();
  }, [onClose]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && items[focusIdx]) { select(items[focusIdx]); }
  }

  if (!isOpen) return null;

  return (
    <div className="rm-cmdk-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="rm-cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={handleKeyDown}>
        <div className="rm-cmdk-input-row">
          <Search size={16} />
          <input
            ref={inputRef}
            className="rm-cmdk-input"
            placeholder="Search papers, tabs, or past research…"
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusIdx(0); }}
            aria-label="Command palette search"
          />
        </div>
        <div className="rm-cmdk-list" role="listbox">
          {items.length === 0 && <div className="rm-cmdk-empty">No matches</div>}
          {items.map((item, idx) => (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={focusIdx === idx}
              className={`rm-cmdk-item ${focusIdx === idx ? 'rm-cmdk-item--focused' : ''}`}
              onMouseEnter={() => setFocusIdx(idx)}
              onClick={() => select(item)}
            >
              <item.Icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
