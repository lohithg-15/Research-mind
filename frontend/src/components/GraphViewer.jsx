import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Network, Info, ZoomIn, ZoomOut, Maximize2, BookOpen, Users, Tag, ArrowRight, TrendingUp, Lightbulb, AlertTriangle } from 'lucide-react';

/* ─── Citation density interpretation ─── */
function densityLabel(val) {
  if (val == null) return { text: 'Unknown', color: '#808080', badge: '?' };
  if (val < 1)    return { text: 'Very sparse — high gap likelihood', color: '#f87171', badge: 'HIGH GAP' };
  if (val < 3)    return { text: 'Sparse — moderate gap potential',   color: '#fb923c', badge: 'MODERATE' };
  if (val < 6)    return { text: 'Moderate — some activity',          color: '#facc15', badge: 'LOW GAP' };
  return           { text: 'Dense — well-cited area',                 color: '#4ade80', badge: 'COVERED'  };
}

export default function GraphViewer({ gapClaims, onHighlightPapers }) {
  const containerRef       = useRef(null);
  const cyRef              = useRef(null);
  const [selectedGapIndex, setSelectedGapIndex] = useState(0);
  const [selectedNode,     setSelectedNode]      = useState(null);
  const [showTip,          setShowTip]           = useState(true);

  /* ── Build / rebuild graph whenever gap changes ── */
  useEffect(() => {
    if (!containerRef.current || !gapClaims || gapClaims.length === 0) return;

    const currentGap = gapClaims[selectedGapIndex];
    const snapshot   = currentGap?.subgraph_snapshot;
    if (!snapshot) return;

    setSelectedNode(null);

    const elements = [];
    const nodes    = snapshot.nodes || [];
    const edges    = snapshot.edges || snapshot.links || [];

    nodes.forEach((node) => {
      let label = node.title || node.name || node.label || node.id;
      if (node.type === 'Paper' && label && label.length > 30) {
        label = label.slice(0, 28) + '…';
      }
      elements.push({
        data: {
          id:        node.id,
          label,
          type:      node.type || 'Paper',
          fullTitle: node.title || node.name || node.label || node.id,
          year:      node.year,
          citations: node.citations,
        },
      });
    });

    edges.forEach((edge, idx) => {
      elements.push({
        data: {
          id:     `edge-${idx}-${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          label:  edge.type || '',
        },
      });
    });

    if (cyRef.current) cyRef.current.destroy();

    cyRef.current = cytoscape({
      container:           containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify:     false,
      style: [
        {
          selector: 'node',
          style: {
            label:               'data(label)',
            color:               'rgba(240,242,247,0.75)',
            'font-family':       'IBM Plex Sans, sans-serif',
            'font-size':         '9px',
            'text-valign':       'bottom',
            'text-margin-y':     6,
            'background-color':  '#3a3f54',
            width: 22, height: 22,
            'text-wrap':         'wrap',
            'text-max-width':    90,
            'border-width':      1.5,
            'border-color':      'rgba(255,255,255,0.10)',
          },
        },
        {
          selector: 'node[type="Paper"]',
          style: {
            'background-color': '#6c8aff',
            'border-color':     'rgba(108,138,255,0.55)',
            width: 26, height: 26,
          },
        },
        {
          selector: 'node[type="Author"]',
          style: {
            'background-color': '#2dd4bf',
            'border-color':     'rgba(45,212,191,0.45)',
            width: 18, height: 18,
          },
        },
        {
          selector: 'node[type="Topic"]',
          style: {
            'background-color': '#a78bfa',
            'border-color':     'rgba(167,139,250,0.55)',
            shape: 'hexagon',
            width: 32, height: 32,
            'font-size': '10px',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#ffffff',
            'border-width':  2.5,
          },
        },
        {
          selector: 'edge',
          style: {
            width:                1.4,
            'line-color':         'rgba(255,255,255,0.10)',
            'target-arrow-color': 'rgba(108,138,255,0.5)',
            'target-arrow-shape': 'triangle',
            'curve-style':        'bezier',
            label:                'data(label)',
            'font-size':          '7px',
            color:                'rgba(155,163,184,0.7)',
            'text-rotation':      'autorotate',
            'text-margin-y':      -6,
          },
        },
      ],
      layout: {
        name:              'cose',
        animate:           true,
        animationDuration: 700,
        padding:           40,
        nodeRepulsion:     () => 6500,
        idealEdgeLength:   () => 80,
      },
    });

    /* node click → show detail card */
    cyRef.current.on('tap', 'node', (evt) => {
      const n = evt.target;
      setSelectedNode({
        id:        n.data('id'),
        label:     n.data('fullTitle'),
        type:      n.data('type'),
        year:      n.data('year'),
        citations: n.data('citations'),
      });
    });
    /* background click → deselect */
    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) setSelectedNode(null);
    });

    if (onHighlightPapers) {
      const paperIds = nodes.filter(n => n.type === 'Paper').map(n => n.id);
      onHighlightPapers(paperIds);
    }

    return () => {
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    };
  }, [gapClaims, selectedGapIndex]);

  /* ── Zoom helpers ── */
  const zoomIn  = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 1.25, renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  const zoomOut = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 0.8,  renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  const fitView = () => cyRef.current?.fit(undefined, 30);

  /* ── Empty state ── */
  if (!gapClaims || gapClaims.length === 0) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">
          <Network size={22} color="var(--text-muted)" />
        </div>
        <p className="panel-empty-title">No gap evidence available</p>
        <p className="panel-empty-desc">
          Run analysis on a topic with at least 15 papers to generate citation gap subgraphs.
        </p>
      </div>
    );
  }

  const currentGap = gapClaims[selectedGapIndex];
  const density    = densityLabel(currentGap.citation_density);

  return (
    <div className="fade-in gv-root">

      {/* ── Explanatory header ── */}
      <div className="gv-header">
        <AlertTriangle size={13} className="gv-header-icon" />
        <div>
          <span className="gv-header-title">Research Gap Evidence</span>
          <p className="gv-header-hint">
            Each gap below is a cluster of papers with <strong>low citation density</strong> —
            they don't cite each other much, signalling an <strong>under-explored area</strong>.
            Select a gap to visualise its citation subgraph and explore future directions.
          </p>
        </div>
      </div>

      {/* ── Gap selector chips ── */}
      <div className="gv-gap-row">
        <span className="gv-gap-label">Select a gap to explore:</span>
        <div className="gap-selector">
          {gapClaims.map((gap, index) => (
            <button
              key={gap.gap_id || index}
              className={`gap-chip ${selectedGapIndex === index ? 'active' : ''}`}
              onClick={() => setSelectedGapIndex(index)}
              title={gap.description}
            >
              <Network size={11} />
              {gap.topic_label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="gv-layout">

        {/* ─ Graph canvas ─ */}
        <div className="gv-canvas-wrap">
          <div ref={containerRef} className="gap-canvas" />

          {/* Zoom controls */}
          <div className="gv-zoom-controls">
            <button className="gv-zoom-btn" onClick={zoomIn}  title="Zoom in">  <ZoomIn  size={13} /></button>
            <button className="gv-zoom-btn" onClick={zoomOut} title="Zoom out"> <ZoomOut size={13} /></button>
            <button className="gv-zoom-btn" onClick={fitView} title="Fit view"> <Maximize2 size={13} /></button>
          </div>

          {/* Interaction tip banner */}
          {showTip && (
            <div className="gv-tip">
              <Info size={11} style={{ flexShrink: 0 }} />
              <span>Click any node to see details &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Drag to pan</span>
              <button className="gv-tip-close" onClick={() => setShowTip(false)}>✕</button>
            </div>
          )}

          {/* Node legend */}
          <div className="gv-legend">
            <div className="gv-legend-title">Legend</div>
            <div className="gv-legend-row"><span className="gv-legend-dot" style={{ background: '#6c8aff', borderRadius: '50%' }} /><span className="gv-legend-label">Paper</span></div>
            <div className="gv-legend-row"><span className="gv-legend-dot" style={{ background: '#2dd4bf', borderRadius: '50%' }} /><span className="gv-legend-label">Author</span></div>
            <div className="gv-legend-row"><span className="gv-legend-dot" style={{ background: '#a78bfa', borderRadius: '3px', transform: 'rotate(30deg)' }} /><span className="gv-legend-label">Topic</span></div>
          </div>

          {/* Node detail popup */}
          {selectedNode && (
            <div className="gv-node-popup">
              <div className="gv-node-popup-type">{selectedNode.type}</div>
              <div className="gv-node-popup-title">{selectedNode.label}</div>
              {selectedNode.year      && <div className="gv-node-popup-meta">📅 {selectedNode.year}</div>}
              {selectedNode.citations != null && <div className="gv-node-popup-meta">📎 {selectedNode.citations} citations</div>}
              <button className="gv-node-popup-close" onClick={() => setSelectedNode(null)}>✕</button>
            </div>
          )}
        </div>

        {/* ─ Right info panel ─ */}
        <div className="gv-info-panel">

          {/* Gap name + description */}
          <div className="gv-info-card gv-info-card--main">
            <div className="gv-info-card-label"><Network size={11} /> Detected Gap</div>
            <div className="gv-info-card-title">{currentGap.topic_label}</div>
            <p className="gv-info-card-desc">{currentGap.description}</p>
          </div>

          {/* Citation density with bar */}
          <div className="gv-info-card">
            <div className="gv-info-card-label"><TrendingUp size={11} /> Citation Density</div>
            <div className="gv-density-row">
              <span className="gv-density-val">
                {currentGap.citation_density != null ? currentGap.citation_density.toFixed(2) : '—'}
              </span>
              <span className="gv-density-unit">citations / paper</span>
              <span className="gv-density-badge" style={{ background: density.color + '22', color: density.color, borderColor: density.color + '55' }}>
                {density.badge}
              </span>
            </div>
            <div className="gv-density-bar-track">
              <div
                className="gv-density-bar-fill"
                style={{
                  width:      `${Math.min(100, (currentGap.citation_density || 0) * 10)}%`,
                  background: density.color,
                }}
              />
            </div>
            <p className="gv-density-interp" style={{ color: density.color }}>{density.text}</p>
            <p className="gv-info-card-desc" style={{ marginTop: 6 }}>
              Papers in this cluster cite each other less than the median across all clusters,
              indicating the community has not fully engaged with this research area yet.
            </p>
          </div>

          {/* Suggested directions */}
          {currentGap.suggested_directions && currentGap.suggested_directions.length > 0 && (
            <div className="gv-info-card">
              <div className="gv-info-card-label"><Lightbulb size={11} /> Suggested Future Directions</div>
              <ul className="gv-future-list">
                {currentGap.suggested_directions.map((dir, idx) => (
                  <li key={idx}>
                    <ArrowRight size={10} className="gv-future-arrow" />
                    <span>{dir}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How-to-read explainer */}
          <div className="gv-info-card gv-info-card--explain">
            <div className="gv-info-card-label"><Info size={11} /> How to read this graph</div>
            <ul className="gv-explain-list">
              <li><span style={{ color: '#6c8aff' }}>●</span> Blue circles are <strong>papers</strong> in this gap cluster</li>
              <li><span style={{ color: '#2dd4bf' }}>●</span> Teal circles are <strong>authors</strong></li>
              <li><span style={{ color: '#a78bfa' }}>◆</span> Purple hexagons are <strong>topic/concept</strong> nodes</li>
              <li>Lines (edges) = citation or co-authorship links</li>
              <li>Fewer lines between nodes = <strong>research gap</strong></li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
