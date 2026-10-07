import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search, BookOpen, AlertCircle, MoreHorizontal, FolderOpen } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../context/ResearchContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import './history.css';

const API_BASE = 'http://localhost:8000';

export default function HistoryPage() {
  const { authHeaders } = useAuth();
  const { loadSession } = useResearch();
  const navigate = useNavigate();

  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
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
        (s.query || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : sessions;

  const statusTone = status => (status === 'error' || status === 'failed' ? 'danger' : status === 'running' ? 'warn' : 'success');
  const statusLabel = status => (status === 'error' || status === 'failed' ? 'Failed' : status === 'running' ? 'Running' : 'Complete');

  return (
    <AppShell>
      <div className="rm-history-page">
        <div className="rm-history-head">
          <div>
            <h1>Research history</h1>
            <p>{sessions.length} saved session{sessions.length !== 1 ? 's' : ''}</p>
          </div>
          <Button icon={<Plus size={14} />} onClick={() => navigate('/research/new')}>New research</Button>
        </div>

        <label className="rm-history-search">
          <Search size={14} />
          <Input placeholder="Search history…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} aria-label="Search history" />
        </label>

        {error && <div className="rm-history-error" role="alert"><AlertCircle size={14} />{error}</div>}

        {loading ? (
          <div className="rm-history-skeleton" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="48px" />)}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={20} />}
            title="No saved research yet"
            description="Run a research query to save it here."
            action={<Button icon={<Plus size={13} />} onClick={() => navigate('/research/new')}>Start research</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={20} />} title="No matches" description="Try a different search term." />
        ) : (
          <div className="rm-history-table-wrap">
            <table className="rm-history-table">
              <thead>
                <tr><th>Research</th><th>Status</th><th>Created</th><th className="rm-history-actions"><span className="rm-sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="rm-history-row">
                    <td><button type="button" className="rm-history-open" title={s.title || s.query} onClick={() => handleLoad(s.id)}>{s.title || s.query}</button></td>
                    <td><Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge></td>
                    <td className="rm-history-date">
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="rm-history-actions">
                      <Dropdown
                        trigger={<Button variant="ghost" size="sm" icon={<MoreHorizontal size={16} />} aria-label={`Actions for ${s.title || s.query}`} />}
                        items={[
                          { key: 'open', label: 'Open', icon: <FolderOpen size={14} />, onSelect: () => handleLoad(s.id) },
                          { key: 'delete', label: 'Delete', icon: <Trash2 size={14} />, onSelect: () => setConfirmId(s.id) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!confirmId} onClose={() => setConfirmId(null)}>
        <div className="rm-confirm">
          <h2>Delete this session?</h2>
          <p>This permanently removes the saved research and its results.</p>
          <div className="rm-confirm-actions">
            <Button variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="danger" loading={!!deletingId} onClick={() => handleDelete(confirmId)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
