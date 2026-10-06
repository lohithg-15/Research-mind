import React from "react";
export default function Badge({ children, variant = "neutral", className = "", ...props }) {
  return <span className={["badge", "badge-" + variant, className].filter(Boolean).join(" ")} {...props}>{children}</span>;
}
