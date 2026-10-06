import React, { useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, AlertCircle, RotateCcw, Download, Share2, Files, LayoutDashboard, Table2, GitFork, Network, MessageSquare, FileText } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useResearch } from '../context/ResearchContext';
import Tabs from '../components/ui/Tabs';
import './workspace.css';

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
      <Loader2 size={28} className="spin rm-workspace-muted" />
      <p className="panel-empty-title">Loading…</p>
    </div>
  );
}

const WORKSPACE_TABS = [
  { key: 'papers', label: 'Papers', Icon: Files },
  { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { key: 'comparison', label: 'Comparison', Icon: Table2 },
  { key: 'gaps', label: 'Gaps', Icon: GitFork },
  { key: 'graph', label: 'Graph', Icon: Network },
  { key: 'assistant', label: 'Assistant', Icon: MessageSquare },
  { key: 'reports', label: 'Reports', Icon: FileText },
];

export default function WorkspacePage() {
  const { jobId, tab } = useParams();
  const navigate = useNavigate();
  const { isDone, isRunning, error, restoreJob, results } = useResearch();

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

  if (!VALID_TABS.includes(tab)) {
    return <Navigate to={`/research/${jobId}/papers`} replace />;
  }

  const TabComponent = TAB_COMPONENTS[tab];

  const isLoading = !isDone && !error;

  return (
    <AppShell>
      <main className="workspace-main rm-workspace">
        <header className="rm-workspace-header">
          <div>
            <p className="rm-eyebrow">Research workspace</p>
            <h1 className="rm-workspace-title">{results?.query || 'Untitled research'}</h1>
          </div>
          <div className="rm-workspace-actions">
            <button type="button" className="rm-btn rm-btn-secondary rm-btn-sm"><Download size={14} /> Export</button>
            <button type="button" className="rm-btn rm-btn-ghost rm-btn-sm"><Share2 size={14} /> Share</button>
          </div>
        </header>
        <Tabs tabs={WORKSPACE_TABS} activeKey={tab} onChange={key => navigate(`/research/${jobId}/${key}`)} className="rm-workspace-tabs" />
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
            <Loader2 size={32} className="spin rm-workspace-muted" />
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
