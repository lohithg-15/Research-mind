import React, { useCallback, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import GraphToolbar from './GraphToolbar';
import GraphLegend from './GraphLegend';
import GraphInspector from './GraphInspector';
import GraphSearch from './GraphSearch';
import { GRAPH_THEME, PAPER_MAX_SIZE, PAPER_MIN_SIZE, paperScale, truncate } from './graphTheme';

export default function GraphCanvas({
  snapshot, isFullscreen, onToggleFullscreen, onSelect, selectedNode, level,
  visibility, onToggleVisibility, showTip, onDismissTip,
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const focusRef = useRef(null);

  /* Build / destroy the cytoscape instance only when the data changes. */
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
        { selector: 'node', style: { label: 'data(label)', color: GRAPH_THEME.text, 'font-family': 'Manrope, sans-serif', 'font-size': '9.5px', 'text-valign': 'top', 'text-halign': 'center', 'text-margin-y': -4, 'text-opacity': 0, 'text-wrap': 'none', 'text-background-color': GRAPH_THEME.background, 'text-background-opacity': 0.88, 'text-background-padding': 2, 'text-background-shape': 'roundrectangle', 'background-color': GRAPH_THEME.paper, 'background-opacity': 0.85, width: 20, height: 20, 'border-width': 1, 'border-color': GRAPH_THEME.background, 'border-opacity': 0.9, 'overlay-opacity': 0, 'transition-property': 'background-opacity, border-color, border-width', 'transition-duration': '140ms' } },
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

    const selectNode = (node) => {
      const id = node.data('id');
      const link = (edge, key) => { const other = edge[key](); return { id: other.id(), label: other.data('fullTitle') }; };
      const cites = node.outgoers('edge[type="CITES"]').map(edge => link(edge, 'target'));
      const citedBy = node.incomers('edge[type="CITES"]').map(edge => link(edge, 'source'));
      onSelect({ id, label: node.data('fullTitle'), type: node.data('type'), year: node.data('year'), citationCount: node.data('citationCount'), venue: node.data('venue'), url: node.data('url'), cites, citedBy });
      const neighborhood = node.closedNeighborhood();
      cy.elements().removeClass('highlighted faded');
      neighborhood.addClass('highlighted');
      cy.elements().difference(neighborhood).addClass('faded');
    };
    cy.on('tap', 'node', event => selectNode(event.target));
    cy.on('tap', event => { if (event.target === cy) { onSelect(null); cy.elements().removeClass('highlighted faded'); } });
    cy.on('mouseover', 'node', event => event.target.addClass('hovered'));
    cy.on('mouseout', 'node', event => event.target.removeClass('hovered'));
    const syncLabels = () => cy.nodes('[type="Paper"]')[cy.zoom() >= 1.15 ? 'addClass' : 'removeClass']('zoom-label');
    cy.on('zoom', syncLabels);
    cy.one('layoutstop', syncLabels);

    focusRef.current = (term) => {
      const needle = term.toLowerCase();
      const match = cy.nodes().filter(node => String(node.data('fullTitle') || '').toLowerCase().includes(needle)).first();
      if (!match || match.empty()) return false;
      selectNode(match);
      cy.animate({ center: { eles: match }, zoom: Math.max(cy.zoom(), 1.3) }, { duration: 300 });
      return true;
    };
    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; focusRef.current = null; };
  }, [snapshot, onSelect]);

  /* Visibility toggles never rebuild the instance. */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes('[type="Author"]').style('display', visibility.authors ? 'element' : 'none');
    cy.nodes('[type="Topic"]').style('display', visibility.topics ? 'element' : 'none');
    cy.edges('[type="CO_AUTHORED_WITH"]').style('display', visibility.coauthor ? 'element' : 'none');
  }, [visibility, snapshot]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return undefined;
    const frame = requestAnimationFrame(() => { cy.resize(); cy.fit(undefined, isFullscreen ? 70 : 40); });
    return () => cancelAnimationFrame(frame);
  }, [isFullscreen]);

  const fitPadding = isFullscreen ? 70 : 40;
  const zoom = factor => {
    const cy = cyRef.current;
    if (cy && containerRef.current) cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 } });
  };
  const fit = () => cyRef.current?.fit(undefined, fitPadding);
  const center = () => cyRef.current?.center();
  const search = useCallback(term => (focusRef.current ? focusRef.current(term) : false), []);

  return (
    <div className="rm-graph-stage">
      <div ref={containerRef} className="rm-graph-canvas" />
      <GraphSearch onSearch={search} />
      <GraphToolbar onZoomIn={() => zoom(1.25)} onZoomOut={() => zoom(0.8)} onFit={fit} onCenter={center} isFullscreen={isFullscreen} onToggleFullscreen={onToggleFullscreen} />
      <GraphLegend visibility={visibility} onToggle={onToggleVisibility} />
      {showTip && !selectedNode && (
        <div className="rm-graph-tip">
          <span>Hover a node to read its label · Click to isolate its neighbourhood · Scroll to zoom</span>
          <button type="button" onClick={onDismissTip} aria-label="Dismiss tip">×</button>
        </div>
      )}
      <GraphInspector node={selectedNode} level={level} onClose={() => onSelect(null)} />
    </div>
  );
}
