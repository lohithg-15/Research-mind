import React, { useState } from 'react';
import { Search, Calendar, Filter } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import './QueryForm.css';

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
    <Card className="rm-queryform">
      <h2 className="rm-queryform-title">
        <Search size={18} />
        Discover Literature Gaps
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="rm-queryform-row">
          <Input
            type="text"
            placeholder="e.g. transformers in NLP, quantum computing error correction..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" loading={isLoading}>
            {isLoading ? 'Processing…' : 'Analyze topic'}
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Filter size={14} />}
          className="rm-queryform-filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide filters' : 'Show year range'}
        </Button>

        {showFilters && (
          <div className="rm-queryform-filters">
            <div className="rm-queryform-filter-field">
              <Calendar size={14} className="rm-queryform-filter-icon" />
              <span className="rm-queryform-filter-label">From year:</span>
              <Input
                type="number"
                className="rm-queryform-year-input"
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
                min="1900"
                max={yearMax}
              />
            </div>
            <div className="rm-queryform-filter-field">
              <span className="rm-queryform-filter-label">To year:</span>
              <Input
                type="number"
                className="rm-queryform-year-input"
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
                min={yearMin}
                max={new Date().getFullYear() + 2}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rm-queryform-error" role="alert">
            {error}
          </div>
        )}
      </form>
    </Card>
  );
}
