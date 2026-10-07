import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SlidersHorizontal, X, ExternalLink, Search, FileSearch } from 'lucide-react';
import { useResearch } from '../../context/ResearchContext';
import { getPaperLink } from '../../utils/paperLinks';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import { Drawer } from '../../components/ui/Modal';
import PaperDetailContent from '../../components/PaperDetailContent';
import '../../components/papers.css';

const SORT_OPTIONS = [
  { value: 'year-desc', label: 'Year (Newest)' },
  { value: 'year-asc', label: 'Year (Oldest)' },
  { value: 'citations-desc', label: 'Most Cited' },
  { value: 'title-asc', label: 'Title A–Z' },
];
const THIS_YEAR = new Date().getFullYear();

function PaperCard({ paper, onOpen }) {
  const link = getPaperLink(paper);
  const authors = Array.isArray(paper.authors)
    ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
    : '';
  const venue = paper.venue && paper.venue !== 'Unknown' ? paper.venue : '';
  const meta = [authors, venue && (paper.citation_count > 0 ? `${venue} • ${paper.citation_count} citations` : venue)]
    .filter(Boolean).join(' · ') || (paper.citation_count > 0 ? `${paper.citation_count} citations` : '');

  return (
    <Card hoverable className="rm-paper-card">
      <div className="rm-paper-card-top">
        <button type="button" className="rm-paper-title" onClick={() => onOpen(paper)}>{paper.title || 'Untitled'}</button>
        {paper.year && <span className="rm-paper-year">{paper.year}</span>}
      </div>
      {meta && <p className="rm-paper-authors">{meta}</p>}
      {paper.doi && <p className="rm-paper-doi rm-mono">{paper.doi}</p>}
      {paper.abstract && <p className="rm-paper-abstract">{paper.abstract}</p>}
      <div className="rm-paper-foot">
        <div className="rm-paper-badges">
          {(paper.source === 'arxiv' || paper.source === 'merged') && <Badge tone="accent">arXiv</Badge>}
          {paper.source !== 'arxiv' && paper.source && <Badge tone="info">S2</Badge>}
          {paper.full_text_available && <Badge tone="success">PDF</Badge>}
        </div>
        {link && (
          <Button as="a" variant="ghost" size="sm" href={link} target="_blank" rel="noopener noreferrer" icon={<ExternalLink size={12} />}>
            View source
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function PapersTab() {
  useParams();
  const { papers } = useResearch();

  const [sortKey, setSortKey] = useState('year-desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterYear, setFilterYear] = useState([1900, THIS_YEAR]);
  const [filterSource, setFilterSource] = useState('all');
  const [filterFullPdf, setFilterFullPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePaper, setActivePaper] = useState(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onDown = e => { if (popRef.current && !popRef.current.contains(e.target)) setFiltersOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setFiltersOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [filtersOpen]);

  const sorted = useMemo(() => {
    let list = papers;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q)
        || (Array.isArray(p.authors) ? p.authors.join(' ') : '').toLowerCase().includes(q)
        || (p.abstract || '').toLowerCase().includes(q));
    }
    if (filterSource !== 'all') list = list.filter(p => p.source === filterSource);
    if (filterFullPdf) list = list.filter(p => p.full_text_available);
    list = list.filter(p => !p.year || (p.year >= filterYear[0] && p.year <= filterYear[1]));
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'year-asc': return (a.year || 0) - (b.year || 0);
        case 'year-desc': return (b.year || 0) - (a.year || 0);
        case 'citations-desc': return (b.citation_count || 0) - (a.citation_count || 0);
        case 'title-asc': return (a.title || '').localeCompare(b.title || '');
        default: return 0;
      }
    });
  }, [papers, searchTerm, filterSource, filterFullPdf, filterYear, sortKey]);

  const resetFilters = () => {
    setFilterYear([1900, THIS_YEAR]); setFilterSource('all'); setFilterFullPdf(false); setSearchTerm('');
  };
  const activeFilterCount = (filterSource !== 'all') + filterFullPdf + (filterYear[0] !== 1900 || filterYear[1] !== THIS_YEAR);

  return (
    <div className="rm-tab-content">
      <div className="rm-papers-toolbar">
        <div className="rm-papers-count">
          {sorted.length} paper{sorted.length !== 1 ? 's' : ''}
          {sorted.length !== papers.length && <span>of {papers.length}</span>}
        </div>
        <div className="rm-papers-controls">
          <label className="rm-papers-search">
            <Search size={14} />
            <Input placeholder="Search papers…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} aria-label="Search papers" />
          </label>
          <select className="rm-select" value={sortKey} onChange={e => setSortKey(e.target.value)} aria-label="Sort papers">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="rm-popover-wrap" ref={popRef}>
            <Button variant="secondary" size="md" icon={<SlidersHorizontal size={14} />} onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} aria-haspopup="dialog">
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            {filtersOpen && (
              <div className="rm-popover" role="dialog" aria-label="Filters">
                <div className="rm-popover-head">
                  <span>Filters</span>
                  <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => setFiltersOpen(false)} aria-label="Close filters" />
                </div>
                <div>
                  <span className="rm-field-label">Year range</span>
                  <div className="rm-year-row">
                    <Input type="number" value={filterYear[0]} min="1900" max={filterYear[1]} onChange={e => setFilterYear([+e.target.value, filterYear[1]])} aria-label="Year from" />
                    <span>–</span>
                    <Input type="number" value={filterYear[1]} min={filterYear[0]} max={THIS_YEAR} onChange={e => setFilterYear([filterYear[0], +e.target.value])} aria-label="Year to" />
                  </div>
                </div>
                <div>
                  <label className="rm-field-label" htmlFor="rm-filter-source">Source</label>
                  <select id="rm-filter-source" className="rm-select" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                    <option value="all">All sources</option>
                    <option value="arxiv">arXiv</option>
                    <option value="semantic_scholar">Semantic Scholar</option>
                  </select>
                </div>
                <label className="rm-check">
                  <input type="checkbox" checked={filterFullPdf} onChange={e => setFilterFullPdf(e.target.checked)} />
                  Full PDF available only
                </label>
                <div className="rm-popover-actions">
                  <Button size="sm" onClick={() => setFiltersOpen(false)}>Apply</Button>
                  <Button size="sm" variant="ghost" onClick={resetFilters}>Reset</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={20} />}
          title="No papers match these filters"
          description="Try adjusting or clearing the filters."
          action={<Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button>}
        />
      ) : (
        <div className="rm-papers-list">
          {sorted.map((paper, idx) => <PaperCard key={paper.id || idx} paper={paper} onOpen={setActivePaper} />)}
        </div>
      )}

      <Drawer isOpen={!!activePaper} onClose={() => setActivePaper(null)}>
        <div className="rm-drawer-head">
          <h2>Paper details</h2>
          <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={() => setActivePaper(null)} aria-label="Close details" />
        </div>
        {activePaper && <PaperDetailContent paper={activePaper} />}
      </Drawer>
    </div>
  );
}
