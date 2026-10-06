import React from 'react';

export default function Tabs({ tabs, activeKey, onChange, className = '' }) {
  return (
    <nav
      className={['tabs', className].filter(Boolean).join(' ')}
      role="tablist"
    >
      {tabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          role="tab"
          id={`tab-${key}`}
          className={['tab-btn', activeKey === key && 'active'].filter(Boolean).join(' ')}
          aria-current={activeKey === key ? 'page' : undefined}
          aria-selected={activeKey === key}
          onClick={() => onChange(key)}
        >
          {Icon && <Icon size={13} aria-hidden="true" />}
          {label}
        </button>
      ))}
    </nav>
  );
}
