import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GitFork, FileSearch, ChevronDown, ChevronUp, Network } from 'lucide-react';
import { useResearch } from '../../context/ResearchContext';
import { getGapLevel } from '../../components/graph/gapLevel';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import './gaps.css';

function GapCard({ gap, idx, jobId }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const papers = gap.supporting_papers || gap.papers || [];
  const claim = gap.gap || gap.claim || gap.description || 'Research gap identified';
  const evidence = gap.evidence || gap.explanation || '';
  const density = gap.citation_density ?? gap.density ?? null;
  const level = getGapLevel(density);
  const confidence = typeof gap.confidence === 'number'
    ? Math.round((gap.confidence <= 1 ? gap.confidence * 100 : gap.confidence) / 5) * 5
    : Math.round(Math.max(0, 100 - level.pct) / 5) * 5;
  const paperTitle = p => (typeof p === 'string' ? p : p.title || 'Paper');
  const graphTarget = gap.gap_id != null ? gap.gap_id : idx;

  return (
    <Card className="rm-gap-card">
      <div className="rm-gap-top">
        <span className="rm-gap-index">Gap {idx + 1}</span>
        {density != null && <Badge tone={level.tone}>{level.label}</Badge>}
      </div>
      <p className="rm-gap-claim">{claim}</p>
      <div className="rm-gap-conf">
        <div className="rm-gap-conf-label"><span>Confidence</span><span>{confidence}%</span></div>
        <div className="rm-gap-bar" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence">
          <div className={`rm-gap-bar-fill rm-w-${confidence}`} />
        </div>
      </div>
      {open && evidence && <p className="rm-gap-evidence">{evidence}</p>}
      {open && papers.length > 0 && (
        <div className="rm-gap-chips">
          {papers.slice(0, 6).map((p, i) => (
            <button type="button" key={i} className="rm-gap-chip" title={paperTitle(p)} onClick={() => navigate(`/research/${jobId}/papers`)}>
              <FileSearch size={11} /><span>{paperTitle(p)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="rm-gap-foot">
        {(evidence || papers.length > 0) && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)} aria-expanded={open} icon={open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}>
            {open ? 'Hide evidence' : `View evidence${papers.length ? ` (${papers.length})` : ''}`}
          </Button>
        )}
        <Button variant="secondary" size="sm" icon={<Network size={13} />} onClick={() => navigate(`/research/${jobId}/graph?gap=${encodeURIComponent(graphTarget)}`)}>
          Highlight in graph
        </Button>
      </div>
    </Card>
  );
}

export default function GapsTab() {
  const { results } = useResearch();
  const { jobId } = useParams();
  const gaps = results?.gap_claims || [];

  if (gaps.length === 0) {
    return (
      <div className="rm-tab-content">
        <EmptyState icon={<GitFork size={20} />} title="No research gaps detected" description="The pipeline did not identify significant gaps for this topic." />
      </div>
    );
  }

  return (
    <div className="rm-tab-content">
      <div className="rm-gaps-head">
        <h2>Research gaps</h2>
        <Badge tone="accent">{gaps.length} identified</Badge>
      </div>
      <p className="rm-gaps-desc">Each gap is an underexplored area in the literature. Expand a card to see its supporting papers and reasoning.</p>
      <div className="rm-gaps-list">
        {gaps.map((gap, idx) => <GapCard key={gap.gap_id ?? idx} gap={gap} idx={idx} jobId={jobId} />)}
      </div>
    </div>
  );
}
