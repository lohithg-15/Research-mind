import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function GraphSearch({ onSearch }) {
  const [term, setTerm] = useState('');
  const [missed, setMissed] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (!term.trim()) return;
    setMissed(!onSearch(term.trim()));
  };

  return (
    <form className="rm-graph-search" onSubmit={submit} role="search">
      <Search size={14} />
      <input
        className="rm-graph-search-input"
        value={term}
        onChange={e => { setTerm(e.target.value); setMissed(false); }}
        placeholder="Find a node…"
        aria-label="Find a node in the graph"
        aria-invalid={missed}
      />
      {missed && <span className="rm-graph-search-miss">No match</span>}
    </form>
  );
}
