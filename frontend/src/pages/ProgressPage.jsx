import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Loader2, AlertCircle, Circle,
  RotateCcw, Plus, XCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useResearch } from '../context/ResearchContext';

/* Plain-language stage labels for the progress page */
const STAGES = [
  { key: 'planner',    label: 'Planning',              desc: 'Decomposing your topic into sub-queries' },
  { key: 'search',     label: 'Searching Papers',      desc: 'Retrieving from arXiv & Semantic Scholar' },
  { key: 'extraction', label: 'Extracting Information',desc: 'Reading papers and extracting key fields' },
  { key: 'synthesis',  label: 'Synthesizing',          desc: 'Generating summaries and comparison table' },
  { key: 'graph_gap',  label: 'Finding Gaps',          desc: 'Building citation graph and detecting gaps' },
  { key: 'report',     label: 'Generating Report',     desc: 'Compiling publication-grade draft' },
];

export default function ProgressPage() {
  const { jobId } = useParams();
  const navigate  = useNavigate();
  const {
    query, agentStatus, jobStatus, isDone, isRunning,
    error, restoreJob, clearResearch,
  } = useResearch();

  // Re-attach polling if this page is loaded directly (deep link / refresh)
  useEffect(() => {
    if (jobId) restoreJob(jobId);
  }, [jobId]); // eslint-disable-line

  // Auto-navigate to results when done
  useEffect(() => {
    if (isDone && jobId) {
      navigate(`/research/${jobId}/papers`, { replace: true });
    }
  }, [isDone, jobId, navigate]);

  const isError = jobStatus === 'error';

  const getStageState = (key) => {
    const s = agentStatus?.[key];
    if (s === 'done')    return 'done';
    if (s === 'running') return 'running';
    if (s === 'error')   return 'error';
    return 'pending';
  };

  const doneCount = STAGES.filter(s => getStageState(s.key) === 'done').length;
  const progress  = Math.round((doneCount / STAGES.length) * 100);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="progress-main">
        <div className="progress-card">
          {/* Header */}
          <div className="progress-header">
            {isError
              ? <XCircle size={32} className="progress-icon error" />
              : isRunning
              ? <Loader2 size={32} className="progress-icon spin" />
              : <CheckCircle2 size={32} className="progress-icon done" />
            }
            <h1 className="progress-title">
              {isError ? 'Research Failed' : isRunning ? 'Running Research…' : 'Almost done…'}
            </h1>
            {query && (
              <p className="progress-query">"{query}"</p>
            )}
          </div>

          {/* Progress bar */}
          {!isError && (
            <div className="progress-bar-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-bar-pct">{progress}%</span>
            </div>
          )}

          {/* Stage list */}
          <div className="progress-stages">
            {STAGES.map((stage, idx) => {
              const state = getStageState(stage.key);
              return (
                <div key={stage.key} className={`progress-stage ${state}`}>
                  <div className="progress-stage-icon">
                    {state === 'done'    && <CheckCircle2 size={16} />}
                    {state === 'running' && <Loader2 size={16} className="spin" />}
                    {state === 'error'   && <AlertCircle size={16} />}
                    {state === 'pending' && <span className="stage-num">{idx + 1}</span>}
                  </div>
                  <div className="progress-stage-body">
                    <span className="progress-stage-label">{stage.label}</span>
                    <span className="progress-stage-desc">{stage.desc}</span>
                  </div>
                  <span className={`progress-stage-badge ${state}`}>
                    {state === 'running' ? 'Running' : state === 'done' ? 'Done' : state === 'error' ? 'Error' : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error state */}
          {isError && (
            <div className="progress-error-box">
              <AlertCircle size={16} />
              <div>
                <p className="progress-error-title">Something went wrong</p>
                <p className="progress-error-msg">
                  {error || 'The research pipeline encountered an error. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          {isError && (
            <div className="progress-actions">
              <button
                className="btn-secondary"
                onClick={() => navigate('/research/new')}
                id="progress-retry-btn"
              >
                <RotateCcw size={14} />
                Try Again
              </button>
              <button
                className="btn-primary"
                onClick={() => { clearResearch(); navigate('/research/new'); }}
                id="progress-new-btn"
              >
                <Plus size={14} />
                New Research
              </button>
            </div>
          )}

          {/* Waiting message */}
          {isRunning && (
            <p className="progress-note">
              This typically takes 30–120 seconds. You can leave this page and come back — progress is saved.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
