import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Files, LayoutDashboard, Table2, GitFork, Network, MessageSquare, FileText,
} from 'lucide-react';
import './shell.css';

/* Temporary: workspace tab links rendered under the TopBar.
   To be folded into the Workspace page header's Tabs component in a later phase. */
const WORKSPACE_TABS = [
  { key: 'papers',     label: 'Papers',     Icon: Files },
  { key: 'overview',   label: 'Overview',   Icon: LayoutDashboard },
  { key: 'comparison', label: 'Comparison', Icon: Table2 },
  { key: 'gaps',       label: 'Gaps',       Icon: GitFork },
  { key: 'graph',      label: 'Graph',      Icon: Network },
  { key: 'assistant',  label: 'Assistant',  Icon: MessageSquare },
  { key: 'reports',    label: 'Reports',    Icon: FileText },
];

export default function WorkspaceTabsBar({ sidebarExpanded }) {
  const { jobId, tab } = useParams();
  if (!jobId || !tab) return null;

  return (
    <nav
      className={`rm-topbar-worktabs ${sidebarExpanded ? 'rm-topbar-worktabs--expanded' : ''}`.trim()}
      aria-label="Workspace tabs"
    >
      {WORKSPACE_TABS.map(({ key, label, Icon }) => (
        <Link
          key={key}
          to={`/research/${jobId}/${key}`}
          className={`rm-topbar-worktab ${tab === key ? 'rm-topbar-worktab--active' : ''}`.trim()}
          aria-current={tab === key ? 'page' : undefined}
        >
          <Icon size={13} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
