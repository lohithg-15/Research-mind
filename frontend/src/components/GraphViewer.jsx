import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import {
  Network, Info, ZoomIn, ZoomOut, Maximize2,
  ArrowRight, Lightbulb, AlertTriangle, CheckCircle,
  AlertCircle, XCircle, BookOpen, TrendingDown, Eye,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Gap risk level — plain English interpretation
───────────────────────────────────────────────*/
function getGapLevel(density) {
  if (density == null) return {
    label: 'Unknown',
    sublabel: 'Coverage data not available',
    color: '#808080',
    bg: 'rgba(128,128,128,0.10)',
    border: 'rgba(128,128,128,0.25)',
    Icon: AlertCircle,
    pct: 0,
    what: 'Coverage information could not be determined for this topic cluster.',
  };
  if (density < 1) return {
    label: 'Critical Gap',
    sublabel: 'Barely any papers reference each other',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.10)',
    border: 'rgba(248,113,113,0.30)',
    Icon: XCircle,
    pct: Math.round((density / 6) * 100),
    what: 'Papers on this topic almost never cite one another — meaning the research community has barely connected the dots here. This is a strong signal that this area is wide open for new work.',
  };
  if (density < 3) return {
    label: 'Significant Gap',
    sublabel: 'Papers rarely reference each other',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.10)',
    border: 'rgba(251,146,60,0.30)',
    Icon: AlertTriangle,
    pct: Math.round((density / 6) * 100),
    what: 'Only a few papers in this cluster cite each other. The community is fragmented — researchers are working on similar ideas without building on each other\'s work, leaving clear room for a connecting study.',
  };
  if (density < 6) return {
    label: 'Moderate Gap',
    sublabel: 'Some coverage, but room remains',
    color: '#facc15',
    bg: 'rgba(250,204,21,0.08)',
    border: 'rgba(250,204,21,0.28)',
    Icon: AlertCircle,
    pct: Math.round((density / 6) * 100),
    what: 'This area has some research activity, but papers don\'t reference each other as often as you\'d expect in a mature field. There\'s still meaningful opportunity here, especially in synthesising existing work.',
  };
  return {
    label: 'Well Covered',
    sublabel: 'Active, well-connected research area',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.25)',
    Icon: CheckCircle,
    pct: 100,
    what: 'Papers in this cluster cite each other frequently, showing a mature, active research community. This area is well covered — focus your novelty elsewhere or look for sub-niches within it.',
  };
}

