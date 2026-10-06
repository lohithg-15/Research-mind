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
          <Link to="/login" className="rm-btn rm-btn-ghost rm-btn-sm">Sign in</Link>
          <Button size="sm" onClick={handleStart}>Start for free</Button>
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
              Start for free
            </Button>
            <Button size="lg" variant="secondary" as={Link} to="/login">
              Sign in
            </Button>
          </div>
          <div className="rm-landing-proof-row">
            <span>Used for literature reviews in ML, bio & materials science</span>
          </div>
        </section>

        <section className="rm-landing-preview">
          <div className="rm-landing-preview-frame" role="img" aria-label="Product preview">
            <FileText size={40} />
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
