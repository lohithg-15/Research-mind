import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Plus, Trash2, Search, Loader2, BookOpen,
  Calendar, AlertCircle,
} from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../context/ResearchContext';

const API_BASE = 'http://localhost:8000';

function groupByDate(sessions) {
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups = { Today: [], Yesterday: [], 'Last 7 days': [], Older: [] };
  for (const s of sessions) {
    const d = new Date(s.created_at);
    if (d >= today)     groups.Today.push(s);
    else if (d >= yesterday) groups.Yesterday.push(s);
    else if (d >= weekAgo)   groups['Last 7 days'].push(s);
    else                     groups.Older.push(s);
  }
  return groups;
}

export default function HistoryPage() {
  const { authHeaders } = useAuth();
  const { loadSession } = useResearch();
  const navigate = useNavigate();

  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId,  setConfirmId]  = useState(null); // pending delete confirmation
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_BASE}/history`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch history.');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      setError(err.message || 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleLoad = async (sessionId) => {
    try {
      const res  = await fetch(`${API_BASE}/history/${sessionId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load session.');
      const data = await res.json();
      loadSession(data);
      navigate(`/research/${data.id}/papers`);
    } catch (err) {
      setError(err.message || 'Could not load session.');
    }
  };

  const handleDelete = async (sessionId) => {
    setDeletingId(sessionId);
    try {
      const res = await fetch(`${API_BASE}/history/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Delete failed.');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err.message || 'Could not delete session.');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const filtered = searchTerm.trim()
    ? sessions.filter(s =>
        (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.query || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sessions;

  const grouped = groupByDate(filtered);

  return (
    <AppShell>
      <main className="history-main">
        <div className="history-page-header">
          <div>
            <h1 className="history-page-title">Research History</h1>
            <p className="history-page-subtitle">
              {sessions.length} saved session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate('/research/new')}
            id="history-new-research-btn"
          >
            <Plus size={14} />
            New Research
          </button>
        </div>

        {/* Search */}
        <div className="history-search-wrap" style={{ maxWidth: 400, marginBottom: 24 }}>
          <Search size={13} className="history-search-icon" />
          <input
            type="text"
            className="history-search"
            placeholder="Search history…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search history"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="error-inline" role="alert">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="panel-empty">
            <Loader2 size={24} className="spin" />
            <p className="panel-empty-title">Loading history…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && sessions.length === 0 && (
          <div className="panel-empty">
            <BookOpen size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="panel-empty-title">No saved research yet</p>
            <p className="panel-empty-desc">Run a research query to save it here.</p>
            <button className="btn-primary" onClick={() => navigate('/research/new')}>
              <Plus size={13} />
              Start Research
            </button>
          </div>
        )}

        {/* Groups */}
        {!loading && Object.entries(grouped).map(([label, items]) => {
          if (!items.length) return null;
          return (
            <section key={label} className="history-group-section">
              <div className="history-group-label">
                <Calendar size={11} />
                {label}
              </div>
              <div className="history-items-grid">
                {items.map(s => (
                  <div key={s.id} className="history-item-card">
                    {/* Confirm delete overlay */}
                    {confirmId === s.id && (
                      <div className="history-item-confirm">
                        <p>Delete this session?</p>
                        <div className="history-item-confirm-actions">
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDelete(s.id)}
                            disabled={!!deletingId}
                          >
                            {deletingId === s.id ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                            Delete
                          </button>
                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      className="history-item-main"
                      onClick={() => handleLoad(s.id)}
                      id={`history-item-${s.id}`}
                    >
                      <div className="history-item-icon">
                        <BookOpen size={16} />
                      </div>
                      <div className="history-item-text">
                        <span className="history-item-title">{s.title || s.query}</span>
                        <span className="history-item-date">
                          {new Date(s.created_at).toLocaleDateString('en-US', {
                            month: 'long', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      </div>
                    </button>

                    <button
                      className="history-item-delete-btn"
                      onClick={() => setConfirmId(s.id)}
                      aria-label="Delete session"
                      title="Delete session"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </AppShell>
  );
}
