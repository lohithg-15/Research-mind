import React from 'react';
import './ui.css';

export default function Wordmark({ iconOnly = false, size = 18, className = '' }) {
  if (iconOnly) {
    return <span className="rm-wordmark-icon" aria-label="ResearchMind">R</span>;
  }
  return (
    <span className={`rm-wordmark ${className}`.trim()} style={{ fontSize: size }}>
      RESEARCHMIND
    </span>
  );
}
