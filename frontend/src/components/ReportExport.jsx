import React, { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { getPaperLink } from '../utils/paperLinks';

export default function ReportExport({ results }) {
  const [includeTable, setIncludeTable] = useState(true);
  const papers = results?.papers || [];
  const gaps = results?.gap_claims || [];
  const comparison = results?.comparison_table || [];
  const query = results?.query || 'Literature review';
  const summary = results?.summary || 'This research workspace contains a synthesized review of the collected literature.';
  const filename = useMemo(() => `${query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'research-report'}.txt`, [query]);

  function exportReport() {
    const content = [`${query}\n`, summary, `\nPapers reviewed: ${papers.length}`, `Research gaps: ${gaps.length}`];
    if (includeTable) content.push('\nComparison\n', ...comparison.map((paper, index) => `${index + 1}. ${paper.title || 'Untitled'} — ${paper.method || 'Method not specified'}`));
    const blob = new Blob([content.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="rm-report-layout">
      <article className="rm-report-preview">
        <div className="rm-report-kicker"><FileText size={15} /> Research report</div>
        <h1>{query}</h1>
        <p className="rm-report-summary">{summary}</p>
        <div className="rm-report-stats"><span>{papers.length} papers</span><span>{gaps.length} gaps</span><span>{comparison.length} comparisons</span></div>
        <section><h2>Key papers</h2>{papers.slice(0, 8).map((paper, index) => <div className="rm-report-paper" key={paper.id || index}><div><strong>{paper.title || 'Untitled paper'}</strong><span>{paper.year || 'Year unavailable'} · {paper.venue || 'Venue unavailable'}</span></div>{getPaperLink(paper) && <a href={getPaperLink(paper)} target="_blank" rel="noopener noreferrer">View source</a>}</div>)}</section>
        <section><h2>Research gaps</h2>{gaps.length ? gaps.map((gap, index) => <div className="rm-report-gap" key={gap.gap_id || index}><strong>{gap.topic_label || `Gap ${index + 1}`}</strong><p>{gap.description || gap.gap}</p></div>) : <p>No gaps were identified.</p>}</section>
      </article>
      <aside className="rm-report-options"><h2>Export report</h2><label className="rm-check"><input type="checkbox" checked={includeTable} onChange={event => setIncludeTable(event.target.checked)} /> Include comparison table</label><button type="button" className="rm-btn rm-btn-primary rm-btn-md" onClick={exportReport}><Download size={14} /> Export .txt</button></aside>
    </div>
  );
}
