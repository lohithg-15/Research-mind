import React from "react";
export default function Pill({ children, active = false, disabled = false, className = "", onClick, icon: Icon }) {
  return (
    <button
      type="button"
      className={["pill", active && "active", disabled && "disabled", className].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={13} aria-hidden="true" />}
      {children}
    </button>
  );
}
