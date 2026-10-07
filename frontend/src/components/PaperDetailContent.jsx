import React from 'react';
import { ExternalLink, BookOpen, Users, Calendar, Hash, Tag } from 'lucide-react';
import { getPaperLink } from '../utils/paperLinks';
import Badge from './ui/Badge';
import './papers.css';

function MetaRow({ icon: Icon, label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="rm-detail-meta-row">
      <Icon size={13} className="rm-detail-meta-icon" />
      <span className="rm-detail-meta-label">{label}</span>
      <span className={`rm-detail-meta-value${mono ? ' rm-mono' : ''}`}>{value}</span>
    </div>
  );
}

const isSet = value => value && String(value).toLowerCase() !== 'not specified';
const sourceLabel = source => (source === 'merged' ? 'arXiv + Semantic Scholar' : source === 'arxiv' ? 'arXiv' : 'Semantic Scholar');

export default function PaperDetailContent({ paper }) {
  const link = getPaperLink(paper);
  const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || '';
  const sections = [
    ['Abstract', paper.abstract],
    ['Method', isSet(paper.method) && paper.method],
    ['Dataset', isSet(paper.dataset) && paper.dataset],
    ['Key metric', isSet(paper.key_metric) && paper.key_metric],
    ['Limitation', isSet(paper.limitation) && paper.limitation],
    ['Summary', paper.summary],
  ].filter(([, value]) => value);

  return (
    <article className="rm-detail">
      <h1 className="rm-detail-title">{paper.title || 'Untitled paper'}</h1>
      <div className="rm-detail-badges">
        {paper.full_text_available && <Badge tone="success">Full PDF available</Badge>}
        {paper.abstract_only && <Badge tone="warn">Abstract only</Badge>}
        {paper.verification_status && <Badge tone="info">{paper.verification_status}</Badge>}
      </div>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="rm-detail-source">
          <ExternalLink size={13} /> View source
        </a>
      )}
      <div className="rm-detail-meta">
        <MetaRow icon={Users} label="Authors" value={authors} />
        <MetaRow icon={Calendar} label="Year" value={paper.year?.toString()} />
        <MetaRow icon={BookOpen} label="Venue" value={paper.venue && paper.venue !== 'Unknown' ? paper.venue : null} />
        <MetaRow icon={Hash} label="arXiv" value={paper.arxiv_id} mono />
        <MetaRow icon={Tag} label="DOI" value={paper.doi} mono />
        <MetaRow icon={BookOpen} label="Citations" value={paper.citation_count > 0 ? String(paper.citation_count) : null} />
        <MetaRow icon={Tag} label="Source" value={paper.source ? sourceLabel(paper.source) : null} />
      </div>
      {sections.map(([title, value]) => (
        <section className="rm-detail-section" key={title}>
          <h2 className="rm-detail-section-title">{title}</h2>
          <p className="rm-detail-text">{value}</p>
        </section>
      ))}
    </article>
  );
}
