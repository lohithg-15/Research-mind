import React, { useEffect, useState } from 'react';
import { Eye, Network, TrendingDown, X } from 'lucide-react';
import GraphCanvas from './graph/GraphCanvas';
import GapCard, { getGapLevel } from './graph/GapCard';
import './graph/graph.css';

export default function GraphViewer({ gapClaims, onHighlightPapers }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentGap = gapClaims?.[activeIdx];
  const level = getGapLevel(currentGap?.citation_density);

  useEffect(() => {
    if (!showGraph) setIsFullscreen(false);
  }, [showGraph]);

  useEffect(() => {
    if (currentGap?.subgraph_snapshot && onHighlightPapers) {
      onHighlightPapers((currentGap.subgraph_snapshot.nodes || []).filter(node => node.type === 'Paper').map(node => node.id));
    }
  }, [currentGap, onHighlightPapers]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = event => { if (event.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [isFullscreen]);

  if (!gapClaims?.length) return <div className="panel-empty"><div className="panel-empty-icon"><Network size={22} /></div><p className="panel-empty-title">No gap evidence available</p><p className="panel-empty-desc">Run analysis on a topic with at least 15 papers to generate research gap insights.</p></div>;

  return (
    <div className="fade-in gv2-root">
      <div className="gv2-page-header"><div className="gv2-page-title-row"><TrendingDown size={16} className="gv2-page-icon" /><h2 className="gv2-page-title">Research Gap Analysis</h2><span className="gv2-page-count">{gapClaims.length} gaps detected</span></div><p className="gv2-page-subtitle">A <strong>research gap</strong> is a topic where existing papers do not build on each other — meaning no one has fully connected the ideas yet.</p></div>
      <div className="gv2-tabs">{gapClaims.map((gap, index) => { const tabLevel = getGapLevel(gap.citation_density); return <button type="button" key={gap.gap_id || index} className={`gv2-tab ${activeIdx === index ? 'active' : ''}`} onClick={() => { setActiveIdx(index); setShowGraph(false); setSelectedNode(null); }}><tabLevel.Icon size={11} /><span className="gv2-tab-label">{gap.topic_label}</span><span className="gv2-tab-badge">{tabLevel.label}</span></button>; })}</div>
      {currentGap && <div className="gv2-detail">
        <GapCard gap={currentGap} level={level} />
        <div className="gv2-graph-section">
          <button type="button" className="gv2-graph-toggle" onClick={() => setShowGraph(value => !value)}><Eye size={13} />{showGraph ? 'Hide' : 'Show'} Citation Network Graph</button>
          {showGraph && <div className={`gv2-canvas-wrap fade-in${isFullscreen ? ' gv2-canvas-wrap--fs' : ''}`}>{isFullscreen && <button type="button" className="gv2-fs-exit" onClick={() => setIsFullscreen(false)} title="Exit fullscreen (Esc)"><X size={16} />Exit fullscreen</button>}<GraphCanvas snapshot={currentGap.subgraph_snapshot} isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(value => !value)} selectedNode={selectedNode} onSelect={setSelectedNode} showTip={showTip} onDismissTip={() => setShowTip(false)} /><p className="gv2-canvas-caption">Each circle is a paper — the bigger it is, the more often it has been cited. Small grey dots are authors. Lines show citation relationships, and isolated clusters with few connections are where the research gap sits.</p></div>}
        </div>
      </div>}
    </div>
  );
}
