import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useResearch } from '../context/ResearchContext';

export default function NewResearchPage() {
  const navigate = useNavigate();
  const { submitQuery, clearResearch } = useResearch();

  const [topic,      setTopic]      = useState('');
  const [yearMin,    setYearMin]    = useState(2015);
  const [yearMax,    setYearMax]    = useState(new Date().getFullYear());
  const [venueType,  setVenueType]  = useState('any');
  const [keywords,   setKeywords]   = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting]  = useState(false);
  const [error,      setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) { setError('Please enter a research topic.'); return; }
    setError('');
    setSubmitting(true);
    try {
      clearResearch();
      const jid = await submitQuery(topic.trim(), { yearMin, yearMax, venueType, keywords });
      navigate(`/research/${jid}/progress`);
    } catch (err) {
      setError(err.message || 'Could not start research. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="new-research-main">
        <div className="new-research-card">
          <h1 className="new-research-title">New Research</h1>
          <p className="new-research-subtitle">
            Enter a research topic and ResearchMind will find papers, extract insights, and compile a report.
          </p>

          <form onSubmit={handleSubmit} className="new-research-form">
            {/* Topic input */}
            <div className="new-research-field">
              <label className="filter-label" htmlFor="research-topic">Research Topic</label>
              <textarea
                id="research-topic"
                className="new-research-textarea"
                placeholder="e.g. Transformer architectures for protein structure prediction"
                value={topic}
                onChange={e => { setTopic(e.target.value); setError(''); }}
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Advanced filters toggle */}
            <button
              type="button"
              className="filters-toggle-btn"
              onClick={() => setShowFilters(v => !v)}
              aria-expanded={showFilters}
              aria-controls="advanced-filters"
            >
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Advanced Filters
            </button>

            {showFilters && (
              <div id="advanced-filters" className="advanced-filters">
                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="filter-label" htmlFor="new-year-min">Year From</label>
                    <input
                      id="new-year-min"
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
                    <label className="filter-label" htmlFor="new-year-max">Year To</label>
                    <input
                      id="new-year-max"
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
                    <label className="filter-label" htmlFor="new-venue-type">Publication Type</label>
                    <select
                      id="new-venue-type"
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
                    <label className="filter-label" htmlFor="new-keywords">Keywords (comma-separated)</label>
                    <input
                      id="new-keywords"
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

            {error && (
              <div className="error-inline" role="alert">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="new-research-submit"
              disabled={submitting || !topic.trim()}
              id="new-research-submit-btn"
            >
              {submitting
                ? <><span className="spin-sm" /> Starting…</>
                : <><Sparkles size={15} /> Start Research</>
              }
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
