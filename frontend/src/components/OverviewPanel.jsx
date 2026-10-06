import React from 'react';
import { BookOpen, Search, GitFork } from 'lucide-react';
import { getPaperLink } from '../utils/paperLinks';

export default function OverviewPanel({ results, onTabChange }) {
  const papers = results?.papers || [];
  const gaps = results?.gap_claims || [];
  const comparison = results?.comparison_table || [];
  const queries = results?.sub_queries || [];
  const pdfs = papers.filter(paper => paper.full_text_available).length;
  const stats = [[papers.length, 'Papers reviewed'], [gaps.length, 'Research gaps'], [pdfs, 'Full-text PDFs'], [papers.length ? `${Math.round((pdfs / papers.length) * 100)}%` : '—', 'PDF coverage']];
  return <div className="rm-overview">
    <div className="rm-overview-stats">{stats.map(([value, label]) => <div className="rm-stat-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <section className="rm-overview-card"><h2>Research summary</h2><p>{results?.summary || 'This review synthesizes the collected literature and highlights opportunities for further research.'}</p></section>
    {queries.length > 0 && <section className="rm-overview-section"><h2><Search size={15} /> Search queries</h2><div className="rm-chip-list">{queries.map(query => <span className="rm-chip" key={query}>{query}</span>)}</div></section>}
    <section className="rm-overview-section"><div className="rm-section-heading"><h2><GitFork size={15} /> Top gaps</h2><button type="button" className="rm-link-button" onClick={() => onTabChange?.('gaps')}>View all</button></div>{gaps.slice(0, 3).map((gap, index) => <div className="rm-overview-gap" key={gap.gap_id || index}><strong>{gap.topic_label || `Gap ${index + 1}`}</strong><span>{gap.description || gap.gap}</span></div>)}</section>
    <section className="rm-overview-section"><div className="rm-section-heading"><h2><BookOpen size={15} /> Key papers</h2><button type="button" className="rm-link-button" onClick={() => onTabChange?.('comparison')}>Comparison</button></div>{(comparison.length ? comparison : papers).slice(0, 6).map((paper, index) => <div className="rm-overview-paper" key={paper.id || index}><div><strong>{paper.title || 'Untitled paper'}</strong><span>{paper.year || 'Year unavailable'} · {paper.venue || 'Venue unavailable'}</span></div>{getPaperLink(paper) && <a href={getPaperLink(paper)} target="_blank" rel="noopener noreferrer">Source</a>}</div>)}</section>
  </div>;
}
