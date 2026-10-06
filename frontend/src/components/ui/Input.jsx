import React from "react";
export default function Input({ className = "", size = "md", error, ...props }) {
  return <input className={["input", size === "sm" && "input-sm", error && "input-error", className].filter(Boolean).join(" ")} {...props} />;
}
