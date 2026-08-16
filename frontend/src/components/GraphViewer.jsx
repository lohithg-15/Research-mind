import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Network } from 'lucide-react';

export default function GraphViewer({ gapClaims, onHighlightPapers }) {
  const containerRef = useRef(null);
  const [selectedGapIndex, setSelectedGapIndex] = useState(0);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !gapClaims || gapClaims.length === 0) return;

    const currentGap = gapClaims[selectedGapIndex];
    const snapshot = currentGap?.subgraph_snapshot;
    if (!snapshot) return;

    const elements = [];
    const nodes = snapshot.nodes || [];
    const edges = snapshot.edges || snapshot.links || [];

    nodes.forEach((node) => {
      let label = node.title || node.name || node.label || node.id;
      if (node.type === 'Paper' && label && label.length > 28) {
        label = label.slice(0, 25) + '…';
      }
      elements.push({ data: { id: node.id, label, type: node.type || 'Paper' } });
    });

    edges.forEach((edge, idx) => {
      elements.push({
        data: {
          id: `edge-${idx}-${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          label: edge.type || '',
        },
      });
    });

    if (cyRef.current) cyRef.current.destroy();

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: true,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: 'rgba(240,242,247,0.7)',
            'font-family': 'Inter, sans-serif',
            'font-size': '8px',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'background-color': '#3a3f54',
            width: 18,
            height: 18,
            'text-wrap': 'wrap',
            'text-max-width': 80,
            'border-width': 1.5,
            'border-color': 'rgba(255,255,255,0.08)',
          },
        },
        {
          selector: 'node[type="Paper"]',
          style: {
            'background-color': '#6c8aff',
            'border-color': 'rgba(108,138,255,0.5)',
            width: 24,
            height: 24,
            'box-shadow': '0 0 8px rgba(108,138,255,0.5)',
          },
        },
        {
          selector: 'node[type="Author"]',
          style: {
            'background-color': '#2dd4bf',
            'border-color': 'rgba(45,212,191,0.4)',
            width: 16,
            height: 16,
          },
        },
        {
          selector: 'node[type="Topic"]',
          style: {
            'background-color': '#a78bfa',
            'border-color': 'rgba(167,139,250,0.5)',
            shape: 'hexagon',
            width: 28,
            height: 28,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.2,
            'line-color': 'rgba(255,255,255,0.08)',
            'target-arrow-color': 'rgba(108,138,255,0.4)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '7px',
            color: 'rgba(155,163,184,0.7)',
            'text-rotation': 'autorotate',
            'text-margin-y': -6,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 600,
        padding: 30,
        nodeRepulsion: () => 5500,
      },
    });

    // Highlight related paper IDs in sources sidebar
    if (onHighlightPapers) {
      const paperIds = nodes.filter(n => n.type === 'Paper').map(n => n.id);
      onHighlightPapers(paperIds);
    }

    return () => {
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    };
  }, [gapClaims, selectedGapIndex]);

  if (!gapClaims || gapClaims.length === 0) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">
          <Network size={22} color="var(--text-muted)" />
        </div>
        <p className="panel-empty-title">No gap subgraphs available</p>
        <p className="panel-empty-desc">Run analysis on a topic with at least 15 papers to generate gap evidence.</p>
      </div>
    );
  }

  const currentGap = gapClaims[selectedGapIndex];

  return (
    <div className="fade-in">
      {/* Gap selector chips */}
      <div className="gap-selector">
        {gapClaims.map((gap, index) => (
          <button
            key={gap.gap_id || index}
            className={`gap-chip ${selectedGapIndex === index ? 'active' : ''}`}
            onClick={() => setSelectedGapIndex(index)}
          >
            <Network size={12} />
            {gap.topic_label}
          </button>
        ))}
      </div>

      {/* Graph + meta layout */}
      <div className="gap-layout">
        {/* Cytoscape canvas */}
        <div ref={containerRef} className="gap-canvas" />

        {/* Meta panel */}
        <div className="gap-meta-panel">
          <div className="meta-card">
            <span className="meta-card-tag">Gap ID: {currentGap.gap_id}</span>
            <h3 className="meta-card-title">{currentGap.topic_label}</h3>
            <p className="meta-card-desc">{currentGap.description}</p>
          </div>

          <div className="meta-card">
            <span className="meta-card-tag">Citation Density</span>
            <div className="meta-card-stat">
              {currentGap.citation_density != null
                ? currentGap.citation_density.toFixed(2)
                : '—'}
            </div>
            <span className="meta-card-stat-label">citations / paper</span>
            <p className="meta-card-desc" style={{ marginTop: '6px' }}>
              Identified due to below-median citation activity.
            </p>
          </div>

          {currentGap.suggested_directions && currentGap.suggested_directions.length > 0 && (
            <div className="meta-card">
              <span className="meta-card-tag">Future Directions</span>
              <ul className="future-list">
                {currentGap.suggested_directions.map((dir, idx) => (
                  <li key={idx}>{dir}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
