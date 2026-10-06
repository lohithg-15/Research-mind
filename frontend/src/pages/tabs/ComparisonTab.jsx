import React from 'react';
import { useResearch } from '../../context/ResearchContext';
import ComparisonTable from '../../components/ComparisonTable';

export default function ComparisonTab() {
  const { results } = useResearch();

  return (
    <div className="tab-content fade-in rm-comparison">
      <ComparisonTable data={results?.comparison_table} />
    </div>
  );
}
