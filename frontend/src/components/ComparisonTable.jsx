import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { getPaperLink } from '../utils/paperLinks';

export default function ComparisonTable({ data = [] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ field: 'year', direction: 'desc' });
  const filtered = useMemo(() => data.filter(item => `${item.title} ${item.method} ${item.dataset} ${item.key_metric}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    const left = a[sort.field] || ''; const right = b[sort.field] || '';
    return (left < right ? -1 : left > right ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1);
  }), [data, query, sort]);
  const columns = [['title', 'Title'], ['year', 'Year'], ['method', 'Method'], ['dataset', 'Dataset'], ['key_metric', 'Key metric'], ['limitation', 'Limitation']];
  function changeSort(field) { setSort(current => ({ field, direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc' })); }
  if (!data.length) return <div className="rm-empty"><Search size={22} /><p>No comparison data yet.</p></div>;
  return <div className="rm-comparison-table"><div className="rm-table-toolbar"><h2>Comparison matrix <span>{filtered.length} papers</span></h2><label className="rm-table-search"><Search size={14} /><input className="rm-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search matrix…" /></label></div><div className="rm-table-scroll"><table><thead><tr>{columns.map(([field, label]) => <th key={field} onClick={() => changeSort(field)}>{label}{sort.field === field && (sort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</th>)}</tr></thead><tbody>{filtered.map((item, index) => <tr key={item.id || index}>{columns.map(([field]) => <td key={field} title={item[field]}>{field === 'title' && getPaperLink(item) ? <a href={getPaperLink(item)} target="_blank" rel="noopener noreferrer">{item[field]}</a> : item[field] || '—'}</td>)}</tr>)}</tbody></table></div></div>;
}
