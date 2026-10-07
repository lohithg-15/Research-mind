import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

function LinkList({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="rm-inspector-section">
      <h4>{title} <span>({items.length})</span></h4>
      <ul>
        {items.slice(0, 8).map(item => <li key={item.id} title={item.label}>{item.label}</li>)}
        {items.length > 8 && <li className="rm-inspector-more">+{items.length - 8} more</li>}
      </ul>
    </section>
  );
}

export default function GraphInspector({ node, level, onClose }) {
  if (!node) return null;
  const isPaper = node.type === 'Paper';
  return (
    <aside className="rm-inspector" aria-label="Selected node details">
      <div className="rm-inspector-head">
        <Badge tone={isPaper ? 'accent' : 'neutral'}>{node.type}</Badge>
        <Button variant="ghost" size="sm" icon={<X size={15} />} onClick={onClose} aria-label="Close inspector" />
      </div>
      <h3 className="rm-inspector-title">{node.label}</h3>
      {isPaper && (
        <div className="rm-inspector-meta">
          {node.year && <span>Published {node.year}</span>}
          {node.venue && <span>{node.venue}</span>}
          {node.citationCount != null && <span>{node.citationCount} citations</span>}
        </div>
      )}
      {isPaper && node.url && (
        <a className="rm-inspector-link" href={node.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13} /> Open paper
        </a>
      )}
      <LinkList title="Cites" items={node.cites} />
      <LinkList title="Cited by" items={node.citedBy} />
      {level && (
        <section className={`rm-inspector-risk rm-risk-${level.key}`}>
          <level.Icon size={16} className="rm-risk-icon" />
          <div>
            <div className="rm-risk-label">{level.label}</div>
            <div className="rm-risk-sub">{level.sublabel}</div>
          </div>
        </section>
      )}
    </aside>
  );
}
