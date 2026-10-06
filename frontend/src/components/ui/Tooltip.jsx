import React from 'react';
import './ui.css';

export default function Tooltip({ label, side = 'top', children }) {
  return (
    <span className="rm-tooltip-wrap">
      {children}
      <span className={`rm-tooltip ${side === 'right' ? 'rm-tooltip-right' : ''}`.trim()} role="tooltip">
        {label}
      </span>
    </span>
  );
}
