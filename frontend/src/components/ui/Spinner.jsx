import React from "react";
export default function Spinner({ size = "md", className = "" }) {
  return (
    <div className={["spinner", "spinner-accent", size === "sm" && "spinner-sm", size === "lg" && "spinner-lg", className].filter(Boolean).join(" ")} />
  );
}
