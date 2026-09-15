import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Plus, Trash2, Search, ChevronRight,
  Loader2, BookOpen, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8000';

/**
 * Group sessions by date buckets: Today, Yesterday, Last 7 days, Older
 */
function groupByDate(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    Older: [],
  };

  for (const s of sessions) {
    const d = new Date(s.created_at);
    if (d >= today) groups.Today.push(s);
    else if (d >= yesterday) groups.Yesterday.push(s);
    else if (d >= weekAgo) groups['Last 7 days'].push(s);
    else groups.Older.push(s);
  }

  return groups;
}

export default function HistorySidebar({ onLoadSession, onNewResearch, activeSessionId }) {
  const { token, isAuthenticated, authHeaders } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch history
  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authHeaders]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Refresh when token changes (login/logout)
  useEffect(() => {
    if (!token) setSessions([]);
  }, [token]);

  // Delete a session
  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(sessionId);
    try {
      const res = await fetch(`${API_BASE}/history/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Load a saved session
  const handleLoad = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/history/${sessionId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        onLoadSession(data);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  if (!isAuthenticated) return null;

  // Filter
  const filtered = searchTerm.trim()
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.query.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sessions;

  const grouped = groupByDate(filtered);

  return (
    <div className="history-sidebar">
      {/* New Research button */}
      <button className="history-new-btn" onClick={onNewResearch}>
        <Plus size={14} />
        New Research
      </button>

      {/* Search */}
      <div className="history-search-wrap">
        <Search size={12} className="history-search-icon" />
        <input
          type="text"
          className="history-search"
          placeholder="Search history…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sessions list */}
      <div className="history-list">
        {loading && sessions.length === 0 && (
          <div className="history-empty">
            <Loader2 size={16} className="spin" />
            <span>Loading history…</span>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="history-empty">
            <BookOpen size={16} />
            <span>No saved research yet</span>
            <span className="history-empty-sub">
              Run a research query to save it here
            </span>
          </div>
        )}

        {Object.entries(grouped).map(([label, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={label} className="history-group">
              <div className="history-group-label">
                <Calendar size={9} />
                {label}
              </div>
              {items.map((s) => (
                <button
                  key={s.id}
                  className={`history-item ${activeSessionId === s.id ? 'active' : ''}`}
                  onClick={() => handleLoad(s.id)}
                >
                  <div className="history-item-content">
                    <span className="history-item-title">{s.title}</span>
                    <span className="history-item-date">
                      {new Date(s.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <button
                    className="history-item-delete"
                    onClick={(e) => handleDelete(e, s.id)}
                    title="Delete session"
                  >
                    {deletingId === s.id
                      ? <Loader2 size={11} className="spin" />
                      : <Trash2 size={11} />}
                  </button>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
