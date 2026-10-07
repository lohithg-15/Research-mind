import React from 'react';
import { BookOpen, Lightbulb } from 'lucide-react';

function CoverageMeter({ pct }) {
  const step = Math.round(pct / 10) * 10;
  return (
    <div className="rm-meter">
      <div className="rm-meter-labels"><span>No coverage</span><span>Fully covered</span></div>
      <div className="rm-meter-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Coverage">
        <div className={`rm-meter-fill rm-meter-${step}`} />
      </div>
      <div className="rm-meter-text">{pct}% covered</div>
    </div>
  );
}

export default function GapCard({ gap, level }) {
  return (
    <div className="rm-gapcard">
      <div className={`rm-risk rm-risk-${level.key}`}>
        <level.Icon size={20} className="rm-risk-icon" />
        <div className="rm-risk-text">
          <div className="rm-risk-label">{level.label}</div>
          <div className="rm-risk-sub">{level.sublabel}</div>
        </div>
        <div className="rm-risk-score">
          <span className="rm-risk-num">{gap.citation_density != null ? gap.citation_density.toFixed(2) : '—'}</span>
          <span className="rm-risk-unit">citations/paper</span>
        </div>
      </div>
      <section className="rm-gapcard-section">
        <div className="rm-gapcard-label"><BookOpen size={12} /> Gap topic</div>
        <h3 className="rm-gapcard-title">{gap.topic_label}</h3>
        <p className="rm-gapcard-text">{gap.description}</p>
      </section>
      <section className="rm-gapcard-section">
        <div className="rm-gapcard-label">What this means</div>
        <p className="rm-gapcard-text">{level.what}</p>
        <CoverageMeter pct={level.pct} />
      </section>
      {gap.suggested_directions?.length > 0 && (
        <section className="rm-gapcard-section">
          <div className="rm-gapcard-label"><Lightbulb size={12} /> Suggested research directions</div>
          <ol className="rm-dirs">
            {gap.suggested_directions.map((direction, index) => (
              <li key={index}><span className="rm-dirs-num">{index + 1}</span><span>{direction}</span></li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
