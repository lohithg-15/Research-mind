import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, BookOpen, GitFork, FileText, Zap } from 'lucide-react';
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
  const [localQuery, setLocalQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (q) => {
    const text = (q ?? localQuery).trim();
    if (!text) { setLocalError('Please enter a research topic.'); return; }
    setLocalError('');
    setSubmitting(true);
    try {
      clearResearch();
      const jid = await submitQuery(text, {
        yearMin: 2015, yearMax: new Date().getFullYear(),
        venueType: 'any', keywords: '',
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
            {localError && (
              <p className="landing-error" role="alert">{localError}</p>
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
