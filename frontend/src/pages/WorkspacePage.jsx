import React, { useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useResearch } from '../context/ResearchContext';

/* Lazy-load heavy tabs */
const PapersTab     = lazy(() => import('./tabs/PapersTab'));
const OverviewTab   = lazy(() => import('./tabs/OverviewTab'));
const ComparisonTab = lazy(() => import('./tabs/ComparisonTab'));
const GapsTab       = lazy(() => import('./tabs/GapsTab'));
const GraphTab      = lazy(() => import('./tabs/GraphTab'));
const AssistantTab  = lazy(() => import('./tabs/AssistantTab'));
const ReportsTab    = lazy(() => import('./tabs/ReportsTab'));

const TAB_COMPONENTS = {
  papers:     PapersTab,
  overview:   OverviewTab,
  comparison: ComparisonTab,
  gaps:       GapsTab,
  graph:      GraphTab,
  assistant:  AssistantTab,
  reports:    ReportsTab,
};

const VALID_TABS = Object.keys(TAB_COMPONENTS);

function TabFallback() {
  return (
    <div className="panel-empty">
      <Loader2 size={28} className="spin" style={{ color: 'var(--text-muted)' }} />
      <p className="panel-empty-title">Loading…</p>
    </div>
  );
}

export default function WorkspacePage() {
  const { jobId, tab } = useParams();
  const navigate = useNavigate();
  const { isDone, isRunning, error, restoreJob, results } = useResearch();

  // Validate tab param
  if (!VALID_TABS.includes(tab)) {
    return <Navigate to={`/research/${jobId}/papers`} replace />;
  }

  // Restore job from URL on mount (deep link / refresh)
  useEffect(() => {
    if (jobId) restoreJob(jobId);
  }, [jobId]); // eslint-disable-line

  // If still running, redirect to progress
  useEffect(() => {
    if (isRunning && !isDone) {
      navigate(`/research/${jobId}/progress`, { replace: true });
    }
  }, [isRunning, isDone, jobId, navigate]);

  const TabComponent = TAB_COMPONENTS[tab];

  const isLoading = !isDone && !error;

  return (
    <AppShell>
      <main className="workspace-main">
        {/* Error state */}
        {error && (
          <div className="workspace-error">
            <AlertCircle size={20} />
            <div>
              <p className="workspace-error-title">Error loading results</p>
              <p className="workspace-error-msg">{error}</p>
            </div>
            <button
              className="btn-secondary"
              onClick={() => restoreJob(jobId)}
            >
              <RotateCcw size={13} />
              Retry
            </button>
          </div>
        )}

        {/* Loading state (restoring from deep link) */}
        {isLoading && !error && (
          <div className="panel-empty workspace-loading">
            <Loader2 size={32} className="spin" />
            <p className="panel-empty-title">Loading research…</p>
            <p className="panel-empty-desc">Restoring your session</p>
          </div>
        )}

        {/* Tab content */}
        {isDone && (
          <Suspense fallback={<TabFallback />}>
            <TabComponent />
          </Suspense>
        )}
      </main>
    </AppShell>
  );
}
