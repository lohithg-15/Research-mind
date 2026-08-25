import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react';

/** Renders a muted dash when a value is empty or "not specified" */
function CellValue({ value }) {
  const isEmpty =
    !value ||
    ['not specified', 'not available', 'n/a', 'none', 'unknown', 'not mentioned'].includes(
      String(value).trim().toLowerCase()
    );

  if (isEmpty) {
    return (
      <span style={{ color: 'var(--gray-600)', fontStyle: 'italic', fontSize: '11px', fontWeight: 300 }}>
        —
      </span>
    );
  }
  return <>{value}</>;
}

/** Authors — shows first 2, "+N more" on hover */
function AuthorsCell({ authors = [] }) {
  if (!authors || authors.length === 0) return <CellValue value={null} />;
  const shown = authors.slice(0, 2).join(', ');
  const extra = authors.length > 2 ? ` +${authors.length - 2} more` : '';
  return (
    <span title={authors.join(', ')}>
      {shown}
      {extra && <span style={{ color: 'var(--gray-600)', fontSize: '11px' }}>{extra}</span>}
    </span>
  );
}

/** Coloured verification badge + optional "Abstract only" sub-badge */
function VerificationBadge({ status, abstractOnly }) {
  const label =
    status === 'verified'  ? 'Verified'   :
    status === 'failed'    ? 'Failed'     :
    status === 'heuristic' ? 'Heuristic'  : 'Unverified';

  const badgeStyle =
    status === 'verified'
      ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }
      : status === 'failed'
      ? { background: 'rgba(239,68,68,0.10)', color: '#f87171', borderColor: 'rgba(239,68,68,0.25)' }
      : status === 'heuristic'
      ? { background: 'rgba(251,191,36,0.10)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.25)' }
      : { background: 'transparent',           color: 'var(--gray-700)', borderColor: 'var(--border)' };

  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="badge" style={badgeStyle}>{label}</span>
      {abstractOnly && (
        <span
          className="badge"
          style={{
            background: 'rgba(251,146,60,0.10)',
            color: '#fb923c',
            borderColor: 'rgba(251,146,60,0.25)',
            fontSize: '8px',
          }}
          title="Fields extracted from abstract only — full text unavailable"
        >
          <BookOpen size={8} style={{ marginRight: 2 }} />
          Abstract only
        </span>
      )}
    </span>
  );
}

export default function ComparisonTable({ data }) {
  const [searchTerm, setSearchTerm]       = useState('');
  const [sortField, setSortField]         = useState('year');
  const [sortDirection, setSortDirection] = useState('desc');

  if (!data || data.length === 0) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">
          <Search size={22} color="var(--text-muted)" />
        </div>
        <p className="panel-empty-title">No comparison data yet</p>
        <p className="panel-empty-desc">Run a review to populate the literature matrix.</p>
      </div>
    );
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredData = data.filter((item) => {
    const authors = Array.isArray(item.authors) ? item.authors.join(' ') : '';
    const s = `${item.title} ${authors} ${item.venue || ''} ${item.method} ${item.dataset} ${item.key_metric} ${item.limitation}`.toLowerCase();
    return s.includes(searchTerm.toLowerCase());
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ?  1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc'
      ? <ChevronUp   size={12} style={{ marginLeft: 3 }} />
      : <ChevronDown size={12} style={{ marginLeft: 3 }} />;
  };

  /**
   * Resolves the best available link for a paper row:
   * 1. Human-readable page (arXiv abstract page / S2 page / DOI page)
   * 2. Open-access or arXiv PDF
   */
  const getPaperLink = (item) => {
    if (item.url)      return item.url;
    if (item.arxiv_id) return `https://arxiv.org/abs/${item.arxiv_id}`;
    if (item.doi)      return `https://doi.org/${item.doi}`;
    if (item.pdf_url)  return item.pdf_url;
    return null;
  };

  const COLS = [
    { key: 'title',               label: 'Title' },
    { key: 'authors',             label: 'Authors',    sortable: false },
    { key: 'year',                label: 'Year',       width: 60 },
    { key: 'venue',               label: 'Venue' },
    { key: 'method',              label: 'Method' },
    { key: 'dataset',             label: 'Dataset' },
    { key: 'key_metric',          label: 'Key Metric' },
    { key: 'limitation',          label: 'Limitation' },
    { key: 'verification_status', label: 'Status',     width: 90 },
  ];

  return (
    <div className="fade-in">
      {/* Search bar */}
      <div className="table-search">
        <h2 className="section-heading" style={{ marginBottom: 0 }}>
          Comparison Matrix
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>
            ({sortedData.length} papers)
          </span>
        </h2>
        <div className="table-search-wrap">
          <Search size={13} className="table-search-icon" />
          <input
            type="text"
            className="table-search-input"
            placeholder="Search matrix…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div
        className="table-wrapper"
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxWidth: 'calc(100vw - 226px - 218px - 48px)',
          maxHeight: 'calc(100vh - 220px)',   /* fixed height = scrollbar always visible */
          display: 'block',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table className="rm-table">
          <thead>
            <tr>
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{
                    width: col.width || undefined,
                    cursor: col.sortable === false ? 'default' : 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {col.label}
                    {col.sortable !== false && <SortIcon field={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((item, idx) => {
                const link = getPaperLink(item);
                return (
                  <tr key={item.id || idx}>
                    {/* Title */}
                    <td className="rm-table-title" title={item.title}>
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--accent-blue)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {item.title}
                          <ExternalLink size={10} style={{ flexShrink: 0, opacity: 0.7 }} />
                        </a>
                      ) : (
                        item.title
                      )}
                    </td>

                    {/* Authors */}
                    <td><AuthorsCell authors={item.authors} /></td>

                    {/* Year */}
                    <td>{item.year || <CellValue value={null} />}</td>

                    {/* Venue */}
                    <td title={item.venue}><CellValue value={item.venue} /></td>

                    {/* Method */}
                    <td title={item.method}><CellValue value={item.method} /></td>

                    {/* Dataset */}
                    <td title={item.dataset}><CellValue value={item.dataset} /></td>

                    {/* Key Metric */}
                    <td title={item.key_metric}><CellValue value={item.key_metric} /></td>

                    {/* Limitation */}
                    <td className="limitation-cell" title={item.limitation}><CellValue value={item.limitation} /></td>

                    {/* Verification Status */}
                    <td>
                      <VerificationBadge
                        status={item.verification_status}
                        abstractOnly={item.abstract_only}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No matching papers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
