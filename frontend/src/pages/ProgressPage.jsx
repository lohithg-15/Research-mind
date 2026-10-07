import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, RotateCcw, Plus, XCircle, FileSearch } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useResearch } from '../context/ResearchContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StepTimeline from '../components/ui/StepTimeline';
import SplitPane from '../components/ui/SplitPane';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import SourcesSidebar from '../components/SourcesSidebar';
import './ProgressPage.css';

const STAGES = [
  { key: 'planner',    label: 'Planner',    description: 'Decomposing your topic into sub-queries' },
  { key: 'search',     label: 'Search',     description: 'Retrieving from arXiv & Semantic Scholar' },
  { key: 'extraction', label: 'Extraction', description: 'Reading papers and extracting key fields' },
  { key: 'synthesis',  label: 'Synthesis',  description: 'Generating summaries and comparison table' },
  { key: 'graph_gap',  label: 'Graph & Gap', description: 'Building citation graph and detecting gaps' },
  { key: 'report',     label: 'Report',     description: 'Compiling publication-grade draft' },
];

function formatElapsed(startedAt) {
  if (!startedAt) return '0:00';
  const secs = Math.max(0, Math.floor((Date.now() - startedAt * 1000) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ProgressPage() {
  const { jobId } = useParams();
  const navigate  = useNavigate();
  const {
    query, agentStatus, jobStatus, isDone, isRunning,
    error, startedAt, restoreJob, clearResearch, papers,
  } = useResearch();

  const [elapsed, setElapsed] = useState(() => formatElapsed(startedAt));

  useEffect(() => {
    if (jobId) restoreJob(jobId);
  }, [jobId]); // eslint-disable-line

  useEffect(() => {
    if (isDone && jobId) {
      navigate(`/research/${jobId}/papers`, { replace: true });
    }
  }, [isDone, jobId, navigate]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setElapsed(formatElapsed(startedAt)), 1000);
    return () => clearInterval(id);
  }, [isRunning, startedAt]);

  const isError = jobStatus === 'error';

  const getStageState = (key) => {
    const s = agentStatus?.[key];
    if (s === 'done')    return 'done';
    if (s === 'running') return 'running';
    if (s === 'error')   return 'failed';
    return 'pending';
  };

  const steps = STAGES.map(s => ({ ...s, status: getStageState(s.key) }));
  const searchDone = getStageState('search') === 'done' || getStageState('extraction') !== 'pending';

  return (
    <AppShell>
      <div className="rm-progress-main">
        <SplitPane
          className="rm-progress-split"
          storageKey="rm_progress_split"
          defaultLeft={560}
          left={
            <div className="rm-progress-left">
              {query && <div className="rm-progress-bubble">{query}</div>}

              <Card>
                <div className="rm-progress-card-header">
                  {isError
                    ? <XCircle size={20} color="var(--rm-danger)" />
                    : isRunning
                    ? <Loader2 size={20} className="rm-spinner" color="var(--rm-accent)" />
                    : <Loader2 size={20} color="var(--rm-success)" />
                  }
                  <h1 className="rm-progress-card-title">
                    {isError ? 'Research failed' : 'Working on your request'}
                  </h1>
                  {!isError && <span className="rm-progress-card-timer">{elapsed}</span>}
                </div>

                <StepTimeline steps={steps} />

                {isError && (
                  <div className="rm-progress-error-box">
                    <AlertCircle size={16} />
                    <div>
                      <p className="rm-progress-error-title">Something went wrong</p>
                      <p className="rm-progress-error-msg">
                        {error || 'The research pipeline encountered an error. Please try again.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rm-progress-actions">
                  {isError ? (
                    <>
                      <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={() => navigate('/research/new')}>
                        Try again
                      </Button>
                      <Button icon={<Plus size={14} />} onClick={() => { clearResearch(); navigate('/research/new'); }}>
                        New research
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" onClick={() => { clearResearch(); navigate('/research/new'); }}>
                      Cancel
                    </Button>
                  )}
                </div>

                {isRunning && (
                  <p className="rm-progress-note">
                    This typically takes 30–120 seconds. You can leave this page and come back — progress is saved.
                  </p>
                )}
              </Card>
            </div>
          }
          right={
            <div className="rm-progress-sources">
              <h2 className="rm-progress-sources-title">Sources</h2>
              {!searchDone ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div className="rm-progress-source-card" key={i}>
                    <Skeleton height="14px" width="70%" />
                    <Skeleton height="12px" width="40%" />
                  </div>
                ))
              ) : papers?.length ? (
                <SourcesSidebar papers={papers} />
              ) : (
                <EmptyState
                  icon={<FileSearch size={20} />}
                  title="Sources retrieved"
                  description="Papers will appear in the Papers tab once the report is ready."
                />
              )}
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
