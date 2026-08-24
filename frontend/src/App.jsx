import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Play, Loader2, LayoutDashboard,
  Table2, GitFork, FileText, AlertCircle,
  Sparkles, Trash2
} from 'lucide-react';

import ProgressTracker  from './components/ProgressTracker';
import ComparisonTable  from './components/ComparisonTable';
import GraphViewer      from './components/GraphViewer';
import ReportExport     from './components/ReportExport';
import OverviewPanel    from './components/OverviewPanel';
import SourcesSidebar   from './components/SourcesSidebar';

/* ─── Tabs config ─── */
const TABS = [
  { key: 'overview',   label: 'Overview',        Icon: LayoutDashboard },
  { key: 'comparison', label: 'Comparison Table', Icon: Table2 },
  { key: 'gap',        label: 'Gap Evidence',     Icon: GitFork },
  { key: 'report',     label: 'Report',           Icon: FileText },
];

/* ─── localStorage helpers ─── */
const LS_KEY = 'researchmind_session';

function saveSession(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
  catch { /* quota exceeded — silently ignore */ }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

/* ─── Initial state from localStorage ─── */
const saved = loadSession();

export default function App() {
  const [query,       setQuery]       = useState(saved?.query       ?? '');
  const [yearMin,     setYearMin]     = useState(saved?.yearMin     ?? 2015);
  const [yearMax,     setYearMax]     = useState(saved?.yearMax     ?? new Date().getFullYear());
  const [venueType,   setVenueType]   = useState(saved?.venueType   ?? 'any');
  const [keywords,    setKeywords]    = useState(saved?.keywords    ?? '');

  const [jobId,       setJobId]       = useState(saved?.jobId       ?? null);
  const [jobStatus,   setJobStatus]   = useState(saved?.jobStatus   ?? null);
  const [agentStatus, setAgentStatus] = useState(saved?.agentStatus ?? {});
  const [results,     setResults]     = useState(saved?.results     ?? null);
  const [error,       setError]       = useState(null);   // errors not persisted
  const [activeTab,   setActiveTab]   = useState(saved?.activeTab   ?? 'overview');
  const [highlighted, setHighlighted] = useState([]);

  /* ─── Persist to localStorage whenever important state changes ─── */
  useEffect(() => {
    saveSession({
      query, yearMin, yearMax, venueType, keywords,
      jobId, jobStatus, agentStatus, results, activeTab,
    });
  }, [query, yearMin, yearMax, venueType, keywords, jobId, jobStatus, agentStatus, results, activeTab]);

  /* ─── If we reload mid-job (running), re-attach polling ─── */
  const isRunning = jobId && (jobStatus === 'pending' || jobStatus === 'running');
  const isDone    = results && results.status === 'done';

  /* ─── Fetch final results ─── */
  const fetchResults = useCallback(async (jid, q) => {
    try {
      const res  = await fetch(`http://localhost:8000/results/${jid}`);
      if (!res.ok) throw new Error('Results fetch failed');
      const data = await res.json();
      setResults({ ...data, query: q });
    } catch {
      setError('Failed to load final results from backend.');
    }
  }, []);

  /* ─── Poll job status ─── */
  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'error') return;
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`http://localhost:8000/status/${jobId}`);
        if (!res.ok) throw new Error('Status fetch failed');
        const data = await res.json();
        setJobStatus(data.status);
        setAgentStatus(data.agent_status || {});
        setError(data.error || null);
        if (data.status === 'done')  { clearInterval(interval); fetchResults(jobId, query); }
        if (data.status === 'error') { clearInterval(interval); }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, jobStatus, fetchResults, query]);

  /* ─── Submit query ─── */
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setResults(null);
    setActiveTab('overview');
    setHighlighted([]);

    try {
      const res = await fetch('http://localhost:8000/query', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          query,
          filters: {
            year_range: [parseInt(yearMin), parseInt(yearMax)],
            venue_type: venueType !== 'any' ? venueType : undefined,
            keywords:   keywords.trim() ? keywords.split(',').map(k => k.trim()) : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to submit query.');
      const data = await res.json();
      setJobId(data.job_id);
      setJobStatus('pending');
      setAgentStatus({
        planner: 'pending', search: 'pending', extraction: 'pending',
        synthesis: 'pending', graph_gap: 'pending', report: 'pending',
      });
    } catch (err) {
      setError(err.message || 'Server connection error.');
    }
  };

  /* ─── Clear all (works even while running) ─── */
  const handleClear = () => {
    // Stop polling by setting jobStatus to a terminal value first
    setJobStatus('cancelled');
    clearSession();
    setQuery('');
    setKeywords('');
    setYearMin(2015);
    setYearMax(new Date().getFullYear());
    setVenueType('any');
    setJobId(null);
    setJobStatus(null);
    setAgentStatus({});
    setResults(null);
    setError(null);
    setActiveTab('overview');
    setHighlighted([]);
  };

  // Prefer the full papers list with URLs; fall back to comparison_table
  const papers = results?.papers?.length
    ? results.papers
    : results?.comparison_table?.map((p, i) => ({
        id: p.id || String(i),
        arxiv_id: p.arxiv_id, doi: p.doi,
        pdf_url: p.pdf_url, url: p.url,
        year: p.year, title: p.title,
      })) || [];

  /* ─── Status badge ─── */
  const StatusBadge = () => {
    if (!jobId) return null;
    if (isRunning) return (
      <span className="status-badge status-badge-running">
        <span className="status-badge-dot pulse" />
        Pipeline running
      </span>
    );
    if (jobStatus === 'done') return (
      <>
        {papers.length > 0 && (
          <span className="status-badge status-badge-sources">
            <span className="status-badge-dot" />
            {papers.length} sources loaded
          </span>
        )}
        <span className="status-badge status-badge-done">
          <span className="status-badge-dot" />
          Pipeline complete
        </span>
      </>
    );
    if (jobStatus === 'error') return (
      <span className="status-badge status-badge-error">
        <span className="status-badge-dot" />
        Pipeline error
      </span>
    );
    return null;
  };

  const reportDraft = isDone ? (results?.report_draft || {}) : null;

  return (
    <>
      {/* ─── Top Bar ─── */}
      <header className="topbar">
        {/* Logo */}
        <div className="topbar-logo">
          <div className="topbar-logo-icon">
            <BookOpen size={16} color="#fff" />
          </div>
          <div className="topbar-brand">
            <span className="topbar-brand-name">ResearchMind</span>
            <span className="topbar-brand-sub">Literature review, with its evidence attached</span>
          </div>
        </div>

        <div className="topbar-divider" />

        {/* Query input */}
        <form
          onSubmit={handleSubmit}
          className="topbar-search"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}
        >
          <input
            id="main-query-input"
            type="text"
            className="topbar-search-input"
            style={{ flex: 1 }}
            placeholder="e.g. agentic AI, quantum error correction, diffusion models…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={isRunning}
          />
          <input
            id="keywords-topbar-input"
            type="text"
            className="topbar-search-input"
            style={{ flex: '0 1 200px', minWidth: '120px' }}
            placeholder="Keywords (e.g. meta-learning)"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            disabled={isRunning}
          />
        </form>

        {/* Right cluster */}
        <div className="topbar-right">
          <StatusBadge />

          {/* Clear button — always clickable, even while running */}
          <button
            id="clear-btn"
            className={`clear-btn ${!jobId && !results && !query.trim() ? 'clear-btn--dim' : ''}`}
            onClick={handleClear}
            title="Clear all results and stop pipeline"
          >
            <Trash2 size={13} />
            Clear
          </button>

          <button
            id="run-review-btn"
            className="run-btn"
            onClick={handleSubmit}
            disabled={isRunning || !query.trim()}
          >
            {isRunning
              ? <Loader2 size={14} className="spin" />
              : <Sparkles size={14} />}
            {isRunning ? 'Running…' : 'Run review'}
          </button>
        </div>
      </header>

      {/* ─── Body layout ─── */}
      <div className="app-layout">

        {/* ── Left Sidebar ── */}
        <aside className="sidebar-left">
          {/* Filters */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Filters</div>

            <label className="filter-label">Year range</label>
            <div className="filter-row">
              <input
                id="year-min"
                type="number"
                className="filter-input"
                value={yearMin}
                onChange={e => setYearMin(e.target.value)}
                min="1900"
                max={yearMax}
                disabled={isRunning}
              />
              <span className="filter-sep">—</span>
              <input
                id="year-max"
                type="number"
                className="filter-input"
                value={yearMax}
                onChange={e => setYearMax(e.target.value)}
                min={yearMin}
                max={new Date().getFullYear() + 2}
                disabled={isRunning}
              />
            </div>

            <label className="filter-label">Publication type</label>
            <div style={{ marginBottom: '12px' }}>
              <select
                id="publication-type"
                className="filter-select"
                value={venueType}
                onChange={e => setVenueType(e.target.value)}
                disabled={isRunning}
              >
                <option value="any">Any</option>
                <option value="conference">Conference</option>
                <option value="journal">Journal</option>
                <option value="arxiv">arXiv preprint</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>
          </div>

          {/* Pipeline */}
          <div className="sidebar-section" style={{ borderBottom: 'none', paddingBottom: 8 }}>
            <div className="sidebar-section-title">Pipeline</div>
          </div>
          <ProgressTracker agentStatus={agentStatus} />
        </aside>

        {/* ── Center Content ── */}
        <main className="content-main">

          {/* Error banner */}
          {error && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="error-card">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="error-card-title">Pipeline Error</p>
                  <p className="error-card-msg">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab bar */}
          {(isDone || isRunning) && (
            <nav className="tab-bar">
              {TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  id={`tab-${key}`}
                  className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  <Icon size={14} className="tab-btn-icon" />
                  {label}
                </button>
              ))}
            </nav>
          )}

          {/* Tab panels */}
          <div className="tab-panel">
            {/* Hero — no job yet */}
            {!jobId && !error && (
              <div className="hero-empty">
                <div className="hero-badge">
                  <Sparkles size={9} />
                  AI-Powered Literature Review
                </div>
                <h1 className="hero-title">
                  Research,{' '}
                  <span className="hero-title-italic">Synthesized.</span>
                </h1>
                <p className="hero-subtitle">
                  Enter a research topic in the search bar above. ResearchMind retrieves
                  papers, extracts methods, maps the citation graph, surfaces gaps,
                  and compiles a publication-grade report — automatically.
                </p>
                <div className="hero-features">
                  <div className="hero-feature-chip">
                    <div className="hero-feature-chip-dot" />arXiv + Semantic Scholar
                  </div>
                  <div className="hero-feature-chip">
                    <div className="hero-feature-chip-dot" />LLM Extraction &amp; Synthesis
                  </div>
                  <div className="hero-feature-chip">
                    <div className="hero-feature-chip-dot" />Citation Gap Detection
                  </div>
                  <div className="hero-feature-chip">
                    <div className="hero-feature-chip-dot" />PDF &amp; Word Export
                  </div>
                </div>
                <div className="hero-cta-line">
                  Type your topic in the search bar above to begin
                </div>
              </div>
            )}

            {/* Pipeline running */}
            {isRunning && !isDone && (
              <div className="panel-empty" style={{ minHeight: '300px' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--gray-500)' }} />
                <p className="panel-empty-title">Pipeline running…</p>
                <p className="panel-empty-desc">
                  Monitor agent progress in the left sidebar. Results will appear automatically when complete.
                </p>
              </div>
            )}

            {/* Results */}
            {isDone && (
              <>
                {activeTab === 'overview' && (
                  <OverviewPanel results={results} onTabChange={setActiveTab} />
                )}
                {activeTab === 'comparison' && (
                  <ComparisonTable data={results.comparison_table} />
                )}
                {activeTab === 'gap' && (
                  <GraphViewer
                    gapClaims={results.gap_claims}
                    onHighlightPapers={setHighlighted}
                  />
                )}
                {activeTab === 'report' && (
                  <ReportExport jobId={jobId} results={results} />
                )}
              </>
            )}
          </div>
        </main>

        {/* ── Right Sidebar ── */}
        <SourcesSidebar papers={papers} highlightedIds={highlighted} />

      </div>
    </>
  );
}
