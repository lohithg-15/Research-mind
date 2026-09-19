/**
 * Resolves the best available human-readable link for a paper, in
 * priority order: explicit url > arXiv abstract page > DOI page >
 * raw PDF url > null. Centralizes logic previously duplicated across
 * OverviewPanel, ComparisonTable, SourcesSidebar, and ReportExport.
 */
export function getPaperLink(paper) {
  if (!paper) return null;
  if (paper.url) return paper.url;
  if (paper.arxiv_id) return `https://arxiv.org/abs/${paper.arxiv_id}`;
  if (paper.doi) return `https://doi.org/${paper.doi}`;
  if (paper.pdf_url) return paper.pdf_url;
  return null;
}

/**
 * Same resolution logic, but also returns a human-readable label for
 * the link source (used by SourcesSidebar, which shows "Open paper" /
 * "arXiv" / "DOI" / "PDF" next to the link).
 */
export function getPaperLinkWithLabel(paper) {
  if (!paper) return null;
  if (paper.url) return { href: paper.url, label: 'Open paper' };
  if (paper.arxiv_id) return { href: `https://arxiv.org/abs/${paper.arxiv_id}`, label: 'arXiv' };
  if (paper.doi) return { href: `https://doi.org/${paper.doi}`, label: 'DOI' };
  if (paper.pdf_url) return { href: paper.pdf_url, label: 'PDF' };
  return null;
}
