import React, { createContext, useContext, useCallback, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './ui.css';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  danger: AlertCircle,
  neutral: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, tone = 'neutral') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="rm-toast-viewport" aria-live="polite">
        {toasts.map(({ id, message, tone }) => {
          const Icon = ICONS[tone] || Info;
          return (
            <div key={id} className={`rm-toast ${tone !== 'neutral' ? `rm-toast-${tone}` : ''}`.trim()}>
              <Icon size={15} />
              {message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
