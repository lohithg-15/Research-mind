import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ui.css';

export default function SplitPane({
  left,
  right,
  storageKey = 'rm_split_pane',
  minLeft = 240,
  maxLeft = 720,
  defaultLeft = 420,
  className = '',
}) {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey));
    return saved > 0 ? saved : defaultLeft;
  });
  const draggingRef = useRef(false);
  const containerRef = useRef(null);

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const next = Math.min(maxLeft, Math.max(minLeft, e.clientX - rect.left));
    setLeftWidth(next);
  }, [minLeft, maxLeft]);

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    localStorage.setItem(storageKey, String(leftWidth));
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove, leftWidth, storageKey]);

  const startDragging = useCallback(() => {
    draggingRef.current = true;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', stopDragging);
  }, [handlePointerMove, stopDragging]);

  useEffect(() => () => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove, stopDragging]);

  return (
    <div className={`rm-split-pane ${className}`.trim()} ref={containerRef}>
      <div style={{ width: leftWidth, flexShrink: 0, minWidth: 0 }}>{left}</div>
      <div
        className="rm-split-pane-handle"
        onPointerDown={startDragging}
        role="separator"
        aria-orientation="vertical"
      />
      <div style={{ flex: 1, minWidth: 0 }}>{right}</div>
    </div>
  );
}
