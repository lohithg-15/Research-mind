import React from 'react';
import './ui.css';

export function Input({ className = '', ...rest }) {
  return <input className={`rm-input ${className}`.trim()} {...rest} />;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`rm-textarea ${className}`.trim()} {...rest} />;
}

export default Input;
