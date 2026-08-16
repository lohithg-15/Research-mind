import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Check, AlertCircle, ExternalLink } from 'lucide-react';

export default function ComparisonTable({ data }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('year');
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
    const s = `${item.title} ${item.method} ${item.dataset} ${item.key_metric} ${item.limitation}`.toLowerCase();
    return s.includes(searchTerm.toLowerCase());
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc'
      ? <ChevronUp size={12} style={{ marginLeft: 3 }} />
      : <ChevronDown size={12} style={{ marginLeft: 3 }} />;
  };

  const StatusBadge = ({ status }) => {
    if (status === 'verified') {
      return (
        <span className="badge badge-verified">
          <Check size={9} /> Verified
        </span>
      );
    }
    return (
      <span className="badge badge-unverified">
        <AlertCircle size={9} /> Unverified
      </span>
    );
  };

  /**
   * Resolves the best available link for a paper row:
   * 1. Human-readable page (arXiv abstract page / S2 page / DOI page)
   * 2. Open-access or arXiv PDF
   */
  const getPaperLink = (item) => {
    if (item.url) return item.url;
    if (item.arxiv_id) return `https://arxiv.org/abs/${item.arxiv_id}`;
    if (item.doi) return `https://doi.org/${item.doi}`;
    if (item.pdf_url) return item.pdf_url;
    return null;
  };

  const COLS = [
    { key: 'title',               label: 'Title' },
    { key: 'year',                label: 'Year',    width: 70 },
    { key: 'method',              label: 'Method' },
    { key: 'dataset',             label: 'Dataset' },
    { key: 'key_metric',          label: 'Key Metric' },
    { key: 'limitation',          label: 'Limitation' },
    { key: 'verification_status', label: 'Grounding', width: 100 },
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

      <div className="table-wrapper">
        <table className="rm-table">
          <thead>
            <tr>
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={col.width ? { width: col.width } : {}}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {col.label}
                    <SortIcon field={col.key} />
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
                    <td>{item.year}</td>
                    <td title={item.method}>{item.method}</td>
                    <td title={item.dataset}>{item.dataset}</td>
                    <td title={item.key_metric}>{item.key_metric}</td>
                    <td title={item.limitation}>{item.limitation}</td>
                    <td><StatusBadge status={item.verification_status} /></td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
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
