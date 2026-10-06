import React, { useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import {
  Loader2, AlertCircle, RotateCcw,
  Files, LayoutDashboard, Table2, GitFork,
  Network, MessageSquare, FileText,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { useResearch } from '../context/ResearchContext';
import '../styles/workspace.css';

/* Lazy-load heavy tabs */
const PapersTab     = lazy(() => import('./tabs/PapersTab'));
const OverviewTab   = lazy(() => import('./tabs/OverviewTab'));
const ComparisonTab = lazy(() => import('./tabs/ComparisonTab'));
const GapsTab       = lazy(() => import('./tabs/GapsTab'));
const GraphTab      = lazy(() => import('./tabs/GraphTab'));
const AssistantTab  = lazy(() => import('./tabs/AssistantTab'));
const ReportsTab    = lazy(() => import('./tabs/ReportsTab'));

const WORKSPACE_TABS = [
  { key: 'papers',     label: 'Papers',     Icon: Files           },
  { key: 'overview',   label: 'Overview',   Icon: LayoutDashboard },
  { key: 'comparison', label: 'Comparison', Icon: Table2          },
  { key: 'gaps',       label: 'Gaps',       Icon: GitFork         },
  { key: 'graph',      label: 'Graph',      Icon: Network         },
  { key: 'assistant',  label: 'Assistant',  Icon: MessageSquare   },
  { key: 'reports',    label: 'Reports',    Icon: FileText        },
];

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
    <div className="workspace-loading">
      <Spinner size="lg" />
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  );
}

export default function WorkspacePage() {
  const { jobId, tab } = useParams();
  const navigate = useNavigate();
  const { isDone, isRunning, error, restoreJob, results, query } = useResearch();

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
      {/* Workspace header strip */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {/* Title row */}
        <div className="workspace-header-row">
          <p className="workspace-query-title" title={query || ''}>
            {query || 'Research Workspace'}
          </p>
          <div className="workspace-header-actions">
            {/* Export and share buttons will be added in Phase 3 */}
          </div>
        </div>

        {/* Tab bar */}
        <nav className="workspace-tab-strip" aria-label="Workspace tabs">
          {WORKSPACE_TABS.map(({ key, label, Icon }) => (
            <Link
              key={key}
              to={`/research/${jobId}/${key}`}
              className={['workspace-tab-btn', tab === key && 'active'].filter(Boolean).join(' ')}
              aria-current={tab === key ? 'page' : undefined}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div style={{ minHeight: 'calc(100vh - var(--topbar-h) - 97px)' }}>
        {/* Error state */}
        {error && (
          <div className="workspace-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p className="workspace-error-title">Error loading results</p>
              <p className="workspace-error-msg">{error}</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => restoreJob(jobId)}
            >
              <RotateCcw size={13} />
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !error && (
          <div className="workspace-loading">
            <Spinner size="lg" />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 500 }}>
              Loading research…
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-disabled)' }}>
              Restoring your session
            </p>
          </div>
        )}

        {/* Tab content */}
        {isDone && (
          <Suspense fallback={<TabFallback />}>
            <TabComponent />
          </Suspense>
        )}
      </div>
    </AppShell>
  );
}
