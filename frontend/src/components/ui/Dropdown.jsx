import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ui.css';

export default function Dropdown({ trigger, items, onClose, className = '' }) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const rootRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setFocusIdx(-1);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusIdx >= 0) {
      items[focusIdx]?.onSelect?.();
      close();
    }
  }

  return (
    <div className={`rm-dropdown ${className}`.trim()} ref={rootRef} onKeyDown={handleKeyDown}>
      <span onClick={() => setOpen(v => !v)}>{trigger}</span>
      {open && (
        <div className="rm-dropdown-menu" role="menu">
          {items.map((item, idx) => (
            <button
              key={item.key ?? idx}
              type="button"
              role="menuitem"
              className={`rm-dropdown-item ${focusIdx === idx ? 'rm-dropdown-item-focused' : ''}`}
              onMouseEnter={() => setFocusIdx(idx)}
              onClick={() => { item.onSelect?.(); close(); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
