import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Network, HelpCircle } from 'lucide-react';

export default function GraphViewer({ gapClaims }) {
  const containerRef = useRef(null);
  const [selectedGapIndex, setSelectedGapIndex] = useState(0);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !gapClaims || gapClaims.length === 0) return;

    const currentGap = gapClaims[selectedGapIndex];
    const snapshot = currentGap.subgraph_snapshot;

    if (!snapshot) return;

    // Map networkx node_link_data to Cytoscape elements
    const elements = [];

    const nodes = snapshot.nodes || [];
    const edges = snapshot.edges || snapshot.links || [];

    // Add nodes
    nodes.forEach((node) => {
      let label = node.title || node.name || node.label || node.id;
      if (node.type === 'Paper' && label.length > 30) {
        label = label.slice(0, 27) + '...';
      }
      elements.push({
        data: {
          id: node.id,
          label: label,
          type: node.type || 'Paper',
        },
      });
    });

    // Add edges
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

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      boxSelectionEnabled: false,
      autounselectify: true,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-family': 'var(--font-family)',
            'font-size': '9px',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'background-color': '#475569',
            'width': 16,
            'height': 16,
            'text-wrap': 'wrap',
            'text-max-width': 80,
          },
        },
        {
          selector: 'node[type="Paper"]',
          style: {
            'background-color': '#3b82f6',
            'width': 22,
            'height': 22,
            'border-width': 2,
            'border-color': 'rgba(59, 130, 246, 0.4)',
          },
        },
        {
          selector: 'node[type="Author"]',
          style: {
            'background-color': '#10b981',
            'width': 16,
            'height': 16,
            'border-width': 1.5,
            'border-color': 'rgba(16, 185, 129, 0.4)',
          },
        },
        {
          selector: 'node[type="Topic"]',
          style: {
            'background-color': '#8b5cf6',
            'width': 26,
            'height': 26,
            'shape': 'hexagon',
            'border-width': 2,
            'border-color': 'rgba(139, 92, 246, 0.4)',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': 'rgba(255, 255, 255, 0.1)',
            'target-arrow-color': 'rgba(255, 255, 255, 0.2)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '7px',
            'color': '#64748b',
            'text-rotation': 'autorotate',
            'text-margin-y': -6,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        padding: 30,
        nodeRepulsion: () => 4500,
      },
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [gapClaims, selectedGapIndex]);

  if (!gapClaims || gapClaims.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        No gaps or subgraphs available. Run analysis on a topic with at least 15 papers.
      </div>
    );
  }

  const currentGap = gapClaims[selectedGapIndex];

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '520px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Network size={18} style={{ color: 'var(--color-primary)' }} />
        Research Gap Citation Subgraph
      </h3>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
        {gapClaims.map((gap, index) => (
          <button
            key={gap.gap_id}
            className={`premium-btn ${selectedGapIndex === index ? '' : 'premium-btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setSelectedGapIndex(index)}
          >
            {gap.topic_label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flex: 1 }}>
        {/* Cytoscape Canvas */}
        <div
          ref={containerRef}
          style={{
            flex: '1 1 360px',
            height: '380px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            position: 'relative',
          }}
        />

        {/* Gap Metadata Panel */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.04)', borderRadius: '8px', border: '1px solid var(--border-glow)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600', textTransform: 'uppercase' }}>
              Gap Reference ID: {currentGap.gap_id}
            </span>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: '4px 0 8px 0' }}>
              {currentGap.topic_label}
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {currentGap.description}
            </p>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>CITATION DENSITY</span>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-secondary)', margin: '2px 0' }}>
              {currentGap.citation_density.toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>citations/paper</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Identified due to below-median citation activity.
            </span>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              FUTURE DIRECTIONS
            </span>
            <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentGap.suggested_directions.map((dir, idx) => (
                <li key={idx}>{dir}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
