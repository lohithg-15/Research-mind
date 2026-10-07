import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function Toggle({ id, label, checked, onChange }) {
  return (
    <label className="rm-legend-toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function GraphLegend({ visibility, onToggle }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rm-graph-legend">
      <button type="button" className="rm-legend-head" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        Legend {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="rm-legend-body">
          <span className="rm-legend-item"><span className="rm-dot rm-dot-paper" />Paper</span>
          <Toggle id="rm-lg-authors" label={<><span className="rm-dot rm-dot-author" />Authors</>} checked={visibility.authors} onChange={v => onToggle('authors', v)} />
          <Toggle id="rm-lg-topics" label={<><span className="rm-dot rm-dot-topic" />Topics</>} checked={visibility.topics} onChange={v => onToggle('topics', v)} />
          <Toggle id="rm-lg-coauth" label={<><span className="rm-edge-line" />Co-author edges</>} checked={visibility.coauthor} onChange={v => onToggle('coauthor', v)} />
          <span className="rm-legend-item"><span className="rm-edge-line rm-edge-cites" />Citation link</span>
          <span className="rm-legend-note">Fewer links between papers = bigger gap</span>
        </div>
      )}
    </div>
  );
}
