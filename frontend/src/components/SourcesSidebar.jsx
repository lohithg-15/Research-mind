import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { getPaperLinkWithLabel } from '../utils/paperLinks';

export default function SourcesSidebar({ papers = [], highlightedIds = [] }) {
  if (!papers || papers.length === 0) {
    return (
      <aside className="sidebar-right">
        <div className="sources-header">
          <span>Sources</span>
          <span className="sources-count">0</span>
        </div>
        <div className="rm-sources-empty">
          No sources yet. Run a review to populate.
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar-right">
      <div className="sources-header">
        <span>Sources</span>
        <span className="sources-count">{papers.length}</span>
      </div>
      {papers.map((paper, idx) => {
        const isHighlighted = highlightedIds.includes(paper.id) || highlightedIds.includes(paper.arxiv_id);
        const linkInfo = getPaperLinkWithLabel(paper);
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
            <div className="rm-source-row">
              <FileText size={11} className="rm-source-icon" />
              <div className="rm-source-body">
                {linkInfo ? (
                  <a
                    href={linkInfo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={paper.title || idBadge}
                    className="rm-source-title"
                  >
                    {paper.title || idBadge}
                  </a>
                ) : (
                  <span
                    title={paper.title || idBadge}
                    className="rm-source-title"
                  >
                    {paper.title || idBadge}
                  </span>
                )}

                {/* Year + ID row */}
                <div className="rm-source-meta">
                  <span className="source-year">{displayYear}</span>
                  <span className="source-id">{idBadge}</span>
                  {linkInfo && (
                    <a
                      href={linkInfo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open on ${linkInfo.label}`}
                      onClick={e => e.stopPropagation()}
                      className="rm-source-link"
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
