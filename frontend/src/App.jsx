import React, { useState, useEffect } from 'react';
import QueryForm from './components/QueryForm';
import ProgressTracker from './components/ProgressTracker';
import ComparisonTable from './components/ComparisonTable';
import GraphViewer from './components/GraphViewer';
import ReportExport from './components/ReportExport';
import { BookOpen, Network, HelpCircle } from 'lucide-react';

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // 'pending' | 'running' | 'done' | 'error'
  const [agentStatus, setAgentStatus] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'graph'

  // Poll status endpoint
  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'error') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/status/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }
        const data = await response.json();
        setJobStatus(data.status);
        setAgentStatus(data.agent_status || {});
        setError(data.error);

        if (data.status === 'done') {
          clearInterval(interval);
          fetchResults();
        } else if (data.status === 'error') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`http://localhost:8000/results/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load final results from backend.');
    }
  };

  const handleJobSubmitted = (newJobId) => {
    setJobId(newJobId);
    setJobStatus('pending');
    setAgentStatus({
      planner: 'pending',
      search: 'pending',
      extraction: 'pending',
      synthesis: 'pending',
      graph_gap: 'pending',
      report: 'pending'
    });
    setResults(null);
    setError(null);
  };

  const isPipelineRunning = jobId && (jobStatus === 'pending' || jobStatus === 'running');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header Banner */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#000000', padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '700', color: '#000000' }}>
              ResearchMind
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Literature Review & Gap Discovery Agent
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid: Form and Progress */}
      <main style={{ display: 'grid', gridTemplateColumns: isPipelineRunning ? '1fr 1fr' : '1fr', gap: '24px', transition: 'var(--transition-smooth)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <QueryForm onJobSubmitted={handleJobSubmitted} isLoading={isPipelineRunning} />
          
          {error && (
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: 'var(--color-danger)' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>Pipeline Error</h4>
              <p style={{ fontSize: '13px' }}>{error}</p>
            </div>
          )}
        </div>

        {isPipelineRunning && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <ProgressTracker agentStatus={agentStatus} />
          </div>
        )}
      </main>

      {/* Results View */}
      {results && results.status === 'done' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Tabs header */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <button
              className={`premium-btn ${activeTab === 'table' ? '' : 'premium-btn-secondary'}`}
              style={{ padding: '8px 20px', fontSize: '13px' }}
              onClick={() => setActiveTab('table')}
            >
              Literature Matrix
            </button>
            <button
              className={`premium-btn ${activeTab === 'graph' ? '' : 'premium-btn-secondary'}`}
              style={{ padding: '8px 20px', fontSize: '13px' }}
              onClick={() => setActiveTab('graph')}
            >
              Gap Citation Subgraph
            </button>
          </div>

          {/* Active Tab Panel */}
          <div>
            {activeTab === 'table' ? (
              <ComparisonTable data={results.comparison_table} />
            ) : (
              <GraphViewer gapClaims={results.gap_claims} />
            )}
          </div>

          {/* Report Export Panel */}
          {results.comparison_table && results.comparison_table.length > 0 && (
            <ReportExport jobId={jobId} reportDraft={results.gap_claims.length > 0 ? { text: `Research Topic: ${results.gap_claims[0].topic_label}\n\nSummary:\n${results.comparison_table.map(p => `• ${p.title} (${p.year}) utilizes ${p.method} on ${p.dataset}. Metric: ${p.key_metric}. Limitation: ${p.limitation}.`).join('\n')}` } : { text: "No gaps detected." }} />
          )}

        </section>
      )}
    </div>
  );
}
