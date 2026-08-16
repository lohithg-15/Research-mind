import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, Circle } from 'lucide-react';

const STAGES = [
  { key: 'planner',   label: 'Planner',   desc: 'Topic decomposition' },
  { key: 'search',    label: 'Search',    desc: 'arXiv & S2 retrieval' },
  { key: 'extraction',label: 'Extraction',desc: 'PDF field extraction' },
  { key: 'synthesis', label: 'Synthesis', desc: 'Summaries & comparison' },
  { key: 'graph_gap', label: 'Graph / Gap', desc: 'Citation graph & gaps' },
  { key: 'report',    label: 'Report',    desc: 'Draft & export' },
];

export default function ProgressTracker({ agentStatus }) {
  const getIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 size={13} />;
      case 'running':
        return <Loader2 size={13} className="spin" />;
      case 'error':
        return <AlertCircle size={13} />;
      default:
        return <span style={{ fontSize: '10px', fontWeight: 700 }}>{' '}</span>;
    }
  };

  return (
    <div className="sidebar-section pipeline-list">
      {STAGES.map((stage, idx) => {
        const status = agentStatus?.[stage.key] || 'pending';
        return (
          <div key={stage.key} className="pipeline-stage">
            <div className={`pipeline-stage-icon ${status}`}>
              {status === 'pending'
                ? <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</span>
                : getIcon(status)
              }
            </div>
            <div className="pipeline-stage-text">
              <span className={`pipeline-stage-name ${status === 'pending' ? '' : 'active'}`}>
                {stage.label}
              </span>
              <span className="pipeline-stage-desc">{stage.desc}</span>
            </div>
            {status !== 'pending' && (
              <span className={`pipeline-stage-status ${status}`}>{status}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
