import React from 'react';
import { useResearch } from '../../context/ResearchContext';
import ComparisonTable from '../../components/ComparisonTable';

export default function ComparisonTab() {
  const { results } = useResearch();
  return (
    <div className="rm-tab-content">
      <ComparisonTable data={results?.comparison_table} />
    </div>
  );
}
