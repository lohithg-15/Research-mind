import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import './ui.css';

function readWidth(key, fallback) {
  try {
    const saved = Number(localStorage.getItem(key));
    return saved > 0 ? saved : fallback;
  } catch { return fallback; }
}

export default function SplitPane({
  left,
  right,
  storageKey = 'rm_split_pane',
  minLeft = 240,
  maxLeft = 720,
  defaultLeft = 420,
  className = '',
}) {
  const [leftWidth, setLeftWidth] = useState(() => readWidth(storageKey, defaultLeft));
  const widthRef = useRef(leftWidth);
  const containerRef = useRef(null);
  const leftRef = useRef(null);

  /* Apply width through a CSS custom property (no inline style in JSX). */
  useLayoutEffect(() => {
    widthRef.current = leftWidth;
    leftRef.current?.style.setProperty('--rm-split-left', `${leftWidth}px`);
  }, [leftWidth]);

  const move = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLeftWidth(Math.round(Math.min(maxLeft, Math.max(minLeft, e.clientX - rect.left))));
  }, [minLeft, maxLeft]);

  const stopRef = useRef(null);
  const stop = useCallback(() => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', stopRef.current);
    try { localStorage.setItem(storageKey, String(widthRef.current)); } catch { /* ignore */ }
  }, [move, storageKey]);
  useEffect(() => { stopRef.current = stop; }, [stop]);

  const start = useCallback((e) => {
    e.preventDefault();
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stopRef.current);
  }, [move]);

  useEffect(() => () => {
    document.removeEventListener('pointermove', move);
    if (stopRef.current) document.removeEventListener('pointerup', stopRef.current);
  }, [move]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setLeftWidth(w => Math.max(minLeft, w - 24));
    if (e.key === 'ArrowRight') setLeftWidth(w => Math.min(maxLeft, w + 24));
  };

  return (
    <div className={`rm-split-pane ${className}`.trim()} ref={containerRef}>
      <div className="rm-split-left" ref={leftRef}>{left}</div>
      <div
        className="rm-split-pane-handle"
        onPointerDown={start}
        onKeyDown={onKeyDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        tabIndex={0}
      />
      <div className="rm-split-right">{right}</div>
    </div>
  );
}
