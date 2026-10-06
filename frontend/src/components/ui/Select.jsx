import React from "react";
export default function Select({ children, className = "", ...props }) {
  return <select className={["select", className].filter(Boolean).join(" ")} {...props}>{children}</select>;
}
