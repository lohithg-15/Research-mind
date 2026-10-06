import React from 'react';
import './ui.css';

export default function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`rm-empty-state ${className}`.trim()}>
      {icon && <div className="rm-empty-state-icon">{icon}</div>}
      {title && <p className="rm-empty-state-title">{title}</p>}
      {description && <p className="rm-empty-state-desc">{description}</p>}
      {action}
    </div>
  );
}
