import React from 'react';
import './ui.css';

export default function Skeleton({ width = '100%', height = '16px', className = '', style = {} }) {
  return (
    <div
      className={`rm-skeleton ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}
