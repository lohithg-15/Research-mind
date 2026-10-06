import React from 'react';
import { X } from 'lucide-react';

export default function GraphInspector({ node, onClose }) {
  if (!node) return null;
  return (
    <aside className="rm-graph-inspector" aria-label="Selected node details">
      <button type="button" className="rm-graph-inspector-close" onClick={onClose} aria-label="Close inspector"><X size={15} /></button>
      <span className="gv2-node-type">{node.type}</span>
      <h3 className="gv2-node-title">{node.label}</h3>
      {node.type === 'Paper' && (
        <>
          {node.year && <div className="gv2-node-meta">Published {node.year}</div>}
          {node.venue && <div className="gv2-node-meta">{node.venue}</div>}
          {node.citationCount != null && <div className="gv2-node-meta">{node.citationCount} citations</div>}
          {node.url && <a className="gv2-node-link" href={node.url} target="_blank" rel="noopener noreferrer">Open paper ↗</a>}
        </>
      )}
    </aside>
  );
}
