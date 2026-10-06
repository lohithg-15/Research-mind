import React from "react";
export default function Textarea({ className = "", borderless = false, ...props }) {
  return <textarea className={["textarea", borderless && "textarea-borderless", className].filter(Boolean).join(" ")} {...props} />;
}
