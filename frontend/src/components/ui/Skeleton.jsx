import React from 'react';
import './ui.css';

export default function Skeleton({ width = '100%', height = '16px', className = '' }) {
  const sizeClass = `${width}-${height}`.replace(/[^a-zA-Z0-9-]/g, '');
  return (
    <div
      className={`rm-skeleton rm-skeleton-${sizeClass} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
