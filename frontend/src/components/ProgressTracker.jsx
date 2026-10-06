import React from 'react';
import StepTimeline from './ui/StepTimeline';

const STAGES = [
  { key: 'planner',    label: 'Planner',    description: 'Topic decomposition' },
  { key: 'search',     label: 'Search',     description: 'arXiv & S2 retrieval' },
  { key: 'extraction', label: 'Extraction', description: 'PDF field extraction' },
  { key: 'synthesis',  label: 'Synthesis',  description: 'Summaries & comparison' },
  { key: 'graph_gap',  label: 'Graph / Gap', description: 'Citation graph & gaps' },
  { key: 'report',     label: 'Report',     description: 'Draft & export' },
];

export default function ProgressTracker({ agentStatus }) {
  const steps = STAGES.map(stage => {
    const status = agentStatus?.[stage.key] || 'pending';
    return { ...stage, status: status === 'error' ? 'failed' : status };
  });

  return <StepTimeline steps={steps} />;
}
