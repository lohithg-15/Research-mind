import React from 'react';
import { ExternalLink, FileText, FileSearch } from 'lucide-react';
import { getPaperLinkWithLabel } from '../utils/paperLinks';
import EmptyState from './ui/EmptyState';
import './papers.css';

export default function SourcesSidebar({ papers = [], highlightedIds = [] }) {
  return (
    <aside className="rm-sources" aria-label="Sources">
      <div className="rm-sources-header">
        <h2>Sources</h2>
        <span className="rm-source-meta">{papers?.length || 0}</span>
      </div>
      {!papers?.length ? (
        <EmptyState icon={<FileSearch size={20} />} title="No sources yet" description="Sources appear here as papers are retrieved." />
      ) : (
        <div className="rm-source-list">
          {papers.map((paper, idx) => {
            const highlighted = highlightedIds.includes(paper.id) || highlightedIds.includes(paper.arxiv_id);
            const linkInfo = getPaperLinkWithLabel(paper);
            const idBadge = paper.arxiv_id || (paper.id ? String(paper.id).slice(0, 12) : `paper-${idx}`);
            const title = paper.title || idBadge;
            return (
              <div key={paper.id || idx} className={`rm-source-item${highlighted ? ' rm-source-item-hl' : ''}`}>
                <div className="rm-source-row">
                  <FileText size={13} className="rm-source-icon" />
                  <div className="rm-source-body">
                    {linkInfo
                      ? <a href={linkInfo.href} target="_blank" rel="noopener noreferrer" title={title} className="rm-source-title">{title}</a>
                      : <span title={title} className="rm-source-title">{title}</span>}
                    <div className="rm-source-meta">
                      <span>{paper.year || '—'}</span>
                      <span className="rm-mono">{idBadge}</span>
                      {linkInfo && (
                        <a href={linkInfo.href} target="_blank" rel="noopener noreferrer" className="rm-source-link" aria-label={`Open on ${linkInfo.label}`}>
                          <ExternalLink size={10} />{linkInfo.label}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
