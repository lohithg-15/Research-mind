import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, PlayCircle, HelpCircle } from 'lucide-react';

const STAGES = [
  { key: 'planner', label: 'Planner Agent', desc: 'Decomposing topic into sub-queries' },
  { key: 'search', label: 'Search Agent', desc: 'Retrieving arXiv & Semantic Scholar literature' },
  { key: 'extraction', label: 'Extraction Agent', desc: 'Downloading PDFs and extracting methodology details' },
  { key: 'synthesis', label: 'Synthesis Agent', desc: 'Summarizing papers and creating comparisons' },
  { key: 'graph_gap', label: 'Graph & Gap Analysis', desc: 'Building NetworkX citation graph and locating research gaps' },
  { key: 'report', label: 'Report Compiler', desc: 'Drafting literature review and generating PDF/DOCX exports' },
];

export default function ProgressTracker({ agentStatus }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />;
      case 'running':
        return <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />;
      case 'error':
        return <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />;
      case 'pending':
      default:
        return <PlayCircle size={20} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'done':
        return { borderLeft: '3px solid var(--color-success)' };
      case 'running':
        return { borderLeft: '3px solid var(--color-primary)', background: 'rgba(59, 130, 246, 0.03)' };
      case 'error':
        return { borderLeft: '3px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.02)' };
      case 'pending':
      default:
        return { borderLeft: '3px solid transparent' };
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        Agent Execution Pipeline
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {STAGES.map((stage) => {
          const status = agentStatus[stage.key] || 'pending';
          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'var(--transition-smooth)',
                ...getStatusClass(status)
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {stage.desc}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {status}
                </span>
                {getStatusIcon(status)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
