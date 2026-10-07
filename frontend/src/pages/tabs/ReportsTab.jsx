import React from 'react';
import { useParams } from 'react-router-dom';
import { useResearch } from '../../context/ResearchContext';
import ReportExport from '../../components/ReportExport';

export default function ReportsTab() {
  const { jobId } = useParams();
  const { results } = useResearch();
  return (
    <div className="rm-tab-content">
      <ReportExport jobId={jobId} results={results} />
    </div>
  );
}
