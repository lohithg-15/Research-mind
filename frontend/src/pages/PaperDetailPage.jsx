import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useResearch } from '../context/ResearchContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import PaperDetailContent from '../components/PaperDetailContent';
import '../components/papers.css';

export default function PaperDetailPage() {
  const { jobId, paperId } = useParams();
  const navigate = useNavigate();
  const { papers } = useResearch();

  const paper = papers.find(p =>
    p.id === paperId
    || p.arxiv_id === paperId
    || encodeURIComponent(p.id || p.arxiv_id || p.title) === paperId);

  const back = (
    <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate(`/research/${jobId}/papers`)}>
      Back to papers
    </Button>
  );

  return (
    <AppShell>
      <div className="rm-paper-page">
        {back}
        {paper ? (
          <Card className="rm-paper-page-card"><PaperDetailContent paper={paper} /></Card>
        ) : (
          <EmptyState icon={<BookOpen size={20} />} title="Paper not found" description="This paper may not be in the current research session." />
        )}
      </div>
    </AppShell>
  );
}
