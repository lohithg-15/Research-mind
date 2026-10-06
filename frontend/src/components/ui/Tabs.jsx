import React from 'react';
import './ui.css';

export default function Tabs({ tabs, activeKey, onChange, className = '' }) {
  return (
    <nav className={`rm-tabs ${className}`.trim()} role="tablist">
      {tabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          className={`rm-tab ${activeKey === key ? 'rm-tab-active' : ''}`}
          aria-current={activeKey === key ? 'page' : undefined}
          aria-selected={activeKey === key}
          onClick={() => onChange(key)}
        >
          {Icon && <Icon size={14} />}
          {label}
        </button>
      ))}
    </nav>
  );
}
