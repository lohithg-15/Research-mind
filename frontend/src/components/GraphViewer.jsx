import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Network, TrendingDown, X } from 'lucide-react';
import GraphCanvas from './graph/GraphCanvas';
import GapCard from './graph/GapCard';
import { getGapLevel } from './graph/gapLevel';
import Pill from './ui/Pill';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import './graph/graph.css';

export default function GraphViewer({ gapClaims, onHighlightPapers }) {
  const [params] = useSearchParams();
  const gapParam = params.get('gap');
  const initialIdx = Math.max(0, (gapClaims || []).findIndex((g, i) => String(g.gap_id ?? i) === gapParam));

  const [activeIdx, setActiveIdx] = useState(initialIdx);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showGraph, setShowGraph] = useState(gapParam != null);
  const [showTip, setShowTip] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibility, setVisibility] = useState({ authors: true, topics: true, coauthor: true });
  const currentGap = gapClaims?.[activeIdx];
  const level = getGapLevel(currentGap?.citation_density);

  const toggleVisibility = useCallback((key, value) => setVisibility(v => ({ ...v, [key]: value })), []);

  useEffect(() => { if (!showGraph) setIsFullscreen(false); }, [showGraph]);

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

  if (!gapClaims?.length) {
    return <EmptyState icon={<Network size={20} />} title="No gap evidence available" description="Run analysis on a topic with at least 15 papers to generate research gap insights." />;
  }

  return (
    <div className="rm-tab-content rm-graphview">
      <div className="rm-graphview-head">
        <h2><TrendingDown size={18} /> Research gap analysis</h2>
        <Badge tone="accent">{gapClaims.length} gaps detected</Badge>
      </div>
      <p className="rm-graphview-sub">A <strong>research gap</strong> is a topic where existing papers do not build on each other, so no one has fully connected the ideas yet.</p>

      <div className="rm-graphview-pills" role="tablist" aria-label="Gaps">
        {gapClaims.map((gap, index) => {
          const tabLevel = getGapLevel(gap.citation_density);
          return (
            <Pill key={gap.gap_id || index} active={activeIdx === index} role="tab" onClick={() => { setActiveIdx(index); setShowGraph(false); setSelectedNode(null); }}>
              <tabLevel.Icon size={12} /> {gap.topic_label}
            </Pill>
          );
        })}
      </div>

      {currentGap && (
        <div className="rm-graphview-body">
          <div className="rm-graphview-main">
            <Button variant="secondary" size="sm" icon={showGraph ? <EyeOff size={14} /> : <Eye size={14} />} onClick={() => setShowGraph(v => !v)} aria-expanded={showGraph}>
              {showGraph ? 'Hide' : 'Show'} citation network graph
            </Button>
            {showGraph && (
              <div className={`rm-graph-wrap${isFullscreen ? ' rm-graph-wrap-fs' : ''}`}>
                {isFullscreen && (
                  <Button className="rm-graph-exit" variant="secondary" size="sm" icon={<X size={14} />} onClick={() => setIsFullscreen(false)}>Exit fullscreen</Button>
                )}
                <GraphCanvas
                  snapshot={currentGap.subgraph_snapshot}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(v => !v)}
                  selectedNode={selectedNode}
                  onSelect={setSelectedNode}
                  level={level}
                  visibility={visibility}
                  onToggleVisibility={toggleVisibility}
                  showTip={showTip}
                  onDismissTip={() => setShowTip(false)}
                />
              </div>
            )}
            {showGraph && <p className="rm-graph-caption">Each circle is a paper; the bigger it is, the more often it has been cited. Small grey dots are authors. Lines show citation relationships, and isolated clusters with few connections are where the research gap sits.</p>}
          </div>
          <GapCard gap={currentGap} level={level} />
        </div>
      )}
    </div>
  );
}
