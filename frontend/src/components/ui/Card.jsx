import React from 'react';
import './ui.css';

export default function Card({ hoverable = false, className = '', children, ...rest }) {
  const classes = ['rm-card', hoverable ? 'rm-card-hoverable' : '', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
