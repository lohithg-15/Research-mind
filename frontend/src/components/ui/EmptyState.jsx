import React from "react";
export default function EmptyState({ icon: Icon, title, description, action, iconSize = 40 }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon"><Icon size={iconSize} /></div>}
      {title && <p className="empty-state-title">{title}</p>}
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div style={{ marginTop: "var(--sp-3)" }}>{action}</div>}
    </div>
  );
}
