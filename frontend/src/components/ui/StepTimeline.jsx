import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import Spinner from './Spinner';

export default function StepTimeline({ steps }) {
  return (
    <div className="step-timeline">
      {steps.map((step, i) => (
        <div
          key={step.key}
          className={['step-item', step.state].filter(Boolean).join(' ')}
        >
          <div className={['step-icon', step.state].filter(Boolean).join(' ')}>
            {step.state === 'done'    && <CheckCircle2 size={15} />}
            {step.state === 'running' && <Spinner size="sm" />}
            {step.state === 'error'   && <AlertCircle size={15} />}
            {step.state === 'pending' && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-disabled)',
              }}>
                {i + 1}
              </span>
            )}
          </div>
          <div className="step-body">
            <div className="step-label">{step.label}</div>
            {step.desc && <div className="step-desc">{step.desc}</div>}
            {step.subtext && (
              <div className="step-desc" style={{ marginTop: 2, opacity: 0.8 }}>
                {step.subtext}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
