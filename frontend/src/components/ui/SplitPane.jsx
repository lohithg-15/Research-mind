import React, { useRef, useState, useEffect, useCallback } from 'react';

const LS_KEY = 'researchmind_split_w';

function getSaved(def) {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? parseInt(v, 10) : def;
  } catch {
    return def;
  }
}

export default function SplitPane({
  primary,
  secondary,
  defaultSecondaryWidth = 360,
  minSecondaryWidth = 220,
  maxSecondaryWidth = 560,
}) {
  const [w, setW] = useState(() => getSaved(defaultSecondaryWidth));
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e) => {
    setDragging(true);
    startX.current = e.clientX;
    startW.current = w;
    e.preventDefault();
  }, [w]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const delta = startX.current - e.clientX;
      const next = Math.min(
        maxSecondaryWidth,
        Math.max(minSecondaryWidth, startW.current + delta),
      );
      setW(next);
    };
    const onUp = () => {
      setDragging(false);
      try { localStorage.setItem(LS_KEY, String(w)); } catch {}
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, maxSecondaryWidth, minSecondaryWidth, w]);

  return (
    <div className="split-pane">
      <div className="split-pane-primary">{primary}</div>
      <div
        className={['split-pane-divider', dragging && 'dragging'].filter(Boolean).join(' ')}
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Drag to resize"
      />
      <div
        className="split-pane-secondary"
        style={{ width: w, flexBasis: w }}
      >
        {secondary}
      </div>
    </div>
  );
}
