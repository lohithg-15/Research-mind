import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, BookOpen, GitFork, FileText, Zap, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useResearch } from '../context/ResearchContext';

const EXAMPLE_QUERIES = [
  'Large language models for code generation',
  'Federated learning in healthcare privacy',
  'Diffusion models for image synthesis',
  'Quantum error correction techniques',
];

const FEATURES = [
  { Icon: BookOpen,  title: 'Literature Search',  desc: 'Retrieves papers from arXiv & Semantic Scholar' },
  { Icon: Zap,       title: 'AI Extraction',       desc: 'Extracts methods, metrics and limitations' },
  { Icon: GitFork,   title: 'Gap Detection',       desc: 'Surfaces unexplored research opportunities' },
  { Icon: FileText,  title: 'Report Export',       desc: 'Generates PDF & Word reports automatically' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { submitQuery, clearResearch } = useResearch();
  const [localQuery,  setLocalQuery]  = useState('');
  const [yearMin,     setYearMin]     = useState(2015);
  const [yearMax,     setYearMax]     = useState(new Date().getFullYear());
  const [venueType,   setVenueType]   = useState('any');
  const [keywords,    setKeywords]    = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [localError,  setLocalError]  = useState('');

  const handleSubmit = async (q) => {
    const text = (q ?? localQuery).trim();
    if (!text) { setLocalError('Please enter a research topic.'); return; }
    setLocalError('');
    setSubmitting(true);
    try {
      clearResearch();
      const jid = await submitQuery(text, {
        yearMin: Number(yearMin),
        yearMax: Number(yearMax),
        venueType,
        keywords,
      });
      navigate(`/research/${jid}/progress`);
    } catch (err) {
      setLocalError(err.message || 'Could not start research. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-badge">
            <Sparkles size={11} />
            AI-Powered Literature Review
          </div>
          <h1 className="landing-title">
            Research,{' '}
            <em className="landing-title-em">Synthesized.</em>
          </h1>
          <p className="landing-subtitle">
            Enter a topic. ResearchMind retrieves papers, extracts methods,
            maps the citation graph, surfaces gaps, and compiles a
            publication-grade report — automatically.
          </p>

          {/* Search box */}
          <form
            className="landing-search-form"
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          >
            <div className="landing-search-box">
              <input
                id="landing-query-input"
                type="text"
                className="landing-search-input"
                placeholder="e.g. agentic AI for scientific discovery…"
                value={localQuery}
                onChange={e => { setLocalQuery(e.target.value); setLocalError(''); }}
                autoFocus
                disabled={submitting}
              />
              <button
                type="submit"
                className="landing-search-btn"
                disabled={submitting || !localQuery.trim()}
                id="landing-start-btn"
              >
                {submitting
                  ? <span className="spin-sm" />
                  : <><Sparkles size={14} /> Start Research</>
                }
              </button>
            </div>

            {/* Filter Toggle Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <button
                type="button"
                className="filters-toggle-btn"
                onClick={() => setShowFilters(v => !v)}
                aria-expanded={showFilters}
                aria-controls="landing-advanced-filters"
              >
                <SlidersHorizontal size={13} />
                <span>{showFilters ? 'Hide Filters' : 'Advanced Filters'}</span>
                {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Expandable Advanced Filters Panel */}
            {showFilters && (
              <div id="landing-advanced-filters" className="advanced-filters" style={{ marginTop: '12px', textAlign: 'left' }}>
                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="filter-label" htmlFor="landing-year-min">Year From</label>
                    <input
                      id="landing-year-min"
                      type="number"
                      className="filter-input"
                      value={yearMin}
                      onChange={e => setYearMin(e.target.value)}
                      min="1900"
                      max={yearMax}
                      disabled={submitting}
                    />
                  </div>
                  <div className="filter-group">
                    <label className="filter-label" htmlFor="landing-year-max">Year To</label>
                    <input
                      id="landing-year-max"
                      type="number"
                      className="filter-input"
                      value={yearMax}
                      onChange={e => setYearMax(e.target.value)}
                      min={yearMin}
                      max={new Date().getFullYear() + 2}
                      disabled={submitting}
                    />
                  </div>
                  <div className="filter-group">
                    <label className="filter-label" htmlFor="landing-venue-type">Publication Type</label>
                    <select
                      id="landing-venue-type"
                      className="filter-select"
                      value={venueType}
                      onChange={e => setVenueType(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="any">Any</option>
                      <option value="conference">Conference</option>
                      <option value="journal">Journal</option>
                      <option value="arxiv">arXiv preprint</option>
                      <option value="workshop">Workshop</option>
                    </select>
                  </div>
                  <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="filter-label" htmlFor="landing-keywords">Keywords (comma-separated)</label>
                    <input
                      id="landing-keywords"
                      type="text"
                      className="filter-input"
                      placeholder="e.g. transformer, attention, self-supervised"
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            )}

            {localError && (
              <p className="landing-error" role="alert" style={{ marginTop: '10px' }}>{localError}</p>
            )}
          </form>

          {/* Example queries */}
          <div className="landing-examples">
            <span className="landing-examples-label">Try:</span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                className="landing-example-chip"
                onClick={() => {
                  setLocalQuery(q);
                  setLocalError('');
                }}
                type="button"
                disabled={submitting}
              >
                {q}
                <ArrowRight size={10} />
              </button>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className="landing-features">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon size={18} />
              </div>
              <h3 className="landing-feature-title">{title}</h3>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
