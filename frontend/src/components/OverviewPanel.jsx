import React, { useState } from 'react';
import {
  BookOpen, BarChart3, Target, Search, Database,
  Layers, ChevronDown, ChevronUp, ExternalLink, Hash
} from 'lucide-react';

function getPaperLink(paper) {
  if (paper?.url) return paper.url;
  if (paper?.arxiv_id) return `https://arxiv.org/abs/${paper.arxiv_id}`;
  if (paper?.doi) return `https://doi.org/${paper.doi}`;
  if (paper?.pdf_url) return paper.pdf_url;
  return null;
}

export default function OverviewPanel({ results, onTabChange }) {
  const [expandedAbstracts, setExpandedAbstracts] = useState({});
  const [showAllPapers, setShowAllPapers] = useState(false);

  const papers      = results?.papers || [];
  const compTable   = results?.comparison_table || [];
  const gapClaims   = results?.gap_claims || [];
  const subQueries  = results?.sub_queries || [];
  const paperCount  = compTable.length || papers.length;

  const arxivCount  = papers.filter(p => p.source === 'arxiv').length;
  const s2Count     = papers.filter(p => p.source === 'semantic_scholar' || p.source === 'merged').length;
  const withPdf     = papers.filter(p => p.full_text_available).length;
  const verifiedCount = compTable.filter(r => r.verification_status === 'verified').length;

  const accuracy = paperCount > 0 ? Math.round((verifiedCount / paperCount) * 100) : null;

  const displayedPapers = showAllPapers ? papers : papers.slice(0, 8);

  const toggleAbstract = (id) =>
    setExpandedAbstracts(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="fade-in">

      {/* ── Stat cards ── */}
      <div className="overview-stats">
        <div className="stat-card">
          <div className="stat-value">{paperCount}</div>
          <div className="stat-label">Papers reviewed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{gapClaims.length}</div>
          <div className="stat-label">Research gaps</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{verifiedCount}</div>
          <div className="stat-label">Verified extractions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy != null ? `${accuracy}%` : '—'}</div>
          <div className="stat-label">Extraction accuracy</div>
        </div>
      </div>

      {/* ── Source breakdown ── */}
      {papers.length > 0 && (
        <div className="differentiator-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={13} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{arxivCount}</strong> from arXiv
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={13} style={{ color: 'var(--accent-purple)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{s2Count}</strong> from Semantic Scholar
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={13} style={{ color: 'var(--accent-teal)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{withPdf}</strong> full-text PDFs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-queries used ── */}
      {subQueries.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Sub-queries used
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {subQueries.map((q, i) => (
              <span key={i} style={{
                fontSize: '11px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
                color: 'var(--text-secondary)',
              }}>
                <Hash size={9} style={{ display: 'inline', marginRight: 3, color: 'var(--accent-blue)' }} />
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Differentiator callout ── */}
      <div className="differentiator-card" style={{ marginBottom: 20 }}>
        <span className="differentiator-tag">Differentiator</span>
        <p className="differentiator-text">
          Every gap claim carries its exact supporting subgraph — open the{' '}
          <span className="differentiator-link" style={{ cursor: 'pointer' }} onClick={() => onTabChange?.('gap')}>
            Gap Evidence
          </span>{' '}
          tab and select a claim to see it{' '}
          <strong style={{ color: 'var(--accent-purple)' }}>highlighted</strong>{' '}
          in the source rail. View the full report in the{' '}
          <span className="differentiator-link" style={{ cursor: 'pointer' }} onClick={() => onTabChange?.('report')}>
            Report
          </span>{' '}
          tab.
        </p>
      </div>

      {/* ── Papers list ── */}
      {papers.length > 0 && (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Retrieved Papers ({papers.length})
            </span>
            <button
              onClick={() => onTabChange?.('comparison')}
              style={{ fontSize: '11px', color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              View comparison matrix →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayedPapers.map((paper, i) => {
              const link = getPaperLink(paper);
              const isExpanded = expandedAbstracts[paper.id];
              const abstract = paper.abstract || '';
              const shortAbstract = abstract.length > 200 ? abstract.slice(0, 200) + '…' : abstract;
              const authors = Array.isArray(paper.authors)
                ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
                : '';

              return (
                <div key={paper.id || i} className="overview-paper-card">
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {link ? (
                        <a
                          href={link} target="_blank" rel="noopener noreferrer"
                          className="overview-paper-title-link"
                        >
                          {paper.title}
                          <ExternalLink size={10} style={{ marginLeft: 4, flexShrink: 0 }} />
                        </a>
                      ) : (
                        <span className="overview-paper-title">{paper.title}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)',
                      flexShrink: 0, background: 'rgba(108,138,255,0.1)',
                      padding: '2px 6px', borderRadius: 4
                    }}>
                      {paper.year}
                    </span>
                  </div>

                  {/* Authors + venue */}
                  {(authors || (paper.venue && paper.venue !== 'Unknown')) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                      {authors}{authors && paper.venue && paper.venue !== 'Unknown' ? ' · ' : ''}{paper.venue !== 'Unknown' ? paper.venue : ''}
                    </div>
                  )}

                  {/* Abstract */}
                  {abstract && (
                    <div style={{ marginTop: 6 }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {isExpanded ? abstract : shortAbstract}
                      </p>
                      {abstract.length > 200 && (
                        <button
                          onClick={() => toggleAbstract(paper.id)}
                          style={{
                            fontSize: '10px', color: 'var(--accent-blue)', background: 'none',
                            border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2,
                            display: 'flex', alignItems: 'center', gap: 3
                          }}
                        >
                          {isExpanded ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> Read more</>}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {paper.source && (
                      <span style={{
                        fontSize: '9px', padding: '2px 6px',
                        borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: paper.source === 'arxiv' ? 'rgba(45,212,191,0.1)' : 'rgba(167,139,250,0.1)',
                        color: paper.source === 'arxiv' ? 'var(--accent-teal)' : 'var(--accent-purple)',
                        border: `1px solid ${paper.source === 'arxiv' ? 'rgba(45,212,191,0.2)' : 'rgba(167,139,250,0.2)'}`,
                      }}>
                        {paper.source === 'merged' ? 'arXiv + S2' : paper.source === 'arxiv' ? 'arXiv' : 'Semantic Scholar'}
                      </span>
                    )}
                    {paper.citation_count > 0 && (
                      <span style={{
                        fontSize: '9px', padding: '2px 6px', borderRadius: 3,
                        background: 'rgba(108,138,255,0.08)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}>
                        {paper.citation_count} citations
                      </span>
                    )}
                    {paper.full_text_available && (
                      <span style={{
                        fontSize: '9px', padding: '2px 6px', borderRadius: 3,
                        background: 'rgba(52,211,153,0.08)',
                        color: 'var(--accent-green)',
                        border: '1px solid rgba(52,211,153,0.2)',
                      }}>
                        Full PDF
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {papers.length > 8 && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllPapers(v => !v)}
              style={{ marginTop: 10 }}
            >
              {showAllPapers
                ? <><ChevronUp size={12} /> Show less</>
                : <><ChevronDown size={12} /> Show all {papers.length} papers</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
