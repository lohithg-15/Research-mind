import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, GitFork, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Wordmark from '../components/ui/Wordmark';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './LandingPage.css';

const FEATURES = [
  { Icon: BookOpen, title: 'Literature search', desc: 'Retrieves papers from arXiv & Semantic Scholar.' },
  { Icon: Sparkles,  title: 'AI extraction',     desc: 'Extracts methods, metrics and limitations.' },
  { Icon: GitFork,   title: 'Gap detection',     desc: 'Surfaces unexplored research opportunities.' },
];

const MOCK_TABS = ['Papers', 'Overview', 'Comparison', 'Gaps', 'Graph', 'Assistant', 'Reports'];
const MOCK_STATS = [['76', 'Papers'], ['12', 'Methods'], ['5', 'Research gaps'], ['9', 'Datasets']];
const MOCK_PAPERS = [
  ['Evaluating large language models trained on code', '2021 · 4,210 citations'],
  ['Competition-level code generation with AlphaCode', '2022 · 1,380 citations'],
  ['Code Llama: open foundation models for code', '2023 · 960 citations'],
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  function handleStart() {
    navigate(isAuthenticated ? '/research/new' : '/signup');
  }

  return (
    <div>
      <header className="rm-landing-header">
        <Link to="/" aria-label="ResearchMind home">
          <Wordmark size={16} />
        </Link>
        <div className="rm-landing-header-actions">
          {!isAuthenticated && <Link to="/login" className="rm-btn rm-btn-ghost rm-btn-sm">Sign in</Link>}
          <Button size="sm" onClick={handleStart}>{isAuthenticated ? 'New research' : 'Start for free'}</Button>
        </div>
      </header>

      <main>
        <section className="rm-landing-hero">
          <span className="rm-landing-badge">
            <Sparkles size={11} />
            AI-Powered Literature Review
          </span>
          <h1 className="rm-landing-title">
            Research,{' '}
            <em className="rm-landing-title-em">Synthesized.</em>
          </h1>
          <p className="rm-landing-subtitle">
            Enter a topic. ResearchMind retrieves papers, extracts methods,
            maps the citation graph, surfaces gaps, and compiles a
            publication-grade report — automatically.
          </p>
          <div className="rm-landing-cta-row">
            <Button size="lg" icon={<Sparkles size={15} />} onClick={handleStart}>
              {isAuthenticated ? 'New research' : 'Start for free'}
            </Button>
            {!isAuthenticated && (
              <Button size="lg" variant="secondary" as={Link} to="/login">
                Sign in
              </Button>
            )}
          </div>
          <div className="rm-landing-proof-row">
            <span>Used for literature reviews in ML, bio & materials science</span>
          </div>
        </section>

        <section className="rm-landing-preview">
          <div className="rm-landing-preview-frame" role="img" aria-label="Preview of a ResearchMind workspace">
            <div className="rm-mock" aria-hidden="true">
              <div className="rm-mock-bar">
                <span className="rm-mock-dot" /><span className="rm-mock-dot" /><span className="rm-mock-dot" />
                <span className="rm-mock-url">Large language models for code generation</span>
              </div>
              <div className="rm-mock-tabs">
                {MOCK_TABS.map((tab, i) => <span key={tab} className={i === 0 ? 'rm-mock-tab rm-mock-tab-active' : 'rm-mock-tab'}>{tab}</span>)}
              </div>
              <div className="rm-mock-stats">
                {MOCK_STATS.map(([value, label]) => (
                  <div key={label} className="rm-mock-stat"><strong>{value}</strong><span>{label}</span></div>
                ))}
              </div>
              <div className="rm-mock-list">
                {MOCK_PAPERS.map(([title, meta]) => (
                  <div key={title} className="rm-mock-paper">
                    <FileText size={16} />
                    <div><strong>{title}</strong><span>{meta}</span></div>
                    <em>arXiv</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rm-landing-features">
          {FEATURES.map(({ Icon, title, desc }) => (
            <Card key={title}>
              <div className="rm-landing-feature-icon">
                <Icon size={18} />
              </div>
              <h3 className="rm-landing-feature-title">{title}</h3>
              <p className="rm-landing-feature-desc">{desc}</p>
            </Card>
          ))}
        </section>
      </main>

      <footer className="rm-landing-footer">
        © {new Date().getFullYear()} ResearchMind. All rights reserved.
      </footer>
    </div>
  );
}
