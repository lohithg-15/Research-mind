export const GRAPH_THEME = {
  background: '#FBFAFB',
  paper: '#8C5A6E',
  author: '#D9D2D6',
  topic: '#7C8AA5',
  cites: '#B9A3AD',
  selection: '#94445B',
  fadedOpacity: 0.18,
};

export const PAPER_MIN_SIZE = 20;
export const PAPER_MAX_SIZE = 56;

export function paperScale(citationCount, maxCitations) {
  const count = Number(citationCount);
  if (!Number.isFinite(count) || count <= 0) return 0;
  const ceiling = Math.max(maxCitations, 10);
  return Math.min(1, Math.max(0, Math.log(1 + count) / Math.log(1 + ceiling)));
}

export function truncate(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
