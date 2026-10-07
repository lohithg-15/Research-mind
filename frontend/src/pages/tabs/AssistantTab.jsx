import React from 'react';
import { useParams } from 'react-router-dom';
import { useResearch } from '../../context/ResearchContext';
import QAAssistant from '../../components/QAAssistant';

export default function AssistantTab() {
  const { jobId } = useParams();
  const { isDone } = useResearch();
  return (
    <div className="rm-tab-content">
      <QAAssistant jobId={jobId} isDone={isDone} />
    </div>
  );
}
