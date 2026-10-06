import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SlidersHorizontal, X, ExternalLink, ChevronDown, ChevronUp, FileSearch } from 'lucide-react';
import { useResearch } from '../../context/ResearchContext';
import { getPaperLink } from '../../utils/paperLinks';

const SORT_OPTIONS = [
  { value: 'year-desc',        label: 'Year (Newest)' },
  { value: 'year-asc',         label: 'Year (Oldest)' },
  { value: 'citations-desc',   label: 'Most Cited' },
  { value: 'title-asc',        label: 'Title A–Z' },
];

function PaperCard({ paper, jobId }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const link = getPaperLink(paper);
  const abstract  = paper.abstract || '';
  const shortAbs  = abstract.length > 200 ? abstract.slice(0, 200) + '…' : abstract;
  const authors   = Array.isArray(paper.authors)
    ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
    : '';

  return (
    <article className="paper-card">
      <div className="paper-card-top">
        <div className="paper-card-meta">
          {paper.year && <span className="paper-card-year">{paper.year}</span>}
          {paper.source && (
            <span className={`paper-card-source ${paper.source === 'arxiv' ? 'arxiv' : 'semantic'}`}>
              {paper.source === 'merged' ? 'arXiv + S2' : paper.source === 'arxiv' ? 'arXiv' : 'Semantic Scholar'}
            </span>
          )}
          {paper.full_text_available && (
            <span className="paper-card-pdf">Full PDF</span>
          )}
        </div>
        <button type="button" className="paper-card-title rm-paper-title-button" onClick={() => navigate(`/research/${jobId}/paper/${encodeURIComponent(paper.id || paper.arxiv_id || paper.title)}`)}>
          {paper.title || 'Untitled'}
        </button>
        {(authors || paper.venue) && (
          <p className="paper-card-authors">
            {authors}
            {authors && paper.venue && paper.venue !== 'Unknown' ? ' · ' : ''}
            {paper.venue && paper.venue !== 'Unknown' ? paper.venue : ''}
            {paper.citation_count > 0 ? ` · ${paper.citation_count} citations` : ''}
          </p>
        )}
      </div>

      {abstract && (
        <div className="paper-card-abstract">
          <p>{expanded ? abstract : shortAbs}</p>
          {abstract.length > 200 && (
            <button className="paper-card-expand" onClick={() => setExpanded(v => !v)}>
              {expanded ? <><ChevronUp size={11}/> Show less</> : <><ChevronDown size={11}/> Read more</>}
            </button>
          )}
        </div>
      )}

      <div className="paper-card-actions">
        <button
          className="rm-btn rm-btn-secondary rm-btn-sm"
          onClick={() => navigate(`/research/${jobId}/paper/${encodeURIComponent(paper.id || paper.arxiv_id || paper.title)}`)}
          id={`view-paper-${paper.id}`}
        >
          <FileSearch size={12} />
          View Paper
        </button>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="rm-btn rm-btn-ghost rm-btn-sm"
            title="Open source"
          >
            <ExternalLink size={12} />
            Read Source
          </a>
        )}
      </div>
    </article>
  );
}

