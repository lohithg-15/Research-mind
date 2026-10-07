import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, ArrowRight, Plus, X } from 'lucide-react';
import { useResearch } from '../context/ResearchContext';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import { Drawer } from './ui/Modal';
import PaperDetailContent from './PaperDetailContent';
import './assistant.css';

const SUGGESTIONS = [
  'What are the most common datasets used in these papers?',
  'Summarize the key methods proposed across all papers.',
  'What are the primary limitations and constraints highlighted in this literature?',
  'Which models or techniques demonstrated the best performance/results?',
];
const DEPTHS = {
  quick: 'Answer briefly in a few sentences.',
  standard: '',
  deep: 'Give a thorough, detailed answer covering nuances and trade-offs.',
};

export default function QAAssistant({ jobId, isDone }) {
  const { papers } = useResearch();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [depth, setDepth] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePaper, setActivePaper] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  if (!isDone) {
    return (
      <EmptyState
        icon={<AlertCircle size={20} />}
        title="Assistant unavailable"
        description="The literature review must complete successfully before you can query the papers."
      />
    );
  }

  const openCitation = (cited) => {
    const match = papers.find(p => (cited.id && p.id === cited.id) || (cited.title && p.title === cited.title));
    if (match) setActivePaper(match);
    else if (cited.url) window.open(cited.url, '_blank', 'noopener,noreferrer');
  };

  const handleSend = async (textToSend) => {
    const questionText = (textToSend || input).trim();
    if (!questionText || loading) return;
    if (!textToSend) setInput('');

    const newMessages = [...messages, { role: 'user', content: questionText }];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    const history = newMessages.slice(0, -1).map(({ role, content }) => ({ role, content }));
    const parts = [questionText];
    if (extraContext.trim()) parts.push(`Additional context: ${extraContext.trim()}`);
    if (DEPTHS[depth]) parts.push(DEPTHS[depth]);

    try {
      const response = await fetch('http://localhost:8000/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, question: parts.join('\n\n'), history }),
      });
      if (!response.ok) throw new Error(`QA API Error: ${response.statusText}`);
      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.answer, papers: data.papers_referenced }]);
    } catch (err) {
      setError(err.message || 'Failed to get a response from the assistant.');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="rm-qa">
      {messages.length === 0 ? (
        <div className="rm-qa-welcome">
          <Badge tone="accent"><Sparkles size={11} /> ResearchMind Co-Pilot</Badge>
          <h2>Ask about this research space</h2>
          <p>Pose questions to synthesize insights from all collected literature. The assistant reads paper methods, metrics, and limitations to compile an answer.</p>
          <div className="rm-qa-suggestions">
            {SUGGESTIONS.map(text => (
              <button type="button" key={text} className="rm-qa-suggestion" onClick={() => handleSend(text)}>
                <span>{text}</span><ArrowRight size={14} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rm-qa-messages" aria-live="polite">
          {messages.map((msg, idx) => (
            <div key={idx} className={`rm-chat-row rm-chat-${msg.role}`}>
              <div className="rm-chat-avatar" aria-hidden="true">{msg.role === 'user' ? 'U' : 'AI'}</div>
              <div className="rm-chat-bubble">
                {msg.content.split('\n').map((para, i) => (
                  <p key={i} className={para ? 'rm-chat-paragraph' : 'rm-chat-paragraph rm-chat-paragraph-empty'}>{para}</p>
                ))}
                {msg.papers?.length > 0 && (
                  <div className="rm-cites">
                    <span className="rm-cites-label">Sources referenced</span>
                    <div className="rm-cites-list">
                      {msg.papers.slice(0, 5).map((paper, i) => (
                        <button type="button" key={i} className="rm-cite" title={paper.title} onClick={() => openCitation(paper)}>
                          <span>[{i + 1}] {paper.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="rm-chat-row rm-chat-assistant">
              <div className="rm-chat-avatar" aria-hidden="true">AI</div>
              <div className="rm-chat-bubble" role="status" aria-label="Assistant is typing"><span className="rm-typing"><i /><i /><i /></span></div>
            </div>
          )}
          {error && <div className="rm-qa-error" role="alert"><AlertCircle size={14} />{error}</div>}
          <div ref={endRef} />
        </div>
      )}

      <div className="rm-qa-composer">
        <div className="rm-qa-box">
          {showContext && (
            <textarea className="rm-qa-context" rows={2} value={extraContext} onChange={e => setExtraContext(e.target.value)} placeholder="Add context for the assistant (optional)…" aria-label="Additional context" />
          )}
          <textarea
            className="rm-qa-input"
            rows={1}
            placeholder="Ask a question about the papers…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            aria-label="Ask a question"
          />
          <div className="rm-qa-toolbar">
            <Button variant="ghost" size="sm" icon={showContext ? <X size={14} /> : <Plus size={14} />} onClick={() => setShowContext(v => !v)} aria-expanded={showContext}>
              {showContext ? 'Remove context' : 'Add context'}
            </Button>
            <select className="rm-select" value={depth} onChange={e => setDepth(e.target.value)} aria-label="Answer depth">
              <option value="quick">Quick</option>
              <option value="standard">Standard</option>
              <option value="deep">Deep</option>
            </select>
            <span className="rm-qa-spacer" />
            <Button size="sm" icon={<Send size={14} />} onClick={() => handleSend()} disabled={loading || !input.trim()} aria-label="Send" />
          </div>
        </div>
      </div>

      <Drawer isOpen={!!activePaper} onClose={() => setActivePaper(null)}>
        <div className="rm-drawer-head">
          <h2>Paper details</h2>
          <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={() => setActivePaper(null)} aria-label="Close details" />
        </div>
        {activePaper && <PaperDetailContent paper={activePaper} />}
      </Drawer>
    </div>
  );
}
