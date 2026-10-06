import React from 'react';
import { Loader2 } from 'lucide-react';
import './ui.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  icon = null,
  loading = false,
  as: Component = 'button',
  className = '',
  children,
  disabled,
  ...rest
}) {
  const classes = [
    'rm-btn',
    `rm-btn-${variant}`,
    `rm-btn-${size}`,
    !children ? 'rm-btn-icon-only' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={14} className="rm-spinner" /> : icon}
      {children}
    </Component>
  );
}
