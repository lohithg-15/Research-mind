import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, SlidersHorizontal, ChevronDown, AlertCircle, Plus, Clock } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../context/ResearchContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Pill from '../components/ui/Pill';
import { Textarea, Input } from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import './NewResearchPage.css';

const API_BASE = 'http://localhost:8000';

const MODES = [
  { key: 'any',        label: 'Any' },
  { key: 'conference',  label: 'Conference' },
  { key: 'journal',     label: 'Journal' },
  { key: 'arxiv',       label: 'arXiv preprint' },
  { key: 'workshop',    label: 'Workshop' },
];

const DEPTHS = [
  { key: 10, label: 'Quick (10 papers)' },
  { key: 20, label: 'Standard (20 papers)' },
  { key: 40, label: 'Deep (40 papers)' },
];

const EXAMPLE_QUERIES = [
  'Large language models for code generation',
  'Federated learning in healthcare privacy',
  'Diffusion models for image synthesis',
];

export default function NewResearchPage() {
  const navigate = useNavigate();
  const { authHeaders, isAuthenticated } = useAuth();
  const {
    submitQuery, clearResearch,
    yearMin, setYearMin, yearMax, setYearMax,
    keywords, setKeywords,
    maxPapers, setMaxPapers,
  } = useResearch();

  const [topic, setTopic] = useState('');
  const [venueType, setVenueType] = useState('any');
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [listTab, setListTab] = useState('recent');
  const [sessions, setSessions] = useState([]);
  const filtersRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/history`, { headers: authHeaders() });
        if (res.ok) setSessions(await res.json());
      } catch { /* ignore */ }
    })();
  }, [isAuthenticated, authHeaders]);

  useEffect(() => {
    if (!showFilters) return;
    function handleClick(e) {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setShowFilters(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilters]);

  const handleSubmit = useCallback(async (q) => {
    const text = (q ?? topic).trim();
    if (!text) { setError('Please enter a research topic.'); return; }
    setError('');
    setSubmitting(true);
    try {
      clearResearch();
      const jid = await submitQuery(text, { yearMin, yearMax, venueType, keywords });
      navigate(`/research/${jid}/progress`);
    } catch (err) {
      setError(err.message || 'Could not start research. Is the backend running?');
      setSubmitting(false);
    }
  }, [topic, yearMin, yearMax, venueType, keywords, clearResearch, submitQuery, navigate]);

  const depthLabel = DEPTHS.find(d => d.key === maxPapers)?.label || 'Standard (20 papers)';

  const displayedSessions = listTab === 'recent' ? sessions.slice(0, 6) : sessions;

  return (
    <AppShell>
      <main className="rm-newresearch-main">
        <h1 className="rm-newresearch-heading">What are you researching?</h1>

        <div className="rm-newresearch-modes">
          {MODES.map(m => (
            <Pill key={m.key} active={venueType === m.key} onClick={() => setVenueType(m.key)}>
              {m.label}
            </Pill>
          ))}
        </div>

        <Card className="rm-newresearch-composer">
          <Textarea
            className="rm-newresearch-textarea"
            placeholder="e.g. Transformer architectures for protein structure prediction"
            value={topic}
            onChange={e => { setTopic(e.target.value); setError(''); }}
            rows={3}
            disabled={submitting}
            autoFocus
          />

          <div className="rm-newresearch-toolbar">
            <Button variant="ghost" size="sm" icon={<Plus size={14} />} aria-label="Add attachment" />

            <div style={{ position: 'relative' }} ref={filtersRef}>
              <Button
                variant="ghost"
                size="sm"
                icon={<SlidersHorizontal size={14} />}
                onClick={() => setShowFilters(v => !v)}
                aria-expanded={showFilters}
              >
                Filters
              </Button>
              {showFilters && (
                <div className="rm-newresearch-filters-panel">
                  <div className="rm-newresearch-filters-row">
                    <div className="rm-newresearch-filters-field">
                      <label className="rm-newresearch-filters-label" htmlFor="nr-year-min">Year from</label>
                      <Input
                        id="nr-year-min"
                        type="number"
                        value={yearMin}
                        onChange={e => setYearMin(e.target.value)}
                        min="1900"
                        max={yearMax}
                      />
                    </div>
                    <div className="rm-newresearch-filters-field">
                      <label className="rm-newresearch-filters-label" htmlFor="nr-year-max">Year to</label>
                      <Input
                        id="nr-year-max"
                        type="number"
                        value={yearMax}
                        onChange={e => setYearMax(e.target.value)}
                        min={yearMin}
                        max={new Date().getFullYear() + 2}
                      />
                    </div>
                  </div>
                  <div className="rm-newresearch-filters-field">
                    <label className="rm-newresearch-filters-label" htmlFor="nr-keywords">Keywords (comma-separated)</label>
                    <Input
                      id="nr-keywords"
                      type="text"
                      placeholder="e.g. transformer, attention"
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Dropdown
              trigger={
                <Button variant="ghost" size="sm" icon={<ChevronDown size={14} />}>
                  {depthLabel.split(' (')[0]}
                </Button>
              }
              items={DEPTHS.map(d => ({
                key: d.key,
                label: d.label,
                onSelect: () => setMaxPapers(d.key),
              }))}
            />

            <div className="rm-newresearch-toolbar-spacer" />

            <Button
              className="rm-newresearch-send"
              onClick={() => handleSubmit()}
              loading={submitting}
              disabled={!topic.trim()}
              aria-label="Start research"
            >
              <Sparkles size={16} />
            </Button>
          </div>

          {error && (
            <div className="rm-newresearch-error" role="alert">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </Card>

        <div className="rm-newresearch-examples">
          {EXAMPLE_QUERIES.map(q => (
            <Pill key={q} onClick={() => { setTopic(q); setError(''); }}>
              {q}
            </Pill>
          ))}
        </div>

        {isAuthenticated && (
          <section className="rm-newresearch-yours">
            <h2 className="rm-newresearch-yours-title">Your research</h2>
            <Tabs
              tabs={[
                { key: 'recent', label: 'Recent' },
                { key: 'all', label: 'All' },
              ]}
              activeKey={listTab}
              onChange={setListTab}
            />
            <div className="rm-newresearch-yours-list">
              {displayedSessions.length === 0 ? (
                <EmptyState
                  icon={<Clock size={20} />}
                  title="No research yet"
                  description="Run a query above to start your first research session."
                />
              ) : (
                displayedSessions.map(s => (
                  <Card
                    key={s.id}
                    hoverable
                    className="rm-newresearch-yours-item"
                    onClick={() => navigate(`/research/${s.id}/papers`)}
                  >
                    <span className="rm-newresearch-yours-item-title">{s.title || s.query}</span>
                    <span className="rm-newresearch-yours-item-date">
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </Card>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
