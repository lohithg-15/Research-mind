import React from 'react';
import './ui.css';

export default function Pill({ active = false, className = '', children, ...rest }) {
  const classes = ['rm-pill', active ? 'rm-pill-active' : '', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={classes} aria-pressed={active} {...rest}>
      {children}
    </button>
  );
}
