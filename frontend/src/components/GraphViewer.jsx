import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import {
  Network, Info, ZoomIn, ZoomOut, Maximize2, Minimize2, Crosshair, X,
  ArrowRight, Lightbulb, AlertTriangle, CheckCircle,
  AlertCircle, XCircle, BookOpen, TrendingDown, Eye,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Graph visual language
   One accent (selection) + a muted 3-tone palette.
───────────────────────────────────────────────*/
const GRAPH_BG      = '#fbfcfd';
const C_PAPER       = '#4a7080';  // muted teal-slate
const C_AUTHOR      = '#c3cbd1';  // pale neutral — deliberately recessive
const C_TOPIC       = '#8b8fa6';  // muted slate-violet
const C_ACCENT      = '#facc15';  // selection ring (kept from previous version)
const C_ACCENT_EDGE = '#eab308';  // same hue, darkened so it reads on a white canvas

/* Paper node size: log(citations), normalised against the loudest node in this
   subgraph so hierarchy stays visible even in low-citation corpora, clamped so
   a single 10k-citation outlier can't swallow the canvas. */
const PAPER_MIN_SIZE = 20;
const PAPER_MAX_SIZE = 56;

function paperScale(citationCount, maxCitations) {
  const c = Number(citationCount);
  if (!Number.isFinite(c) || c <= 0) return 0;
  const ceiling = Math.max(maxCitations, 10);
  const t = Math.log(1 + c) / Math.log(1 + ceiling);
  return Math.min(1, Math.max(0, t));
}

/* Labels are the main source of clutter — truncate hard. */
function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

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
  const [isFullscreen, setIsFullscreen]   = useState(false);

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

    const maxCitations = nodes.reduce((max, n) => {
      const c = Number(n.citation_count);
      return Number.isFinite(c) && c > max ? c : max;
    }, 0);

    nodes.forEach((node) => {
      const type      = node.type || 'Paper';
      const fullTitle = node.title || node.name || node.label || node.id;
      const t         = type === 'Paper' ? paperScale(node.citation_count, maxCitations) : 0;

      elements.push({
        data: {
          id:            node.id,
          label:         truncate(fullTitle, type === 'Paper' ? 20 : 18),
          type,
          fullTitle,
          year:          node.year,
          citationCount: node.citation_count,
          venue:         node.venue,
          url:           node.url,
          /* size + fill weight drive the visual hierarchy for Paper nodes */
          size:          Math.round(PAPER_MIN_SIZE + (PAPER_MAX_SIZE - PAPER_MIN_SIZE) * t),
          fill:          Number((0.42 + 0.53 * t).toFixed(3)),
        },
      });
    });
    edges.forEach((edge, idx) => {
      elements.push({
        data: {
          id:     `edge-${idx}-${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type:   edge.type || '',
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
        /* ── Nodes: labels off by default, revealed on hover / selection / zoom ── */
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: '#2a3138',
            'font-family': 'IBM Plex Sans, sans-serif',
            'font-size': '9.5px',
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': -4,
            'text-wrap': 'none',
            'text-opacity': 0,
            'text-background-color': GRAPH_BG,
            'text-background-opacity': 0.88,
            'text-background-padding': 2,
            'text-background-shape': 'roundrectangle',
            'background-color': C_PAPER,
            'background-opacity': 0.85,
            width: 20, height: 20,
            'border-width': 1,
            'border-color': '#ffffff',
            'border-opacity': 0.9,
            'overlay-opacity': 0,
            'transition-property': 'background-opacity, border-color, border-width',
            'transition-duration': '140ms',
          },
        },
        {
          selector: 'node[type="Paper"]',
          style: {
            'background-color': C_PAPER,
            'background-opacity': 'data(fill)',
            width: 'data(size)',
            height: 'data(size)',
          },
        },
        {
          /* Authors recede to small unlabeled dots — this is what un-clutters the map */
          selector: 'node[type="Author"]',
          style: {
            'background-color': C_AUTHOR,
            'background-opacity': 0.9,
            'border-width': 0,
            width: 8, height: 8,
            'font-size': '9px',
          },
        },
        {
          selector: 'node[type="Topic"]',
          style: {
            'background-color': C_TOPIC,
            'background-opacity': 0.8,
            shape: 'hexagon', width: 26, height: 26,
            'font-family': 'Syne, sans-serif',
            'font-size': '9px',
            'font-weight': 700,
            'text-transform': 'uppercase',
            'text-opacity': 1,          // few in number, and they anchor the map
            'text-margin-y': -5,
          },
        },

        /* ── Edges: hair-thin and near-invisible until a neighborhood is picked ── */
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#1f2933',
            'line-opacity': 0.13,
            'target-arrow-shape': 'none',   // only CITES is directional
            'curve-style': 'bezier',
            'overlay-opacity': 0,
          },
        },
        {
          /* co-authorship is combinatorially dense — push it furthest back */
          selector: 'edge[type="CO_AUTHORED_WITH"], edge[type="AUTHORED_BY"]',
          style: { 'line-opacity': 0.07 },
        },
        {
          selector: 'edge[type="CITES"]',
          style: {
            'line-opacity': 0.22,
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#1f2933',
            'arrow-scale': 0.55,
          },
        },

        /* ── Label reveal ── */
        {
          selector: 'node[type="Paper"].zoom-label, node.highlighted, node.hovered',
          style: { 'text-opacity': 1 },
        },
        {
          selector: 'node.hovered',
          style: {
            'z-index': 30,
            'font-size': '10.5px',
            'border-width': 2,
            'border-color': C_ACCENT_EDGE,
            'border-opacity': 1,
            'background-opacity': 1,
          },
        },

        /* ── Selection: the single accent in the whole palette ── */
        {
          selector: 'node.highlighted',
          style: {
            'z-index': 20,
            'border-width': 2.5,
            'border-color': C_ACCENT,
            'border-opacity': 1,
            'background-opacity': 1,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': C_ACCENT,
            'border-opacity': 1,
            'z-index': 40,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': C_ACCENT_EDGE,
            'line-opacity': 0.95,
            'target-arrow-color': C_ACCENT_EDGE,
            width: 1.8,
            'z-index': 15,
          },
        },

        /* ── Everything outside the picked neighborhood drops away. Last in the
              stylesheet so it wins over .zoom-label. ── */
        {
          selector: 'node.faded',
          style: { opacity: 0.22, 'text-opacity': 0 },
        },
        {
          selector: 'edge.faded',
          style: { 'line-opacity': 0.07, opacity: 0.5 },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 700,
        padding: 60,
        nodeRepulsion: () => 18000,
        idealEdgeLength: () => 150,
        edgeElasticity: () => 60,
        nodeOverlap: 24,
        componentSpacing: 160,
        gravity: 0.6,
        nodeDimensionsIncludeLabels: false,  // labels are hidden by default
      },
    });

    const cy = cyRef.current;

    cy.on('tap', 'node', (evt) => {
      const n = evt.target;
      setSelectedNode({
        id: n.data('id'), label: n.data('fullTitle'),
        type: n.data('type'), year: n.data('year'),
        citationCount: n.data('citationCount'),
        venue: n.data('venue'), url: n.data('url'),
      });

      const neighborhood = n.closedNeighborhood();
      cy.elements().removeClass('highlighted faded');
      neighborhood.addClass('highlighted');
      cy.elements().difference(neighborhood).addClass('faded');
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.elements().removeClass('highlighted faded');
      }
    });

    /* hover reveals a single label at a time — never a wall of text */
    cy.on('mouseover', 'node', (evt) => evt.target.addClass('hovered'));
    cy.on('mouseout',  'node', (evt) => evt.target.removeClass('hovered'));

    /* Once the user zooms in there is physical room for paper titles, so let
       them back in. Authors stay unlabeled at every zoom level. */
    const PAPER_LABEL_ZOOM_THRESHOLD = 1.15;
    const syncZoomLabels = () => {
      const papers = cy.nodes('[type="Paper"]');
      if (cy.zoom() >= PAPER_LABEL_ZOOM_THRESHOLD) papers.addClass('zoom-label');
      else papers.removeClass('zoom-label');
    };
    cy.on('zoom', syncZoomLabels);
    cy.one('layoutstop', syncZoomLabels);

    if (onHighlightPapers) {
      onHighlightPapers(nodes.filter(n => n.type === 'Paper').map(n => n.id));
    }
    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [gapClaims, activeIdx, showGraph]);

  /* Fullscreen: the cytoscape instance is never rebuilt — the same container
     element just changes size, so selection/highlight classes survive. */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const frame = requestAnimationFrame(() => {
      cy.resize();
      cy.fit(undefined, isFullscreen ? 70 : 40);
    });
    return () => cancelAnimationFrame(frame);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  /* never leave a fullscreen overlay behind when the graph is hidden */
  useEffect(() => { if (!showGraph) setIsFullscreen(false); }, [showGraph]);

  /* zoom helpers */
  const zoomIn  = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 1.25, renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  const zoomOut = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 0.8,  renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  const fitView = () => cyRef.current?.fit(undefined, isFullscreen ? 70 : 40);

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
              <div className={`gv2-canvas-wrap fade-in${isFullscreen ? ' gv2-canvas-wrap--fs' : ''}`}>

                {/* exit fullscreen — large tap target, top-right of the overlay */}
                {isFullscreen && (
                  <button
                    className="gv2-fs-exit"
                    onClick={() => setIsFullscreen(false)}
                    title="Exit fullscreen (Esc)"
                  >
                    <X size={16} />
                    Exit fullscreen
                  </button>
                )}

                {/* legend strip */}
                <div className="gv2-legend-strip">
                  <span className="gv2-legend-item"><span className="gv2-dot" style={{ background: C_PAPER }} />Paper</span>
                  <span className="gv2-legend-item"><span className="gv2-dot gv2-dot--sm" style={{ background: C_AUTHOR }} />Author</span>
                  <span className="gv2-legend-item"><span className="gv2-dot gv2-dot--hex" style={{ background: C_TOPIC }} />Topic</span>
                  <span className="gv2-legend-item gv2-legend-edge"><span className="gv2-edge-line" />Citation link</span>
                  <span className="gv2-legend-item gv2-legend-size">
                    <span className="gv2-dot gv2-dot--sm" style={{ background: C_PAPER }} />
                    <span className="gv2-dot" style={{ background: C_PAPER }} />
                    <span className="gv2-dot gv2-dot--lg" style={{ background: C_PAPER }} />
                    More cited
                  </span>
                  <span className="gv2-legend-note">
                    Fewer links between papers = bigger gap
                  </span>
                </div>

                <div className="gv2-graph-stage">
                  <div ref={containerRef} className="gv2-canvas" />

                  {/* zoom controls */}
                  <div className="gv2-zoom-controls">
                    <button className="gv2-zoom-btn" onClick={zoomIn}  title="Zoom in"><ZoomIn  size={13} /></button>
                    <button className="gv2-zoom-btn" onClick={zoomOut} title="Zoom out"><ZoomOut size={13} /></button>
                    <button className="gv2-zoom-btn" onClick={fitView} title="Fit all"><Crosshair size={13} /></button>
                    <button
                      className={`gv2-zoom-btn${isFullscreen ? ' is-active' : ''}`}
                      onClick={() => setIsFullscreen(v => !v)}
                      title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
                    >
                      {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                  </div>

                  {/* tip banner */}
                  {showTip && (
                    <div className="gv2-tip">
                      <Info size={11} style={{ flexShrink: 0 }} />
                      <span>Hover a node to read its label &nbsp;·&nbsp; Click to isolate its neighbourhood &nbsp;·&nbsp; Scroll to zoom</span>
                      <button className="gv2-tip-close" onClick={() => setShowTip(false)}>✕</button>
                    </div>
                  )}

                  {/* node popup */}
                  {selectedNode && (
                    <div className="gv2-node-popup">
                      <div className="gv2-node-type">{selectedNode.type}</div>
                      <div className="gv2-node-title">{selectedNode.label}</div>
                      {selectedNode.type === 'Paper' && (
                        <>
                          {selectedNode.year && <div className="gv2-node-meta">📅 Published {selectedNode.year}</div>}
                          {selectedNode.venue && <div className="gv2-node-meta">🏛 {selectedNode.venue}</div>}
                          {selectedNode.citationCount != null && (
                            <div className="gv2-node-meta">📎 {selectedNode.citationCount} citations</div>
                          )}
                          {selectedNode.url && (
                            <a
                              className="gv2-node-link"
                              href={selectedNode.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open paper ↗
                            </a>
                          )}
                        </>
                      )}
                      <button className="gv2-node-close" onClick={() => setSelectedNode(null)}>✕</button>
                    </div>
                  )}
                </div>

                <p className="gv2-canvas-caption">
                  Each circle is a paper — the bigger it is, the more often it has been cited.
                  Small grey dots are authors. Lines show citation relationships, and isolated
                  clusters with few connections are where the research gap sits.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
