import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import GraphToolbar from './GraphToolbar';
import GraphLegend from './GraphLegend';
import GraphInspector from './GraphInspector';
import { GRAPH_THEME, PAPER_MAX_SIZE, PAPER_MIN_SIZE, paperScale, truncate } from './graphTheme';

export default function GraphCanvas({ snapshot, isFullscreen, onToggleFullscreen, onSelect, selectedNode, showTip, onDismissTip }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !snapshot) return undefined;
    const nodes = snapshot.nodes || [];
    const edges = snapshot.edges || snapshot.links || [];
    const maxCitations = nodes.reduce((max, node) => Math.max(max, Number(node.citation_count) || 0), 0);
    const elements = nodes.map(node => {
      const type = node.type || 'Paper';
      const title = node.title || node.name || node.label || node.id;
      const scale = type === 'Paper' ? paperScale(node.citation_count, maxCitations) : 0;
      return { data: { id: node.id, label: truncate(title, type === 'Paper' ? 20 : 18), type, fullTitle: title, year: node.year, citationCount: node.citation_count, venue: node.venue, url: node.url, size: Math.round(PAPER_MIN_SIZE + (PAPER_MAX_SIZE - PAPER_MIN_SIZE) * scale), fill: Number((0.42 + 0.53 * scale).toFixed(3)) } };
    });
    edges.forEach((edge, index) => elements.push({ data: { id: `edge-${index}-${edge.source}-${edge.target}`, source: edge.source, target: edge.target, type: edge.type || '' } }));

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        { selector: 'node', style: { label: 'data(label)', color: 'var(--rm-text)', 'font-family': 'var(--rm-font-ui)', 'font-size': '9.5px', 'text-valign': 'top', 'text-halign': 'center', 'text-margin-y': -4, 'text-opacity': 0, 'text-wrap': 'none', 'text-background-color': GRAPH_THEME.background, 'text-background-opacity': 0.88, 'text-background-padding': 2, 'text-background-shape': 'roundrectangle', 'background-color': GRAPH_THEME.paper, 'background-opacity': 0.85, width: 20, height: 20, 'border-width': 1, 'border-color': GRAPH_THEME.background, 'border-opacity': 0.9, 'overlay-opacity': 0, 'transition-property': 'background-opacity, border-color, border-width', 'transition-duration': '140ms' } },
        { selector: 'node[type="Paper"]', style: { 'background-color': GRAPH_THEME.paper, 'background-opacity': 'data(fill)', width: 'data(size)', height: 'data(size)' } },
        { selector: 'node[type="Author"]', style: { 'background-color': GRAPH_THEME.author, 'background-opacity': 0.9, 'border-width': 0, width: 8, height: 8, 'font-size': '9px' } },
        { selector: 'node[type="Topic"]', style: { 'background-color': GRAPH_THEME.topic, 'background-opacity': 0.8, shape: 'hexagon', width: 26, height: 26, 'font-size': '9px', 'font-weight': 700, 'text-opacity': 1, 'text-margin-y': -5 } },
        { selector: 'edge', style: { width: 1, 'line-color': GRAPH_THEME.cites, 'line-opacity': 0.5, 'target-arrow-shape': 'none', 'curve-style': 'bezier', 'overlay-opacity': 0 } },
        { selector: 'edge[type="CO_AUTHORED_WITH"], edge[type="AUTHORED_BY"]', style: { 'line-opacity': 0.25 } },
        { selector: 'edge[type="CITES"]', style: { 'line-opacity': 0.5, 'target-arrow-shape': 'triangle', 'target-arrow-color': GRAPH_THEME.cites, 'arrow-scale': 0.55 } },
        { selector: 'node[type="Paper"].zoom-label, node.highlighted, node.hovered', style: { 'text-opacity': 1 } },
        { selector: 'node.hovered', style: { 'z-index': 30, 'font-size': '10.5px', 'border-width': 2, 'border-color': GRAPH_THEME.selection, 'border-opacity': 1, 'background-opacity': 1 } },
        { selector: 'node.highlighted, node:selected', style: { 'z-index': 40, 'border-width': 3, 'border-color': GRAPH_THEME.selection, 'border-opacity': 1, 'background-opacity': 1 } },
        { selector: 'edge.highlighted', style: { 'line-color': GRAPH_THEME.selection, 'line-opacity': 0.95, 'target-arrow-color': GRAPH_THEME.selection, width: 1.8, 'z-index': 15 } },
        { selector: 'node.faded', style: { opacity: GRAPH_THEME.fadedOpacity, 'text-opacity': 0 } },
        { selector: 'edge.faded', style: { 'line-opacity': 0.07, opacity: 0.5 } },
      ],
      layout: { name: 'cose', animate: true, animationDuration: 700, padding: 60, nodeRepulsion: () => 18000, idealEdgeLength: () => 150, edgeElasticity: () => 60, nodeOverlap: 24, componentSpacing: 160, gravity: 0.6, nodeDimensionsIncludeLabels: false },
    });
    cy.on('tap', 'node', event => {
      const node = event.target;
      onSelect({ id: node.data('id'), label: node.data('fullTitle'), type: node.data('type'), year: node.data('year'), citationCount: node.data('citationCount'), venue: node.data('venue'), url: node.data('url') });
      const neighborhood = node.closedNeighborhood();
      cy.elements().removeClass('highlighted faded');
      neighborhood.addClass('highlighted');
      cy.elements().difference(neighborhood).addClass('faded');
    });
    cy.on('tap', event => { if (event.target === cy) { onSelect(null); cy.elements().removeClass('highlighted faded'); } });
    cy.on('mouseover', 'node', event => event.target.addClass('hovered'));
    cy.on('mouseout', 'node', event => event.target.removeClass('hovered'));
    const syncLabels = () => cy.nodes('[type="Paper"]')[cy.zoom() >= 1.15 ? 'addClass' : 'removeClass']('zoom-label');
    cy.on('zoom', syncLabels);
    cy.one('layoutstop', syncLabels);
    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, [snapshot, onSelect]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return undefined;
    const frame = requestAnimationFrame(() => { cy.resize(); cy.fit(undefined, isFullscreen ? 70 : 40); });
    return () => cancelAnimationFrame(frame);
  }, [isFullscreen]);

  const zoom = factor => {
    const cy = cyRef.current;
    if (cy && containerRef.current) cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  };
  const fit = () => cyRef.current?.fit(undefined, isFullscreen ? 70 : 40);

  return (
    <>
      <GraphLegend />
      <div className="gv2-graph-stage">
        <div ref={containerRef} className="gv2-canvas" />
        <GraphToolbar onZoomIn={() => zoom(1.25)} onZoomOut={() => zoom(0.8)} onFit={fit} isFullscreen={isFullscreen} onToggleFullscreen={onToggleFullscreen} />
        {showTip && <div className="gv2-tip"><span>Hover a node to read its label · Click to isolate its neighbourhood · Scroll to zoom</span><button type="button" className="gv2-tip-close" onClick={onDismissTip}>×</button></div>}
        <GraphInspector node={selectedNode} onClose={() => onSelect(null)} />
      </div>
    </>
  );
}
