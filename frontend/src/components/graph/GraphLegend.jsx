import React, { useState } from 'react';

export default function GraphLegend() {
  const [open, setOpen] = useState(true);
  return (
    <div className={`gv2-legend-strip${open ? '' : ' gv2-legend-strip--collapsed'}`}>
      <button type="button" className="gv2-legend-toggle" onClick={() => setOpen(value => !value)} aria-expanded={open}>Legend</button>
      {open && (
        <>
          <span className="gv2-legend-item"><span className="gv2-dot rm-graph-paper" />Paper</span>
          <span className="gv2-legend-item"><span className="gv2-dot gv2-dot--sm rm-graph-author" />Author</span>
          <span className="gv2-legend-item"><span className="gv2-dot gv2-dot--hex rm-graph-topic" />Topic</span>
          <span className="gv2-legend-item gv2-legend-edge"><span className="gv2-edge-line" />Citation link</span>
          <span className="gv2-legend-note">Fewer links between papers = bigger gap</span>
        </>
      )}
    </div>
  );
}
