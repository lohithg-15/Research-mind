import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useResearch } from '../../context/ResearchContext';
import OverviewPanel from '../../components/OverviewPanel';

export default function OverviewTab() {
  const { results } = useResearch();
  const { jobId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="rm-tab-content">
      <OverviewPanel results={results} onTabChange={tab => navigate(`/research/${jobId}/${tab}`)} />
    </div>
  );
}
