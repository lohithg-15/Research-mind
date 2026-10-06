import React from 'react';
import { Loader2 } from 'lucide-react';
import './ui.css';

export default function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`rm-spinner ${className}`.trim()} aria-label="Loading" />;
}
