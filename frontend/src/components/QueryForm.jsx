import React, { useState } from 'react';
import { Search, Calendar, Filter } from 'lucide-react';

export default function QueryForm({ onJobSubmitted, isLoading }) {
  const [query, setQuery] = useState('');
  const [yearMin, setYearMin] = useState(2015);
  const [yearMax, setYearMax] = useState(new Date().getFullYear());
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a research topic or query.');
      return;
    }
    setError('');

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          filters: {
            year_range: [parseInt(yearMin), parseInt(yearMax)]
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit query to backend.');
      }

      const data = await response.json();
      onJobSubmitted(data.job_id);
    } catch (err) {
      setError(err.message || 'Server connection error.');
    }
  };

  return (
    <div className="glass-card">
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Search size={20} className="animate-pulse-glow" style={{ color: 'var(--color-primary)' }} />
        Discover Literature Gaps
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <input
              type="text"
              className="premium-input"
              placeholder="e.g. transformers in NLP, quantum computing error correction..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              style={{ paddingRight: '40px' }}
            />
          </div>
          <button type="submit" className="premium-btn" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Analyze Topic'}
          </button>
        </div>

        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="premium-btn premium-btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            <Filter size={14} />
            {showFilters ? 'Hide Filters' : 'Show Year Range'}
          </button>
        </div>

        {showFilters && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>From Year:</span>
              <input
                type="number"
                className="premium-input"
                style={{ width: '80px', padding: '6px' }}
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
                min="1900"
                max={yearMax}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>To Year:</span>
              <input
                type="number"
                className="premium-input"
                style={{ width: '80px', padding: '6px' }}
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
                min={yearMin}
                max={new Date().getFullYear() + 2}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '13px' }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
