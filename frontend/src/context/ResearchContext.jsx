import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import { useAuth } from './AuthContext';

const ResearchContext = createContext(null);

const API_BASE = 'http://localhost:8000';

/* ─── localStorage helpers ─── */
const LS_KEY = 'researchmind_session';
function saveSession(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* quota */ }
}
function loadSession() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearSession() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

const saved = loadSession();

export function ResearchProvider({ children }) {
  const { authHeaders } = useAuth();

  const [query,       setQuery]       = useState(saved?.query       ?? '');
  const [yearMin,     setYearMin]     = useState(saved?.yearMin     ?? 2015);
  const [yearMax,     setYearMax]     = useState(saved?.yearMax     ?? new Date().getFullYear());
  const [venueType,   setVenueType]   = useState(saved?.venueType   ?? 'any');
  const [keywords,    setKeywords]    = useState(saved?.keywords    ?? '');
  const [maxPapers,   setMaxPapers]   = useState(saved?.maxPapers   ?? 20);

  const [jobId,       setJobId]       = useState(saved?.jobId       ?? null);
  const [jobStatus,   setJobStatus]   = useState(saved?.jobStatus   ?? null);
  const [agentStatus, setAgentStatus] = useState(saved?.agentStatus ?? {});
  const [results,     setResults]     = useState(saved?.results     ?? null);
  const [error,       setError]       = useState(null);
  const [mockMode,    setMockMode]    = useState(saved?.mockMode    ?? false);
  const [startedAt,   setStartedAt]   = useState(saved?.startedAt   ?? null);
  const [finishedAt,  setFinishedAt]  = useState(saved?.finishedAt  ?? null);

  // Persist on change
  useEffect(() => {
    saveSession({ query, yearMin, yearMax, venueType, keywords, maxPapers,
      jobId, jobStatus, agentStatus, results, mockMode, startedAt, finishedAt });
  }, [query, yearMin, yearMax, venueType, keywords, maxPapers, jobId, jobStatus, agentStatus, results, mockMode, startedAt, finishedAt]);

  const isRunning = !!(jobId && (jobStatus === 'pending' || jobStatus === 'running'));
  const isDone    = !!(results && results.status === 'done');

  /* ─── Fetch final results ─── */
  const fetchResults = useCallback(async (jid, q) => {
    try {
      const res  = await fetch(`${API_BASE}/results/${jid}`);
      if (!res.ok) throw new Error('Results fetch failed');
      const data = await res.json();
      setResults({ ...data, query: q });
    } catch {
      setError('Failed to load final results from backend.');
    }
  }, []);

  /* ─── Poll job status ─── */
  const pollRef = useRef(null);

  const startPolling = useCallback((jid, q) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API_BASE}/status/${jid}`);
        if (!res.ok) throw new Error('Status fetch failed');
        const data = await res.json();
        setJobStatus(data.status);
        setAgentStatus(data.agent_status || {});
        setError(data.error || null);
        setMockMode(!!data.mock_mode);
        if (data.started_at  != null) setStartedAt(data.started_at);
        if (data.finished_at != null) setFinishedAt(data.finished_at);
        if (data.status === 'done')  { clearInterval(pollRef.current); fetchResults(jid, q); }
        if (data.status === 'error') { clearInterval(pollRef.current); }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  }, [fetchResults]);

  // Re-attach polling on mount if we reloaded mid-job
  useEffect(() => {
    if (jobId && (jobStatus === 'pending' || jobStatus === 'running')) {
      startPolling(jobId, query);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  /* ─── Submit new query ─── */
  const submitQuery = useCallback(async (q, filters) => {
    setError(null);
    setResults(null);
    setMockMode(false);
    setStartedAt(null);
    setFinishedAt(null);

    const body = {
      query: q,
      filters: {
        year_range:  [parseInt(filters.yearMin), parseInt(filters.yearMax)],
        venue_type:  filters.venueType !== 'any' ? filters.venueType : undefined,
        keywords:    filters.keywords?.trim()
          ? filters.keywords.split(',').map(k => k.trim())
          : undefined,
      },
    };

    const res = await fetch(`${API_BASE}/query`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit query.');
    }
    const data = await res.json();
    const jid  = data.job_id;

    setQuery(q);
    setYearMin(filters.yearMin);
    setYearMax(filters.yearMax);
    setVenueType(filters.venueType);
    setKeywords(filters.keywords ?? '');
    setJobId(jid);
    setJobStatus('pending');
    setAgentStatus({
      planner: 'pending', search: 'pending', extraction: 'pending',
      synthesis: 'pending', graph_gap: 'pending', report: 'pending',
    });

    startPolling(jid, q);
    return jid;
  }, [authHeaders, startPolling]);

  /* ─── Load a session from history (by full session object) ─── */
  const loadSession_ = useCallback((session) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setQuery(session.query || '');
    setResults(session.results ? { ...session.results, query: session.query } : null);
    setJobId(session.id);
    setJobStatus('done');
    setAgentStatus({
      planner: 'done', search: 'done', extraction: 'done',
      synthesis: 'done', graph_gap: 'done', report: 'done',
    });
    setError(null);
    setMockMode(false);
    setStartedAt(null);
    setFinishedAt(null);
    if (session.filters) {
      const yr = session.filters.year_range;
      if (yr?.length === 2) { setYearMin(yr[0]); setYearMax(yr[1]); }
      if (session.filters.venue_type) setVenueType(session.filters.venue_type);
      if (session.filters.keywords)   setKeywords(session.filters.keywords.join(', '));
    }
  }, []);

  /* ─── Restore job from URL (deep link / refresh) ─── */
  const restoreJob = useCallback(async (jid) => {
    // If we already have this job's results in context, skip fetch
    if (jobId === jid && (isDone || isRunning)) return;

    try {
      const statusRes = await fetch(`${API_BASE}/status/${jid}`);
      if (!statusRes.ok) return;
      const statusData = await statusRes.json();

      setJobId(jid);
      setJobStatus(statusData.status);
      setAgentStatus(statusData.agent_status || {});
      setMockMode(!!statusData.mock_mode);
      if (statusData.started_at)  setStartedAt(statusData.started_at);
      if (statusData.finished_at) setFinishedAt(statusData.finished_at);

      if (statusData.status === 'done') {
        await fetchResults(jid, query);
      } else if (statusData.status === 'pending' || statusData.status === 'running') {
        startPolling(jid, query);
      }
    } catch (err) {
      console.error('restoreJob error:', err);
    }
  }, [jobId, isDone, isRunning, fetchResults, startPolling, query]);

  /* ─── Clear / New Research ─── */
  const clearResearch = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    clearSession();
    setQuery('');
    setKeywords('');
    setYearMin(2015);
    setYearMax(new Date().getFullYear());
    setVenueType('any');
    setMaxPapers(20);
    setJobId(null);
    setJobStatus(null);
    setAgentStatus({});
    setResults(null);
    setError(null);
    setMockMode(false);
    setStartedAt(null);
    setFinishedAt(null);
  }, []);

  // Derived: paper list (prefer papers array, fallback to comparison_table)
  const papers = results?.papers?.length
    ? results.papers
    : (results?.comparison_table?.map((p, i) => ({
        id: p.id || String(i),
        arxiv_id: p.arxiv_id, doi: p.doi,
        pdf_url: p.pdf_url, url: p.url,
        year: p.year, title: p.title,
      })) || []);

  const value = {
    // Filters state
    query,       setQuery,
    yearMin,     setYearMin,
    yearMax,     setYearMax,
    venueType,   setVenueType,
    keywords,    setKeywords,
    maxPapers,   setMaxPapers,
    // Job state
    jobId,
    jobStatus,
    agentStatus,
    results,
    papers,
    error,       setError,
    mockMode,
    startedAt,
    finishedAt,
    isRunning,
    isDone,
    // Actions
    submitQuery,
    loadSession: loadSession_,
    restoreJob,
    clearResearch,
  };

  return (
    <ResearchContext.Provider value={value}>
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const ctx = useContext(ResearchContext);
  if (!ctx) throw new Error('useResearch must be used within ResearchProvider');
  return ctx;
}
