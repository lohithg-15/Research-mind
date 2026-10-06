import React, { useEffect, useRef } from 'react';
import './ui.css';

function useFocusTrap(ref, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    const node = ref.current;
    const focusable = node?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, ref]);
}

export function Modal({ isOpen, onClose, children, className = '' }) {
  const ref = useRef(null);
  useFocusTrap(ref, isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div className="rm-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`rm-modal ${className}`.trim()} role="dialog" aria-modal="true" ref={ref}>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ isOpen, onClose, children, className = '' }) {
  const ref = useRef(null);
  useFocusTrap(ref, isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div className="rm-drawer-overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`rm-drawer ${className}`.trim()} role="dialog" aria-modal="true" ref={ref}>
        {children}
      </div>
    </div>
  );
}

export default Modal;
