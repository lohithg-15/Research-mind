import React, { useLayoutEffect, useRef } from 'react';
import './ui.css';

/* Size is applied through CSS custom properties set on the node so no inline
   style attribute is needed in JSX. */
export default function Skeleton({ width = '100%', height = '16px', className = '' }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty('--rm-sk-w', width);
    node.style.setProperty('--rm-sk-h', height);
  }, [width, height]);
  return <div ref={ref} className={`rm-skeleton ${className}`.trim()} aria-hidden="true" />;
}
