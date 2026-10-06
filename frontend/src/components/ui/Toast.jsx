import React, { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'default', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'toast',
              t.type === 'success' && 'toast-success',
              t.type === 'danger'  && 'toast-danger',
              t.type === 'warn'    && 'toast-warn',
            ].filter(Boolean).join(' ')}
          >
            {t.type === 'success' && <CheckCircle size={15} />}
            {t.type === 'danger'  && <AlertCircle size={15} />}
            {(t.type === 'default' || !t.type) && <Info size={15} />}
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return () => {};
  return ctx;
}
