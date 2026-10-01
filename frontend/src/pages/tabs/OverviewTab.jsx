import React from 'react';
import { useResearch } from '../../context/ResearchContext';
import OverviewPanel from '../../components/OverviewPanel';
import { useNavigate, useParams } from 'react-router-dom';

export default function OverviewTab() {
  const { results } = useResearch();
  const { jobId } = useParams();
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    navigate(`/research/${jobId}/${tab}`);
  };

  return (
    <div className="tab-content fade-in">
      <OverviewPanel results={results} onTabChange={handleTabChange} />
    </div>
  );
}
