import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GitFork, FileSearch, ChevronDown, ChevronUp } from 'lucide-react';
import { useResearch } from '../../context/ResearchContext';

function GapCard({ gap, idx, jobId, navigate }) {
  const [open, setOpen] = useState(false);

  const papers    = gap.supporting_papers || gap.papers || [];
  const gapText   = gap.gap || gap.claim || gap.description || 'Research gap identified';
  const evidence  = gap.evidence || gap.explanation || '';
  const density   = gap.citation_density ?? gap.density ?? null;

  const riskLabel =
    density == null        ? null :
    density < 1            ? 'Critical Gap' :
    density < 3            ? 'Significant Gap' :
    density < 6            ? 'Moderate Gap' :
                             'Minor Gap';

  const riskClass =
    density == null        ? '' :
    density < 1            ? 'risk-critical' :
    density < 3            ? 'risk-significant' :
    density < 6            ? 'risk-moderate' :
                             'risk-minor';

  return (
    <article className="gap-card">
      <div className="gap-card-header">
        <div className="gap-card-number">{idx + 1}</div>
        <div className="gap-card-content">
          <p className="gap-card-text">{gapText}</p>
          {riskLabel && (
            <span className={`gap-card-risk ${riskClass}`}>{riskLabel}</span>
          )}
        </div>
      </div>

      {(evidence || papers.length > 0) && (
        <div className="gap-card-footer">
          {papers.length > 0 && (
            <span className="gap-card-papers">
              {papers.length} supporting paper{papers.length !== 1 ? 's' : ''}
            </span>
          )}
          {evidence && (
            <button
              className="gap-card-toggle"
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
            >
              {open ? <><ChevronUp size={11} /> Hide evidence</> : <><ChevronDown size={11} /> View evidence</>}
            </button>
          )}
        </div>
      )}

      {open && evidence && (
        <div className="gap-card-evidence">
          <p>{evidence}</p>
          {papers.length > 0 && (
            <div className="gap-card-paper-list">
              {papers.slice(0, 5).map((p, pIdx) => (
                <button
                  key={pIdx}
                  className="gap-card-paper-link"
                  onClick={() => navigate(`/research/${jobId}/papers`)}
                  title={typeof p === 'string' ? p : p.title}
                >
                  <FileSearch size={10} />
                  {typeof p === 'string' ? p.slice(0, 60) : (p.title || 'Paper').slice(0, 60)}
                  {(typeof p === 'string' ? p : p.title || '').length > 60 ? '…' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function GapsTab() {
  const { results } = useResearch();
  const { jobId } = useParams();
  const navigate  = useNavigate();

  const gaps = results?.gap_claims || [];

  if (gaps.length === 0) {
    return (
      <div className="tab-content fade-in">
        <div className="panel-empty">
          <GitFork size={32} style={{ color: 'var(--text-muted)' }} />
          <p className="panel-empty-title">No research gaps detected</p>
          <p className="panel-empty-desc">The pipeline did not identify significant gaps for this topic.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content fade-in">
      <div className="tab-section-header">
        <h2 className="tab-section-title">Research Gaps</h2>
        <span className="tab-section-count">{gaps.length} gap{gaps.length !== 1 ? 's' : ''} identified</span>
      </div>
      <p className="tab-section-desc">
        Each gap represents an underexplored area in the literature. Click "View evidence" to see supporting papers and reasoning.
      </p>
      <div className="gaps-list">
        {gaps.map((gap, idx) => (
          <GapCard
            key={idx}
            gap={gap}
            idx={idx}
            jobId={jobId}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}
