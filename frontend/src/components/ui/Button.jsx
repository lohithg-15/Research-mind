import React from "react";

export default function Button({
  children, variant = "primary", size = "md",
  className = "", disabled, onClick, type = "button",
  as: Tag = "button", href, target, rel, title,
  ...props
}) {
  const cls = ["btn", "btn-" + variant, "btn-" + size, className].filter(Boolean).join(" ");
  if (Tag === "a") {
    return <a href={href} target={target} rel={rel} className={cls} title={title} {...props}>{children}</a>;
  }
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} title={title} {...props}>
      {children}
    </button>
  );
}