/* ─────────────────────────────────────────────
   Coverage meter bar
───────────────────────────────────────────────*/
function CoverageMeter({ pct, color }) {
  return (
    <div className="gv2-meter-wrap">
      <div className="gv2-meter-labels">
        <span className="gv2-meter-lbl">No coverage</span>
        <span className="gv2-meter-lbl">Fully covered</span>
      </div>
      <div className="gv2-meter-track">
        <div
          className="gv2-meter-fill"
          style={{ width: `${Math.max(3, pct)}%`, background: color }}
        />
        <div
          className="gv2-meter-thumb"
          style={{ left: `${Math.max(1, pct)}%`, borderColor: color }}
        />
      </div>
      <div className="gv2-meter-pct" style={{ color }}>{pct}% covered</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────────*/
export default function GraphViewer({ gapClaims, onHighlightPapers }) {
  const containerRef         = useRef(null);
  const cyRef                = useRef(null);
  const [activeIdx, setActiveIdx]         = useState(0);
  const [selectedNode, setSelectedNode]   = useState(null);
  const [showGraph, setShowGraph]         = useState(false);
  const [showTip, setShowTip]             = useState(true);

  const currentGap = gapClaims?.[activeIdx];
  const level      = getGapLevel(currentGap?.citation_density);

  /* rebuild cytoscape when gap or graph visibility changes */
  useEffect(() => {
    if (!showGraph || !containerRef.current || !currentGap) return;
    const snapshot = currentGap?.subgraph_snapshot;
    if (!snapshot) return;

    setSelectedNode(null);
    const elements = [];
    const nodes    = snapshot.nodes || [];
    const edges    = snapshot.edges || snapshot.links || [];

    nodes.forEach((node) => {
      let label = node.title || node.name || node.label || node.id;
      if (node.type === 'Paper' && label?.length > 30) label = label.slice(0, 28) + '…';
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
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: 'rgba(240,242,247,0.75)',
            'font-family': 'IBM Plex Sans, sans-serif',
            'font-size': '9px',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': '#3a3f54',
            width: 22, height: 22,
            'text-wrap': 'wrap',
            'text-max-width': 90,
            'border-width': 1.5,
            'border-color': 'rgba(255,255,255,0.10)',
          },
        },
        {
          selector: 'node[type="Paper"]',
          style: { 'background-color': '#6c8aff', 'border-color': 'rgba(108,138,255,0.55)', width: 26, height: 26 },
        },
        {
          selector: 'node[type="Author"]',
          style: { 'background-color': '#2dd4bf', 'border-color': 'rgba(45,212,191,0.45)', width: 18, height: 18 },
        },
        {
          selector: 'node[type="Topic"]',
          style: {
            'background-color': '#a78bfa', 'border-color': 'rgba(167,139,250,0.55)',
            shape: 'hexagon', width: 32, height: 32, 'font-size': '10px',
          },
        },
        {
          selector: 'node:selected',
          style: { 'border-color': '#ffffff', 'border-width': 2.5 },
        },
        {
          selector: 'edge',
          style: {
            width: 1.4,
            'line-color': 'rgba(255,255,255,0.10)',
            'target-arrow-color': 'rgba(108,138,255,0.5)',
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
        name: 'cose', animate: true, animationDuration: 700,
        padding: 40, nodeRepulsion: () => 6500, idealEdgeLength: () => 80,
      },
    });

    cyRef.current.on('tap', 'node', (evt) => {
      const n = evt.target;
      setSelectedNode({
        id: n.data('id'), label: n.data('fullTitle'),
        type: n.data('type'), year: n.data('year'), citations: n.data('citations'),
      });
    });
    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) setSelectedNode(null);
    });

    if (onHighlightPapers) {
      onHighlightPapers(nodes.filter(n => n.type === 'Paper').map(n => n.id));
    }
    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [gapClaims, activeIdx, showGraph]);

  /* zoom helpers */
  const zoomIn  = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 1.25, renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  const zoomOut = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 0.8,  renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  const fitView = () => cyRef.current?.fit(undefined, 30);

  /* ── Empty state ── */
  if (!gapClaims || gapClaims.length === 0) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon"><Network size={22} color="var(--text-muted)" /></div>
        <p className="panel-empty-title">No gap evidence available</p>
        <p className="panel-empty-desc">
          Run analysis on a topic with at least 15 papers to generate research gap insights.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in gv2-root">

      {/* ── Page title ── */}
      <div className="gv2-page-header">
        <div className="gv2-page-title-row">
          <TrendingDown size={16} className="gv2-page-icon" />
          <h2 className="gv2-page-title">Research Gap Analysis</h2>
          <span className="gv2-page-count">{gapClaims.length} gaps detected</span>
        </div>
        <p className="gv2-page-subtitle">
          A <strong>research gap</strong> is a topic where existing papers don't build on each other —
          meaning no one has fully connected the ideas yet. These are prime opportunities for new research.
        </p>
      </div>

      {/* ── Gap tabs ── */}
      <div className="gv2-tabs">
        {gapClaims.map((gap, i) => {
          const lvl = getGapLevel(gap.citation_density);
          return (
            <button
              key={gap.gap_id || i}
              className={`gv2-tab ${activeIdx === i ? 'active' : ''}`}
              onClick={() => { setActiveIdx(i); setShowGraph(false); setSelectedNode(null); }}
              style={activeIdx === i ? { borderColor: lvl.color, color: lvl.color } : {}}
            >
              <lvl.Icon size={11} style={{ flexShrink: 0 }} />
              <span className="gv2-tab-label">{gap.topic_label}</span>
              <span
                className="gv2-tab-badge"
                style={activeIdx === i ? { background: lvl.bg, color: lvl.color } : {}}
              >
                {lvl.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Active gap detail ── */}
      {currentGap && (
        <div className="gv2-detail">

          {/* ① Risk header */}
          <div className="gv2-risk-header" style={{ borderColor: level.border, background: level.bg }}>
            <div className="gv2-risk-left">
              <level.Icon size={20} style={{ color: level.color, flexShrink: 0 }} />
              <div>
                <div className="gv2-risk-label" style={{ color: level.color }}>{level.label}</div>
                <div className="gv2-risk-sublabel">{level.sublabel}</div>
              </div>
            </div>
            <div className="gv2-risk-score" style={{ color: level.color }}>
              <span className="gv2-risk-num">
                {currentGap.citation_density != null ? currentGap.citation_density.toFixed(2) : '—'}
              </span>
              <span className="gv2-risk-unit">citations/paper</span>
            </div>
          </div>

          {/* ② Gap topic + description */}
          <div className="gv2-card">
            <div className="gv2-card-label"><BookOpen size={11} /> Gap Topic</div>
            <div className="gv2-card-title">{currentGap.topic_label}</div>
            <p className="gv2-card-desc">{currentGap.description}</p>
          </div>

          {/* ③ Plain-English explanation */}
          <div className="gv2-card gv2-card--explain">
            <div className="gv2-card-label"><Info size={11} /> What This Means</div>
            <p className="gv2-explain-text">{level.what}</p>
            {/* Coverage meter */}
            <CoverageMeter pct={level.pct} color={level.color} />
          </div>

          {/* ④ Future directions */}
          {currentGap.suggested_directions?.length > 0 && (
            <div className="gv2-card">
              <div className="gv2-card-label"><Lightbulb size={11} /> Suggested Research Directions</div>
              <p className="gv2-dirs-intro">
                These are concrete ways researchers could address this gap:
              </p>
              <ol className="gv2-dirs-list">
                {currentGap.suggested_directions.map((dir, idx) => (
                  <li key={idx} className="gv2-dirs-item">
                    <span className="gv2-dirs-num">{idx + 1}</span>
                    <span>{dir}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ⑤ Citation graph toggle */}
          <div className="gv2-graph-section">
            <button
              className="gv2-graph-toggle"
              onClick={() => setShowGraph(v => !v)}
            >
              <Eye size={13} />
              {showGraph ? 'Hide' : 'Show'} Citation Network Graph
              <span className="gv2-graph-toggle-hint">
                (visual map of which papers cite each other)
              </span>
            </button>

            {showGraph && (
              <div className="gv2-canvas-wrap fade-in">

                {/* legend strip */}
                <div className="gv2-legend-strip">
                  <span className="gv2-legend-item"><span className="gv2-dot" style={{ background: '#6c8aff' }} />Paper</span>
                  <span className="gv2-legend-item"><span className="gv2-dot" style={{ background: '#2dd4bf' }} />Author</span>
                  <span className="gv2-legend-item"><span className="gv2-dot gv2-dot--hex" style={{ background: '#a78bfa' }} />Topic</span>
                  <span className="gv2-legend-item gv2-legend-edge"><span className="gv2-edge-line" />Citation link</span>
                  <span className="gv2-legend-note">
                    Fewer links between papers = bigger gap
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <div ref={containerRef} className="gv2-canvas" />

                  {/* zoom controls */}
                  <div className="gv2-zoom-controls">
                    <button className="gv2-zoom-btn" onClick={zoomIn}  title="Zoom in"><ZoomIn  size={13} /></button>
                    <button className="gv2-zoom-btn" onClick={zoomOut} title="Zoom out"><ZoomOut size={13} /></button>
                    <button className="gv2-zoom-btn" onClick={fitView} title="Fit all"><Maximize2 size={13} /></button>
                  </div>

                  {/* tip banner */}
                  {showTip && (
                    <div className="gv2-tip">
                      <Info size={11} style={{ flexShrink: 0 }} />
                      <span>Click any node for details &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Drag to pan</span>
                      <button className="gv2-tip-close" onClick={() => setShowTip(false)}>✕</button>
                    </div>
                  )}

                  {/* node popup */}
                  {selectedNode && (
                    <div className="gv2-node-popup">
                      <div className="gv2-node-type">{selectedNode.type}</div>
                      <div className="gv2-node-title">{selectedNode.label}</div>
                      {selectedNode.year      && <div className="gv2-node-meta">📅 Published {selectedNode.year}</div>}
                      {selectedNode.citations != null && <div className="gv2-node-meta">📎 {selectedNode.citations} citations</div>}
                      <button className="gv2-node-close" onClick={() => setSelectedNode(null)}>✕</button>
                    </div>
                  )}
                </div>

                <p className="gv2-canvas-caption">
                  Each node is a paper, author, or topic. Lines show citation relationships.
                  Isolated clusters with few connections indicate the research gap.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
