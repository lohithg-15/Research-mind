import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

export default function SourcesSidebar({ papers = [], highlightedIds = [] }) {
  if (!papers || papers.length === 0) {
    return (
      <aside className="sidebar-right">
        <div className="sources-header">
          <span>Sources</span>
          <span className="sources-count">0</span>
        </div>
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          No sources yet. Run a review to populate.
        </div>
      </aside>
    );
  }

  /**
   * Resolves the best available link for a paper:
   * 1. Human-readable page (arXiv abstract / S2 / DOI)
   * 2. PDF URL
   */
  const getPaperLink = (paper) => {
    if (paper.url) return { href: paper.url, label: 'Open paper' };
    if (paper.arxiv_id) return { href: `https://arxiv.org/abs/${paper.arxiv_id}`, label: 'arXiv' };
    if (paper.doi) return { href: `https://doi.org/${paper.doi}`, label: 'DOI' };
    if (paper.pdf_url) return { href: paper.pdf_url, label: 'PDF' };
    return null;
  };

  return (
    <aside className="sidebar-right">
      <div className="sources-header">
        <span>Sources</span>
        <span className="sources-count">{papers.length}</span>
      </div>
      {papers.map((paper, idx) => {
        const isHighlighted = highlightedIds.includes(paper.id) || highlightedIds.includes(paper.arxiv_id);
        const linkInfo = getPaperLink(paper);
        const displayYear = paper.year || '—';

        // Show arXiv ID badge or a short ID badge
        const idBadge = paper.arxiv_id
          ? paper.arxiv_id
          : paper.id
            ? String(paper.id).slice(0, 12)
            : `paper-${idx}`;

        return (
          <div
            key={paper.id || idx}
            className={`source-item ${isHighlighted ? 'highlighted' : ''}`}
          >
            {/* Paper icon + title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', minWidth: 0 }}>
              <FileText size={11} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
              <div style={{ minWidth: 0 }}>
                {linkInfo ? (
                  <a
                    href={linkInfo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={paper.title || idBadge}
                    style={{
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      fontSize: '11px',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.textDecoration = 'none'; }}
                  >
                    {paper.title || idBadge}
                  </a>
                ) : (
                  <span
                    title={paper.title || idBadge}
                    style={{
                      fontSize: '11px',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {paper.title || idBadge}
                  </span>
                )}

                {/* Year + ID row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span className="source-year">{displayYear}</span>
                  <span className="source-id" style={{ fontSize: '9px' }}>{idBadge}</span>
                  {linkInfo && (
                    <a
                      href={linkInfo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open on ${linkInfo.label}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        color: 'var(--accent-blue)',
                        fontSize: '9px',
                        textDecoration: 'none',
                        opacity: 0.8,
                      }}
                    >
                      <ExternalLink size={9} />
                      {linkInfo.label}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
