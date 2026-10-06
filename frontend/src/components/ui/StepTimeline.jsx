import React from 'react';
import { Check, X, Circle } from 'lucide-react';
import './ui.css';

const STATUS_ICON = {
  done: Check,
  failed: X,
  pending: Circle,
  running: Circle,
};

export default function StepTimeline({ steps, className = '' }) {
  return (
    <div className={`rm-step-timeline ${className}`.trim()}>
      {steps.map(({ key, label, description, status }) => {
        const Icon = STATUS_ICON[status] || Circle;
        return (
          <div className="rm-step" key={key}>
            <span className={`rm-step-dot rm-step-dot-${status}`}>
              <Icon size={12} />
            </span>
            <div>
              <div className="rm-step-label">{label}</div>
              {description && <div className="rm-step-desc">{description}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
