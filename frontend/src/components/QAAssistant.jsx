import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const SUGGESTIONS = [
  "What are the most common datasets used in these papers?",
  "Summarize the key methods proposed across all papers.",
  "What are the primary limitations and constraints highlighted in this literature?",
  "Which models or techniques demonstrated the best performance/results?"
];

export default function QAAssistant({ jobId, isDone }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isDone) {
    return (
      <div className="panel-empty" style={{ minHeight: '350px' }}>
        <AlertCircle size={32} style={{ color: 'var(--gray-700)' }} />
        <p className="panel-empty-title">Assistant Unavailable</p>
        <p className="panel-empty-desc">
          The literature review must complete successfully before you can query the papers. Please submit a query and wait for it to finish.
        </p>
      </div>
    );
  }

  const handleSend = async (textToSend) => {
    const questionText = textToSend || input;
    if (!questionText.trim() || loading) return;

    if (!textToSend) {
      setInput('');
    }

    // Add User Message to local state
    const newMessages = [...messages, { role: 'user', content: questionText }];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    // Build chat history for context
    const history = newMessages.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const response = await fetch('http://localhost:8000/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          question: questionText,
          history: history
        })
      });

      if (!response.ok) {
        throw new Error(`QA API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      setMessages([
        ...newMessages,
        { 
          role: 'assistant', 
          content: data.answer, 
          papers: data.papers_referenced 
        }
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to get a response from the assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="qa-container">
      {/* Suggestions block when empty */}
      {messages.length === 0 && (
        <div className="qa-welcome">
          <div className="qa-welcome-badge">
            <Sparkles size={11} style={{ marginRight: 5 }} />
            ResearchMind Co-Pilot
          </div>
          <h2 className="qa-welcome-title">Ask about this research space</h2>
          <p className="qa-welcome-desc">
            Pose questions to synthesize insights from all collected literature. The assistant reads through target paper methods, metrics, and limitations to compile an answer.
          </p>
          <div className="qa-suggestions-grid">
            {SUGGESTIONS.map((sug, i) => (
              <button 
                key={i} 
                className="qa-suggestion-pill"
                onClick={() => handleSend(sug)}
              >
                <span>{sug}</span>
                <ArrowRight size={10} className="qa-pill-arrow" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      {messages.length > 0 && (
        <div className="qa-messages-list">
          {messages.map((msg, idx) => (
            <div key={idx} className={`qa-message-row ${msg.role}`}>
              <div className="qa-message-avatar">
                {msg.role === 'user' ? 'U' : 'AI'}
              </div>
              <div className="qa-message-bubble">
                <div className="qa-message-content">
                  {msg.content.split('\n').map((para, pIdx) => (
                    <p key={pIdx} style={{ marginBottom: para ? '8px' : '0px' }}>
                      {para}
                    </p>
                  ))}
                </div>

                {/* Citations/Referenced Papers */}
                {msg.papers && msg.papers.length > 0 && (
                  <div className="qa-citations">
                    <span className="qa-citations-label">Sources Referenced:</span>
                    <div className="qa-citations-list">
                      {msg.papers.slice(0, 5).map((paper, pIdx) => (
                        <a 
                          key={pIdx} 
                          href={paper.url || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="qa-citation-link"
                          title={paper.title}
                        >
                          [{pIdx + 1}] {paper.title.substring(0, 45)}...
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="qa-message-row assistant loading">
              <div className="qa-message-avatar">AI</div>
              <div className="qa-message-bubble">
                <div className="qa-loading-loader">
                  <Loader2 size={16} className="spin" style={{ marginRight: 8, color: 'var(--gray-700)' }} />
                  Assistant is reading literature and synthesizing response...
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="qa-error-banner">
              <AlertCircle size={14} style={{ marginRight: 6 }} />
              <span>{error}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {/* Query Bar */}
      <div className="qa-input-bar-wrap">
        <div className="qa-input-box">
          <input 
            type="text" 
            className="qa-chat-input"
            placeholder="Ask a question about the papers..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button 
            className="qa-send-btn"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
