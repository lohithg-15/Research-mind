import React, { useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { AlertCircle, RotateCcw, Download, Share2, FileJson, Files, LayoutDashboard, Table2, GitFork, Network, MessageSquare, FileText } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useResearch } from '../context/ResearchContext';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
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

function TabSkeleton() {
  return (
    <div className="rm-workspace-state" aria-busy="true" aria-label="Loading">
      <Skeleton height="20px" width="40%" />
      <Skeleton height="96px" />
      <Skeleton height="96px" />
      <Skeleton height="96px" />
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
  const showToast = useToast();

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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    } catch {
      showToast('Could not copy link', 'danger');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(results ?? {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `research-${jobId}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportItems = [
    { key: 'report', label: 'Open report export', icon: <Download size={14} />, onSelect: () => navigate(`/research/${jobId}/reports`) },
    { key: 'json', label: 'Download JSON', icon: <FileJson size={14} />, onSelect: downloadJson },
  ];

  return (
    <AppShell>
      <div className="rm-workspace">
        <header className="rm-workspace-header">
          <div>
            <p className="rm-eyebrow">Research workspace</p>
            <h1 className="rm-workspace-title">{results?.query || 'Untitled research'}</h1>
          </div>
          <div className="rm-workspace-actions">
            <Dropdown
              trigger={<Button variant="secondary" size="sm" icon={<Download size={14} />} disabled={!isDone}>Export</Button>}
              items={exportItems}
            />
            <Button variant="ghost" size="sm" icon={<Share2 size={14} />} onClick={copyLink}>Share</Button>
          </div>
        </header>
        <Tabs tabs={WORKSPACE_TABS} activeKey={tab} onChange={key => navigate(`/research/${jobId}/${key}`)} className="rm-workspace-tabs" />

        {error && (
          <div className="rm-workspace-error" role="alert">
            <AlertCircle size={20} />
            <div>
              <p className="rm-workspace-error-title">Error loading results</p>
              <p>{error}</p>
            </div>
            <Button variant="secondary" size="sm" icon={<RotateCcw size={13} />} onClick={() => restoreJob(jobId)}>Retry</Button>
          </div>
        )}

        {isLoading && !error && <TabSkeleton />}

        {isDone && (
          <Suspense fallback={<TabSkeleton />}>
            <TabComponent />
          </Suspense>
        )}
      </div>
    </AppShell>
  );
}
