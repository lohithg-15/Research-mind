import React, { useState } from 'react';
import { useResearch } from '../../context/ResearchContext';
import GraphViewer from '../../components/GraphViewer';

export default function GraphTab() {
  const { results } = useResearch();
  const [highlighted, setHighlighted] = useState([]);

  return (
    <div className="tab-content tab-content--graph fade-in">
      <GraphViewer
        gapClaims={results?.gap_claims}
        onHighlightPapers={setHighlighted}
      />
    </div>
  );
}
