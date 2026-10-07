import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function getGapLevel(density) {
  if (density == null) return { key: 'unknown', tone: 'neutral', label: 'Unknown', sublabel: 'Coverage data not available', Icon: AlertCircle, pct: 0, what: 'Coverage information could not be determined for this topic cluster.' };
  const pct = Math.min(100, Math.round((density / 6) * 100));
  if (density < 1) return { key: 'critical', tone: 'danger', label: 'Critical Gap', sublabel: 'Barely any papers reference each other', Icon: XCircle, pct, what: 'Papers on this topic almost never cite one another, so the research community has barely connected the dots here. This is a strong signal that this area is wide open for new work.' };
  if (density < 3) return { key: 'significant', tone: 'warn', label: 'Significant Gap', sublabel: 'Papers rarely reference each other', Icon: AlertTriangle, pct, what: 'Only a few papers in this cluster cite each other. The community is fragmented: researchers are working on similar ideas without building on each other’s work.' };
  if (density < 6) return { key: 'moderate', tone: 'warn', label: 'Moderate Gap', sublabel: 'Some coverage, but room remains', Icon: AlertCircle, pct, what: 'This area has some research activity, but papers do not reference each other as often as expected in a mature field.' };
  return { key: 'covered', tone: 'success', label: 'Well Covered', sublabel: 'Active, well-connected research area', Icon: CheckCircle, pct: 100, what: 'Papers in this cluster cite each other frequently, showing a mature, active research community.' };
}
