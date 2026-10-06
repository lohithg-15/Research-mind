import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, BookOpen, Users, Calendar, Hash, Tag } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useResearch } from '../context/ResearchContext';
import { getPaperLink } from '../utils/paperLinks';

function MetaRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="paper-detail-meta-row">
      <Icon size={13} className="paper-detail-meta-icon" />
      <span className="paper-detail-meta-label">{label}</span>
      <span className="paper-detail-meta-value">{value}</span>
    </div>
  );
}

export default function PaperDetailPage() {
  const { jobId, paperId } = useParams();
  const navigate = useNavigate();
  const { papers } = useResearch();

  // Find paper by id, arxiv_id, or title match
  const paper = papers.find(p =>
    p.id === paperId ||
    p.arxiv_id === paperId ||
    encodeURIComponent(p.id || p.arxiv_id || p.title) === paperId
  );

  const link    = paper ? getPaperLink(paper) : null;
  const authors = Array.isArray(paper?.authors)
    ? paper.authors.join(', ')
    : paper?.authors || '';

  if (!paper) {
    return (
      <AppShell>
        <main className="paper-detail-main">
          <div className="panel-empty">
            <BookOpen size={32} className="rm-muted-icon" />
            <p className="panel-empty-title">Paper not found</p>
            <p className="panel-empty-desc">This paper may not be in the current research session.</p>
            <button className="btn-secondary" onClick={() => navigate(`/research/${jobId}/papers`)}>
              <ArrowLeft size={13} />
              Back to Papers
            </button>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="paper-detail-main">
        {/* Back */}
        <button
          className="paper-detail-back"
          onClick={() => navigate(`/research/${jobId}/papers`)}
          id="back-to-results-btn"
        >
          <ArrowLeft size={14} />
          Back to Papers
        </button>

        <article className="paper-detail-card">
          {/* Title */}
          <h1 className="paper-detail-title">
            {paper.title || 'Untitled Paper'}
          </h1>

          {/* Source link */}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="paper-detail-source-link"
            >
              <ExternalLink size={13} />
              View on source
            </a>
          )}

          {/* Meta */}
          <div className="paper-detail-meta">
            <MetaRow icon={Users}    label="Authors" value={authors} />
            <MetaRow icon={Calendar} label="Year"    value={paper.year?.toString()} />
            <MetaRow icon={BookOpen} label="Venue"   value={paper.venue && paper.venue !== 'Unknown' ? paper.venue : null} />
            <MetaRow icon={Hash}     label="arXiv"   value={paper.arxiv_id} />
            <MetaRow icon={Tag}      label="DOI"     value={paper.doi} />
            {paper.citation_count > 0 && (
              <MetaRow icon={BookOpen} label="Citations" value={`${paper.citation_count}`} />
            )}
            {paper.source && (
              <MetaRow icon={Tag} label="Source" value={
                paper.source === 'merged' ? 'arXiv + Semantic Scholar' :
                paper.source === 'arxiv' ? 'arXiv' : 'Semantic Scholar'
              } />
            )}
          </div>

          {/* Abstract */}
          {paper.abstract && (
            <section className="paper-detail-section">
              <h2 className="paper-detail-section-title">Abstract</h2>
              <p className="paper-detail-abstract">{paper.abstract}</p>
            </section>
          )}

          {/* Extracted fields — only shown if non-empty */}
          {paper.method && paper.method.toLowerCase() !== 'not specified' && (
            <section className="paper-detail-section">
              <h2 className="paper-detail-section-title">Method</h2>
              <p className="paper-detail-field-value">{paper.method}</p>
            </section>
          )}

          {paper.dataset && paper.dataset.toLowerCase() !== 'not specified' && (
            <section className="paper-detail-section">
              <h2 className="paper-detail-section-title">Dataset</h2>
              <p className="paper-detail-field-value">{paper.dataset}</p>
            </section>
          )}

          {paper.key_metric && paper.key_metric.toLowerCase() !== 'not specified' && (
            <section className="paper-detail-section">
              <h2 className="paper-detail-section-title">Key Metric</h2>
              <p className="paper-detail-field-value">{paper.key_metric}</p>
            </section>
          )}

          {paper.limitation && paper.limitation.toLowerCase() !== 'not specified' && (
            <section className="paper-detail-section">
              <h2 className="paper-detail-section-title">Limitation</h2>
              <p className="paper-detail-field-value">{paper.limitation}</p>
            </section>
          )}

          {paper.summary && (
            <section className="paper-detail-section">
              <h2 className="paper-detail-section-title">Summary</h2>
              <p className="paper-detail-field-value">{paper.summary}</p>
            </section>
          )}

          {/* Tags */}
          <div className="paper-detail-tags">
            {paper.full_text_available && (
              <span className="paper-tag paper-tag--green">Full PDF available</span>
            )}
            {paper.verification_status && (
              <span className={`paper-tag paper-tag--${paper.verification_status}`}>
                {paper.verification_status}
              </span>
            )}
            {paper.abstract_only && (
              <span className="paper-tag paper-tag--orange">Abstract only</span>
            )}
          </div>
        </article>
      </main>
    </AppShell>
  );
}
