import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';

export default function ComparisonTable({ data }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('year');
  const [sortDirection, setSortDirection] = useState('desc');

  if (!data || data.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        No literature matrix compiled. Submit a query to see comparison data.
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
    const searchStr = `${item.title} ${item.method} ${item.dataset} ${item.key_metric} ${item.limitation}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const renderStatusBadge = (status) => {
    if (status === 'verified') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', fontSize: '11px', fontWeight: '600' }}>
          <Check size={10} /> Verified
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', fontSize: '11px', fontWeight: '600' }}>
        <AlertCircle size={10} /> Unverified
      </span>
    );
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>Comparison Matrix</h3>
        <div style={{ position: 'relative', width: '250px' }}>
          <input
            type="text"
            className="premium-input"
            placeholder="Search matrix..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', paddingRight: '12px', height: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
        </div>
      </div>
      
      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>Title {renderSortIcon('title')}</th>
              <th onClick={() => handleSort('year')} style={{ cursor: 'pointer', width: '90px' }}>Year {renderSortIcon('year')}</th>
              <th onClick={() => handleSort('method')} style={{ cursor: 'pointer' }}>Method {renderSortIcon('method')}</th>
              <th onClick={() => handleSort('dataset')} style={{ cursor: 'pointer' }}>Dataset {renderSortIcon('dataset')}</th>
              <th onClick={() => handleSort('key_metric')} style={{ cursor: 'pointer' }}>Key Metric {renderSortIcon('key_metric')}</th>
              <th onClick={() => handleSort('limitation')} style={{ cursor: 'pointer' }}>Limitation {renderSortIcon('limitation')}</th>
              <th onClick={() => handleSort('verification_status')} style={{ cursor: 'pointer', width: '110px' }}>Grounding {renderSortIcon('verification_status')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td title={item.title} style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.title}</td>
                  <td>{item.year}</td>
                  <td title={item.method}>{item.method}</td>
                  <td title={item.dataset}>{item.dataset}</td>
                  <td title={item.key_metric}>{item.key_metric}</td>
                  <td title={item.limitation}>{item.limitation}</td>
                  <td>{renderStatusBadge(item.verification_status)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
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
