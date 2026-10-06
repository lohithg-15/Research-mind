import React from 'react';
import { AlertCircle, AlertTriangle, BookOpen, CheckCircle, Lightbulb, XCircle } from 'lucide-react';

export function getGapLevel(density) {
  if (density == null) return { key: 'unknown', label: 'Unknown', sublabel: 'Coverage data not available', Icon: AlertCircle, pct: 0, what: 'Coverage information could not be determined for this topic cluster.' };
  if (density < 1) return { key: 'critical', label: 'Critical Gap', sublabel: 'Barely any papers reference each other', Icon: XCircle, pct: Math.round((density / 6) * 100), what: 'Papers on this topic almost never cite one another — meaning the research community has barely connected the dots here. This is a strong signal that this area is wide open for new work.' };
  if (density < 3) return { key: 'significant', label: 'Significant Gap', sublabel: 'Papers rarely reference each other', Icon: AlertTriangle, pct: Math.round((density / 6) * 100), what: 'Only a few papers in this cluster cite each other. The community is fragmented — researchers are working on similar ideas without building on each other’s work.' };
  if (density < 6) return { key: 'moderate', label: 'Moderate Gap', sublabel: 'Some coverage, but room remains', Icon: AlertCircle, pct: Math.round((density / 6) * 100), what: 'This area has some research activity, but papers do not reference each other as often as expected in a mature field.' };
  return { key: 'covered', label: 'Well Covered', sublabel: 'Active, well-connected research area', Icon: CheckCircle, pct: 100, what: 'Papers in this cluster cite each other frequently, showing a mature, active research community.' };
}

function CoverageMeter({ pct }) {
  return <div className="gv2-meter-wrap"><div className="gv2-meter-labels"><span className="gv2-meter-lbl">No coverage</span><span className="gv2-meter-lbl">Fully covered</span></div><div className="gv2-meter-track"><div className={`gv2-meter-fill rm-meter-fill rm-meter-${Math.round(Math.max(3, pct) / 10) * 10}`} /><div className={`gv2-meter-thumb rm-meter-thumb rm-meter-thumb-${Math.round(Math.max(1, pct) / 10) * 10}`} /></div><div className="gv2-meter-pct rm-meter-text">{pct}% covered</div></div>;
}

export default function GapCard({ gap, level }) {
  return (
    <>
      <div className={`gv2-risk-header rm-risk-header rm-risk-${level.key}`}>
        <div className="gv2-risk-left"><level.Icon size={20} className="rm-risk-icon" /><div><div className="gv2-risk-label rm-risk-label">{level.label}</div><div className="gv2-risk-sublabel">{level.sublabel}</div></div></div>
        <div className="gv2-risk-score rm-risk-score"><span className="gv2-risk-num">{gap.citation_density != null ? gap.citation_density.toFixed(2) : '—'}</span><span className="gv2-risk-unit">citations/paper</span></div>
      </div>
      <div className="gv2-card"><div className="gv2-card-label"><BookOpen size={11} /> Gap Topic</div><div className="gv2-card-title">{gap.topic_label}</div><p className="gv2-card-desc">{gap.description}</p></div>
      <div className="gv2-card gv2-card--explain"><div className="gv2-card-label">What This Means</div><p className="gv2-explain-text">{level.what}</p><CoverageMeter pct={level.pct} /></div>
      {gap.suggested_directions?.length > 0 && <div className="gv2-card"><div className="gv2-card-label"><Lightbulb size={11} /> Suggested Research Directions</div><p className="gv2-dirs-intro">These are concrete ways researchers could address this gap:</p><ol className="gv2-dirs-list">{gap.suggested_directions.map((direction, index) => <li key={index} className="gv2-dirs-item"><span className="gv2-dirs-num">{index + 1}</span><span>{direction}</span></li>)}</ol></div>}
    </>
  );
}
