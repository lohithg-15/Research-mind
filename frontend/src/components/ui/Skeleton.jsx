import React from "react";
export default function Skeleton({ width, height, className = "", variant = "default" }) {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;
  return (
    <div
      className={["skeleton", variant === "text" && "skeleton-text", variant === "title" && "skeleton-title", variant === "card" && "skeleton-card", className].filter(Boolean).join(" ")}
      style={style}
    />
  );
}
