import React, { useState } from 'react';
import {
  FileText, Download, Check, Loader2, BookOpen, Users,
  Calendar, Database, BarChart2, AlertTriangle, ExternalLink,
  ChevronDown, ChevronUp, Hash, Lightbulb, Layers, Info, CheckCircle2, XCircle
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────── */
function renderMarkdown(text = '') {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={key++} style={{ height: 8 }} />); continue; }

    if (trimmed.startsWith('### '))
      elements.push(<h3 key={key++} className="rp-h3">{trimmed.slice(4)}</h3>);
    else if (trimmed.startsWith('## '))
      elements.push(<h2 key={key++} className="rp-h2">{trimmed.slice(3)}</h2>);
    else if (trimmed.startsWith('# '))
      elements.push(<h1 key={key++} className="rp-h1">{trimmed.slice(2)}</h1>);
    else if (trimmed.startsWith('- ') || trimmed.startsWith('• '))
      elements.push(<li key={key++} className="rp-li">{inlineFormat(trimmed.slice(2))}</li>);
    else
      elements.push(<p key={key++} className="rp-p">{inlineFormat(trimmed)}</p>);
  }
  return elements;
}

function inlineFormat(text) {
  // Bold (**text**) and italic (*text*)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*'))
      return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

function getPaperLink(paper) {
  if (paper?.url) return paper.url;
  if (paper?.arxiv_id) return `https://arxiv.org/abs/${paper.arxiv_id}`;
  if (paper?.doi) return `https://doi.org/${paper.doi}`;
  if (paper?.pdf_url) return paper.pdf_url;
  return null;
}

/* ── sub-components ───────────────────────────────────── */
function SectionHeader({ number, title, icon: Icon }) {
  return (
    <div className="rp-section-header">
      <div className="rp-section-num">{number}</div>
      <div className="rp-section-title-row">
        {Icon && <Icon size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />}
        <span className="rp-section-title">{title}</span>
      </div>
    </div>
  );
}

function AbstractCard({ query, paperCount, gapCount, subQueries = [] }) {
  return (
    <div className="rp-abstract-card">
      <div className="rp-abstract-label">Abstract</div>
      <p className="rp-abstract-text">
        This literature review presents a systematic survey of academic research on{' '}
        <strong style={{ color: 'var(--accent-blue)' }}>{query}</strong>.
        A corpus of <strong>{paperCount}</strong> peer-reviewed papers was retrieved from arXiv and
        Semantic Scholar, analyzed for methodology, datasets, and quantitative results, and
        synthesized to identify open research gaps.
        {gapCount > 0 && ` A total of ${gapCount} candidate research gap${gapCount > 1 ? 's were' : ' was'} identified.`}
      </p>
      {subQueries.length > 0 && (
        <div className="rp-keywords-row">
          <span className="rp-kw-label">Search queries:</span>
          {subQueries.map((q, i) => (
            <span key={i} className="rp-kw-chip">{q}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsBanner({ papers = [], comparisonTable = [] }) {
  const arxivCount = papers.filter(p => p.source === 'arxiv').length;
  const s2Count    = papers.filter(p => p.source === 'semantic_scholar').length;
  const mergedCount = papers.filter(p => p.source === 'merged').length;
  const verifiedCount = comparisonTable.filter(r => r.verification_status === 'verified').length;
  const withPdf = papers.filter(p => p.full_text_available).length;

  const stats = [
    { icon: BookOpen,     value: papers.length,    label: 'Papers analysed' },
    { icon: Database,     value: arxivCount,        label: 'From arXiv' },
    { icon: Layers,       value: s2Count + mergedCount, label: 'From Semantic Scholar' },
    { icon: Check,        value: verifiedCount,     label: 'Verified extractions' },
    { icon: FileText,     value: withPdf,           label: 'Full-text PDFs' },
  ];

  return (
    <div className="rp-stats-banner">
      {stats.map(({ icon: Icon, value, label }) => (
        <div key={label} className="rp-stat-item">
          <Icon size={13} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
          <span className="rp-stat-value">{value}</span>
          <span className="rp-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function CompactTable({ data = [] }) {
  if (!data.length) return <p className="rp-p">No comparison data available.</p>;

  const getLink = (row) => {
    if (row.url) return row.url;
    if (row.arxiv_id) return `https://arxiv.org/abs/${row.arxiv_id}`;
    if (row.doi) return `https://doi.org/${row.doi}`;
    return null;
  };

  const statusColor = (s) => ({
    verified:   'var(--accent-green)',
    unverified: 'var(--accent-amber)',
    failed:     'var(--accent-red)',
  })[s] || 'var(--text-muted)';

  return (
    <div className="rp-table-wrap">
      <table className="rp-table">
        <thead>
          <tr>
            <th>#</th><th>Title</th><th>Year</th><th>Method</th>
            <th>Dataset</th><th>Key Metric</th><th>Limitation</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const link = getLink(row);
            return (
              <tr key={row.id || i}>
                <td style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{i + 1}</td>
                <td className="rp-td-title">
                  {link
                    ? <a href={link} target="_blank" rel="noopener noreferrer" className="rp-paper-link">
                        {row.title}
                        <ExternalLink size={9} style={{ flexShrink: 0 }} />
                      </a>
                    : row.title}
                </td>
                <td>{row.year}</td>
                <td>{row.method}</td>
                <td>{row.dataset}</td>
                <td>{row.key_metric}</td>
                <td>{row.limitation}</td>
                <td>
                  <span style={{
                    fontSize: '9px', fontWeight: 600, textTransform: 'uppercase',
                    color: statusColor(row.verification_status), letterSpacing: '0.05em'
                  }}>
                    {row.verification_status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GapSection({ gaps = [] }) {
  const [open, setOpen] = useState({});
  if (!gaps.length)
    return <p className="rp-p">No high-confidence research gaps were detected in this corpus.</p>;

  return (
    <div className="rp-gaps">
      {gaps.map((gap, i) => (
        <div key={gap.gap_id || i} className="rp-gap-card">
          <button
            className="rp-gap-header"
            onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="rp-gap-num">Gap {i + 1}</span>
              <span className="rp-gap-label">{gap.topic_label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="rp-gap-density">
                {gap.citation_density?.toFixed(2)} citations/paper
              </span>
              {open[i] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </button>
          {open[i] && (
            <div className="rp-gap-body">
              <p className="rp-p" style={{ marginBottom: 12 }}>{gap.description}</p>
              {gap.suggested_directions?.length > 0 && (
                <>
                  <p className="rp-gap-directions-label">
                    <Lightbulb size={12} style={{ color: 'var(--accent-amber)' }} />
                    Suggested Future Directions
                  </p>
                  <ul className="rp-gap-directions">
                    {gap.suggested_directions.map((d, j) => (
                      <li key={j} className="rp-li">{d}</li>
                    ))}
                  </ul>
                </>
              )}
              {gap.papers_in_cluster?.length > 0 && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>
                  Papers in cluster: {gap.papers_in_cluster.length}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReferencesSection({ papers = [] }) {
  if (!papers.length) return null;
  return (
    <ol className="rp-refs">
      {papers.map((p, i) => {
        const link = getPaperLink(p);
        const authors = Array.isArray(p.authors)
          ? p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ' et al.' : '')
          : '';
        return (
          <li key={p.id || i} className="rp-ref-item">
            <span className="rp-ref-authors">{authors}</span>
            {authors && ' '}
            {link
              ? <a href={link} target="_blank" rel="noopener noreferrer" className="rp-ref-link">
                  {p.title}
                  <ExternalLink size={9} style={{ marginLeft: 3, flexShrink: 0 }} />
                </a>
              : <span className="rp-ref-title">{p.title}</span>}
            {p.year && <span className="rp-ref-year"> ({p.year})</span>}
            {p.venue && p.venue !== 'Unknown' && (
              <span className="rp-ref-venue"> — {p.venue}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Summary renderer with source attribution badges ── */
const SOURCE_COLORS = {
  'Abstract':    { bg: 'rgba(108,138,255,0.15)', color: '#6c8aff',  border: 'rgba(108,138,255,0.35)' },
  'Method':      { bg: 'rgba(45,212,191,0.12)',  color: '#2dd4bf',  border: 'rgba(45,212,191,0.3)'  },
  'Dataset':     { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa',  border: 'rgba(167,139,250,0.3)' },
  'Key Metric':  { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c',  border: 'rgba(251,146,60,0.3)'  },
  'Limitation':  { bg: 'rgba(248,113,113,0.12)', color: '#f87171',  border: 'rgba(248,113,113,0.3)' },
};

function SummaryWithAttributions({ summary }) {
  const attributions = summary?.attributions;

  // If we have structured attributions, render them with badges
  if (attributions && attributions.length > 0) {
    return (
      <div className="rp-attr-list">
        {attributions.map((attr, i) => {
          const sourceKey = Object.keys(SOURCE_COLORS).find(k =>
            (attr.source || '').toLowerCase().includes(k.toLowerCase())
          );
          const style = sourceKey ? SOURCE_COLORS[sourceKey] : SOURCE_COLORS['Abstract'];
          // Strip the [Source: X] tag from the sentence text for cleaner display
          const cleanSentence = (attr.sentence || '').replace(/\[Source:[^\]]+\]/g, '').trim();
          return (
            <div key={i} className="rp-attr-row">
              <span
                className="rp-attr-badge"
                style={{ background: style.bg, color: style.color, borderColor: style.border }}
              >
                {attr.source || 'General'}
              </span>
              <p className="rp-p rp-attr-text">{cleanSentence}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: plain text, strip [Source: X] tags
  const cleanText = (summary?.summary_text || '').replace(/\[Source:[^\]]+\]/g, '').trim();
  return <p className="rp-p">{cleanText}</p>;
}

/* ── main component ───────────────────────────────────── */
/* Extract only the synthesis section from the full markdown dump (fallback) */
function extractSynthesisFromMarkdown(fullText = '') {
  // The full text has sections 1–4. We want only section 3.
  const m3 = fullText.match(/## 3\..*?\n([\s\S]*?)(?=\n## 4\.|$)/);
  if (m3) return m3[1].trim();
  return '';
}

export default function ReportExport({ jobId, results }) {
  const [downloading, setDownloading] = useState({ pdf: false, docx: false });
  const [completed,   setCompleted]   = useState({ pdf: false, docx: false });

  const query          = results?.query            || '';
  const papers         = results?.papers           || [];
  const compTable      = results?.comparison_table || [];
  const gapClaims      = results?.gap_claims       || [];
  const summaries      = results?.summaries        || [];
  const subQueries     = results?.sub_queries      || [];
  const reportDraft    = results?.report_draft     || {};

  // Prefer the dedicated key; fall back to extracting just section 3 from the full dump.
  // Never use the entire dump (it contains all sections which would duplicate content).
  const synthesisText  = reportDraft?.synthesis_text
    || extractSynthesisFromMarkdown(reportDraft?.text || '')
    || '';

  if (!results) return (
    <div className="panel-empty">
      <FileText size={32} color="var(--text-muted)" />
      <p className="panel-empty-title">No report yet</p>
      <p className="panel-empty-desc">Run a review to generate a full literature report.</p>
    </div>
  );

  const handleDownload = async (format) => {
    setDownloading(p => ({ ...p, [format]: true }));
    try {
      const response = await fetch(`http://localhost:8000/export/${jobId}?format=${format}`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ResearchMind_Report_${String(jobId).slice(0, 8)}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      setCompleted(p => ({ ...p, [format]: true }));
      setTimeout(() => setCompleted(p => ({ ...p, [format]: false })), 3000);
    } catch (err) {
      alert(`Error downloading ${format.toUpperCase()}: ${err.message}`);
    } finally {
      setDownloading(p => ({ ...p, [format]: false }));
    }
  };

  return (
    <div className="rp-root fade-in">

      {/* ── Toolbar ── */}
      <div className="rp-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} style={{ color: 'var(--accent-blue)' }} />
          <span className="rp-toolbar-title">Literature Review Report</span>
          <span className="rp-toolbar-badge">{papers.length} papers</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="export-btn primary" onClick={() => handleDownload('pdf')} disabled={downloading.pdf}>
            {downloading.pdf ? <Loader2 size={12} className="spin" /> : completed.pdf ? <Check size={12} /> : <Download size={12} />}
            {downloading.pdf ? 'Exporting…' : completed.pdf ? 'PDF Saved' : 'Export PDF'}
          </button>
          <button className="export-btn" onClick={() => handleDownload('docx')} disabled={downloading.docx}>
            {downloading.docx ? <Loader2 size={12} className="spin" /> : completed.docx ? <Check size={12} /> : <Download size={12} />}
            {downloading.docx ? 'Exporting…' : completed.docx ? 'DOCX Saved' : 'Export Word'}
          </button>
        </div>
      </div>

      {/* ── Paper ── */}
      <div className="rp-paper">

        {/* Title block */}
        <div className="rp-title-block">
          <div className="rp-paper-tag">Automated Literature Review</div>
          <h1 className="rp-main-title">{query || 'Literature Review'}</h1>
          <div className="rp-meta-row">
            <span className="rp-meta-chip">
              <Calendar size={11} /> {new Date().getFullYear()}
            </span>
            <span className="rp-meta-chip">
              <Database size={11} /> arXiv · Semantic Scholar
            </span>
            <span className="rp-meta-chip">
              <Users size={11} /> ResearchMind AI
            </span>
          </div>
        </div>

        <div className="rp-divider" />

        {/* Abstract */}
        <AbstractCard
          query={query}
          paperCount={papers.length}
          gapCount={gapClaims.length}
          subQueries={subQueries}
        />

        {/* Stats */}
        <StatsBanner papers={papers} comparisonTable={compTable} />

        <div className="rp-divider" />

        {/* Section 1: Introduction */}
        <section className="rp-section">
          <SectionHeader number="1" title="Introduction" icon={BookOpen} />
          <p className="rp-p">
            The rapid evolution of research in <strong>{query}</strong> has produced a large and
            fragmented body of literature, making it difficult for researchers to obtain a
            comprehensive view of current methodological trends, benchmark practices, and open
            research challenges. This automated literature review systematically retrieves,
            extracts, and synthesizes academic publications from arXiv and Semantic Scholar to
            address this gap.
          </p>
          <p className="rp-p">
            A total of <strong>{papers.length}</strong> relevant papers were identified using{' '}
            {subQueries.length} targeted sub-queries decomposed from the main research topic.
            For each paper, structured methodology fields (proposed method, evaluation dataset,
            key metric, and main limitation) were extracted using an LLM-assisted extraction
            pipeline and verified against source text where available.
          </p>
        </section>

        {/* Section 2: Comparison Matrix */}
        <section className="rp-section">
          <SectionHeader number="2" title="Methodology Comparison Matrix" icon={BarChart2} />
          <p className="rp-p" style={{ marginBottom: 12 }}>
            The table below provides a structured comparison of {compTable.length} analysed papers,
            detailing their proposed methods, evaluation datasets, reported metrics, and key
            limitations. Click any paper title to access the original publication.
          </p>
          <CompactTable data={compTable} />
        </section>

        {/* Section 3: Thematic Synthesis */}
        <section className="rp-section">
          <SectionHeader number="3" title="Thematic Literature Survey & Synthesis" icon={Layers} />

          {synthesisText ? (
            /* ── LLM-generated academic synthesis ── */
            <div className="rp-synthesis">
              <div className="rp-synthesis-badge">
                <CheckCircle2 size={11} />
                AI-synthesized academic survey across {summaries.length} papers
              </div>
              {renderMarkdown(synthesisText)}
            </div>
          ) : summaries.length > 0 ? (
            /* ── Fallback: per-paper summaries with attribution ── */
            <div className="rp-synthesis">
              <div className="rp-synthesis-badge rp-synthesis-badge--fallback">
                <Info size={11} />
                Showing individual paper summaries (thematic synthesis unavailable)
              </div>
              {summaries.map((s, i) => (
                <div key={s.paper_id || i} className="rp-summary-item">
                  <p className="rp-summary-title">
                    <Hash size={11} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
                    {s.title}
                  </p>
                  <SummaryWithAttributions summary={s} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rp-empty-section">
              <XCircle size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span>Synthesis not available. Ensure the pipeline completed successfully and includes at least one paper.</span>
            </div>
          )}
        </section>

        {/* Section 4: Research Gaps */}
        <section className="rp-section">
          <SectionHeader number="4" title="Identified Research Gaps" icon={AlertTriangle} />
          <p className="rp-p" style={{ marginBottom: 16 }}>
            The following candidate research gaps were detected by analysing the citation network
            and clustering under-connected areas of the literature. Each gap is accompanied by
            a description and suggested directions for future work.
          </p>
          <GapSection gaps={gapClaims} />
        </section>

        {/* Section 5: References */}
        {papers.length > 0 && (
          <section className="rp-section">
            <SectionHeader number="5" title="References" icon={FileText} />
            <ReferencesSection papers={papers} />
          </section>
        )}

        {/* Footer */}
        <div className="rp-footer">
          <span>Generated by ResearchMind · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>Sources: arXiv.org · Semantic Scholar · LLM: Claude</span>
        </div>

      </div>{/* end rp-paper */}
    </div>
  );
}
