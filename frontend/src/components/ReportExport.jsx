import React, { useState } from 'react';
import { FileText, Download, Check } from 'lucide-react';

export default function ReportExport({ jobId, reportDraft }) {
  const [downloading, setDownloading] = useState({ pdf: false, docx: false });
  const [completed, setCompleted] = useState({ pdf: false, docx: false });

  if (!reportDraft) return null;

  const handleDownload = async (format) => {
    setDownloading(prev => ({ ...prev, [format]: true }));
    try {
      const url = `http://localhost:8000/export/${jobId}?format=${format}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `ResearchMind_Report_${jobId.slice(0, 8)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setCompleted(prev => ({ ...prev, [format]: true }));
      setTimeout(() => {
        setCompleted(prev => ({ ...prev, [format]: false }));
      }, 3000);
    } catch (err) {
      alert(`Error downloading ${format.toUpperCase()}: ${err.message}`);
    } finally {
      setDownloading(prev => ({ ...prev, [format]: false }));
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: 'var(--color-primary)' }} />
          Compiled Research Report
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="premium-btn"
            style={{ padding: '8px 16px', fontSize: '12px' }}
            onClick={() => handleDownload('pdf')}
            disabled={downloading.pdf}
          >
            {completed.pdf ? <Check size={14} /> : <Download size={14} />}
            {downloading.pdf ? 'Downloading...' : completed.pdf ? 'PDF Downloaded' : 'Export PDF'}
          </button>
          <button
            className="premium-btn premium-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '12px' }}
            onClick={() => handleDownload('docx')}
            disabled={downloading.docx}
          >
            {completed.docx ? <Check size={14} /> : <Download size={14} />}
            {downloading.docx ? 'Downloading...' : completed.docx ? 'DOCX Downloaded' : 'Export Word'}
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '20px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap'
        }}
      >
        {reportDraft.text || 'No draft text compiled.'}
      </div>
    </div>
  );
}