export default function PapersTab() {
  const { jobId } = useParams();
  const { papers } = useResearch();

  const [sortKey,      setSortKey]      = useState('year-desc');
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [filterYear,   setFilterYear]   = useState([1900, new Date().getFullYear()]);
  const [filterSource, setFilterSource] = useState('all');
  const [filterFullPdf,setFilterFullPdf]= useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');

  const filtered = useMemo(() => {
    let list = papers;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (Array.isArray(p.authors) ? p.authors.join(' ') : '').toLowerCase().includes(q) ||
        (p.abstract || '').toLowerCase().includes(q)
      );
    }
    if (filterSource !== 'all') {
      list = list.filter(p => p.source === filterSource || (filterSource === 'merged' && p.source === 'merged'));
    }
    if (filterFullPdf) {
      list = list.filter(p => p.full_text_available);
    }
    list = list.filter(p => {
      if (!p.year) return true;
      return p.year >= filterYear[0] && p.year <= filterYear[1];
    });
    return list;
  }, [papers, searchTerm, filterSource, filterFullPdf, filterYear]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'year-asc':       return (a.year || 0) - (b.year || 0);
        case 'year-desc':      return (b.year || 0) - (a.year || 0);
        case 'citations-desc': return (b.citation_count || 0) - (a.citation_count || 0);
        case 'title-asc':      return (a.title || '').localeCompare(b.title || '');
        default: return 0;
      }
    });
  }, [filtered, sortKey]);

  return (
    <div className="tab-content fade-in rm-papers">
      {/* Toolbar */}
      <div className="papers-toolbar">
        <div className="papers-toolbar-left">
          <span className="papers-count">{sorted.length} paper{sorted.length !== 1 ? 's' : ''}</span>
          {sorted.length !== papers.length && (
            <span className="papers-filtered">({papers.length} total)</span>
          )}
        </div>
        <div className="papers-toolbar-right">
          <input
            type="text"
            className="rm-input papers-search"
            placeholder="Search papers…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search papers"
          />
          <select
            className="rm-input filter-select sort-select"
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            aria-label="Sort papers"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            className={`rm-btn rm-btn-secondary rm-btn-sm ${drawerOpen ? 'active' : ''}`}
            onClick={() => setDrawerOpen(v => !v)}
            aria-expanded={drawerOpen}
            aria-controls="filter-drawer"
            id="filters-btn"
          >
            <SlidersHorizontal size={13} />
            Filters
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      {drawerOpen && (
        <aside id="filter-drawer" className="filter-drawer" role="dialog" aria-label="Filters">
          <div className="filter-drawer-header">
            <span className="filter-drawer-title">Filters</span>
            <button className="filter-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
              <X size={15} />
            </button>
          </div>
          <div className="filter-drawer-body">
            <div className="filter-group">
              <label className="filter-label">Year Range</label>
              <div className="filter-row">
                <input
                  type="number"
                  className="filter-input"
                  value={filterYear[0]}
                  onChange={e => setFilterYear([+e.target.value, filterYear[1]])}
                  min="1900"
                  max={filterYear[1]}
                  aria-label="Year from"
                />
                <span className="filter-sep">—</span>
                <input
                  type="number"
                  className="filter-input"
                  value={filterYear[1]}
                  onChange={e => setFilterYear([filterYear[0], +e.target.value])}
                  min={filterYear[0]}
                  max={new Date().getFullYear()}
                  aria-label="Year to"
                />
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label" htmlFor="filter-source">Source</label>
              <select
                id="filter-source"
                className="filter-select"
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
              >
                <option value="all">All sources</option>
                <option value="arxiv">arXiv</option>
                <option value="semantic_scholar">Semantic Scholar</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filterFullPdf}
                  onChange={e => setFilterFullPdf(e.target.checked)}
                />
                Full PDF available only
              </label>
            </div>

            <button
              className="btn-primary"
              onClick={() => setDrawerOpen(false)}
              id="apply-filters-btn"
            >
              Apply Filters
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={() => {
                setFilterYear([1900, new Date().getFullYear()]);
                setFilterSource('all');
                setFilterFullPdf(false);
                setSearchTerm('');
              }}
            >
              Reset
            </button>
          </div>
        </aside>
      )}

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="panel-empty">
          <FileSearch size={32} style={{ color: 'var(--text-muted)' }} />
          <p className="panel-empty-title">No papers match these filters</p>
          <p className="panel-empty-desc">Try adjusting or clearing the filters.</p>
        </div>
      )}

      {/* Paper cards */}
      <div className="papers-grid">
        {sorted.map((paper, idx) => (
          <PaperCard key={paper.id || idx} paper={paper} jobId={jobId} />
        ))}
      </div>
    </div>
  );
}
