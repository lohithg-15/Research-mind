import React from 'react';
import './ui.css';

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`rm-badge rm-badge-${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
