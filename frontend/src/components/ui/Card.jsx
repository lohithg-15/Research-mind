import React from "react";
export default function Card({ children, className = "", padded = false, hover = false, large = false, ...props }) {
  const cls = ["card", padded && "card-padded", hover && "card-hover", large && "card-lg", className].filter(Boolean).join(" ");
  return <div className={cls} {...props}>{children}</div>;
}
