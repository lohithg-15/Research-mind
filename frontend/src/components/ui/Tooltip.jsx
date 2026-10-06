import React, { useState } from 'react';

export default function Tooltip({ children, text }) {
  const [visible, setVisible] = useState(false);
  if (!text) return <>{children}</>;
  return (
    <div
      className="tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && <div className="tooltip" role="tooltip">{text}</div>}
    </div>
  );
}
