import React, { useState } from 'react';
import { useResearch } from '../../context/ResearchContext';
import GraphViewer from '../../components/GraphViewer';

export default function GraphTab() {
  const { results } = useResearch();
  const [, setHighlighted] = useState([]);
  return <GraphViewer gapClaims={results?.gap_claims} onHighlightPapers={setHighlighted} />;
}
